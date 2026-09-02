import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { Prisma } from '../../generated/prisma/client.cjs';
import { OfferType, ProductStatus } from '../../generated/prisma/enums.cjs';
import { CurrencyService } from '../currency/currency.service';
import { PrismaService } from '../database/prisma.service';
import { OfferResolverService } from '../offer/services/offer-resolver.service';
import { ShippingService } from '../shipping/shipping.service';
import { OrderService } from './order.service';

function decimal(value: string | number) {
  return new Prisma.Decimal(value);
}

function cartItem({
  id = 'cart_item_1',
  variantId = 'variant_1',
  quantity = 2,
  price = '1000',
  stockQuantity = 10,
} = {}) {
  return {
    id,
    variantId,
    quantity,
    variant: {
      id: variantId,
      sku: `${variantId}-SKU`,
      price: decimal(price),
      stockQuantity,
      isActive: true,
      deletedAt: null,
      product: {
        id: 'product_1',
        name: 'Daily Cleanser',
        status: ProductStatus.PUBLISHED,
        deletedAt: null,
      },
    },
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

describe('OrderService offer checkout calculation', () => {
  let service: OrderService;
  let offerResolver: { resolveForVariants: jest.Mock };
  let productVariant: { findFirst: jest.Mock };

  beforeEach(async () => {
    offerResolver = {
      resolveForVariants: jest.fn(),
    };
    productVariant = {
      findFirst: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        {
          provide: PrismaService,
          useValue: {
            productVariant,
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
            }),
            ensureActiveCurrency: jest.fn().mockResolvedValue({
              code: 'INR',
              decimalDigits: 2,
            }),
          },
        },
        {
          provide: ShippingService,
          useValue: {},
        },
        {
          provide: OfferResolverService,
          useValue: offerResolver,
        },
      ],
    }).compile();

    service = module.get<OrderService>(OrderService);
  });

  it('recalculates percentage offer pricing and snapshots paid order items', async () => {
    offerResolver.resolveForVariants.mockResolvedValue(
      new Map([['variant_1', resolverResult()]]),
    );

    const totals = await (service as any).calculateTotals('INR', [cartItem()]);

    expect(totals.basePreDiscountSubtotal).toBe(2000);
    expect(totals.discountAmount).toBe(400);
    expect(totals.baseSubtotal).toBe(1600);
    expect(totals.rewardSavings).toBe(0);
    expect(totals.paidOrderItems[0]).toMatchObject({
      productId: 'product_1',
      variantId: 'variant_1',
      quantity: 2,
      baseUnitPrice: decimal('1000'),
      unitPrice: decimal('800'),
      lineSubtotal: decimal('2000'),
      discountAmount: decimal('400'),
      unitDiscountAmount: decimal('200'),
      appliedOfferId: 'offer_1',
      appliedOfferName: 'Summer Sale',
      appliedOfferType: OfferType.PERCENTAGE,
      appliedOfferValue: '20.00',
      isOfferReward: false,
      lineTotal: decimal('1600'),
    });
  });

  it('creates immutable BOGO reward order item snapshots', async () => {
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

    const totals = await (service as any).calculateTotals('INR', [
      cartItem({ quantity: 5 }),
    ]);

    expect(totals.baseSubtotal).toBe(5000);
    expect(totals.discountAmount).toBe(0);
    expect(totals.rewardSavings).toBe(2000);
    expect(totals.rewardOrderItems).toHaveLength(1);
    expect(totals.rewardOrderItems[0]).toMatchObject({
      productId: 'product_1',
      variantId: 'variant_1',
      quantity: 2,
      baseUnitPrice: decimal('1000'),
      unitPrice: decimal('0'),
      lineSubtotal: decimal('2000'),
      discountAmount: decimal('2000'),
      unitDiscountAmount: decimal('1000'),
      appliedOfferId: 'offer_1',
      appliedOfferType: OfferType.BUY_X_GET_Y,
      isOfferReward: true,
      sourceOfferId: 'offer_1',
      lineTotal: decimal('0'),
    });
  });

  it('snapshots no-offer checkout lines with zero discounts', async () => {
    offerResolver.resolveForVariants.mockResolvedValue(
      new Map([['variant_1', noOfferResult()]]),
    );

    const totals = await (service as any).calculateTotals('INR', [cartItem()]);

    expect(totals.basePreDiscountSubtotal).toBe(2000);
    expect(totals.discountAmount).toBe(0);
    expect(totals.baseSubtotal).toBe(2000);
    expect(totals.paidOrderItems[0]).toMatchObject({
      baseUnitPrice: decimal('1000'),
      unitPrice: decimal('1000'),
      discountAmount: decimal('0'),
      unitDiscountAmount: decimal('0'),
      appliedOfferId: null,
      isOfferReward: false,
      lineTotal: decimal('2000'),
    });
  });

  it('snapshots fixed amount checkout discounts', async () => {
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

    const totals = await (service as any).calculateTotals('INR', [
      cartItem({ quantity: 3 }),
    ]);

    expect(totals.basePreDiscountSubtotal).toBe(3000);
    expect(totals.discountAmount).toBe(600);
    expect(totals.baseSubtotal).toBe(2400);
    expect(totals.paidOrderItems[0]).toMatchObject({
      unitPrice: decimal('800'),
      lineSubtotal: decimal('3000'),
      discountAmount: decimal('600'),
      appliedOfferType: OfferType.FIXED_AMOUNT,
      lineTotal: decimal('2400'),
    });
  });

  it('preserves resolver fixed-price floors at checkout', async () => {
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

    const totals = await (service as any).calculateTotals('INR', [cartItem()]);

    expect(totals.baseSubtotal).toBe(0);
    expect(totals.paidOrderItems[0]).toMatchObject({
      unitDiscountAmount: decimal('1000'),
      unitPrice: decimal('0'),
      discountAmount: decimal('2000'),
      lineTotal: decimal('0'),
    });
  });

  it('snapshots an explicitly configured BOGO reward variant', async () => {
    productVariant.findFirst.mockResolvedValue({
      ...cartItem({
        variantId: 'reward_variant_1',
        price: '250',
        stockQuantity: 5,
      }).variant,
      product: {
        id: 'reward_product_1',
        name: 'Travel Mini',
        status: ProductStatus.PUBLISHED,
        deletedAt: null,
      },
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

    const totals = await (service as any).calculateTotals('INR', [cartItem()]);

    expect(productVariant.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'reward_variant_1',
        }),
      }),
    );
    expect(totals.rewardOrderItems[0]).toMatchObject({
      productId: 'reward_product_1',
      variantId: 'reward_variant_1',
      quantity: 1,
      baseUnitPrice: decimal('250'),
      unitPrice: decimal('0'),
      discountAmount: decimal('250'),
      isOfferReward: true,
    });
  });

  it('fails checkout calculation when a configured reward variant is unavailable', async () => {
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
    productVariant.findFirst.mockResolvedValue(null);

    await expect(
      (service as any).calculateTotals('INR', [cartItem()]),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
