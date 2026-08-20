import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../database/prisma.service';
import { ProductCategoryService } from './product-category.service';

describe('ProductCategoryService', () => {
  let service: ProductCategoryService;
  const product = {
    findFirst: jest.fn(),
  };
  const category = {
    findFirst: jest.fn(),
  };
  const productCategory = {
    delete: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    upsert: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const runTransaction = <T>(
      callback: (tx: { productCategory: typeof productCategory }) => T,
    ) =>
      callback({
        productCategory,
      });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductCategoryService,
        {
          provide: PrismaService,
          useValue: {
            product,
            category,
            productCategory,
            $transaction: jest.fn(runTransaction),
          },
        },
      ],
    }).compile();

    service = module.get<ProductCategoryService>(ProductCategoryService);
  });

  it('assigns a category to a product and clears old primary when needed', async () => {
    const expectedAssignment = {
      productId: 'product_1',
      categoryId: 'category_1',
      isPrimary: true,
    };

    product.findFirst.mockResolvedValue({
      id: 'product_1',
    });
    category.findFirst.mockResolvedValue({
      id: 'category_1',
    });
    productCategory.upsert.mockResolvedValue(expectedAssignment);

    await expect(
      service.assign('product_1', {
        categoryId: 'category_1',
        isPrimary: true,
        sortOrder: 2,
      }),
    ).resolves.toBe(expectedAssignment);

    expect(productCategory.updateMany).toHaveBeenCalledWith({
      where: {
        productId: 'product_1',
        isPrimary: true,
      },
      data: {
        isPrimary: false,
      },
    });
    expect(productCategory.upsert).toHaveBeenCalledWith({
      where: {
        productId_categoryId: {
          productId: 'product_1',
          categoryId: 'category_1',
        },
      },
      create: {
        productId: 'product_1',
        categoryId: 'category_1',
        isPrimary: true,
        sortOrder: 2,
      },
      update: {
        isPrimary: true,
        sortOrder: 2,
      },
      include: {
        category: true,
      },
    });
  });
});
