import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  ProductStatus,
  ReviewStatus,
} from '../../generated/prisma/enums.cjs';
import { PrismaService } from '../database/prisma.service';
import { CreateProductReviewDto } from './dto/create-product-review.dto';

@Injectable()
export class ProductReviewService {
  constructor(private readonly prisma: PrismaService) {}

  async upsertProductReview(
    userId: string,
    productId: string,
    dto: CreateProductReviewDto,
  ) {
    await this.ensurePublishedProduct(productId);

    const data = {
      rating: dto.rating,
      title: this.nullableTrim(dto.title),
      body: dto.body.trim(),
      status: ReviewStatus.APPROVED,
      publishedAt: new Date(),
      deletedAt: null,
    };

    return this.prisma.review.upsert({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
      create: {
        userId,
        productId,
        ...data,
      },
      update: data,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  private async ensurePublishedProduct(productId: string) {
    const product = await this.prisma.product.findFirst({
      where: {
        id: productId,
        deletedAt: null,
        status: ProductStatus.PUBLISHED,
      },
      select: {
        id: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }
  }

  private nullableTrim(value: string | null | undefined): string | null {
    const trimmed = value?.trim();

    return trimmed || null;
  }
}
