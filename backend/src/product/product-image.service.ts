import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { PrismaService } from '../database/prisma.service';
import { AssignVariantImagesDto } from './dto/assign-variant-images.dto';
import { UpdateProductImageDto } from './dto/update-product-image.dto';
import { CloudinaryProductImageService } from './cloudinary-product-image.service';

@Injectable()
export class ProductImageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly cloudinaryService: CloudinaryProductImageService,
  ) {}

  async findByProduct(productId: string) {
    await this.ensureProduct(productId);

    return this.prisma.productImage.findMany({
      where: {
        productId,
        deletedAt: null,
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
    });
  }

  async uploadProductImages(productId: string, files: Express.Multer.File[]) {
    await this.ensureProduct(productId);

    if (!files.length) {
      throw new BadRequestException('Select at least one image');
    }

    const activeImageCount = await this.prisma.productImage.count({
      where: {
        productId,
        deletedAt: null,
      },
    });
    const maxImages = Number(
      this.configService.get<string>('MAX_PRODUCT_IMAGES_PER_PRODUCT', '12'),
    );

    if (activeImageCount + files.length > maxImages) {
      throw new BadRequestException(
        `A product can have up to ${maxImages} images`,
      );
    }

    const uploadedImages = await Promise.all(
      files.map((file) =>
        this.cloudinaryService.uploadProductImage(productId, file),
      ),
    );

    await this.prisma.productImage.createMany({
      data: uploadedImages.map((image, index) => ({
        productId,
        url: image.secure_url,
        publicId: image.public_id,
        altText: null,
        sortOrder: activeImageCount + index,
        isPrimary: activeImageCount === 0 && index === 0,
        width: image.width,
        height: image.height,
        format: image.format,
        bytes: image.bytes,
      })),
    });

    return this.findByProduct(productId);
  }

  async updateImage(
    productId: string,
    imageId: string,
    dto: UpdateProductImageDto,
  ) {
    const image = await this.ensureProductImage(productId, imageId);

    if (dto.variantId) {
      await this.ensureVariant(productId, dto.variantId);
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.isPrimary) {
        await tx.productImage.updateMany({
          where: {
            productId,
            deletedAt: null,
            id: {
              not: image.id,
            },
          },
          data: {
            isPrimary: false,
          },
        });
      }

      return tx.productImage.update({
        where: {
          id: image.id,
        },
        data: {
          ...(dto.altText !== undefined && {
            altText: this.nullableTrim(dto.altText),
          }),
          ...(dto.sortOrder !== undefined && {
            sortOrder: dto.sortOrder,
          }),
          ...(dto.isPrimary !== undefined && {
            isPrimary: dto.isPrimary,
          }),
          ...(dto.variantId !== undefined && {
            variantId: dto.variantId || null,
          }),
        },
      });
    });
  }

  async assignVariantImages(
    productId: string,
    variantId: string,
    dto: AssignVariantImagesDto,
  ) {
    await this.ensureVariant(productId, variantId);

    const uniqueImageIds = [...new Set(dto.imageIds)];
    const imageCount = await this.prisma.productImage.count({
      where: {
        productId,
        id: {
          in: uniqueImageIds,
        },
        deletedAt: null,
      },
    });

    if (imageCount !== uniqueImageIds.length) {
      throw new BadRequestException(
        'Variant images must belong to the selected product',
      );
    }

    await this.prisma.$transaction([
      this.prisma.productImage.updateMany({
        where: {
          productId,
          variantId,
          deletedAt: null,
        },
        data: {
          variantId: null,
        },
      }),
      this.prisma.productImage.updateMany({
        where: {
          productId,
          id: {
            in: uniqueImageIds,
          },
          deletedAt: null,
        },
        data: {
          variantId,
        },
      }),
    ]);

    return this.findByProduct(productId);
  }

  async deleteImage(productId: string, imageId: string) {
    const image = await this.ensureProductImage(productId, imageId);

    await this.cloudinaryService.deleteImage(image.publicId);

    return this.prisma.productImage.update({
      where: {
        id: image.id,
      },
      data: {
        deletedAt: new Date(),
        isPrimary: false,
        variantId: null,
      },
    });
  }

  private async ensureProduct(productId: string) {
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

  private async ensureVariant(productId: string, variantId: string) {
    const variant = await this.prisma.productVariant.findFirst({
      where: {
        id: variantId,
        productId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!variant) {
      throw new NotFoundException('Product variant not found');
    }
  }

  private async ensureProductImage(productId: string, imageId: string) {
    const image = await this.prisma.productImage.findFirst({
      where: {
        id: imageId,
        productId,
        deletedAt: null,
      },
    });

    if (!image) {
      throw new NotFoundException('Product image not found');
    }

    return image;
  }

  private nullableTrim(value?: string | null): string | null {
    const trimmed = value?.trim();
    return trimmed || null;
  }
}
