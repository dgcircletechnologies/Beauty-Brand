import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '../../../generated/prisma/client.cjs';
import { OfferType } from '../../../generated/prisma/enums.cjs';
import { PrismaService } from '../../database/prisma.service';

type TargetType = 'VARIANT' | 'PRODUCT' | 'CATEGORY';

type OfferResolverProductCategory = {
  categoryId: string;
  category: {
    id: string;
    deletedAt: Date | null;
    isActive: boolean;
  };
};

type OfferResolverVariant = {
  id: string;
  price: Prisma.Decimal;
  deletedAt: Date | null;
  isActive: boolean;
  product: {
    id: string;
    deletedAt: Date | null;
    categories: OfferResolverProductCategory[];
  };
};

type OfferResolverCategory = {
  id: string;
  deletedAt: Date | null;
  isActive: boolean;
};

type OfferResolverTarget = {
  id: string;
  productId: string | null;
  categoryId: string | null;
  variantId: string | null;
};

type ResolvableOffer = {
  id: string;
  name: string;
  type: OfferType;
  value: Prisma.Decimal | null;
  maxDiscountAmount: Prisma.Decimal | null;
  priority: number;
  startAt: Date | null;
  endAt: Date | null;
  createdAt: Date;
  buyXGetYConfig: {
    buyQuantity: number;
    getQuantity: number;
    rewardProductId: string | null;
    rewardVariantId: string | null;
  } | null;
};

type ResolvableOfferTarget = OfferResolverTarget & {
  offer: ResolvableOffer;
};

type OfferMatch = {
  offer: ResolvableOffer;
  specificityRank: number;
  matchedBy: {
    targetType: TargetType;
    targetId: string;
    categoryDistance?: number;
  };
};

export type OfferResolverResult = {
  hasOffer: boolean;
  basePrice: Prisma.Decimal;
  discountAmount: Prisma.Decimal;
  finalPrice: Prisma.Decimal;
  offer: {
    id: string;
    name: string;
    type: OfferType;
    value: Prisma.Decimal | null;
    maxDiscountAmount: Prisma.Decimal | null;
    priority: number;
    startAt: Date | null;
    endAt: Date | null;
  } | null;
  matchedBy: {
    targetType: TargetType;
    targetId: string;
    categoryDistance?: number;
  } | null;
  buyXGetY: {
    buyQuantity: number;
    getQuantity: number;
    rewardProductId: string | null;
    rewardVariantId: string | null;
  } | null;
};

export type CategoryOfferResolverResult = {
  hasOffer: boolean;
  offer: OfferResolverResult['offer'];
  matchedBy: {
    targetType: 'CATEGORY';
    targetId: string;
    categoryDistance: number;
  } | null;
  buyXGetY: OfferResolverResult['buyXGetY'];
};

@Injectable()
export class OfferResolverService {
  private readonly zero = new Prisma.Decimal(0);
  private readonly oneHundred = new Prisma.Decimal(100);

  constructor(private readonly prisma: PrismaService) {}

  async resolveForVariant(variantId: string): Promise<OfferResolverResult> {
    const now = new Date();
    const variant = await this.findVariantContext(variantId);
    return this.resolveVariantContext(variant, now);
  }

  async resolveForVariants(
    variantIds: string[],
  ): Promise<Map<string, OfferResolverResult>> {
    const uniqueVariantIds = [...new Set(variantIds.filter(Boolean))];
    const results = new Map<string, OfferResolverResult>();

    if (!uniqueVariantIds.length) {
      return results;
    }

    const now = new Date();
    const variants = await this.findVariantContexts(uniqueVariantIds);
    const matchesByVariantId = await this.findBatchOfferMatches(variants, now);

    for (const variant of variants) {
      results.set(
        variant.id,
        await this.resolveVariantContext(
          variant,
          now,
          matchesByVariantId.get(variant.id) ?? [],
        ),
      );
    }

    return results;
  }

  async resolveForCategory(
    categoryId: string,
  ): Promise<CategoryOfferResolverResult> {
    const now = new Date();
    const category = await this.findCategoryContext(categoryId);
    const categoryDistances = await this.findCategoryDistancesForCategory(
      category.id,
    );
    const matches = await this.findCategoryOfferMatches(categoryDistances, now);
    const winningMatch = this.pickWinningMatch(matches);

    if (!winningMatch) {
      return {
        hasOffer: false,
        offer: null,
        matchedBy: null,
        buyXGetY: null,
      };
    }

    return {
      hasOffer: true,
      offer: this.toResolvedOfferView(winningMatch.offer),
      matchedBy: {
        targetType: 'CATEGORY',
        targetId: winningMatch.matchedBy.targetId,
        categoryDistance: winningMatch.matchedBy.categoryDistance ?? 0,
      },
      buyXGetY: winningMatch.offer.buyXGetYConfig
        ? {
            buyQuantity: winningMatch.offer.buyXGetYConfig.buyQuantity,
            getQuantity: winningMatch.offer.buyXGetYConfig.getQuantity,
            rewardProductId: winningMatch.offer.buyXGetYConfig.rewardProductId,
            rewardVariantId: winningMatch.offer.buyXGetYConfig.rewardVariantId,
          }
        : null,
    };
  }

  private async findVariantContext(
    variantId: string,
  ): Promise<OfferResolverVariant> {
    const variants = await this.findVariantContexts([variantId]);
    const variant = variants[0];

    if (!variant) {
      throw new NotFoundException('Variant not found');
    }

    return variant;
  }

  private async findVariantContexts(
    variantIds: string[],
  ): Promise<OfferResolverVariant[]> {
    return this.prisma.productVariant.findMany({
      where: {
        id: {
          in: variantIds,
        },
        deletedAt: null,
        isActive: true,
        product: {
          deletedAt: null,
        },
      },
      select: {
        id: true,
        price: true,
        deletedAt: true,
        isActive: true,
        product: {
          select: {
            id: true,
            deletedAt: true,
            categories: {
              where: {
                category: {
                  deletedAt: null,
                  isActive: true,
                },
              },
              select: {
                categoryId: true,
                category: {
                  select: {
                    id: true,
                    deletedAt: true,
                    isActive: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  private async findCategoryContext(
    categoryId: string,
  ): Promise<OfferResolverCategory> {
    const category = await this.prisma.category.findFirst({
      where: {
        id: categoryId,
        deletedAt: null,
        isActive: true,
      },
      select: {
        id: true,
        deletedAt: true,
        isActive: true,
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  private async findOfferMatches(
    variant: OfferResolverVariant,
    now: Date,
  ): Promise<OfferMatch[]> {
    const directCategoryIds = variant.product.categories.map(
      (productCategory) => productCategory.categoryId,
    );
    const categoryDistances =
      await this.findCategoryDistancesFromDirectCategories(directCategoryIds);
    const categoryIds = [...categoryDistances.keys()];
    const offerTargets = await this.prisma.offerTarget.findMany({
      where: {
        OR: [
          {
            variantId: variant.id,
          },
          {
            productId: variant.product.id,
          },
          ...(categoryIds.length
            ? [
                {
                  categoryId: {
                    in: categoryIds,
                  },
                },
              ]
            : []),
        ],
        offer: {
          isActive: true,
          OR: [
            {
              startAt: null,
            },
            {
              startAt: {
                lte: now,
              },
            },
          ],
          AND: [
            {
              OR: [
                {
                  endAt: null,
                },
                {
                  endAt: {
                    gte: now,
                  },
                },
              ],
            },
          ],
        },
      },
      include: {
        offer: {
          include: {
            buyXGetYConfig: true,
          },
        },
      },
    });

    return this.deduplicateOfferMatches(
      offerTargets
        .map((target) => this.toOfferMatch(target, variant, categoryDistances))
        .filter((match): match is OfferMatch => match !== null),
    );
  }

  private async findBatchOfferMatches(
    variants: OfferResolverVariant[],
    now: Date,
  ) {
    const matchesByVariantId = new Map<string, OfferMatch[]>();

    if (!variants.length) {
      return matchesByVariantId;
    }

    const variantIds = variants.map((variant) => variant.id);
    const productIds = [
      ...new Set(variants.map((variant) => variant.product.id)),
    ];
    const directCategoryIds = [
      ...new Set(
        variants.flatMap((variant) =>
          variant.product.categories.map(
            (productCategory) => productCategory.categoryId,
          ),
        ),
      ),
    ];
    const categoryDistancesByDirectCategory =
      await this.findCategoryDistancesByDirectCategory(directCategoryIds);
    const categoryIds = [
      ...new Set(
        [...categoryDistancesByDirectCategory.values()].flatMap((distances) => [
          ...distances.keys(),
        ]),
      ),
    ];
    const offerTargets = await this.prisma.offerTarget.findMany({
      where: {
        OR: [
          {
            variantId: {
              in: variantIds,
            },
          },
          {
            productId: {
              in: productIds,
            },
          },
          ...(categoryIds.length
            ? [
                {
                  categoryId: {
                    in: categoryIds,
                  },
                },
              ]
            : []),
        ],
        offer: this.getActiveOfferWhere(now),
      },
      include: this.getOfferTargetInclude(),
    });

    for (const variant of variants) {
      const categoryDistances = this.mergeVariantCategoryDistances(
        variant,
        categoryDistancesByDirectCategory,
      );
      const matches = this.deduplicateOfferMatches(
        offerTargets
          .map((target) =>
            this.toOfferMatch(target, variant, categoryDistances),
          )
          .filter((match): match is OfferMatch => match !== null),
      );

      matchesByVariantId.set(variant.id, matches);
    }

    return matchesByVariantId;
  }

  private async resolveVariantContext(
    variant: OfferResolverVariant,
    now: Date,
    matches?: OfferMatch[],
  ) {
    const basePrice = new Prisma.Decimal(variant.price);
    const resolvedMatches =
      matches ?? (await this.findOfferMatches(variant, now));
    const winningMatch = this.pickWinningMatch(resolvedMatches);

    return winningMatch
      ? this.buildOfferResult(basePrice, winningMatch)
      : this.noOfferResult(basePrice);
  }

  private async findCategoryDistancesFromDirectCategories(
    directCategoryIds: string[],
  ) {
    if (!directCategoryIds.length) {
      return new Map<string, number>();
    }

    const closureRows = await this.prisma.categoryClosure.findMany({
      where: {
        descendantId: {
          in: directCategoryIds,
        },
        ancestor: {
          deletedAt: null,
          isActive: true,
        },
      },
      select: {
        ancestorId: true,
        descendantId: true,
        depth: true,
      },
      orderBy: {
        depth: 'asc',
      },
    });
    const distances = new Map<string, number>();
    const visitedEdges = new Set<string>();

    for (const row of closureRows) {
      const edgeKey = `${row.ancestorId}:${row.descendantId}`;

      if (visitedEdges.has(edgeKey)) {
        continue;
      }

      visitedEdges.add(edgeKey);

      const existingDistance = distances.get(row.ancestorId);

      if (existingDistance === undefined || row.depth < existingDistance) {
        distances.set(row.ancestorId, row.depth);
      }
    }

    for (const categoryId of directCategoryIds) {
      const existingDistance = distances.get(categoryId);

      if (existingDistance === undefined || existingDistance > 0) {
        distances.set(categoryId, 0);
      }
    }

    return distances;
  }

  private async findCategoryDistancesByDirectCategory(
    directCategoryIds: string[],
  ) {
    const distancesByDirectCategory = new Map<string, Map<string, number>>();

    if (!directCategoryIds.length) {
      return distancesByDirectCategory;
    }

    const closureRows = await this.prisma.categoryClosure.findMany({
      where: {
        descendantId: {
          in: directCategoryIds,
        },
        ancestor: {
          deletedAt: null,
          isActive: true,
        },
      },
      select: {
        ancestorId: true,
        descendantId: true,
        depth: true,
      },
      orderBy: {
        depth: 'asc',
      },
    });

    for (const categoryId of directCategoryIds) {
      distancesByDirectCategory.set(
        categoryId,
        new Map<string, number>([[categoryId, 0]]),
      );
    }

    for (const row of closureRows) {
      const distances =
        distancesByDirectCategory.get(row.descendantId) ??
        new Map<string, number>();
      const existingDistance = distances.get(row.ancestorId);

      if (existingDistance === undefined || row.depth < existingDistance) {
        distances.set(row.ancestorId, row.depth);
      }

      distancesByDirectCategory.set(row.descendantId, distances);
    }

    return distancesByDirectCategory;
  }

  private async findCategoryDistancesForCategory(categoryId: string) {
    const byDirectCategory = await this.findCategoryDistancesByDirectCategory([
      categoryId,
    ]);

    return byDirectCategory.get(categoryId) ?? new Map([[categoryId, 0]]);
  }

  private mergeVariantCategoryDistances(
    variant: OfferResolverVariant,
    categoryDistancesByDirectCategory: Map<string, Map<string, number>>,
  ) {
    const distances = new Map<string, number>();

    for (const productCategory of variant.product.categories) {
      const categoryDistances =
        categoryDistancesByDirectCategory.get(productCategory.categoryId) ??
        new Map([[productCategory.categoryId, 0]]);

      for (const [categoryId, distance] of categoryDistances) {
        const existingDistance = distances.get(categoryId);

        if (existingDistance === undefined || distance < existingDistance) {
          distances.set(categoryId, distance);
        }
      }
    }

    return distances;
  }

  private async findCategoryOfferMatches(
    categoryDistances: Map<string, number>,
    now: Date,
  ) {
    const categoryIds = [...categoryDistances.keys()];

    if (!categoryIds.length) {
      return [];
    }

    const offerTargets = await this.prisma.offerTarget.findMany({
      where: {
        categoryId: {
          in: categoryIds,
        },
        offer: this.getActiveOfferWhere(now),
      },
      include: this.getOfferTargetInclude(),
    });

    return this.deduplicateOfferMatches(
      offerTargets
        .map((target): OfferMatch | null => {
          if (!target.categoryId) {
            return null;
          }

          const categoryDistance = categoryDistances.get(target.categoryId);

          if (categoryDistance === undefined) {
            return null;
          }

          return {
            offer: target.offer,
            specificityRank: categoryDistance,
            matchedBy: {
              targetType: 'CATEGORY' as const,
              targetId: target.categoryId,
              categoryDistance,
            },
          };
        })
        .filter((match): match is OfferMatch => match !== null),
    );
  }

  private toOfferMatch(
    target: ResolvableOfferTarget,
    variant: OfferResolverVariant,
    categoryDistances: Map<string, number>,
  ): OfferMatch | null {
    if (target.variantId === variant.id) {
      return {
        offer: target.offer,
        specificityRank: 0,
        matchedBy: {
          targetType: 'VARIANT',
          targetId: target.variantId,
        },
      };
    }

    if (target.productId === variant.product.id) {
      return {
        offer: target.offer,
        specificityRank: 1,
        matchedBy: {
          targetType: 'PRODUCT',
          targetId: target.productId,
        },
      };
    }

    if (target.categoryId) {
      const categoryDistance = categoryDistances.get(target.categoryId);

      if (categoryDistance !== undefined) {
        return {
          offer: target.offer,
          specificityRank: 2 + categoryDistance,
          matchedBy: {
            targetType: 'CATEGORY',
            targetId: target.categoryId,
            categoryDistance,
          },
        };
      }
    }

    return null;
  }

  private deduplicateOfferMatches(matches: OfferMatch[]) {
    const bestMatchByOfferId = new Map<string, OfferMatch>();

    for (const match of matches) {
      const existingMatch = bestMatchByOfferId.get(match.offer.id);

      if (!existingMatch || this.compareMatches(match, existingMatch) < 0) {
        bestMatchByOfferId.set(match.offer.id, match);
      }
    }

    return [...bestMatchByOfferId.values()];
  }

  private pickWinningMatch(matches: OfferMatch[]) {
    return [...matches].sort((first, second) =>
      this.compareMatches(first, second),
    )[0];
  }

  private compareMatches(first: OfferMatch, second: OfferMatch) {
    if (first.specificityRank !== second.specificityRank) {
      return first.specificityRank - second.specificityRank;
    }

    if (first.offer.priority !== second.offer.priority) {
      return second.offer.priority - first.offer.priority;
    }

    const createdAtDifference =
      second.offer.createdAt.getTime() - first.offer.createdAt.getTime();

    if (createdAtDifference !== 0) {
      return createdAtDifference;
    }

    return second.offer.id.localeCompare(first.offer.id);
  }

  private buildOfferResult(
    basePrice: Prisma.Decimal,
    match: OfferMatch,
  ): OfferResolverResult {
    const offer = match.offer;

    if (offer.type === OfferType.BUY_X_GET_Y) {
      if (!offer.buyXGetYConfig) {
        throw new BadRequestException(
          'BUY_X_GET_Y offer configuration is missing',
        );
      }

      return {
        hasOffer: true,
        basePrice,
        discountAmount: this.zero,
        finalPrice: basePrice,
        offer: this.toResolvedOfferView(offer),
        matchedBy: match.matchedBy,
        buyXGetY: {
          buyQuantity: offer.buyXGetYConfig.buyQuantity,
          getQuantity: offer.buyXGetYConfig.getQuantity,
          rewardProductId: offer.buyXGetYConfig.rewardProductId,
          rewardVariantId: offer.buyXGetYConfig.rewardVariantId,
        },
      };
    }

    const discountAmount =
      offer.type === OfferType.PERCENTAGE
        ? this.calculatePercentageDiscount(basePrice, offer)
        : this.calculateFixedDiscount(basePrice, offer);

    return {
      hasOffer: true,
      basePrice,
      discountAmount,
      finalPrice: basePrice.minus(discountAmount),
      offer: this.toResolvedOfferView(offer),
      matchedBy: match.matchedBy,
      buyXGetY: null,
    };
  }

  private calculatePercentageDiscount(
    basePrice: Prisma.Decimal,
    offer: ResolvableOffer,
  ) {
    if (!offer.value || offer.value.lte(0) || offer.value.gt(this.oneHundred)) {
      throw new BadRequestException('Invalid percentage offer value');
    }

    const calculatedDiscount = basePrice.mul(offer.value).div(this.oneHundred);

    if (
      offer.maxDiscountAmount &&
      offer.maxDiscountAmount.gt(0) &&
      calculatedDiscount.gt(offer.maxDiscountAmount)
    ) {
      return offer.maxDiscountAmount;
    }

    return calculatedDiscount;
  }

  private calculateFixedDiscount(
    basePrice: Prisma.Decimal,
    offer: ResolvableOffer,
  ) {
    if (!offer.value || offer.value.lte(0)) {
      throw new BadRequestException('Invalid fixed amount offer value');
    }

    return offer.value.gt(basePrice) ? basePrice : offer.value;
  }

  private noOfferResult(basePrice: Prisma.Decimal): OfferResolverResult {
    return {
      hasOffer: false,
      basePrice,
      discountAmount: this.zero,
      finalPrice: basePrice,
      offer: null,
      matchedBy: null,
      buyXGetY: null,
    };
  }

  private toResolvedOfferView(offer: ResolvableOffer) {
    return {
      id: offer.id,
      name: offer.name,
      type: offer.type,
      value: offer.value,
      maxDiscountAmount: offer.maxDiscountAmount,
      priority: offer.priority,
      startAt: offer.startAt,
      endAt: offer.endAt,
    };
  }

  private getActiveOfferWhere(now: Date) {
    return {
      isActive: true,
      OR: [
        {
          startAt: null,
        },
        {
          startAt: {
            lte: now,
          },
        },
      ],
      AND: [
        {
          OR: [
            {
              endAt: null,
            },
            {
              endAt: {
                gte: now,
              },
            },
          ],
        },
      ],
    };
  }

  private getOfferTargetInclude() {
    return {
      offer: {
        include: {
          buyXGetYConfig: true,
        },
      },
    };
  }
}
