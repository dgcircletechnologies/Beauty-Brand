import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { CartStatus, ProductStatus } from '../../generated/prisma/enums.cjs';
import { CurrencyService } from '../currency/currency.service';
import { PrismaService } from '../database/prisma.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartCurrencyDto } from './dto/update-cart-currency.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

type CartWithItems = Awaited<ReturnType<CartService['findActiveCartRecord']>>;

@Injectable()
export class CartService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly currencyService: CurrencyService,
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

    const items = cart.items.map((item) => {
      const baseUnitPrice = Number(item.variant.price);
      const baseLineTotal = baseUnitPrice * item.quantity;
      const availability = this.getCartItemAvailability(item);
      const displayUnitPrice = this.roundMoney(
        baseUnitPrice * exchangeRate.rate,
        cart.currency.decimalDigits,
      );
      const displayLineTotal = this.roundMoney(
        baseLineTotal * exchangeRate.rate,
        cart.currency.decimalDigits,
      );

      return {
        id: item.id,
        variantId: item.variantId,
        quantity: item.quantity,
        baseUnitPrice,
        baseLineTotal,
        displayUnitPrice,
        displayLineTotal,
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
        image:
          item.variant.images[0] ??
          item.variant.product.images[0] ??
          null,
      };
    });

    const baseSubtotal = items.reduce(
      (total, item) => total + item.baseLineTotal,
      0,
    );

    return {
      id: cart.id,
      status: cart.status,
      currency: cart.currency,
      baseCurrency,
      exchangeRate,
      items,
      itemCount: items.reduce((total, item) => total + item.quantity, 0),
      hasUnavailableItems: items.some((item) => !item.availability.isAvailable),
      baseSubtotal: this.roundMoney(baseSubtotal, baseCurrency.decimalDigits),
      displaySubtotal: this.roundMoney(
        baseSubtotal * exchangeRate.rate,
        cart.currency.decimalDigits,
      ),
      createdAt: cart.createdAt,
      updatedAt: cart.updatedAt,
    };
  }

  private roundMoney(amount: number, decimalDigits: number): number {
    const factor = 10 ** decimalDigits;
    return Math.round((amount + Number.EPSILON) * factor) / factor;
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
