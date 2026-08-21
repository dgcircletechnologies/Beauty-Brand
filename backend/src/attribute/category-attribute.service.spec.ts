import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../database/prisma.service';
import { CategoryAttributeService } from './category-attribute.service';

describe('CategoryAttributeService', () => {
  let service: CategoryAttributeService;
  const category = {
    findFirst: jest.fn(),
  };
  const attributeDefinition = {
    findFirst: jest.fn(),
  };
  const categoryAttribute = {
    delete: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    upsert: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoryAttributeService,
        {
          provide: PrismaService,
          useValue: {
            category,
            attributeDefinition,
            categoryAttribute,
          },
        },
      ],
    }).compile();

    service = module.get<CategoryAttributeService>(CategoryAttributeService);
  });

  it('assigns an attribute definition to a category', async () => {
    const expectedAssignment = {
      categoryId: 'category_1',
      attributeDefinitionId: 'attribute_1',
    };

    category.findFirst.mockResolvedValue({
      id: 'category_1',
    });
    attributeDefinition.findFirst.mockResolvedValue({
      id: 'attribute_1',
    });
    categoryAttribute.upsert.mockResolvedValue(expectedAssignment);

    await expect(
      service.assign('category_1', {
        attributeDefinitionId: 'attribute_1',
        isRequired: true,
        isVariantAttribute: true,
        sortOrder: 2,
      }),
    ).resolves.toBe(expectedAssignment);

    expect(categoryAttribute.upsert).toHaveBeenCalledWith({
      where: {
        categoryId_attributeDefinitionId: {
          categoryId: 'category_1',
          attributeDefinitionId: 'attribute_1',
        },
      },
      create: {
        categoryId: 'category_1',
        attributeDefinitionId: 'attribute_1',
        isRequired: true,
        isVariantAttribute: true,
        sortOrder: 2,
      },
      update: {
        isRequired: true,
        isVariantAttribute: true,
        sortOrder: 2,
      },
      include: {
        attributeDefinition: {
          include: {
            attributeOptions: {
              where: {
                deletedAt: null,
              },
              orderBy: {
                sortOrder: 'asc',
              },
            },
          },
        },
      },
    });
  });

  it('rejects missing categories', async () => {
    category.findFirst.mockResolvedValue(null);

    await expect(
      service.assign('missing_category', {
        attributeDefinitionId: 'attribute_1',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
