import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../database/prisma.service';
import { ProductVariantService } from './product-variant.service';

type ProductDelegateMock = {
  findFirst: jest.Mock;
};

type ProductVariantDelegateMock = {
  create: jest.Mock;
  findUnique: jest.Mock;
  findFirst: jest.Mock;
  findMany: jest.Mock;
  update: jest.Mock;
};

describe('ProductVariantService', () => {
  let service: ProductVariantService;
  let product: ProductDelegateMock;
  let productVariant: ProductVariantDelegateMock;

  beforeEach(async () => {
    product = {
      findFirst: jest.fn(),
    };

    productVariant = {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductVariantService,
        {
          provide: PrismaService,
          useValue: {
            product,
            productVariant,
          },
        },
      ],
    }).compile();

    service = module.get<ProductVariantService>(ProductVariantService);
  });

  it('creates a variant for an active product and normalizes SKU', async () => {
    const expectedVariant = {
      id: 'variant_1',
      productId: 'product_1',
      sku: 'CLEANSER-100ML',
    };

    product.findFirst.mockResolvedValue({
      id: 'product_1',
    });
    productVariant.create.mockResolvedValue(expectedVariant);

    await expect(
      service.create('product_1', {
        sku: ' cleanser-100ml ',
        price: 24.99,
      }),
    ).resolves.toBe(expectedVariant);

    expect(product.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'product_1',
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });
    expect(productVariant.create).toHaveBeenCalledWith({
      data: {
        productId: 'product_1',
        sku: 'CLEANSER-100ML',
        price: 24.99,
        compareAtPrice: null,
        stockQuantity: 0,
        isActive: true,
      },
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
    });
  });

  it('does not create a variant when product is missing', async () => {
    product.findFirst.mockResolvedValue(null);

    await expect(
      service.create('missing_product', {
        sku: 'SKU-1',
        price: 10,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(productVariant.create).not.toHaveBeenCalled();
  });

  it('converts duplicate SKU errors into conflict responses', async () => {
    product.findFirst.mockResolvedValue({
      id: 'product_1',
    });
    productVariant.create.mockRejectedValue({
      code: 'P2002',
    });

    await expect(
      service.create('product_1', {
        sku: 'SKU-1',
        price: 10,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('checks SKU availability', async () => {
    productVariant.findUnique.mockResolvedValue({
      id: 'variant_1',
      sku: 'CLEANSER-100ML',
      productId: 'product_1',
      deletedAt: null,
    });

    await expect(
      service.checkSkuAvailability(' cleanser-100ml '),
    ).resolves.toEqual({
      sku: 'CLEANSER-100ML',
      available: false,
      variant: {
        id: 'variant_1',
        sku: 'CLEANSER-100ML',
        productId: 'product_1',
        deletedAt: null,
      },
    });

    expect(productVariant.findUnique).toHaveBeenCalledWith({
      where: {
        sku: 'CLEANSER-100ML',
      },
      select: {
        id: true,
        sku: true,
        productId: true,
        deletedAt: true,
      },
    });
  });

  it('fetches variants with attribute values', async () => {
    const expectedVariants = [
      {
        id: 'variant_1',
        attributeValues: [],
      },
    ];

    product.findFirst.mockResolvedValue({
      id: 'product_1',
    });
    productVariant.findMany.mockResolvedValue(expectedVariants);

    await expect(service.findByProduct('product_1')).resolves.toBe(
      expectedVariants,
    );

    expect(productVariant.findMany).toHaveBeenCalledWith({
      where: {
        productId: 'product_1',
        deletedAt: null,
      },
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
      orderBy: {
        createdAt: 'desc',
      },
    });
  });

  it('soft deletes a variant and disables it', async () => {
    const expectedVariant = {
      id: 'variant_1',
      deletedAt: new Date(),
      isActive: false,
    };

    productVariant.findFirst.mockResolvedValue({
      id: 'variant_1',
      productId: 'product_1',
    });
    productVariant.update.mockResolvedValue(expectedVariant);

    await expect(service.softDelete('product_1', 'variant_1')).resolves.toBe(
      expectedVariant,
    );

    expect(productVariant.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'variant_1',
        productId: 'product_1',
        deletedAt: null,
      },
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
    });
    expect(productVariant.update).toHaveBeenCalledWith({
      where: {
        id: 'variant_1',
      },
      data: {
        deletedAt: expect.any(Date) as Date,
        isActive: false,
      },
    });
  });
});
