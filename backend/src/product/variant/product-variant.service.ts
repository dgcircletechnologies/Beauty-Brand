import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import { CreateProductVariantDto } from './dto/create-product-variant.dto';
import { UpdateProductVariantDto } from './dto/update-product-variant.dto';

@Injectable()
export class ProductVariantService {
  constructor(private readonly prisma: PrismaService) {}

  async create(productId: string, dto: CreateProductVariantDto) {
    await this.ensureActiveProductExists(productId);

    return this.prisma.productVariant
      .create({
        data: {
          productId,
          sku: this.normalizeSku(dto.sku),
          price: dto.price,
          compareAtPrice: dto.compareAtPrice ?? null,
          stockQuantity: dto.stockQuantity ?? 0,
          isActive: dto.isActive ?? true,
        },
      })
      .catch((error: unknown) => {
        this.handleUniqueSkuError(error);
        throw error;
      });
  }

  async findByProduct(productId: string) {
    await this.ensureActiveProductExists(productId);

    return this.prisma.productVariant.findMany({
      where: {
        productId,
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(productId: string, variantId: string) {
    return this.getActiveVariant(productId, variantId);
  }

  async update(
    productId: string,
    variantId: string,
    dto: UpdateProductVariantDto,
  ) {
    await this.getActiveVariant(productId, variantId);

    return this.prisma.productVariant
      .update({
        where: {
          id: variantId,
        },
        data: {
          ...(dto.sku !== undefined && {
            sku: this.normalizeSku(dto.sku),
          }),
          ...(dto.price !== undefined && {
            price: dto.price,
          }),
          ...(dto.compareAtPrice !== undefined && {
            compareAtPrice: dto.compareAtPrice,
          }),
          ...(dto.stockQuantity !== undefined && {
            stockQuantity: dto.stockQuantity,
          }),
          ...(dto.isActive !== undefined && {
            isActive: dto.isActive,
          }),
        },
      })
      .catch((error: unknown) => {
        this.handleUniqueSkuError(error);
        throw error;
      });
  }

  async softDelete(productId: string, variantId: string) {
    await this.getActiveVariant(productId, variantId);

    return this.prisma.productVariant.update({
      where: {
        id: variantId,
      },
      data: {
        deletedAt: new Date(),
        isActive: false,
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

  private async getActiveVariant(productId: string, variantId: string) {
    const variant = await this.prisma.productVariant.findFirst({
      where: {
        id: variantId,
        productId,
        deletedAt: null,
      },
    });

    if (!variant) {
      throw new NotFoundException('Product variant not found');
    }

    return variant;
  }

  private normalizeSku(sku: string): string {
    return sku.trim().toUpperCase();
  }

  private handleUniqueSkuError(error: unknown): void {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(
        'A product variant with this SKU already exists',
      );
    }
  }
}
