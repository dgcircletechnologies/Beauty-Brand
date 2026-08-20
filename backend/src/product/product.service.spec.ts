import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { ProductStatus } from '../../generated/prisma/enums.cjs';
import { PrismaService } from '../database/prisma.service';
import { ProductService } from './product.service';

type ProductDelegateMock = {
  create: jest.Mock;
  findFirst: jest.Mock;
  findMany: jest.Mock;
  update: jest.Mock;
};

describe('ProductService', () => {
  let service: ProductService;
  let product: ProductDelegateMock;

  beforeEach(async () => {
    product = {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductService,
        {
          provide: PrismaService,
          useValue: {
            product,
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
    ).resolves.toBe(expectedProduct);

    expect(product.findFirst).toHaveBeenCalledWith({
      where: {
        slug: 'daily-cleanser',
        deletedAt: null,
        status: ProductStatus.PUBLISHED,
      },
      include: {
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
        variants: {
          where: {
            deletedAt: null,
            isActive: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });
  });

  it('fetches admin product detail with non-deleted variants', async () => {
    const expectedProduct = {
      id: 'product_1',
      variants: [],
    };

    product.findFirst.mockResolvedValue(expectedProduct);

    await expect(service.findAdminProductById('product_1')).resolves.toBe(
      expectedProduct,
    );

    expect(product.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'product_1',
        deletedAt: null,
      },
      include: {
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
        variants: {
          where: {
            deletedAt: null,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });
  });

  it('throws when public product detail is missing', async () => {
    product.findFirst.mockResolvedValue(null);

    await expect(
      service.findPublicProductBySlug('missing-product'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
