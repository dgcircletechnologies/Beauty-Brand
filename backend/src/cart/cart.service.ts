import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '../../generated/prisma/client.cjs';
import { CartStatus, ProductStatus } from '../../generated/prisma/enums.cjs';
import { CurrencyService } from '../currency/currency.service';
import { PrismaService } from '../database/prisma.service';
import {
  OfferResolverResult,
  OfferResolverService,
} from '../offer/services/offer-resolver.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartCurrencyDto } from './dto/update-cart-currency.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

type CartWithItems = Awaited<ReturnType<CartService['findActiveCartRecord']>>;
type CartItemWithVariant = NonNullable<CartWithItems>['items'][number];
type CartVariant = CartItemWithVariant['variant'];

type RewardIssue = {
  sourceCartItemId: string;
  sourceOfferId: string;
  message: string;
};

type PricedCartLineForRewards = {
  id: string;
  variantId: string;
  sourceVariant: CartVariant;
  quantity: number;
  availability: {
    isAvailable: boolean;
  };
  resolvedPricing?: OfferResolverResult;
};

@Injectable()
export class CartService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly currencyService: CurrencyService,
    private readonly offerResolverService: OfferResolverService,
  ) {}

  async getActiveCart(userId: string) {
    const cart = await this.findOrCreateActiveCart(userId);
    return this.toCartSummary(cart);
  }

  async addItem(userId: string, dto: AddCartItemDto) {
    const variant = await this.findSellableVariant(dto.variantId);
    const cart = await this.findOrCreateActiveCart(userId);

    const existingItem = cart.items.find(
      (item) => item.variantId === variant.id,
    );
    const nextQuantity = (existingItem?.quantity ?? 0) + dto.quantity;

    this.ensureStockAvailable(nextQuantity, variant.stockQuantity);

    if (existingItem) {
      await this.prisma.cartItem.update({
        where: {
          id: existingItem.id,
        },
        data: {
          quantity: nextQuantity,
        },
      });
    } else {
      await this.prisma.cartItem.create({
        data: {
          cartId: cart.id,
          variantId: variant.id,
          quantity: dto.quantity,
        },
      });
    }

    return this.toCartSummary(await this.findOrCreateActiveCart(userId));
  }

  async updateItem(userId: string, itemId: string, dto: UpdateCartItemDto) {
    const cart = await this.findOrCreateActiveCart(userId);
    const item = cart.items.find((cartItem) => cartItem.id === itemId);

    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    this.ensureCartItemCanBePurchased(item);
    this.ensureStockAvailable(dto.quantity, item.variant.stockQuantity);

    await this.prisma.cartItem.update({
      where: {
        id: itemId,
      },
      data: {
        quantity: dto.quantity,
      },
    });

    return this.toCartSummary(await this.findOrCreateActiveCart(userId));
  }

  async removeItem(userId: string, itemId: string) {
    const cart = await this.findOrCreateActiveCart(userId);
    const item = cart.items.find((cartItem) => cartItem.id === itemId);

    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    await this.prisma.cartItem.delete({
      where: {
        id: itemId,
      },
    });

    return this.toCartSummary(await this.findOrCreateActiveCart(userId));
  }

  async clearCart(userId: string) {
    const cart = await this.findOrCreateActiveCart(userId);

    await this.prisma.cartItem.deleteMany({
      where: {
        cartId: cart.id,
      },
    });

    return this.toCartSummary(await this.findOrCreateActiveCart(userId));
  }

  async updateCurrency(userId: string, dto: UpdateCartCurrencyDto) {
    const currency = await this.currencyService.ensureActiveCurrency(
      dto.currencyCode,
    );
    const cart = await this.findOrCreateActiveCart(userId);

    await this.prisma.cart.update({
      where: {
        id: cart.id,
      },
      data: {
        currencyCode: currency.code,
      },
    });

    return this.toCartSummary(await this.findOrCreateActiveCart(userId));
  }

  private async findOrCreateActiveCart(userId: string) {
    const existingCart = await this.findActiveCartRecord(userId);

    if (existingCart) {
      return existingCart;
    }

    const baseCurrency = await this.currencyService.getBaseCurrency();

    await this.prisma.cart.create({
      data: {
        userId,
        currencyCode: baseCurrency.code,
      },
    });

    const createdCart = await this.findActiveCartRecord(userId);

    if (!createdCart) {
      throw new BadRequestException('Unable to initialize cart');
    }

    return createdCart;
  }

  private findActiveCartRecord(userId: string) {
    return this.prisma.cart.findFirst({
      where: {
        userId,
        status: CartStatus.ACTIVE,
      },
      include: {
        currency: true,
        items: {
          include: {
            variant: {
              include: {
                product: {
                  include: {
                    images: {
                      where: {
                        deletedAt: null,
                      },
                      orderBy: this.getCartImageOrderBy(),
                    },
                  },
                },
                images: {
                  where: {
                    deletedAt: null,
                  },
                  orderBy: this.getCartImageOrderBy(),
                },
                attributeValues: {
                  include: {
                    attribute: true,
                    option: true,
                  },
                  orderBy: {
                    createdAt: 'asc',
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  private async findSellableVariant(variantId: string) {
    const variant = await this.prisma.productVariant.findFirst({
      where: {
        id: variantId,
        isActive: true,
        deletedAt: null,
        product: {
          deletedAt: null,
          status: ProductStatus.PUBLISHED,
        },
      },
      include: {
        product: true,
      },
    });

    if (!variant) {
      throw new NotFoundException('Product variant not found');
    }

    return variant;
  }

  private ensureStockAvailable(quantity: number, stockQuantity: number) {
    if (quantity > stockQuantity) {
      throw new BadRequestException('Requested quantity is not available');
    }
  }

  private async toCartSummary(cart: NonNullable<CartWithItems>) {
    const baseCurrency = await this.currencyService.getBaseCurrency();
    const exchangeRate = await this.currencyService.getLatestRate(
      baseCurrency.code,
      cart.currencyCode,
    );
    const exchangeRateDecimal = new Prisma.Decimal(exchangeRate.rate);
    const pricingByVariantId =
      await this.offerResolverService.resolveForVariants(
        cart.items.map((item) => item.variantId),
      );
    const rewardIssues: RewardIssue[] = [];

    const items = cart.items.map((item) => {
      const resolvedPricing = pricingByVariantId.get(item.variantId);
      const unitBasePrice = resolvedPricing
        ? resolvedPricing.basePrice
        : new Prisma.Decimal(item.variant.price);
      const unitDiscountAmount =
        resolvedPricing?.discountAmount ?? new Prisma.Decimal(0);
      const unitFinalPrice =
        resolvedPricing?.finalPrice ?? new Prisma.Decimal(item.variant.price);
      const lineBaseSubtotal = unitBasePrice.mul(item.quantity);
      const lineDiscountAmount = unitDiscountAmount.mul(item.quantity);
      const lineFinalSubtotal = unitFinalPrice.mul(item.quantity);
      const availability = this.getCartItemAvailability(item);
      const displayUnitPrice = this.decimalToRoundedNumber(
        unitFinalPrice.mul(exchangeRateDecimal),
        cart.currency.decimalDigits,
      );
      const displayUnitBasePrice = this.decimalToRoundedNumber(
        unitBasePrice.mul(exchangeRateDecimal),
        cart.currency.decimalDigits,
      );
      const displayUnitDiscountAmount = this.decimalToRoundedNumber(
        unitDiscountAmount.mul(exchangeRateDecimal),
        cart.currency.decimalDigits,
      );
      const displayLineBaseSubtotal = this.decimalToRoundedNumber(
        lineBaseSubtotal.mul(exchangeRateDecimal),
        cart.currency.decimalDigits,
      );
      const displayLineDiscountAmount = this.decimalToRoundedNumber(
        lineDiscountAmount.mul(exchangeRateDecimal),
        cart.currency.decimalDigits,
      );
      const displayLineTotal = this.decimalToRoundedNumber(
        lineFinalSubtotal.mul(exchangeRateDecimal),
        cart.currency.decimalDigits,
      );
      const offer = resolvedPricing?.offer
        ? {
            id: resolvedPricing.offer.id,
            name: resolvedPricing.offer.name,
            type: resolvedPricing.offer.type,
            value: this.nullableDecimalToMoney(resolvedPricing.offer.value),
            maxDiscountAmount: this.nullableDecimalToMoney(
              resolvedPricing.offer.maxDiscountAmount,
            ),
          }
        : null;

      return {
        id: item.id,
        variantId: item.variantId,
        quantity: item.quantity,
        baseUnitPrice: this.decimalToRoundedNumber(
          unitBasePrice,
          baseCurrency.decimalDigits,
        ),
        baseLineTotal: this.decimalToRoundedNumber(
          lineFinalSubtotal,
          baseCurrency.decimalDigits,
        ),
        displayUnitBasePrice,
        displayUnitDiscountAmount,
        displayUnitPrice,
        displayLineBaseSubtotal,
        displayLineDiscountAmount,
        displayLineTotal,
        pricing: {
          unitBasePrice: this.decimalToMoney(unitBasePrice),
          unitDiscountAmount: this.decimalToMoney(unitDiscountAmount),
          unitFinalPrice: this.decimalToMoney(unitFinalPrice),
          lineBaseSubtotal: this.decimalToMoney(lineBaseSubtotal),
          lineDiscountAmount: this.decimalToMoney(lineDiscountAmount),
          lineFinalSubtotal: this.decimalToMoney(lineFinalSubtotal),
          hasOffer: resolvedPricing?.hasOffer ?? false,
          offer,
          buyXGetY: resolvedPricing?.buyXGetY ?? null,
        },
        resolvedPricing,
        availability,
        product: {
          id: item.variant.product.id,
          name: item.variant.product.name,
          slug: item.variant.product.slug,
        },
        variant: {
          id: item.variant.id,
          sku: item.variant.sku,
          stockQuantity: item.variant.stockQuantity,
          isActive: item.variant.isActive,
          deletedAt: item.variant.deletedAt,
          attributeValues: item.variant.attributeValues,
        },
        sourceVariant: item.variant,
        image: item.variant.images[0] ?? item.variant.product.images[0] ?? null,
      };
    });

    const rewardItems = await this.buildRewardItems(
      items,
      cart.currency.decimalDigits,
      exchangeRateDecimal,
      rewardIssues,
    );
    const baseSubtotal = items.reduce(
      (total, item) =>
        total.plus(new Prisma.Decimal(item.pricing.lineFinalSubtotal)),
      new Prisma.Decimal(0),
    );
    const basePreDiscountSubtotal = items.reduce(
      (total, item) =>
        total.plus(new Prisma.Decimal(item.pricing.lineBaseSubtotal)),
      new Prisma.Decimal(0),
    );
    const discountTotal = items.reduce(
      (total, item) =>
        total.plus(new Prisma.Decimal(item.pricing.lineDiscountAmount)),
      new Prisma.Decimal(0),
    );
    const rewardSavings = rewardItems.reduce(
      (total, item) => total.plus(new Prisma.Decimal(item.discountAmount)),
      new Prisma.Decimal(0),
    );

    return {
      id: cart.id,
      status: cart.status,
      currency: cart.currency,
      baseCurrency,
      exchangeRate,
      items: items.map((item) => this.toPublicCartItem(item)),
      rewardItems,
      rewardIssues,
      itemCount: items.reduce((total, item) => total + item.quantity, 0),
      hasUnavailableItems: items.some((item) => !item.availability.isAvailable),
      baseSubtotal: this.decimalToRoundedNumber(
        baseSubtotal,
        baseCurrency.decimalDigits,
      ),
      displaySubtotal: this.decimalToRoundedNumber(
        baseSubtotal.mul(exchangeRateDecimal),
        cart.currency.decimalDigits,
      ),
      summary: {
        baseSubtotal: this.decimalToMoney(basePreDiscountSubtotal),
        discountTotal: this.decimalToMoney(discountTotal),
        finalSubtotal: this.decimalToMoney(baseSubtotal),
        rewardSavings: this.decimalToMoney(rewardSavings),
        displayBaseSubtotal: this.decimalToMoney(
          this.roundDecimal(
            basePreDiscountSubtotal.mul(exchangeRateDecimal),
            cart.currency.decimalDigits,
          ),
        ),
        displayDiscountTotal: this.decimalToMoney(
          this.roundDecimal(
            discountTotal.mul(exchangeRateDecimal),
            cart.currency.decimalDigits,
          ),
        ),
        displayRewardSavings: this.decimalToMoney(
          this.roundDecimal(
            rewardSavings.mul(exchangeRateDecimal),
            cart.currency.decimalDigits,
          ),
        ),
        displayFinalSubtotal: this.decimalToMoney(
          this.roundDecimal(
            baseSubtotal.mul(exchangeRateDecimal),
            cart.currency.decimalDigits,
          ),
        ),
      },
      createdAt: cart.createdAt,
      updatedAt: cart.updatedAt,
    };
  }

  private toPublicCartItem(item: Record<string, unknown>) {
    const publicItem = { ...item };

    delete publicItem.resolvedPricing;
    delete publicItem.sourceVariant;

    return publicItem;
  }

  private async buildRewardItems(
    items: PricedCartLineForRewards[],
    displayDecimalDigits: number,
    exchangeRate: Prisma.Decimal,
    rewardIssues: RewardIssue[],
  ) {
    const rewardItems = [];

    for (const item of items) {
      const resolvedPricing = item.resolvedPricing;
      const bogo = resolvedPricing?.buyXGetY;

      if (
        !resolvedPricing?.hasOffer ||
        !resolvedPricing.offer ||
        !bogo ||
        !item.availability.isAvailable
      ) {
        continue;
      }

      const rewardGroups = Math.floor(item.quantity / bogo.buyQuantity);
      const quantity = rewardGroups * bogo.getQuantity;

      if (quantity <= 0) {
        continue;
      }

      const rewardVariant = await this.findRewardVariant(item, bogo);

      if (!rewardVariant) {
        rewardIssues.push({
          sourceCartItemId: item.id,
          sourceOfferId: resolvedPricing.offer.id,
          message: 'Configured offer reward is no longer available',
        });
        continue;
      }

      const unitPrice = new Prisma.Decimal(rewardVariant.price);
      const discountAmount = unitPrice.mul(quantity);

      rewardItems.push({
        isOfferReward: true,
        sourceOfferId: resolvedPricing.offer.id,
        sourceCartItemId: item.id,
        variantId: rewardVariant.id,
        productId: rewardVariant.product.id,
        name: rewardVariant.product.name,
        quantity,
        unitPrice: this.decimalToMoney(unitPrice),
        discountAmount: this.decimalToMoney(discountAmount),
        finalUnitPrice: this.decimalToMoney(new Prisma.Decimal(0)),
        lineTotal: this.decimalToMoney(new Prisma.Decimal(0)),
        displayUnitPrice: this.decimalToRoundedNumber(
          unitPrice.mul(exchangeRate),
          displayDecimalDigits,
        ),
        displayLineTotal: 0,
        offer: {
          id: resolvedPricing.offer.id,
          name: resolvedPricing.offer.name,
          type: resolvedPricing.offer.type,
        },
        product: {
          id: rewardVariant.product.id,
          name: rewardVariant.product.name,
          slug: rewardVariant.product.slug,
        },
        variant: {
          id: rewardVariant.id,
          sku: rewardVariant.sku,
          stockQuantity: rewardVariant.stockQuantity,
          isActive: rewardVariant.isActive,
          deletedAt: rewardVariant.deletedAt,
          attributeValues: rewardVariant.attributeValues,
        },
        image:
          rewardVariant.images[0] ?? rewardVariant.product.images[0] ?? null,
      });
    }

    return rewardItems;
  }

  private async findRewardVariant(
    sourceItem: {
      variantId: string;
      sourceVariant: CartVariant;
    },
    bogo: {
      rewardProductId: string | null;
      rewardVariantId: string | null;
    },
  ): Promise<CartVariant | null> {
    if (bogo.rewardVariantId) {
      return this.prisma.productVariant.findFirst({
        where: {
          id: bogo.rewardVariantId,
          deletedAt: null,
          isActive: true,
          product: {
            deletedAt: null,
            status: ProductStatus.PUBLISHED,
          },
        },
        include: this.getCartVariantInclude(),
      });
    }

    if (bogo.rewardProductId) {
      return this.prisma.productVariant.findFirst({
        where: {
          productId: bogo.rewardProductId,
          deletedAt: null,
          isActive: true,
          product: {
            deletedAt: null,
            status: ProductStatus.PUBLISHED,
          },
        },
        include: this.getCartVariantInclude(),
        orderBy: {
          price: 'asc',
        },
      });
    }

    return sourceItem.sourceVariant;
  }

  private decimalToRoundedNumber(
    amount: Prisma.Decimal,
    decimalDigits: number,
  ): number {
    return this.roundDecimal(amount, decimalDigits).toNumber();
  }

  private roundDecimal(amount: Prisma.Decimal, decimalDigits: number) {
    return new Prisma.Decimal(amount.toFixed(decimalDigits));
  }

  private decimalToMoney(value: Prisma.Decimal) {
    return value.toFixed(2);
  }

  private nullableDecimalToMoney(value: Prisma.Decimal | null) {
    return value ? value.toFixed(2) : null;
  }

  private getCartImageOrderBy() {
    return [
      {
        isPrimary: 'desc' as const,
      },
      {
        sortOrder: 'asc' as const,
      },
      {
        createdAt: 'asc' as const,
      },
    ];
  }

  private getCartVariantInclude() {
    return {
      product: {
        include: {
          images: {
            where: {
              deletedAt: null,
            },
            orderBy: this.getCartImageOrderBy(),
          },
        },
      },
      images: {
        where: {
          deletedAt: null,
        },
        orderBy: this.getCartImageOrderBy(),
      },
      attributeValues: {
        include: {
          attribute: true,
          option: true,
        },
        orderBy: {
          createdAt: 'asc' as const,
        },
      },
    };
  }

  private ensureCartItemCanBePurchased(
    item: NonNullable<CartWithItems>['items'][number],
  ) {
    const availability = this.getCartItemAvailability(item);

    if (!availability.isAvailable) {
      throw new BadRequestException(availability.message);
    }
  }

  private getCartItemAvailability(
    item: NonNullable<CartWithItems>['items'][number],
  ) {
    if (item.variant.product.deletedAt) {
      return {
        status: 'PRODUCT_DELETED',
        isAvailable: false,
        message: 'This product is no longer available',
      };
    }

    if (item.variant.product.status !== ProductStatus.PUBLISHED) {
      return {
        status: 'PRODUCT_UNAVAILABLE',
        isAvailable: false,
        message: 'This product is currently unavailable',
      };
    }

    if (item.variant.deletedAt || !item.variant.isActive) {
      return {
        status: 'VARIANT_UNAVAILABLE',
        isAvailable: false,
        message: 'This product option is no longer available',
      };
    }

    if (item.variant.stockQuantity <= 0) {
      return {
        status: 'OUT_OF_STOCK',
        isAvailable: false,
        message: 'This item is out of stock',
      };
    }

    if (item.quantity > item.variant.stockQuantity) {
      return {
        status: 'INSUFFICIENT_STOCK',
        isAvailable: false,
        message: `Only ${item.variant.stockQuantity} item(s) are available`,
      };
    }

    return {
      status: 'AVAILABLE',
      isAvailable: true,
      message: 'Available',
    };
  }
}
