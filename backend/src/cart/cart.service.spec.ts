import { Test, TestingModule } from '@nestjs/testing';

import { Prisma } from '../../generated/prisma/client.cjs';
import {
  CartStatus,
  OfferType,
  ProductStatus,
} from '../../generated/prisma/enums.cjs';
import { CurrencyService } from '../currency/currency.service';
import { PrismaService } from '../database/prisma.service';
import { OfferResolverService } from '../offer/services/offer-resolver.service';
import { CartService } from './cart.service';

function decimal(value: string | number) {
  return new Prisma.Decimal(value);
}

function cartItem({
  id = 'cart_item_1',
  variantId = 'variant_1',
  quantity = 2,
  price = '1000',
  productId = 'product_1',
  productName = 'Daily Cleanser',
} = {}) {
  return {
    id,
    cartId: 'cart_1',
    variantId,
    quantity,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    variant: {
      id: variantId,
      sku: `${variantId}-SKU`,
      price: decimal(price),
      stockQuantity: 10,
      isActive: true,
      deletedAt: null,
      product: {
        id: productId,
        name: productName,
        slug: productName.toLowerCase().replace(/\s+/g, '-'),
        status: ProductStatus.PUBLISHED,
        deletedAt: null,
        images: [],
      },
      images: [],
      attributeValues: [],
    },
  };
}

function cart(items = [cartItem()]) {
  return {
    id: 'cart_1',
    userId: 'user_1',
    currencyCode: 'INR',
    status: CartStatus.ACTIVE,
    expiresAt: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    currency: {
      code: 'INR',
      symbol: 'Rs',
      name: 'Indian Rupee',
      decimalDigits: 2,
      isBase: true,
      status: 'ACTIVE',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    },
    items,
  };
}

function resolverResult({
  basePrice = '1000',
  discountAmount = '200',
  finalPrice = '800',
  type = OfferType.PERCENTAGE,
  buyXGetY = null,
}: {
  basePrice?: string;
  discountAmount?: string;
  finalPrice?: string;
  type?: OfferType;
  buyXGetY?: {
    buyQuantity: number;
    getQuantity: number;
    rewardProductId: string | null;
    rewardVariantId: string | null;
  } | null;
} = {}) {
  return {
    hasOffer: true,
    basePrice: decimal(basePrice),
    discountAmount: decimal(discountAmount),
    finalPrice: decimal(finalPrice),
    offer: {
      id: 'offer_1',
      name: 'Summer Sale',
      type,
      value: type === OfferType.PERCENTAGE ? decimal('20') : null,
      maxDiscountAmount: null,
      priority: 0,
      startAt: null,
      endAt: null,
    },
    matchedBy: {
      targetType: 'VARIANT' as const,
      targetId: 'variant_1',
    },
    buyXGetY,
  };
}

function noOfferResult(price = '1000') {
  return {
    hasOffer: false,
    basePrice: decimal(price),
    discountAmount: decimal('0'),
    finalPrice: decimal(price),
    offer: null,
    matchedBy: null,
    buyXGetY: null,
  };
}

describe('CartService', () => {
  let service: CartService;
  let cartDelegate: {
    findFirst: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
  let productVariantDelegate: { findFirst: jest.Mock };
  let offerResolver: { resolveForVariants: jest.Mock };

  beforeEach(async () => {
    cartDelegate = {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };
    offerResolver = {
      resolveForVariants: jest.fn(),
    };
    productVariantDelegate = {
      findFirst: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        {
          provide: PrismaService,
          useValue: {
            cart: cartDelegate,
            cartItem: {
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
              deleteMany: jest.fn(),
            },
            productVariant: productVariantDelegate,
          },
        },
        {
          provide: CurrencyService,
          useValue: {
            getBaseCurrency: jest.fn().mockResolvedValue({
              code: 'INR',
              decimalDigits: 2,
            }),
            getLatestRate: jest.fn().mockResolvedValue({
              rate: 1,
              effectiveAt: null,
              provider: 'identity',
            }),
          },
        },
        {
          provide: OfferResolverService,
          useValue: offerResolver,
        },
      ],
    }).compile();

    service = module.get<CartService>(CartService);
  });

  it('calculates paid cart line offer pricing with Decimal totals', async () => {
    cartDelegate.findFirst.mockResolvedValue(cart());
    offerResolver.resolveForVariants.mockResolvedValue(
      new Map([['variant_1', resolverResult()]]),
    );

    const result = await service.getActiveCart('user_1');

    expect(result.items[0].pricing).toMatchObject({
      unitBasePrice: '1000.00',
      unitDiscountAmount: '200.00',
      unitFinalPrice: '800.00',
      lineBaseSubtotal: '2000.00',
      lineDiscountAmount: '400.00',
      lineFinalSubtotal: '1600.00',
      hasOffer: true,
    });
    expect(result.baseSubtotal).toBe(1600);
    expect(result.displaySubtotal).toBe(1600);
    expect(result.summary).toMatchObject({
      baseSubtotal: '2000.00',
      discountTotal: '400.00',
      finalSubtotal: '1600.00',
      rewardSavings: '0.00',
    });
  });

  it('computes same-variant BOGO reward lines without reducing paid subtotal', async () => {
    cartDelegate.findFirst.mockResolvedValue(cart([cartItem({ quantity: 5 })]));
    offerResolver.resolveForVariants.mockResolvedValue(
      new Map([
        [
          'variant_1',
          resolverResult({
            discountAmount: '0',
            finalPrice: '1000',
            type: OfferType.BUY_X_GET_Y,
            buyXGetY: {
              buyQuantity: 2,
              getQuantity: 1,
              rewardProductId: null,
              rewardVariantId: null,
            },
          }),
        ],
      ]),
    );

    const result = await service.getActiveCart('user_1');

    expect(result.items[0].pricing.lineFinalSubtotal).toBe('5000.00');
    expect(result.rewardItems).toHaveLength(1);
    expect(result.rewardItems[0]).toMatchObject({
      isOfferReward: true,
      sourceOfferId: 'offer_1',
      sourceCartItemId: 'cart_item_1',
      variantId: 'variant_1',
      quantity: 2,
      unitPrice: '1000.00',
      discountAmount: '2000.00',
      finalUnitPrice: '0.00',
      lineTotal: '0.00',
    });
    expect(result.summary).toMatchObject({
      discountTotal: '0.00',
      finalSubtotal: '5000.00',
      rewardSavings: '2000.00',
    });
  });

  it('keeps a stable no-offer pricing shape', async () => {
    cartDelegate.findFirst.mockResolvedValue(cart());
    offerResolver.resolveForVariants.mockResolvedValue(
      new Map([['variant_1', noOfferResult()]]),
    );

    const result = await service.getActiveCart('user_1');

    expect(result.items[0].pricing).toMatchObject({
      unitBasePrice: '1000.00',
      unitDiscountAmount: '0.00',
      unitFinalPrice: '1000.00',
      lineBaseSubtotal: '2000.00',
      lineDiscountAmount: '0.00',
      lineFinalSubtotal: '2000.00',
      hasOffer: false,
      offer: null,
      buyXGetY: null,
    });
    expect(result.rewardItems).toEqual([]);
    expect(result.summary.finalSubtotal).toBe('2000.00');
  });

  it('calculates fixed amount cart discounts', async () => {
    cartDelegate.findFirst.mockResolvedValue(cart([cartItem({ quantity: 3 })]));
    offerResolver.resolveForVariants.mockResolvedValue(
      new Map([
        [
          'variant_1',
          resolverResult({
            discountAmount: '200',
            finalPrice: '800',
            type: OfferType.FIXED_AMOUNT,
          }),
        ],
      ]),
    );

    const result = await service.getActiveCart('user_1');

    expect(result.items[0].pricing).toMatchObject({
      lineBaseSubtotal: '3000.00',
      lineDiscountAmount: '600.00',
      lineFinalSubtotal: '2400.00',
    });
    expect(result.summary).toMatchObject({
      discountTotal: '600.00',
      finalSubtotal: '2400.00',
    });
  });

  it('uses resolver fixed-discount floors without recalculating them in cart', async () => {
    cartDelegate.findFirst.mockResolvedValue(cart([cartItem({ quantity: 2 })]));
    offerResolver.resolveForVariants.mockResolvedValue(
      new Map([
        [
          'variant_1',
          resolverResult({
            discountAmount: '1000',
            finalPrice: '0',
            type: OfferType.FIXED_AMOUNT,
          }),
        ],
      ]),
    );

    const result = await service.getActiveCart('user_1');

    expect(result.items[0].pricing).toMatchObject({
      unitDiscountAmount: '1000.00',
      unitFinalPrice: '0.00',
      lineDiscountAmount: '2000.00',
      lineFinalSubtotal: '0.00',
    });
    expect(result.summary.finalSubtotal).toBe('0.00');
  });

  it('does not create BOGO rewards below the quantity threshold', async () => {
    cartDelegate.findFirst.mockResolvedValue(cart([cartItem({ quantity: 1 })]));
    offerResolver.resolveForVariants.mockResolvedValue(
      new Map([
        [
          'variant_1',
          resolverResult({
            discountAmount: '0',
            finalPrice: '1000',
            type: OfferType.BUY_X_GET_Y,
            buyXGetY: {
              buyQuantity: 2,
              getQuantity: 1,
              rewardProductId: null,
              rewardVariantId: null,
            },
          }),
        ],
      ]),
    );

    const result = await service.getActiveCart('user_1');

    expect(result.rewardItems).toEqual([]);
    expect(result.summary.rewardSavings).toBe('0.00');
  });

  it('does not combine separate BOGO qualifying lines', async () => {
    const firstItem = cartItem({ quantity: 1, variantId: 'variant_1' });
    const secondItem = cartItem({
      id: 'cart_item_2',
      quantity: 1,
      variantId: 'variant_2',
      productId: 'product_2',
      productName: 'Night Cream',
    });
    cartDelegate.findFirst.mockResolvedValue(cart([firstItem, secondItem]));
    offerResolver.resolveForVariants.mockResolvedValue(
      new Map([
        [
          'variant_1',
          resolverResult({
            discountAmount: '0',
            finalPrice: '1000',
            type: OfferType.BUY_X_GET_Y,
            buyXGetY: {
              buyQuantity: 2,
              getQuantity: 1,
              rewardProductId: null,
              rewardVariantId: null,
            },
          }),
        ],
        [
          'variant_2',
          {
            ...resolverResult({
              discountAmount: '0',
              finalPrice: '1000',
              type: OfferType.BUY_X_GET_Y,
              buyXGetY: {
                buyQuantity: 2,
                getQuantity: 1,
                rewardProductId: null,
                rewardVariantId: null,
              },
            }),
            matchedBy: {
              targetType: 'CATEGORY' as const,
              targetId: 'category_1',
              categoryDistance: 0,
            },
          },
        ],
      ]),
    );

    const result = await service.getActiveCart('user_1');

    expect(result.rewardItems).toEqual([]);
    expect(result.summary.finalSubtotal).toBe('2000.00');
  });

  it('uses an explicitly configured BOGO reward variant', async () => {
    cartDelegate.findFirst.mockResolvedValue(cart([cartItem({ quantity: 2 })]));
    productVariantDelegate.findFirst.mockResolvedValue({
      ...cartItem({
        variantId: 'reward_variant_1',
        productId: 'reward_product_1',
        productName: 'Travel Mini',
        price: '250',
      }).variant,
    });
    offerResolver.resolveForVariants.mockResolvedValue(
      new Map([
        [
          'variant_1',
          resolverResult({
            discountAmount: '0',
            finalPrice: '1000',
            type: OfferType.BUY_X_GET_Y,
            buyXGetY: {
              buyQuantity: 2,
              getQuantity: 1,
              rewardProductId: null,
              rewardVariantId: 'reward_variant_1',
            },
          }),
        ],
      ]),
    );

    const result = await service.getActiveCart('user_1');

    expect(productVariantDelegate.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'reward_variant_1',
        }),
      }),
    );
    expect(result.rewardItems[0]).toMatchObject({
      variantId: 'reward_variant_1',
      productId: 'reward_product_1',
      quantity: 1,
      unitPrice: '250.00',
      discountAmount: '250.00',
    });
  });
});
