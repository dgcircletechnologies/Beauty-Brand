import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../database/prisma.service';
import { OfferResolverService } from '../offer/services/offer-resolver.service';
import { CategoryService } from './category.service';

type CategoryDelegateMock = {
  create: jest.Mock;
  delete: jest.Mock;
  findUnique: jest.Mock;
  findFirst: jest.Mock;
  findMany: jest.Mock;
  update: jest.Mock;
};

type CategoryClosureDelegateMock = {
  create: jest.Mock;
  createMany: jest.Mock;
  deleteMany: jest.Mock;
  findUnique: jest.Mock;
  findMany: jest.Mock;
};

type ProductDelegateMock = {
  findMany: jest.Mock;
};

type OfferResolverMock = {
  resolveForCategory: jest.Mock;
  resolveForVariants: jest.Mock;
};

type CategoryTransactionMock = {
  category: CategoryDelegateMock;
  categoryClosure: CategoryClosureDelegateMock;
};

const categoryImagesInclude = {
  images: {
    where: {
      deletedAt: null,
    },
    orderBy: [
      {
        sortOrder: 'asc',
      },
      {
        createdAt: 'asc',
      },
    ],
  },
};

const categoryProductInclude = {
  images: {
    where: {
      deletedAt: null,
      variantId: null,
    },
    orderBy: [
      {
        isPrimary: 'desc',
      },
      {
        sortOrder: 'asc',
      },
      {
        createdAt: 'asc',
      },
    ],
  },
  variants: {
    where: {
      deletedAt: null,
      isActive: true,
    },
    orderBy: {
      createdAt: 'asc',
    },
  },
};

describe('CategoryService', () => {
  let service: CategoryService;
  let category: CategoryDelegateMock;
  let categoryClosure: CategoryClosureDelegateMock;
  let product: ProductDelegateMock;
  let offerResolver: OfferResolverMock;

  beforeEach(async () => {
    category = {
      create: jest.fn(),
      delete: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn(),
    };
    categoryClosure = {
      create: jest.fn(),
      createMany: jest.fn(),
      deleteMany: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    };
    product = {
      findMany: jest.fn(),
    };
    offerResolver = {
      resolveForCategory: jest.fn().mockResolvedValue({
        hasOffer: false,
        offer: null,
        matchedBy: null,
        buyXGetY: null,
      }),
      resolveForVariants: jest.fn().mockResolvedValue(new Map()),
    };

    const runTransaction = <T>(callback: (tx: CategoryTransactionMock) => T) =>
      callback({
        category,
        categoryClosure,
      });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoryService,
        {
          provide: PrismaService,
          useValue: {
            category,
            categoryClosure,
            product,
            $transaction: jest.fn(runTransaction),
          },
        },
        {
          provide: OfferResolverService,
          useValue: offerResolver,
        },
      ],
    }).compile();

    service = module.get<CategoryService>(CategoryService);
  });

  it('creates a root category with a self closure row', async () => {
    const expectedCategory = {
      id: 'category_1',
      slug: 'skin-care',
    };

    category.create.mockResolvedValue(expectedCategory);

    await expect(
      service.create({
        name: ' Skin Care ',
        slug: 'skin-care',
      }),
    ).resolves.toBe(expectedCategory);

    expect(category.create).toHaveBeenCalledWith({
      data: {
        name: 'Skin Care',
        slug: 'skin-care',
        description: null,
        parentId: null,
        isActive: true,
      },
      include: categoryImagesInclude,
    });
    expect(categoryClosure.create).toHaveBeenCalledWith({
      data: {
        ancestorId: 'category_1',
        descendantId: 'category_1',
        depth: 0,
      },
    });
    expect(categoryClosure.createMany).not.toHaveBeenCalled();
  });

  it('creates parent closure rows for child categories', async () => {
    category.findFirst.mockResolvedValue({
      id: 'parent_1',
    });
    category.create.mockResolvedValue({
      id: 'child_1',
      slug: 'cleansers',
    });
    categoryClosure.findMany.mockResolvedValue([
      {
        ancestorId: 'parent_1',
        descendantId: 'parent_1',
        depth: 0,
      },
      {
        ancestorId: 'root_1',
        descendantId: 'parent_1',
        depth: 1,
      },
    ]);

    await service.create({
      name: 'Cleansers',
      slug: 'cleansers',
      parentId: 'parent_1',
    });

    expect(categoryClosure.createMany).toHaveBeenCalledWith({
      data: [
        {
          ancestorId: 'parent_1',
          descendantId: 'child_1',
          depth: 1,
        },
        {
          ancestorId: 'root_1',
          descendantId: 'child_1',
          depth: 2,
        },
      ],
    });
  });

  it('fetches admin categories without parent or children relations', async () => {
    const expectedCategories = [
      {
        id: 'category_1',
        name: 'Skin Care',
      },
    ];

    category.findMany.mockResolvedValue(expectedCategories);

    await expect(service.findAll()).resolves.toBe(expectedCategories);

    expect(category.findMany).toHaveBeenCalledWith({
      where: {
        deletedAt: null,
      },
      include: categoryImagesInclude,
      orderBy: {
        name: 'asc',
      },
    });
  });

  it('checks category slug availability', async () => {
    category.findUnique.mockResolvedValue({
      id: 'category_1',
      name: 'Skin Care',
      deletedAt: null,
    });

    await expect(service.checkSlugAvailability(' Skin-Care ')).resolves.toEqual(
      {
        slug: 'skin-care',
        available: false,
        category: {
          id: 'category_1',
          name: 'Skin Care',
          deletedAt: null,
        },
      },
    );

    expect(category.findUnique).toHaveBeenCalledWith({
      where: {
        slug: 'skin-care',
      },
      select: {
        id: true,
        name: true,
        deletedAt: true,
      },
    });
  });

  it('fetches public categories without parent or children relations', async () => {
    const expectedCategories = [
      {
        id: 'child_1',
        name: 'Cleansers',
        slug: 'cleansers',
        description: null,
        parentId: 'root_1',
      },
      {
        id: 'root_1',
        name: 'Skin Care',
        slug: 'skin-care',
        description: null,
        parentId: null,
      },
    ];

    category.findMany.mockResolvedValue(expectedCategories);

    await expect(service.findPublicCategories()).resolves.toBe(
      expectedCategories,
    );

    expect(category.findMany).toHaveBeenCalledWith({
      where: {
        deletedAt: null,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        parentId: true,
        images: categoryImagesInclude.images,
      },
      orderBy: {
        name: 'asc',
      },
    });
  });

  it('fetches published products for a category and descendants', async () => {
    const expectedProducts = [
      {
        id: 'product_1',
        name: 'Daily Cleanser',
      },
    ];

    category.findFirst.mockResolvedValue({
      id: 'category_1',
    });
    categoryClosure.findMany.mockResolvedValue([
      {
        descendantId: 'category_1',
      },
      {
        descendantId: 'child_category_1',
      },
    ]);
    product.findMany.mockResolvedValue(expectedProducts);

    await expect(
      service.findPublicProductsBySlug('skin-care'),
    ).resolves.toEqual([
      {
        ...expectedProducts[0],
        variants: [],
      },
    ]);

    expect(category.findFirst).toHaveBeenCalledWith({
      where: {
        slug: 'skin-care',
        deletedAt: null,
        isActive: true,
      },
      select: {
        id: true,
      },
    });
    expect(categoryClosure.findMany).toHaveBeenCalledWith({
      where: {
        ancestorId: 'category_1',
      },
      select: {
        descendantId: true,
      },
    });
    expect(category.findMany).toHaveBeenCalledWith({
      where: {
        deletedAt: null,
        isActive: true,
      },
      select: {
        id: true,
        parentId: true,
      },
    });
    expect(product.findMany).toHaveBeenCalledWith({
      where: {
        deletedAt: null,
        status: 'PUBLISHED',
        categories: {
          some: {
            categoryId: {
              in: ['category_1', 'child_category_1'],
            },
            category: {
              deletedAt: null,
              isActive: true,
            },
          },
        },
      },
      include: categoryProductInclude,
      orderBy: [
        {
          isFeatured: 'desc',
        },
        {
          publishedAt: 'desc',
        },
        {
          createdAt: 'desc',
        },
      ],
    });
  });

  it('includes products on public category detail', async () => {
    const expectedCategory = {
      id: 'category_1',
      slug: 'skin-care',
      children: [],
    };
    const expectedProducts = [
      {
        id: 'product_1',
      },
    ];

    category.findFirst.mockResolvedValue(expectedCategory);
    categoryClosure.findMany.mockResolvedValue([
      {
        descendantId: 'category_1',
      },
    ]);
    product.findMany.mockResolvedValue(expectedProducts);

    await expect(service.findPublicBySlug('skin-care')).resolves.toEqual({
      ...expectedCategory,
      offer: {
        hasOffer: false,
        offer: null,
        buyXGetY: null,
      },
      products: [
        {
          ...expectedProducts[0],
          variants: [],
        },
      ],
    });

    expect(category.findFirst).toHaveBeenCalledWith({
      where: {
        slug: 'skin-care',
        deletedAt: null,
        isActive: true,
      },
      include: {
        images: categoryImagesInclude.images,
        parent: true,
        children: {
          where: {
            deletedAt: null,
            isActive: true,
          },
          orderBy: {
            name: 'asc',
          },
        },
      },
    });
  });

  it('falls back to the current category when closure rows are missing', async () => {
    category.findFirst.mockResolvedValue({
      id: 'category_1',
    });
    categoryClosure.findMany.mockResolvedValue([]);
    product.findMany.mockResolvedValue([]);

    await service.findPublicProductsBySlug('skin-care');

    expect(product.findMany).toHaveBeenCalledWith({
      where: {
        deletedAt: null,
        status: 'PUBLISHED',
        categories: {
          some: {
            categoryId: {
              in: ['category_1'],
            },
            category: {
              deletedAt: null,
              isActive: true,
            },
          },
        },
      },
      include: categoryProductInclude,
      orderBy: [
        {
          isFeatured: 'desc',
        },
        {
          publishedAt: 'desc',
        },
        {
          createdAt: 'desc',
        },
      ],
    });
  });

  it('finds descendant category products through parentId when closure rows are missing', async () => {
    category.findFirst.mockResolvedValue({
      id: 'parent_category_1',
    });
    categoryClosure.findMany.mockResolvedValue([]);
    category.findMany.mockResolvedValue([
      {
        id: 'parent_category_1',
        parentId: null,
      },
      {
        id: 'shampoo_category_1',
        parentId: 'parent_category_1',
      },
    ]);
    product.findMany.mockResolvedValue([]);

    await service.findPublicProductsBySlug('hair-care');

    expect(product.findMany).toHaveBeenCalledWith({
      where: {
        deletedAt: null,
        status: 'PUBLISHED',
        categories: {
          some: {
            categoryId: {
              in: ['parent_category_1', 'shampoo_category_1'],
            },
            category: {
              deletedAt: null,
              isActive: true,
            },
          },
        },
      },
      include: categoryProductInclude,
      orderBy: [
        {
          isFeatured: 'desc',
        },
        {
          publishedAt: 'desc',
        },
        {
          createdAt: 'desc',
        },
      ],
    });
  });

  it('updates category parent and rebuilds external closure links', async () => {
    category.findFirst
      .mockResolvedValueOnce({
        id: 'category_1',
      })
      .mockResolvedValueOnce({
        id: 'new_parent_1',
      });
    categoryClosure.findUnique.mockResolvedValue(null);
    categoryClosure.findMany
      .mockResolvedValueOnce([
        {
          ancestorId: 'category_1',
          descendantId: 'category_1',
          depth: 0,
        },
        {
          ancestorId: 'category_1',
          descendantId: 'child_1',
          depth: 1,
        },
      ])
      .mockResolvedValueOnce([
        {
          ancestorId: 'new_parent_1',
          descendantId: 'new_parent_1',
          depth: 0,
        },
        {
          ancestorId: 'root_1',
          descendantId: 'new_parent_1',
          depth: 1,
        },
      ]);
    category.update
      .mockResolvedValueOnce({
        id: 'category_1',
        parentId: 'new_parent_1',
      })
      .mockResolvedValueOnce({
        id: 'category_1',
        name: 'Cleansers',
        parentId: 'new_parent_1',
      });

    await expect(
      service.update('category_1', {
        name: 'Cleansers',
        parentId: 'new_parent_1',
      }),
    ).resolves.toEqual({
      id: 'category_1',
      name: 'Cleansers',
      parentId: 'new_parent_1',
    });

    expect(category.update).toHaveBeenNthCalledWith(1, {
      where: {
        id: 'category_1',
      },
      data: {
        parentId: 'new_parent_1',
      },
    });
    expect(categoryClosure.deleteMany).toHaveBeenCalledWith({
      where: {
        descendantId: {
          in: ['category_1', 'child_1'],
        },
        ancestorId: {
          notIn: ['category_1', 'child_1'],
        },
      },
    });
    expect(categoryClosure.createMany).toHaveBeenCalledWith({
      data: [
        {
          ancestorId: 'new_parent_1',
          descendantId: 'category_1',
          depth: 1,
        },
        {
          ancestorId: 'new_parent_1',
          descendantId: 'child_1',
          depth: 2,
        },
        {
          ancestorId: 'root_1',
          descendantId: 'category_1',
          depth: 2,
        },
        {
          ancestorId: 'root_1',
          descendantId: 'child_1',
          depth: 3,
        },
      ],
      skipDuplicates: true,
    });
    expect(category.update).toHaveBeenNthCalledWith(2, {
      where: {
        id: 'category_1',
      },
      data: {
        name: 'Cleansers',
      },
      include: categoryImagesInclude,
    });
  });

  it('clears category parent when parentId is null', async () => {
    category.findFirst.mockResolvedValue({
      id: 'category_1',
    });
    categoryClosure.findMany.mockResolvedValue([
      {
        ancestorId: 'category_1',
        descendantId: 'category_1',
        depth: 0,
      },
    ]);
    category.update.mockResolvedValue({
      id: 'category_1',
      parentId: null,
    });

    await service.update('category_1', {
      parentId: null,
    });

    expect(category.update).toHaveBeenNthCalledWith(1, {
      where: {
        id: 'category_1',
      },
      data: {
        parentId: null,
      },
    });
    expect(categoryClosure.createMany).not.toHaveBeenCalled();
  });

  it('blocks deleting a category with children', async () => {
    category.findFirst.mockResolvedValue({
      id: 'category_1',
      parentId: null,
      children: [
        {
          id: 'child_1',
        },
      ],
    });

    await expect(service.delete('category_1')).rejects.toThrow(
      'Remove child categories before deleting this category',
    );
    expect(category.delete).not.toHaveBeenCalled();
    expect(category.update).not.toHaveBeenCalled();
  });

  it('blocks deleting a child category until its parent is removed', async () => {
    category.findFirst.mockResolvedValue({
      id: 'category_1',
      parentId: 'parent_1',
      children: [],
    });

    await expect(service.delete('category_1')).rejects.toThrow(
      'Remove the parent category before deleting this category',
    );
    expect(category.delete).not.toHaveBeenCalled();
    expect(category.update).not.toHaveBeenCalled();
  });

  it('hard deletes a root category without child categories', async () => {
    const deletedCategory = {
      id: 'category_1',
      parentId: null,
      children: [],
    };

    category.findFirst.mockResolvedValue(deletedCategory);
    category.delete.mockResolvedValue(deletedCategory);

    await expect(service.delete('category_1')).resolves.toBe(deletedCategory);

    expect(category.delete).toHaveBeenCalledWith({
      where: {
        id: 'category_1',
      },
    });
  });
});
