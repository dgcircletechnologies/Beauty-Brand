import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { ProductStatus } from '../../generated/prisma/enums.cjs';
import { PrismaService } from '../database/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductRelationsDto } from './dto/product-relations.dto';
import { UpdateProductStatusDto } from './dto/update-product-status.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductMetadataService } from './product-metadata.service';

type ProductRelationClient = Pick<
  PrismaService,
  | 'productIngredient'
  | 'productAudience'
  | 'productSkinType'
  | 'productAgeGroup'
  | 'productHairProfile'
  | 'productConcern'
  | 'productBenefit'
  | 'ingredient'
  | 'audience'
  | 'skinType'
  | 'ageGroup'
  | 'hairProfile'
  | 'concern'
  | 'benefit'
>;

type ProductImageRecord = {
  id: string;
  productId: string;
  variantId: string | null;
  url: string;
  publicId: string | null;
  altText: string | null;
  sortOrder: number;
  isPrimary: boolean;
  width: number | null;
  height: number | null;
  format: string | null;
  bytes: number | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class ProductService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly productMetadataService: ProductMetadataService,
  ) {}

  async create(dto: CreateProductDto) {
    const productId = await this.prisma
      .$transaction(async (tx) => {
        const product = await tx.product.create({
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
        });

        await this.replaceProductRelations(tx, product.id, dto);

        return product.id;
      })
      .catch((error: unknown) => {
        this.handleUniqueSlugError(error);
        throw error;
      });

    return this.findAdminProductById(productId);
  }

  findProductMetadata() {
    return this.productMetadataService.findAllMetadataOptions();
  }

  async findPublicProducts() {
    const products = await this.prisma.product.findMany({
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

    const imagesByProductId = await this.getImagesByProductId(
      products.map((product) => product.id),
    );

    return products.map((product) => ({
      ...product,
      images: imagesByProductId.get(product.id) ?? [],
    }));
  }

  async findPublicProductBySlug(slug: string) {
    const product = await this.prisma.product.findFirst({
      where: {
        slug,
        deletedAt: null,
        status: ProductStatus.PUBLISHED,
      },
      include: {
        ...this.getPublicProductInclude(),
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const imagesByProductId = await this.getImagesByProductId([product.id]);
    const variantImagesByVariantId = await this.getImagesByVariantId(
      product.variants.map((variant) => variant.id),
    );

    return {
      ...product,
      images: imagesByProductId.get(product.id) ?? [],
      variants: product.variants.map((variant) => ({
        ...variant,
        images: variantImagesByVariantId.get(variant.id) ?? [],
      })),
    };
  }

  findAdminProducts() {
    return this.prisma.product.findMany({
      where: {
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

    const productId = await this.prisma
      .$transaction(async (tx) => {
        await tx.product.update({
          where: {
            id,
          },
          data,
        });

        await this.replaceProductRelations(tx, id, dto);

        return id;
      })
      .catch((error: unknown) => {
        this.handleUniqueSlugError(error);
        throw error;
      });

    return this.findAdminProductById(productId);
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
        ...this.getProductInclude(false),
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const imagesByProductId = await this.getImagesByProductId([product.id]);
    const variantImagesByVariantId = await this.getImagesByVariantId(
      product.variants.map((variant) => variant.id),
    );

    return {
      ...product,
      images: imagesByProductId.get(product.id) ?? [],
      variants: product.variants.map((variant) => ({
        ...variant,
        images: variantImagesByVariantId.get(variant.id) ?? [],
      })),
    };
  }

  private normalizeSlug(slug: string): string {
    return slug.trim().toLowerCase();
  }

  private nullableTrim(value: string | undefined): string | null {
    const trimmed = value?.trim();

    return trimmed || null;
  }

  private getProductInclude(onlyActiveVariants: boolean) {
    return {
      categories: {
        include: {
          category: true,
        },
        orderBy: [
          {
            isPrimary: 'desc' as const,
          },
          {
            sortOrder: 'asc' as const,
          },
        ],
      },
      attributeValues: {
        include: {
          attribute: true,
          option: true,
        },
        orderBy: {
          createdAt: 'asc' as const,
        },
      },
      variants: {
        where: {
          deletedAt: null,
          ...(onlyActiveVariants && {
            isActive: true,
          }),
        },
        orderBy: {
          createdAt: 'desc' as const,
        },
      },
      ingredients: {
        include: {
          ingredient: true,
        },
        orderBy: {
          sortOrder: 'asc' as const,
        },
      },
      audiences: {
        include: {
          audience: true,
        },
      },
      skinTypes: {
        include: {
          skinType: true,
        },
      },
      ageGroups: {
        include: {
          ageGroup: true,
        },
      },
      hairProfiles: {
        include: {
          hairProfile: true,
        },
      },
      concerns: {
        include: {
          concern: true,
        },
      },
      productBenefits: {
        include: {
          benefit: true,
        },
      },
    };
  }

  private getPublicProductInclude() {
    return {
      categories: {
        include: {
          category: true,
        },
        orderBy: [
          {
            isPrimary: 'desc' as const,
          },
          {
            sortOrder: 'asc' as const,
          },
        ],
      },
      attributeValues: {
        include: {
          attribute: true,
          option: true,
        },
        orderBy: {
          createdAt: 'asc' as const,
        },
      },
      variants: {
        where: {
          deletedAt: null,
          isActive: true,
        },
        orderBy: {
          createdAt: 'desc' as const,
        },
      },
      ingredients: {
        include: {
          ingredient: true,
        },
        orderBy: {
          sortOrder: 'asc' as const,
        },
      },
      audiences: {
        include: {
          audience: true,
        },
      },
      skinTypes: {
        include: {
          skinType: true,
        },
      },
      ageGroups: {
        include: {
          ageGroup: true,
        },
      },
      hairProfiles: {
        include: {
          hairProfile: true,
        },
      },
      concerns: {
        include: {
          concern: true,
        },
      },
      productBenefits: {
        include: {
          benefit: true,
        },
      },
    };
  }

  private async getImagesByProductId(productIds: string[]) {
    const imagesByProductId = new Map<string, ProductImageRecord[]>();

    if (!productIds.length) {
      return imagesByProductId;
    }

    const images = await this.findProductImagesByColumn(
      'productId',
      productIds,
      true,
    );

    images.forEach((image) => {
      const productImages = imagesByProductId.get(image.productId) ?? [];
      productImages.push(image);
      imagesByProductId.set(image.productId, productImages);
    });

    return imagesByProductId;
  }

  private async getImagesByVariantId(variantIds: string[]) {
    const imagesByVariantId = new Map<string, ProductImageRecord[]>();

    if (!variantIds.length) {
      return imagesByVariantId;
    }

    const images = await this.findProductImagesByColumn(
      'variantId',
      variantIds,
      false,
    );

    images.forEach((image) => {
      if (!image.variantId) {
        return;
      }

      const variantImages = imagesByVariantId.get(image.variantId) ?? [];
      variantImages.push(image);
      imagesByVariantId.set(image.variantId, variantImages);
    });

    return imagesByVariantId;
  }

  private getProductImageOrderBy() {
    return [
      {
        isPrimary: 'desc' as const,
      },
      {
        sortOrder: 'asc' as const,
      },
      {
        createdAt: 'asc' as const,
      },
    ];
  }

  private async findProductImagesByColumn(
    column: 'productId' | 'variantId',
    ids: string[],
    includePrimarySort: boolean,
  ) {
    const safeIds = ids.filter((id) => /^[a-zA-Z0-9_-]+$/.test(id));

    if (!safeIds.length) {
      return [];
    }

    const idList = safeIds.map((id) => `'${id}'`).join(',');
    const primarySort = includePrimarySort ? '"isPrimary" DESC,' : '';

    return this.prisma.$queryRawUnsafe<ProductImageRecord[]>(`
      SELECT
        "id",
        "productId",
        "variantId",
        "url",
        "publicId",
        "altText",
        "sortOrder",
        "isPrimary",
        "width",
        "height",
        "format",
        "bytes",
        "deletedAt",
        "createdAt",
        "updatedAt"
      FROM "public"."ProductImage"
      WHERE "deletedAt" IS NULL
        AND "${column}" IN (${idList})
      ORDER BY ${primarySort} "sortOrder" ASC, "createdAt" ASC
    `);
  }

  private async replaceProductRelations(
    tx: ProductRelationClient,
    productId: string,
    dto: ProductRelationsDto,
  ): Promise<void> {
    if (dto.ingredients !== undefined) {
      const ingredients = this.dedupeIngredients(dto.ingredients);
      const ingredientIds = ingredients.map(
        (ingredient) => ingredient.ingredientId,
      );

      await this.ensureActiveIngredientIds(tx, ingredientIds);
      await tx.productIngredient.deleteMany({
        where: {
          productId,
        },
      });

      if (ingredients.length > 0) {
        await tx.productIngredient.createMany({
          data: ingredients.map((ingredient, index) => ({
            productId,
            ingredientId: ingredient.ingredientId,
            purpose: this.nullableTrim(ingredient.purpose),
            concentration: this.nullableTrim(ingredient.concentration),
            isKeyIngredient: ingredient.isKeyIngredient ?? false,
            sortOrder: ingredient.sortOrder ?? index,
          })),
        });
      }
    }

    if (dto.audienceIds !== undefined) {
      const audienceIds = this.dedupeIds(dto.audienceIds);

      await this.ensureActiveAudienceIds(tx, audienceIds);
      await tx.productAudience.deleteMany({
        where: {
          productId,
        },
      });

      if (audienceIds.length > 0) {
        await tx.productAudience.createMany({
          data: audienceIds.map((audienceId) => ({
            productId,
            audienceId,
          })),
        });
      }
    }

    if (dto.skinTypeIds !== undefined) {
      const skinTypeIds = this.dedupeIds(dto.skinTypeIds);

      await this.ensureActiveSkinTypeIds(tx, skinTypeIds);
      await tx.productSkinType.deleteMany({
        where: {
          productId,
        },
      });

      if (skinTypeIds.length > 0) {
        await tx.productSkinType.createMany({
          data: skinTypeIds.map((skinTypeId) => ({
            productId,
            skinTypeId,
          })),
        });
      }
    }

    if (dto.ageGroupIds !== undefined) {
      const ageGroupIds = this.dedupeIds(dto.ageGroupIds);

      await this.ensureActiveAgeGroupIds(tx, ageGroupIds);
      await tx.productAgeGroup.deleteMany({
        where: {
          productId,
        },
      });

      if (ageGroupIds.length > 0) {
        await tx.productAgeGroup.createMany({
          data: ageGroupIds.map((ageGroupId) => ({
            productId,
            ageGroupId,
          })),
        });
      }
    }

    if (dto.hairProfileIds !== undefined) {
      const hairProfileIds = this.dedupeIds(dto.hairProfileIds);

      await this.ensureActiveHairProfileIds(tx, hairProfileIds);
      await tx.productHairProfile.deleteMany({
        where: {
          productId,
        },
      });

      if (hairProfileIds.length > 0) {
        await tx.productHairProfile.createMany({
          data: hairProfileIds.map((hairProfileId) => ({
            productId,
            hairProfileId,
          })),
        });
      }
    }

    if (dto.concernIds !== undefined) {
      const concernIds = this.dedupeIds(dto.concernIds);

      await this.ensureActiveConcernIds(tx, concernIds);
      await tx.productConcern.deleteMany({
        where: {
          productId,
        },
      });

      if (concernIds.length > 0) {
        await tx.productConcern.createMany({
          data: concernIds.map((concernId) => ({
            productId,
            concernId,
          })),
        });
      }
    }

    if (dto.benefitIds !== undefined) {
      const benefitIds = this.dedupeIds(dto.benefitIds);

      await this.ensureActiveBenefitIds(tx, benefitIds);
      await tx.productBenefit.deleteMany({
        where: {
          productId,
        },
      });

      if (benefitIds.length > 0) {
        await tx.productBenefit.createMany({
          data: benefitIds.map((benefitId) => ({
            productId,
            benefitId,
          })),
        });
      }
    }
  }

  private dedupeIds(ids: string[]): string[] {
    return [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
  }

  private dedupeIngredients(
    ingredients: NonNullable<ProductRelationsDto['ingredients']>,
  ) {
    const seenIngredientIds = new Set<string>();

    return ingredients.filter((ingredient) => {
      const ingredientId = ingredient.ingredientId.trim();

      if (!ingredientId || seenIngredientIds.has(ingredientId)) {
        return false;
      }

      seenIngredientIds.add(ingredientId);
      ingredient.ingredientId = ingredientId;

      return true;
    });
  }

  private async ensureActiveIngredientIds(
    tx: ProductRelationClient,
    ids: string[],
  ): Promise<void> {
    if (ids.length === 0) {
      return;
    }

    const count = await tx.ingredient.count({
      where: {
        id: {
          in: ids,
        },
        deletedAt: null,
        isActive: true,
      },
    });

    if (count !== ids.length) {
      throw new NotFoundException('One or more ingredients were not found');
    }
  }

  private async ensureActiveAudienceIds(
    tx: ProductRelationClient,
    ids: string[],
  ): Promise<void> {
    if (ids.length === 0) {
      return;
    }

    const count = await tx.audience.count({
      where: {
        id: {
          in: ids,
        },
        deletedAt: null,
        isActive: true,
      },
    });

    if (count !== ids.length) {
      throw new NotFoundException('One or more audiences were not found');
    }
  }

  private async ensureActiveSkinTypeIds(
    tx: ProductRelationClient,
    ids: string[],
  ): Promise<void> {
    if (ids.length === 0) {
      return;
    }

    const count = await tx.skinType.count({
      where: {
        id: {
          in: ids,
        },
        deletedAt: null,
        isActive: true,
      },
    });

    if (count !== ids.length) {
      throw new NotFoundException('One or more skin types were not found');
    }
  }

  private async ensureActiveAgeGroupIds(
    tx: ProductRelationClient,
    ids: string[],
  ): Promise<void> {
    if (ids.length === 0) {
      return;
    }

    const count = await tx.ageGroup.count({
      where: {
        id: {
          in: ids,
        },
        deletedAt: null,
        isActive: true,
      },
    });

    if (count !== ids.length) {
      throw new NotFoundException('One or more age groups were not found');
    }
  }

  private async ensureActiveHairProfileIds(
    tx: ProductRelationClient,
    ids: string[],
  ): Promise<void> {
    if (ids.length === 0) {
      return;
    }

    const count = await tx.hairProfile.count({
      where: {
        id: {
          in: ids,
        },
        deletedAt: null,
        isActive: true,
      },
    });

    if (count !== ids.length) {
      throw new NotFoundException('One or more hair profiles were not found');
    }
  }

  private async ensureActiveConcernIds(
    tx: ProductRelationClient,
    ids: string[],
  ): Promise<void> {
    if (ids.length === 0) {
      return;
    }

    const count = await tx.concern.count({
      where: {
        id: {
          in: ids,
        },
        deletedAt: null,
        isActive: true,
      },
    });

    if (count !== ids.length) {
      throw new NotFoundException('One or more concerns were not found');
    }
  }

  private async ensureActiveBenefitIds(
    tx: ProductRelationClient,
    ids: string[],
  ): Promise<void> {
    if (ids.length === 0) {
      return;
    }

    const count = await tx.benefit.count({
      where: {
        id: {
          in: ids,
        },
        deletedAt: null,
        isActive: true,
      },
    });

    if (count !== ids.length) {
      throw new NotFoundException('One or more benefits were not found');
    }
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
