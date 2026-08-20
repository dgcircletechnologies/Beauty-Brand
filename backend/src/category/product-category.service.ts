import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../database/prisma.service';
import { AssignProductCategoryDto } from './dto/assign-product-category.dto';
import { UpdateProductCategoryDto } from './dto/update-product-category.dto';

@Injectable()
export class ProductCategoryService {
  constructor(private readonly prisma: PrismaService) {}

  async assign(productId: string, dto: AssignProductCategoryDto) {
    await this.ensureActiveProductExists(productId);
    await this.ensureActiveCategoryExists(dto.categoryId);

    return this.prisma.$transaction(async (tx) => {
      if (dto.isPrimary) {
        await tx.productCategory.updateMany({
          where: {
            productId,
            isPrimary: true,
          },
          data: {
            isPrimary: false,
          },
        });
      }

      return tx.productCategory.upsert({
        where: {
          productId_categoryId: {
            productId,
            categoryId: dto.categoryId,
          },
        },
        create: {
          productId,
          categoryId: dto.categoryId,
          isPrimary: dto.isPrimary ?? false,
          sortOrder: dto.sortOrder ?? 0,
        },
        update: {
          ...(dto.isPrimary !== undefined && {
            isPrimary: dto.isPrimary,
          }),
          ...(dto.sortOrder !== undefined && {
            sortOrder: dto.sortOrder,
          }),
        },
        include: {
          category: true,
        },
      });
    });
  }

  async findByProduct(productId: string) {
    await this.ensureActiveProductExists(productId);

    return this.prisma.productCategory.findMany({
      where: {
        productId,
      },
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
        {
          createdAt: 'desc',
        },
      ],
    });
  }

  async update(
    productId: string,
    categoryId: string,
    dto: UpdateProductCategoryDto,
  ) {
    await this.ensureActiveProductCategoryExists(productId, categoryId);

    return this.prisma.$transaction(async (tx) => {
      if (dto.isPrimary) {
        await tx.productCategory.updateMany({
          where: {
            productId,
            isPrimary: true,
          },
          data: {
            isPrimary: false,
          },
        });
      }

      return tx.productCategory.update({
        where: {
          productId_categoryId: {
            productId,
            categoryId,
          },
        },
        data: {
          ...(dto.isPrimary !== undefined && {
            isPrimary: dto.isPrimary,
          }),
          ...(dto.sortOrder !== undefined && {
            sortOrder: dto.sortOrder,
          }),
        },
        include: {
          category: true,
        },
      });
    });
  }

  async remove(productId: string, categoryId: string) {
    await this.ensureActiveProductCategoryExists(productId, categoryId);

    return this.prisma.productCategory.delete({
      where: {
        productId_categoryId: {
          productId,
          categoryId,
        },
      },
    });
  }

  private async ensureActiveProductExists(productId: string) {
    const product = await this.prisma.product.findFirst({
      where: {
        id: productId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }
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

  private async ensureActiveProductCategoryExists(
    productId: string,
    categoryId: string,
  ) {
    const productCategory = await this.prisma.productCategory.findUnique({
      where: {
        productId_categoryId: {
          productId,
          categoryId,
        },
      },
    });

    if (!productCategory) {
      throw new NotFoundException('Product category assignment not found');
    }
  }
}
