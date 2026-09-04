import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { ProductStatus } from '../../generated/prisma/enums.cjs';
import { PrismaService } from '../database/prisma.service';
import { OfferResolverService } from '../offer/services/offer-resolver.service';
import { ProductMetadataService } from './product-metadata.service';
import { ProductService } from './product.service';

type ProductDelegateMock = {
  create: jest.Mock;
  findUnique: jest.Mock;
  findFirst: jest.Mock;
  findMany: jest.Mock;
  update: jest.Mock;
};

type ProductVariantDelegateMock = {
  updateMany: jest.Mock;
};

describe('ProductService', () => {
  let service: ProductService;
  let product: ProductDelegateMock;
  let productVariant: ProductVariantDelegateMock;

  beforeEach(async () => {
    product = {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    };
    productVariant = {
      updateMany: jest.fn(),
    };

    const runTransaction = <T>(
      callback: (tx: {
        product: ProductDelegateMock;
        productVariant: ProductVariantDelegateMock;
      }) => T,
    ) =>
      callback({
        product,
        productVariant,
      });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductService,
        {
          provide: PrismaService,
          useValue: {
            product,
            productVariant,
            $queryRawUnsafe: jest.fn().mockResolvedValue([]),
            $transaction: jest.fn(runTransaction),
          },
        },
        {
          provide: ProductMetadataService,
          useValue: {
            findAllMetadataOptions: jest.fn(),
          },
        },
        {
          provide: OfferResolverService,
          useValue: {
            resolveForVariants: jest.fn().mockResolvedValue(new Map()),
          },
        },
      ],
    }).compile();

    service = module.get<ProductService>(ProductService);
  });

  it('fetches public product detail with only active variants', async () => {
    const expectedProduct = {
      id: 'product_1',
      slug: 'daily-cleanser',
      variants: [],
    };

    product.findFirst.mockResolvedValue(expectedProduct);

    await expect(
      service.findPublicProductBySlug('daily-cleanser'),
    ).resolves.toEqual({
      ...expectedProduct,
      images: [],
      averageRating: 0,
      reviewCount: 0,
      hasOffer: false,
      effectiveOffer: null,
      displayPrice: null,
      displayPricing: null,
    });

    expect(product.findFirst).toHaveBeenCalledWith({
      where: {
        slug: 'daily-cleanser',
        deletedAt: null,
        status: ProductStatus.PUBLISHED,
      },
      include: getExpectedProductInclude(true),
    });
  });

  it('fetches admin product detail with non-deleted variants', async () => {
    const expectedProduct = {
      id: 'product_1',
      variants: [],
    };

    product.findFirst.mockResolvedValue(expectedProduct);

    await expect(service.findAdminProductById('product_1')).resolves.toEqual({
      ...expectedProduct,
      images: [],
    });

    expect(product.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'product_1',
        deletedAt: null,
      },
      include: getExpectedProductInclude(false),
    });
  });

  it('throws when public product detail is missing', async () => {
    product.findFirst.mockResolvedValue(null);

    await expect(
      service.findPublicProductBySlug('missing-product'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('checks product slug availability', async () => {
    product.findUnique.mockResolvedValue({
      id: 'product_1',
      name: 'Daily Cleanser',
      deletedAt: null,
    });

    await expect(
      service.checkSlugAvailability(' Daily-Cleanser '),
    ).resolves.toEqual({
      slug: 'daily-cleanser',
      available: false,
      product: {
        id: 'product_1',
        name: 'Daily Cleanser',
        deletedAt: null,
      },
    });

    expect(product.findUnique).toHaveBeenCalledWith({
      where: {
        slug: 'daily-cleanser',
      },
      select: {
        id: true,
        name: true,
        deletedAt: true,
      },
    });
  });

  it('archives product variants when product is archived', async () => {
    product.findFirst.mockResolvedValue({
      id: 'product_1',
      variants: [],
    });
    product.update.mockResolvedValue({
      id: 'product_1',
      status: ProductStatus.ARCHIVED,
    });

    await service.updateStatus('product_1', {
      status: ProductStatus.ARCHIVED,
    });

    expect(productVariant.updateMany).toHaveBeenCalledWith({
      where: {
        productId: 'product_1',
        deletedAt: null,
      },
      data: {
        isActive: false,
      },
    });
  });
});

function getExpectedProductInclude(onlyActiveVariants: boolean) {
  return {
    categories: {
      include: {
        category: true,
      },
      orderBy: [
        {
          isPrimary: 'desc',
        },
        {
          sortOrder: 'asc',
        },
      ],
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
    variants: {
      where: {
        deletedAt: null,
        ...(onlyActiveVariants && {
          isActive: true,
        }),
      },
      ...(onlyActiveVariants && {
        include: {
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
      }),
      orderBy: {
        createdAt: 'desc',
      },
    },
    ingredients: {
      include: {
        ingredient: true,
      },
      orderBy: {
        sortOrder: 'asc',
      },
    },
    audiences: {
      include: {
        audience: true,
      },
    },
    skinTypes: {
      include: {
        skinType: true,
      },
    },
    ageGroups: {
      include: {
        ageGroup: true,
      },
    },
    hairProfiles: {
      include: {
        hairProfile: true,
      },
    },
    concerns: {
      include: {
        concern: true,
      },
    },
    productBenefits: {
      include: {
        benefit: true,
      },
    },
    tags: {
      include: {
        tag: true,
      },
    },
    ...(onlyActiveVariants && {
      reviews: {
        where: {
          deletedAt: null,
          status: 'APPROVED',
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      },
    }),
  };
}
