import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { PrismaService } from '../database/prisma.service';
import { CloudinaryCategoryImageService } from './cloudinary-category-image.service';
import { UpdateCategoryImageDto } from './dto/update-category-image.dto';

@Injectable()
export class CategoryImageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly cloudinaryService: CloudinaryCategoryImageService,
  ) {}

  async findByCategory(categoryId: string) {
    await this.ensureCategory(categoryId);

    return this.findCategoryImages(categoryId);
  }

  async uploadCategoryImages(categoryId: string, files: Express.Multer.File[]) {
    await this.ensureCategory(categoryId);

    if (!files.length) {
      throw new BadRequestException('Select at least one image');
    }

    const activeImageCount = await this.prisma.categoryImage.count({
      where: {
        categoryId,
        deletedAt: null,
      },
    });
    const maxImages = Number(
      this.configService.get<string>('MAX_CATEGORY_IMAGES_PER_CATEGORY', '8'),
    );

    if (activeImageCount + files.length > maxImages) {
      throw new BadRequestException(
        `A category can have up to ${maxImages} images`,
      );
    }

    const uploadedImages = await Promise.all(
      files.map((file) =>
        this.cloudinaryService.uploadCategoryImage(categoryId, file),
      ),
    );

    await this.prisma.categoryImage.createMany({
      data: uploadedImages.map((image, index) => ({
        categoryId,
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

    return this.findCategoryImages(categoryId);
  }

  async updateImage(
    categoryId: string,
    imageId: string,
    dto: UpdateCategoryImageDto,
  ) {
    const image = await this.ensureCategoryImage(categoryId, imageId);

    return this.prisma.$transaction(async (tx) => {
      if (dto.isPrimary) {
        await tx.categoryImage.updateMany({
          where: {
            categoryId,
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

      return tx.categoryImage.update({
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
        },
      });
    });
  }

  async deleteImage(categoryId: string, imageId: string) {
    const image = await this.ensureCategoryImage(categoryId, imageId);

    await this.cloudinaryService.deleteImage(image.publicId);

    return this.prisma.categoryImage.update({
      where: {
        id: image.id,
      },
      data: {
        deletedAt: new Date(),
        isPrimary: false,
      },
    });
  }

  private async ensureCategory(categoryId: string) {
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

  private async ensureCategoryImage(categoryId: string, imageId: string) {
    const image = await this.prisma.categoryImage.findFirst({
      where: {
        id: imageId,
        categoryId,
        deletedAt: null,
      },
    });

    if (!image) {
      throw new NotFoundException('Category image not found');
    }

    return image;
  }

  private findCategoryImages(categoryId: string) {
    return this.prisma.categoryImage.findMany({
      where: {
        categoryId,
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
    });
  }

  private nullableTrim(value: string | undefined): string | null {
    const trimmed = value?.trim();

    return trimmed || null;
  }
}
