import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../database/prisma.service';
import { AssignCategoryAttributeDto } from './dto/assign-category-attribute.dto';
import { UpdateCategoryAttributeDto } from './dto/update-category-attribute.dto';

@Injectable()
export class CategoryAttributeService {
  constructor(private readonly prisma: PrismaService) {}

  async assign(categoryId: string, dto: AssignCategoryAttributeDto) {
    await this.ensureActiveCategoryExists(categoryId);
    await this.ensureActiveAttributeExists(dto.attributeDefinitionId);

    return this.prisma.categoryAttribute.upsert({
      where: {
        categoryId_attributeDefinitionId: {
          categoryId,
          attributeDefinitionId: dto.attributeDefinitionId,
        },
      },
      create: {
        categoryId,
        attributeDefinitionId: dto.attributeDefinitionId,
        isRequired: dto.isRequired ?? false,
        isVariantAttribute: dto.isVariantAttribute ?? false,
        sortOrder: dto.sortOrder ?? 0,
      },
      update: {
        ...(dto.isRequired !== undefined && {
          isRequired: dto.isRequired,
        }),
        ...(dto.isVariantAttribute !== undefined && {
          isVariantAttribute: dto.isVariantAttribute,
        }),
        ...(dto.sortOrder !== undefined && {
          sortOrder: dto.sortOrder,
        }),
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
  }

  async findByCategory(categoryId: string) {
    await this.ensureActiveCategoryExists(categoryId);

    return this.prisma.categoryAttribute.findMany({
      where: {
        categoryId,
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
      orderBy: {
        sortOrder: 'asc',
      },
    });
  }

  async update(
    categoryId: string,
    attributeDefinitionId: string,
    dto: UpdateCategoryAttributeDto,
  ) {
    await this.ensureCategoryAttributeExists(categoryId, attributeDefinitionId);

    return this.prisma.categoryAttribute.update({
      where: {
        categoryId_attributeDefinitionId: {
          categoryId,
          attributeDefinitionId,
        },
      },
      data: {
        ...(dto.isRequired !== undefined && {
          isRequired: dto.isRequired,
        }),
        ...(dto.isVariantAttribute !== undefined && {
          isVariantAttribute: dto.isVariantAttribute,
        }),
        ...(dto.sortOrder !== undefined && {
          sortOrder: dto.sortOrder,
        }),
      },
      include: {
        attributeDefinition: true,
      },
    });
  }

  async remove(categoryId: string, attributeDefinitionId: string) {
    await this.ensureCategoryAttributeExists(categoryId, attributeDefinitionId);

    return this.prisma.categoryAttribute.delete({
      where: {
        categoryId_attributeDefinitionId: {
          categoryId,
          attributeDefinitionId,
        },
      },
    });
  }

  private async ensureActiveCategoryExists(categoryId: string) {
    const category = await this.prisma.category.findFirst({
      where: {
        id: categoryId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }
  }

  private async ensureActiveAttributeExists(attributeDefinitionId: string) {
    const attribute = await this.prisma.attributeDefinition.findFirst({
      where: {
        id: attributeDefinitionId,
        deletedAt: null,
        isActive: true,
      },
      select: {
        id: true,
      },
    });

    if (!attribute) {
      throw new NotFoundException('Attribute definition not found');
    }
  }

  private async ensureCategoryAttributeExists(
    categoryId: string,
    attributeDefinitionId: string,
  ) {
    const categoryAttribute = await this.prisma.categoryAttribute.findUnique({
      where: {
        categoryId_attributeDefinitionId: {
          categoryId,
          attributeDefinitionId,
        },
      },
    });

    if (!categoryAttribute) {
      throw new NotFoundException('Category attribute not found');
    }
  }
}
