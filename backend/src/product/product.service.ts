import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { ProductStatus } from '../../generated/prisma/enums.cjs';
import { PrismaService } from '../database/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductRelationsDto } from './dto/product-relations.dto';
import { PublicProductQueryDto } from './dto/public-product-query.dto';
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

  async checkSlugAvailability(slug: string, excludeId?: string) {
    const normalizedSlug = this.normalizeSlug(slug);
    const product = await this.prisma.product.findUnique({
      where: {
        slug: normalizedSlug,
      },
      select: {
        id: true,
        name: true,
        deletedAt: true,
      },
    });

    return {
      slug: normalizedSlug,
      available: !product || product.id === excludeId,
      product: product
        ? {
            id: product.id,
            name: product.name,
            deletedAt: product.deletedAt,
          }
        : null,
    };
  }

  async findPublicProducts(query: PublicProductQueryDto = {}) {
    const page = this.getPositiveInteger(query.page, 1);
    const pageSize = Math.min(this.getPositiveInteger(query.pageSize, 12), 48);
    const selectedFilters = this.getPublicProductFilters(query);
    const products = await this.prisma.product.findMany({
      where: {
        deletedAt: null,
        status: ProductStatus.PUBLISHED,
        ...selectedFilters,
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
        variants: {
          where: {
            deletedAt: null,
            isActive: true,
          },
          orderBy: {
            price: 'asc',
          },
        },
        skinTypes: {
          include: {
            skinType: true,
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
        ageGroups: {
          include: {
            ageGroup: true,
          },
        },
        attributeValues: {
          include: {
            attribute: true,
            option: true,
          },
        },
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

    const sortedProducts = this.sortPublicProducts(products, query.sort);
    const totalItems = sortedProducts.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const safePage = Math.min(page, totalPages);
    const paginatedProducts = sortedProducts.slice(
      (safePage - 1) * pageSize,
      safePage * pageSize,
    );
    const imagesByProductId = await this.getImagesByProductId(
      paginatedProducts.map((product) => product.id),
    );

    return {
      items: paginatedProducts.map((product) => ({
        ...product,
        images: imagesByProductId.get(product.id) ?? [],
      })),
      pagination: {
        page: safePage,
        pageSize,
        totalItems,
        totalPages,
        hasPreviousPage: safePage > 1,
        hasNextPage: safePage < totalPages,
      },
      filters: await this.getPublicShopFilters(),
    };
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

  private getPublicProductFilters(query: PublicProductQueryDto) {
    const categorySlugs = this.parseList(query.category);
    const skinTypeSlugs = this.parseList(query.skinType);
    const concernSlugs = this.parseList(query.concern);
    const benefitSlugs = this.parseList(query.benefit);
    const ageGroupSlugs = this.parseList(query.ageGroup);
    const formulas = this.parseList(query.formula);
    const minPrice = this.parsePrice(query.minPrice);
    const maxPrice = this.parsePrice(query.maxPrice);
    const searchTerm = query.q?.trim();
    const andFilters: Record<string, unknown>[] = [];

    if (searchTerm) {
      andFilters.push({
        OR: [
          {
            name: {
              contains: searchTerm,
              mode: 'insensitive',
            },
          },
          {
            shortDescription: {
              contains: searchTerm,
              mode: 'insensitive',
            },
          },
          {
            description: {
              contains: searchTerm,
              mode: 'insensitive',
            },
          },
        ],
      });
    }

    if (query.excludeProductId?.trim()) {
      andFilters.push({
        id: {
          not: query.excludeProductId.trim(),
        },
      });
    }

    if (categorySlugs.length) {
      andFilters.push({
        categories: {
          some: {
            category: {
              slug: {
                in: categorySlugs,
              },
              parentId: {
                not: null,
              },
              isActive: true,
              deletedAt: null,
            },
          },
        },
      });
    }

    if (skinTypeSlugs.length) {
      andFilters.push({
        skinTypes: {
          some: {
            skinType: {
              slug: {
                in: skinTypeSlugs,
              },
              isActive: true,
              deletedAt: null,
            },
          },
        },
      });
    }

    if (concernSlugs.length) {
      andFilters.push({
        concerns: {
          some: {
            concern: {
              slug: {
                in: concernSlugs,
              },
              isActive: true,
              deletedAt: null,
            },
          },
        },
      });
    }

    if (benefitSlugs.length) {
      andFilters.push({
        productBenefits: {
          some: {
            benefit: {
              slug: {
                in: benefitSlugs,
              },
              isActive: true,
              deletedAt: null,
            },
          },
        },
      });
    }

    if (ageGroupSlugs.length) {
      andFilters.push({
        ageGroups: {
          some: {
            ageGroup: {
              slug: {
                in: ageGroupSlugs,
              },
              isActive: true,
              deletedAt: null,
            },
          },
        },
      });
    }

    if (minPrice !== null || maxPrice !== null) {
      andFilters.push({
        variants: {
          some: {
            deletedAt: null,
            isActive: true,
            price: {
              ...(minPrice !== null && {
                gte: minPrice,
              }),
              ...(maxPrice !== null && {
                lte: maxPrice,
              }),
            },
          },
        },
      });
    }

    if (formulas.includes('fragrance-free')) {
      andFilters.push({
        attributeValues: {
          some: {
            booleanValue: true,
            attribute: {
              slug: 'fragrance-free',
            },
          },
        },
      });
    }

    if (formulas.includes('spf')) {
      andFilters.push({
        attributeValues: {
          some: {
            numberValue: {
              gt: 0,
            },
            attribute: {
              slug: 'spf',
            },
          },
        },
      });
    }

    return {
      ...(andFilters.length && {
        AND: andFilters,
      }),
    };
  }

  private sortPublicProducts<T extends { variants?: { price: unknown }[]; isFeatured: boolean; publishedAt: Date | null; createdAt: Date; averageRating: unknown }>(
    products: T[],
    sort = 'featured',
  ) {
    const priceOf = (product: T) => Number(product.variants?.[0]?.price ?? 0);

    return [...products].sort((first, second) => {
      if (sort === 'price-asc') {
        return priceOf(first) - priceOf(second);
      }

      if (sort === 'price-desc') {
        return priceOf(second) - priceOf(first);
      }

      if (sort === 'rating') {
        return Number(second.averageRating) - Number(first.averageRating);
      }

      if (sort === 'newest') {
        return (
          (second.publishedAt ?? second.createdAt).getTime() -
          (first.publishedAt ?? first.createdAt).getTime()
        );
      }

      return Number(second.isFeatured) - Number(first.isFeatured);
    });
  }

  private async getPublicShopFilters() {
    const [
      categories,
      skinTypes,
      concerns,
      benefits,
      ageGroups,
      formulaAttributes,
    ] = await Promise.all([
      this.prisma.category.findMany({
        where: {
          deletedAt: null,
          isActive: true,
          parentId: {
            not: null,
          },
        },
        select: {
          name: true,
          slug: true,
        },
        orderBy: {
          name: 'asc',
        },
      }),
      this.prisma.skinType.findMany({
        where: {
          deletedAt: null,
          isActive: true,
        },
        select: {
          name: true,
          slug: true,
        },
        orderBy: {
          name: 'asc',
        },
      }),
      this.prisma.concern.findMany({
        where: {
          deletedAt: null,
          isActive: true,
        },
        select: {
          name: true,
          slug: true,
        },
        orderBy: {
          name: 'asc',
        },
      }),
      this.prisma.benefit.findMany({
        where: {
          deletedAt: null,
          isActive: true,
        },
        select: {
          name: true,
          slug: true,
        },
        orderBy: {
          name: 'asc',
        },
      }),
      this.prisma.ageGroup.findMany({
        where: {
          deletedAt: null,
          isActive: true,
        },
        select: {
          name: true,
          slug: true,
        },
        orderBy: {
          minAge: 'asc',
        },
      }),
      this.prisma.attributeDefinition.findMany({
        where: {
          deletedAt: null,
          isActive: true,
          slug: {
            in: ['fragrance-free', 'spf'],
          },
        },
        select: {
          name: true,
          slug: true,
        },
        orderBy: {
          name: 'asc',
        },
      }),
    ]);

    return {
      categories,
      skinTypes,
      concerns,
      benefits,
      ageGroups,
      formula: formulaAttributes.map((attribute) => ({
        name: attribute.slug === 'spf' ? 'Has SPF' : attribute.name,
        slug: attribute.slug === 'spf' ? 'spf' : attribute.slug,
      })),
      priceRanges: [
        { name: 'Under Rs 1,000', minPrice: null, maxPrice: 1000 },
        { name: 'Rs 1,000 - Rs 1,999', minPrice: 1000, maxPrice: 1999 },
        { name: 'Rs 2,000+', minPrice: 2000, maxPrice: null },
      ],
    };
  }

  private getPositiveInteger(value: string | undefined, fallback: number) {
    const parsed = Number.parseInt(value ?? '', 10);

    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  private parsePrice(value: string | undefined) {
    const parsed = Number(value);

    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
  }

  private parseList(value: string | undefined) {
    return [
      ...new Set(
        (value ?? '')
          .split(',')
          .map((item) => item.trim())
          .filter((item) => /^[a-z0-9-]+$/.test(item)),
      ),
    ];
  }

  async findAdminProducts() {
    const products = await this.prisma.product.findMany({
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

    const imagesByProductId = await this.getImagesByProductId(
      products.map((product) => product.id),
    );

    return products.map((product) => ({
      ...product,
      images: imagesByProductId.get(product.id) ?? [],
    }));
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

        if (dto.status === ProductStatus.ARCHIVED) {
          await tx.productVariant.updateMany({
            where: {
              productId: id,
              deletedAt: null,
            },
            data: {
              isActive: false,
            },
          });
        }

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

    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.update({
        where: {
          id,
        },
        data: {
          status: dto.status,
          publishedAt:
            dto.status === ProductStatus.PUBLISHED ? new Date() : null,
        },
      });

      if (dto.status === ProductStatus.ARCHIVED) {
        await tx.productVariant.updateMany({
          where: {
            productId: id,
            deletedAt: null,
          },
          data: {
            isActive: false,
          },
        });
      }

      return product;
    });
  }

  async softDelete(id: string) {
    await this.getActiveProductById(id);

    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.update({
        where: {
          id,
        },
        data: {
          deletedAt: new Date(),
          status: ProductStatus.ARCHIVED,
        },
      });

      await tx.productVariant.updateMany({
        where: {
          productId: id,
          deletedAt: null,
        },
        data: {
          isActive: false,
        },
      });

      return product;
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
        include: {
          attributeValues: {
            include: {
              attribute: true,
              option: true,
            },
            orderBy: {
              createdAt: 'asc' as const,
            },
          },
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
