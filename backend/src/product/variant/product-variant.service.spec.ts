import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../database/prisma.service';
import { ProductVariantService } from './product-variant.service';

type ProductDelegateMock = {
  findFirst: jest.Mock;
};

type ProductVariantDelegateMock = {
  create: jest.Mock;
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
