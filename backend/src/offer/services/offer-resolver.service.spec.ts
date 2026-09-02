import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { Prisma } from '../../../generated/prisma/client.cjs';
import { OfferType } from '../../../generated/prisma/enums.cjs';
import { PrismaService } from '../../database/prisma.service';
import { OfferResolverService } from './offer-resolver.service';

type ProductVariantDelegateMock = {
  findFirst: jest.Mock;
  findMany: jest.Mock;
};

type CategoryDelegateMock = {
  findFirst: jest.Mock;
};

type CategoryClosureDelegateMock = {
  findMany: jest.Mock;
};

type OfferTargetDelegateMock = {
  findMany: jest.Mock;
};

type PrismaMock = {
  productVariant: ProductVariantDelegateMock;
  category: CategoryDelegateMock;
  categoryClosure: CategoryClosureDelegateMock;
  offerTarget: OfferTargetDelegateMock;
};

function decimal(value: string | number) {
  return new Prisma.Decimal(value);
}

function variantContext(categoryIds: string[] = ['moisturizers']) {
  return {
    id: 'variant_100ml',
    price: decimal('1000'),
    deletedAt: null,
    isActive: true,
    product: {
      id: 'product_a',
      deletedAt: null,
      categories: categoryIds.map((categoryId) => ({
        categoryId,
        category: {
          id: categoryId,
          deletedAt: null,
          isActive: true,
        },
      })),
    },
  };
}

function offerTarget({
  id,
  offerId,
  type,
  priority = 0,
  value = '20',
  maxDiscountAmount = null,
  createdAt = new Date('2026-01-01T00:00:00.000Z'),
  productId = null,
  categoryId = null,
  variantId = null,
  buyXGetYConfig = null,
}: {
  id: string;
  offerId: string;
  type: OfferType;
  priority?: number;
  value?: string | null;
  maxDiscountAmount?: string | null;
  createdAt?: Date;
  productId?: string | null;
  categoryId?: string | null;
  variantId?: string | null;
  buyXGetYConfig?: {
    buyQuantity: number;
    getQuantity: number;
    rewardProductId: string | null;
    rewardVariantId: string | null;
  } | null;
}) {
  return {
    id,
    productId,
    categoryId,
    variantId,
    offer: {
      id: offerId,
      name: offerId,
      type,
      value: value === null ? null : decimal(value),
      maxDiscountAmount:
        maxDiscountAmount === null ? null : decimal(maxDiscountAmount),
      priority,
      startAt: null,
      endAt: null,
      createdAt,
      buyXGetYConfig,
    },
  };
}

describe('OfferResolverService', () => {
  let service: OfferResolverService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = {
      productVariant: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
      category: {
        findFirst: jest.fn(),
      },
      categoryClosure: {
        findMany: jest.fn(),
      },
      offerTarget: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OfferResolverService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<OfferResolverService>(OfferResolverService);
    prisma.productVariant.findMany.mockResolvedValue([variantContext()]);
    prisma.category.findFirst.mockResolvedValue({
      id: 'moisturizers',
      deletedAt: null,
      isActive: true,
    });
    prisma.categoryClosure.findMany.mockResolvedValue([
      {
        ancestorId: 'moisturizers',
        descendantId: 'moisturizers',
        depth: 0,
      },
      {
        ancestorId: 'skin-care',
        descendantId: 'moisturizers',
        depth: 1,
      },
    ]);
  });

  it('prefers a variant offer over higher-priority product offers', async () => {
    prisma.offerTarget.findMany.mockResolvedValue([
      offerTarget({
        id: 'target_product',
        offerId: 'product_offer',
        type: OfferType.PERCENTAGE,
        priority: 100,
        productId: 'product_a',
      }),
      offerTarget({
        id: 'target_variant',
        offerId: 'variant_offer',
        type: OfferType.FIXED_AMOUNT,
        priority: 1,
        value: '300',
        variantId: 'variant_100ml',
      }),
    ]);

    const result = await service.resolveForVariant('variant_100ml');

    expect(result.offer?.id).toBe('variant_offer');
    expect(result.matchedBy).toEqual({
      targetType: 'VARIANT',
      targetId: 'variant_100ml',
    });
    expect(result.discountAmount.toFixed(2)).toBe('300.00');
    expect(result.finalPrice.toFixed(2)).toBe('700.00');
  });

  it('prefers product offers over category offers', async () => {
    prisma.offerTarget.findMany.mockResolvedValue([
      offerTarget({
        id: 'target_category',
        offerId: 'category_offer',
        type: OfferType.PERCENTAGE,
        priority: 100,
        categoryId: 'moisturizers',
      }),
      offerTarget({
        id: 'target_product',
        offerId: 'product_offer',
        type: OfferType.PERCENTAGE,
        value: '20',
        productId: 'product_a',
      }),
    ]);

    const result = await service.resolveForVariant('variant_100ml');

    expect(result.offer?.id).toBe('product_offer');
    expect(result.matchedBy?.targetType).toBe('PRODUCT');
  });

  it('uses nearest category inheritance before priority', async () => {
    prisma.offerTarget.findMany.mockResolvedValue([
      offerTarget({
        id: 'target_parent',
        offerId: 'parent_offer',
        type: OfferType.PERCENTAGE,
        value: '25',
        priority: 100,
        categoryId: 'skin-care',
      }),
      offerTarget({
        id: 'target_direct',
        offerId: 'direct_offer',
        type: OfferType.PERCENTAGE,
        value: '15',
        priority: 1,
        categoryId: 'moisturizers',
      }),
    ]);

    const result = await service.resolveForVariant('variant_100ml');

    expect(result.offer?.id).toBe('direct_offer');
    expect(result.matchedBy).toEqual({
      targetType: 'CATEGORY',
      targetId: 'moisturizers',
      categoryDistance: 0,
    });
  });

  it('uses priority then createdAt then id for same-specificity category offers', async () => {
    prisma.productVariant.findMany.mockResolvedValue([
      variantContext(['moisturizers', 'sensitive-skin']),
    ]);
    prisma.categoryClosure.findMany.mockResolvedValue([
      {
        ancestorId: 'moisturizers',
        descendantId: 'moisturizers',
        depth: 0,
      },
      {
        ancestorId: 'sensitive-skin',
        descendantId: 'sensitive-skin',
        depth: 0,
      },
    ]);
    prisma.offerTarget.findMany.mockResolvedValue([
      offerTarget({
        id: 'target_a',
        offerId: 'offer_a',
        type: OfferType.PERCENTAGE,
        value: '10',
        priority: 10,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        categoryId: 'moisturizers',
      }),
      offerTarget({
        id: 'target_b',
        offerId: 'offer_b',
        type: OfferType.PERCENTAGE,
        value: '20',
        priority: 20,
        createdAt: new Date('2026-01-02T00:00:00.000Z'),
        categoryId: 'sensitive-skin',
      }),
    ]);

    const priorityResult = await service.resolveForVariant('variant_100ml');
    expect(priorityResult.offer?.id).toBe('offer_b');

    prisma.offerTarget.findMany.mockResolvedValue([
      offerTarget({
        id: 'target_a',
        offerId: 'offer_a',
        type: OfferType.PERCENTAGE,
        value: '10',
        priority: 10,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        categoryId: 'moisturizers',
      }),
      offerTarget({
        id: 'target_b',
        offerId: 'offer_b',
        type: OfferType.PERCENTAGE,
        value: '20',
        priority: 10,
        createdAt: new Date('2026-01-02T00:00:00.000Z'),
        categoryId: 'sensitive-skin',
      }),
    ]);

    const newerResult = await service.resolveForVariant('variant_100ml');
    expect(newerResult.offer?.id).toBe('offer_b');

    prisma.offerTarget.findMany.mockResolvedValue([
      offerTarget({
        id: 'target_a',
        offerId: 'offer_a',
        type: OfferType.PERCENTAGE,
        value: '10',
        priority: 10,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        categoryId: 'moisturizers',
      }),
      offerTarget({
        id: 'target_b',
        offerId: 'offer_b',
        type: OfferType.PERCENTAGE,
        value: '20',
        priority: 10,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        categoryId: 'sensitive-skin',
      }),
    ]);

    const idResult = await service.resolveForVariant('variant_100ml');
    expect(idResult.offer?.id).toBe('offer_b');
  });

  it('deduplicates the same offer and keeps its most specific match', async () => {
    prisma.offerTarget.findMany.mockResolvedValue([
      offerTarget({
        id: 'target_category',
        offerId: 'same_offer',
        type: OfferType.PERCENTAGE,
        categoryId: 'moisturizers',
      }),
      offerTarget({
        id: 'target_product',
        offerId: 'same_offer',
        type: OfferType.PERCENTAGE,
        productId: 'product_a',
      }),
    ]);

    const result = await service.resolveForVariant('variant_100ml');

    expect(result.offer?.id).toBe('same_offer');
    expect(result.matchedBy?.targetType).toBe('PRODUCT');
  });

  it('calculates percentage discounts with caps using Decimal arithmetic', async () => {
    prisma.productVariant.findMany.mockResolvedValue([
      {
        ...variantContext(),
        price: decimal('10000'),
      },
    ]);
    prisma.offerTarget.findMany.mockResolvedValue([
      offerTarget({
        id: 'target_product',
        offerId: 'capped_offer',
        type: OfferType.PERCENTAGE,
        value: '20',
        maxDiscountAmount: '500',
        productId: 'product_a',
      }),
    ]);

    const result = await service.resolveForVariant('variant_100ml');

    expect(result.discountAmount.toFixed(2)).toBe('500.00');
    expect(result.finalPrice.toFixed(2)).toBe('9500.00');
  });

  it('floors fixed discounts at zero', async () => {
    prisma.offerTarget.findMany.mockResolvedValue([
      offerTarget({
        id: 'target_product',
        offerId: 'fixed_offer',
        type: OfferType.FIXED_AMOUNT,
        value: '1500',
        productId: 'product_a',
      }),
    ]);

    const result = await service.resolveForVariant('variant_100ml');

    expect(result.discountAmount.toFixed(2)).toBe('1000.00');
    expect(result.finalPrice.toFixed(2)).toBe('0.00');
  });

  it('returns BOGO metadata without changing unit price', async () => {
    prisma.offerTarget.findMany.mockResolvedValue([
      offerTarget({
        id: 'target_product',
        offerId: 'bogo_offer',
        type: OfferType.BUY_X_GET_Y,
        value: null,
        productId: 'product_a',
        buyXGetYConfig: {
          buyQuantity: 2,
          getQuantity: 1,
          rewardProductId: 'reward_product',
          rewardVariantId: null,
        },
      }),
    ]);

    const result = await service.resolveForVariant('variant_100ml');

    expect(result.hasOffer).toBe(true);
    expect(result.discountAmount.toFixed(2)).toBe('0.00');
    expect(result.finalPrice.toFixed(2)).toBe('1000.00');
    expect(result.buyXGetY).toEqual({
      buyQuantity: 2,
      getQuantity: 1,
      rewardProductId: 'reward_product',
      rewardVariantId: null,
    });
  });

  it('returns a no-offer result when no active target matches', async () => {
    prisma.offerTarget.findMany.mockResolvedValue([]);

    const result = await service.resolveForVariant('variant_100ml');

    expect(result).toMatchObject({
      hasOffer: false,
      offer: null,
      matchedBy: null,
      buyXGetY: null,
    });
    expect(result.discountAmount.toFixed(2)).toBe('0.00');
    expect(result.finalPrice.toFixed(2)).toBe('1000.00');
  });

  it('resolves multiple variants with one offer target query', async () => {
    prisma.productVariant.findMany.mockResolvedValue([
      variantContext(['moisturizers']),
      {
        ...variantContext(['cleansers']),
        id: 'variant_200ml',
        price: decimal('2000'),
      },
    ]);
    prisma.categoryClosure.findMany.mockResolvedValue([
      {
        ancestorId: 'moisturizers',
        descendantId: 'moisturizers',
        depth: 0,
      },
      {
        ancestorId: 'cleansers',
        descendantId: 'cleansers',
        depth: 0,
      },
    ]);
    prisma.offerTarget.findMany.mockResolvedValue([
      offerTarget({
        id: 'target_first',
        offerId: 'first_offer',
        type: OfferType.PERCENTAGE,
        value: '10',
        variantId: 'variant_100ml',
      }),
      offerTarget({
        id: 'target_second',
        offerId: 'second_offer',
        type: OfferType.FIXED_AMOUNT,
        value: '250',
        variantId: 'variant_200ml',
      }),
    ]);

    const results = await service.resolveForVariants([
      'variant_100ml',
      'variant_200ml',
    ]);

    expect(results.get('variant_100ml')?.finalPrice.toFixed(2)).toBe('900.00');
    expect(results.get('variant_200ml')?.finalPrice.toFixed(2)).toBe('1750.00');
    expect(prisma.productVariant.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.offerTarget.findMany).toHaveBeenCalledTimes(1);
  });

  it('resolves direct category display offers before inherited parent offers', async () => {
    prisma.categoryClosure.findMany.mockResolvedValue([
      {
        ancestorId: 'moisturizers',
        descendantId: 'moisturizers',
        depth: 0,
      },
      {
        ancestorId: 'skin-care',
        descendantId: 'moisturizers',
        depth: 1,
      },
    ]);
    prisma.offerTarget.findMany.mockResolvedValue([
      offerTarget({
        id: 'target_parent',
        offerId: 'parent_offer',
        type: OfferType.PERCENTAGE,
        value: '30',
        priority: 100,
        categoryId: 'skin-care',
      }),
      offerTarget({
        id: 'target_direct',
        offerId: 'direct_offer',
        type: OfferType.PERCENTAGE,
        value: '15',
        priority: 1,
        categoryId: 'moisturizers',
      }),
    ]);

    const result = await service.resolveForCategory('moisturizers');

    expect(result.hasOffer).toBe(true);
    expect(result.offer?.id).toBe('direct_offer');
    expect(result.matchedBy).toEqual({
      targetType: 'CATEGORY',
      targetId: 'moisturizers',
      categoryDistance: 0,
    });
  });

  it('throws when the variant does not exist', async () => {
    prisma.productVariant.findMany.mockResolvedValue([]);

    await expect(service.resolveForVariant('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
