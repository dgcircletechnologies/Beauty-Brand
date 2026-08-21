import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { ProductStatus } from '../../generated/prisma/enums.cjs';
import { PrismaService } from '../database/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductStatusDto } from './dto/update-product-status.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateProductDto) {
    return this.prisma.product
      .create({
        data: {
          name: dto.name.trim(),
          slug: this.normalizeSlug(dto.slug),
          shortDescription: this.nullableTrim(dto.shortDescription),
          description: this.nullableTrim(dto.description),
          usageInstructions: this.nullableTrim(dto.usageInstructions),
          warnings: this.nullableTrim(dto.warnings),
          status: dto.status ?? ProductStatus.DRAFT,
          isFeatured: dto.isFeatured ?? false,
          publishedAt:
            dto.status === ProductStatus.PUBLISHED ? new Date() : null,
        },
      })
      .catch((error: unknown) => {
        this.handleUniqueSlugError(error);
        throw error;
      });
  }

  findPublicProducts() {
    return this.prisma.product.findMany({
      where: {
        deletedAt: null,
        status: ProductStatus.PUBLISHED,
      },
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
  }

  async findPublicProductBySlug(slug: string) {
    const product = await this.prisma.product.findFirst({
      where: {
        slug,
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
            isActive: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  findAdminProducts() {
    return this.prisma.product.findMany({
      where: {
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findAdminProductById(id: string) {
    return this.getActiveProductById(id);
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.getActiveProductById(id);

    const data = {
      ...(dto.name !== undefined && {
        name: dto.name.trim(),
      }),
      ...(dto.slug !== undefined && {
        slug: this.normalizeSlug(dto.slug),
      }),
      ...(dto.shortDescription !== undefined && {
        shortDescription: this.nullableTrim(dto.shortDescription),
      }),
      ...(dto.description !== undefined && {
        description: this.nullableTrim(dto.description),
      }),
      ...(dto.usageInstructions !== undefined && {
        usageInstructions: this.nullableTrim(dto.usageInstructions),
      }),
      ...(dto.warnings !== undefined && {
        warnings: this.nullableTrim(dto.warnings),
      }),
      ...(dto.status !== undefined && {
        status: dto.status,
        publishedAt: dto.status === ProductStatus.PUBLISHED ? new Date() : null,
      }),
      ...(dto.isFeatured !== undefined && {
        isFeatured: dto.isFeatured,
      }),
    };

    return this.prisma.product
      .update({
        where: {
          id,
        },
        data,
      })
      .catch((error: unknown) => {
        this.handleUniqueSlugError(error);
        throw error;
      });
  }

  async updateStatus(id: string, dto: UpdateProductStatusDto) {
    await this.getActiveProductById(id);

    return this.prisma.product.update({
      where: {
        id,
      },
      data: {
        status: dto.status,
        publishedAt: dto.status === ProductStatus.PUBLISHED ? new Date() : null,
      },
    });
  }

  async softDelete(id: string) {
    await this.getActiveProductById(id);

    return this.prisma.product.update({
      where: {
        id,
      },
      data: {
        deletedAt: new Date(),
        status: ProductStatus.ARCHIVED,
      },
    });
  }

  private async getActiveProductById(id: string) {
    const product = await this.prisma.product.findFirst({
      where: {
        id,
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
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  private normalizeSlug(slug: string): string {
    return slug.trim().toLowerCase();
  }

  private nullableTrim(value: string | undefined): string | null {
    const trimmed = value?.trim();

    return trimmed || null;
  }

  private handleUniqueSlugError(error: unknown): void {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('A product with this slug already exists');
    }
  }
}
