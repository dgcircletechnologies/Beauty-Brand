import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { ProductStatus } from '../../generated/prisma/enums.cjs';
import { PrismaService } from '../database/prisma.service';
import {
  mapNoOfferPricing,
  mapResolvedCategoryOffer,
  mapResolvedPricing,
} from '../offer/services/customer-offer-pricing.mapper';
import { OfferResolverService } from '../offer/services/offer-resolver.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

export type PublicCategoryNode = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  children: PublicCategoryNode[];
};

@Injectable()
export class CategoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly offerResolverService: OfferResolverService,
  ) {}

  async create(dto: CreateCategoryDto) {
    const parentId = dto.parentId?.trim() || null;

    if (parentId) {
      await this.ensureActiveCategoryExists(parentId);
    }

    return this.prisma
      .$transaction(async (tx) => {
        const category = await tx.category.create({
          data: {
            name: dto.name.trim(),
            slug: this.normalizeSlug(dto.slug),
            description: this.nullableTrim(dto.description),
            parentId,
            isActive: dto.isActive ?? true,
          },
          include: this.getCategoryInclude(),
        });

        await tx.categoryClosure.create({
          data: {
            ancestorId: category.id,
            descendantId: category.id,
            depth: 0,
          },
        });

        if (parentId) {
          const ancestorLinks = await tx.categoryClosure.findMany({
            where: {
              descendantId: parentId,
            },
          });

          await tx.categoryClosure.createMany({
            data: ancestorLinks.map((link) => ({
              ancestorId: link.ancestorId,
              descendantId: category.id,
              depth: link.depth + 1,
            })),
          });
        }

        return category;
      })
      .catch((error: unknown) => {
        this.handleUniqueSlugError(error);
        throw error;
      });
  }

  findAll() {
    return this.prisma.category.findMany({
      where: {
        deletedAt: null,
      },
      include: {
        images: {
          where: {
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
        },
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async findOne(id: string) {
    return this.getActiveCategoryById(id);
  }

  async checkSlugAvailability(slug: string, excludeId?: string) {
    const normalizedSlug = this.normalizeSlug(slug);
    const category = await this.prisma.category.findUnique({
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
      available: !category || category.id === excludeId,
      category: category
        ? {
            id: category.id,
            name: category.name,
            deletedAt: category.deletedAt,
          }
        : null,
    };
  }

  findPublicCategories() {
    return this.prisma.category.findMany({
      where: {
        deletedAt: null,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        parentId: true,
        images: {
          where: {
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
        },
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async findPublicBySlug(slug: string) {
    const category = await this.prisma.category.findFirst({
      where: {
        slug: this.normalizeSlug(slug),
        deletedAt: null,
        isActive: true,
      },
      include: {
        images: {
          where: {
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
        },
        parent: true,
        children: {
          where: {
            deletedAt: null,
            isActive: true,
          },
          orderBy: {
            name: 'asc',
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const categoryIds = await this.getCategoryAndDescendantIds(category.id);
    const products = await this.findPublicProductsByCategoryIds(categoryIds);
    const categoryOffer = await this.offerResolverService.resolveForCategory(
      category.id,
    );

    return {
      ...category,
      offer: mapResolvedCategoryOffer(categoryOffer),
      products,
    };
  }

  async findPublicProductsBySlug(slug: string) {
    const category = await this.prisma.category.findFirst({
      where: {
        slug: this.normalizeSlug(slug),
        deletedAt: null,
        isActive: true,
      },
      select: {
        id: true,
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const categoryIds = await this.getCategoryAndDescendantIds(category.id);

    return this.findPublicProductsByCategoryIds(categoryIds);
  }

  private async findPublicProductsByCategoryIds(categoryIds: string[]) {
    const products = await this.prisma.product.findMany({
      where: {
        deletedAt: null,
        status: ProductStatus.PUBLISHED,
        categories: {
          some: {
            categoryId: {
              in: categoryIds,
            },
            category: {
              deletedAt: null,
              isActive: true,
            },
          },
        },
      },
      include: {
        images: {
          where: {
            deletedAt: null,
            variantId: null,
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
        },
        variants: {
          where: {
            deletedAt: null,
            isActive: true,
          },
          orderBy: {
            createdAt: 'asc',
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

    return this.withPublicVariantPricing(products);
  }

  private async withPublicVariantPricing<
    T extends { variants?: { id: string; price: unknown }[] },
  >(products: T[]) {
    const variantIds = products.flatMap((product) =>
      (product.variants ?? []).map((variant) => variant.id),
    );
    const pricingByVariantId =
      await this.offerResolverService.resolveForVariants(variantIds);

    return products.map((product) => ({
      ...product,
      variants: (product.variants ?? []).map((variant) => {
        const resolvedPricing = pricingByVariantId.get(variant.id);
        const publicVariant = { ...variant } as {
          id: string;
          price: unknown;
          compareAtPrice?: unknown;
        };
        delete publicVariant.compareAtPrice;

        return {
          ...publicVariant,
          pricing: resolvedPricing
            ? mapResolvedPricing(resolvedPricing)
            : mapNoOfferPricing(variant.price as string | number),
        };
      }),
    }));
  }

  private async getCategoryAndDescendantIds(
    categoryId: string,
  ): Promise<string[]> {
    const [descendantLinks, categories] = await Promise.all([
      this.prisma.categoryClosure.findMany({
        where: {
          ancestorId: categoryId,
        },
        select: {
          descendantId: true,
        },
      }),
      this.prisma.category.findMany({
        where: {
          deletedAt: null,
          isActive: true,
        },
        select: {
          id: true,
          parentId: true,
        },
      }),
    ]);

    const categoryIds = new Set(
      descendantLinks.map((link) => link.descendantId),
    );

    categoryIds.add(categoryId);

    const childrenByParentId = new Map<string, string[]>();

    for (const category of categories) {
      if (!category.parentId) {
        continue;
      }

      const childIds = childrenByParentId.get(category.parentId) ?? [];
      childIds.push(category.id);
      childrenByParentId.set(category.parentId, childIds);
    }

    const pendingCategoryIds = [categoryId];

    while (pendingCategoryIds.length > 0) {
      const currentCategoryId = pendingCategoryIds.pop();

      if (!currentCategoryId) {
        continue;
      }

      const childIds = childrenByParentId.get(currentCategoryId) ?? [];

      for (const childId of childIds) {
        if (categoryIds.has(childId)) {
          continue;
        }

        categoryIds.add(childId);
        pendingCategoryIds.push(childId);
      }
    }

    return [...categoryIds];
  }

  async update(id: string, dto: UpdateCategoryDto) {
    await this.getActiveCategoryById(id);

    if (dto.parentId !== undefined) {
      return this.updateWithParentChange(id, dto).catch((error: unknown) => {
        this.handleUniqueSlugError(error);
        throw error;
      });
    }

    return this.prisma.category
      .update({
        where: {
          id,
        },
        data: this.getCategoryUpdateData(dto),
        include: this.getCategoryInclude(),
      })
      .catch((error: unknown) => {
        this.handleUniqueSlugError(error);
        throw error;
      });
  }

  async delete(id: string) {
    const category = await this.getActiveCategoryById(id);

    if (category.children.length > 0) {
      throw new BadRequestException(
        'Remove child categories before deleting this category',
      );
    }

    if (category.parentId) {
      throw new BadRequestException(
        'Remove the parent category before deleting this category',
      );
    }

    return this.prisma.category.delete({
      where: {
        id,
      },
    });
  }

  async ensureActiveCategoryExists(id: string) {
    const category = await this.prisma.category.findFirst({
      where: {
        id,
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

  private async getActiveCategoryById(id: string) {
    const category = await this.prisma.category.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        images: {
          where: {
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
        },
        parent: true,
        children: {
          where: {
            deletedAt: null,
          },
          orderBy: {
            name: 'asc',
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
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
      throw new ConflictException('A category with this slug already exists');
    }
  }

  private async updateWithParentChange(id: string, dto: UpdateCategoryDto) {
    const nextParentId = dto.parentId?.trim() || null;

    if (nextParentId === id) {
      throw new BadRequestException('Category cannot be its own parent');
    }

    if (nextParentId) {
      await this.ensureActiveCategoryExists(nextParentId);

      const descendantLink = await this.prisma.categoryClosure.findUnique({
        where: {
          ancestorId_descendantId: {
            ancestorId: id,
            descendantId: nextParentId,
          },
        },
      });

      if (descendantLink) {
        throw new BadRequestException(
          'Category cannot be moved under its own descendant',
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const subtreeLinks = await tx.categoryClosure.findMany({
        where: {
          ancestorId: id,
        },
      });

      const subtreeIds = subtreeLinks.map((link) => link.descendantId);

      await tx.category.update({
        where: {
          id,
        },
        data: {
          parentId: nextParentId,
        },
      });

      await tx.categoryClosure.deleteMany({
        where: {
          descendantId: {
            in: subtreeIds,
          },
          ancestorId: {
            notIn: subtreeIds,
          },
        },
      });

      if (nextParentId) {
        const newAncestorLinks = await tx.categoryClosure.findMany({
          where: {
            descendantId: nextParentId,
          },
        });

        await tx.categoryClosure.createMany({
          data: newAncestorLinks.flatMap((ancestorLink) =>
            subtreeLinks.map((subtreeLink) => ({
              ancestorId: ancestorLink.ancestorId,
              descendantId: subtreeLink.descendantId,
              depth: ancestorLink.depth + subtreeLink.depth + 1,
            })),
          ),
          skipDuplicates: true,
        });
      }

      return tx.category.update({
        where: {
          id,
        },
        data: this.getCategoryUpdateData(dto),
        include: this.getCategoryInclude(),
      });
    });
  }

  private getCategoryInclude() {
    return {
      images: {
        where: {
          deletedAt: null,
        },
        orderBy: [
          {
            sortOrder: 'asc' as const,
          },
          {
            createdAt: 'asc' as const,
          },
        ],
      },
    };
  }

  private getCategoryUpdateData(dto: UpdateCategoryDto) {
    return {
      ...(dto.name !== undefined && {
        name: dto.name.trim(),
      }),
      ...(dto.description !== undefined && {
        description: this.nullableTrim(dto.description),
      }),
      ...(dto.isActive !== undefined && {
        isActive: dto.isActive,
      }),
    };
  }
}
