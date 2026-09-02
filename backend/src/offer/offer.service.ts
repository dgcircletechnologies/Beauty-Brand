import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { OfferType } from '../../generated/prisma/enums.cjs';
import { PrismaService } from '../database/prisma.service';
import { BulkCreateOfferTargetsDto } from './dto/bulk-create-offer-targets.dto';
import { CreateOfferDto } from './dto/create-offer.dto';
import { CreateOfferTargetDto } from './dto/create-offer-target.dto';
import { OfferQueryDto } from './dto/offer-query.dto';
import { UpdateOfferDto } from './dto/update-offer.dto';

type NormalizedOfferTarget = {
  productId: string | null;
  categoryId: string | null;
  variantId: string | null;
  targetType: 'PRODUCT' | 'CATEGORY' | 'VARIANT';
  targetId: string;
  duplicateKey: string;
};

type OfferTargetViewInput = {
  id: string;
  offerId: string;
  productId: string | null;
  categoryId: string | null;
  variantId: string | null;
  createdAt: Date;
  product?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  category?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  variant?: {
    id: string;
    sku: string;
    productId: string;
  } | null;
};

type OfferDetailInput = {
  targets: OfferTargetViewInput[];
};

@Injectable()
export class OfferService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateOfferDto) {
    this.validateDateRange(dto.startAt, dto.endAt);
    await this.validateCreatePayload(dto);

    const offerData = {
      name: dto.name.trim(),
      description: this.nullableTrim(dto.description),
      type: dto.type,
      value: dto.type === OfferType.BUY_X_GET_Y ? null : (dto.value ?? null),
      maxDiscountAmount: dto.maxDiscountAmount ?? null,
      startAt: this.toNullableDate(dto.startAt),
      endAt: this.toNullableDate(dto.endAt),
      isActive: dto.isActive ?? true,
      priority: dto.priority ?? 0,
    };

    if (dto.type !== OfferType.BUY_X_GET_Y) {
      return this.prisma.offer.create({
        data: offerData,
        include: this.getOfferInclude(),
      });
    }

    return this.prisma.$transaction(async (tx) => {
      const offer = await tx.offer.create({
        data: offerData,
      });

      await tx.offerBuyXGetY.create({
        data: {
          offerId: offer.id,
          buyQuantity: dto.buyQuantity as number,
          getQuantity: dto.getQuantity as number,
          rewardProductId: this.nullableTrim(dto.rewardProductId),
          rewardVariantId: this.nullableTrim(dto.rewardVariantId),
        },
      });

      return tx.offer.findUnique({
        where: {
          id: offer.id,
        },
        include: this.getOfferInclude(),
      });
    });
  }

  async findAll(query: OfferQueryDto = {}) {
    const page = this.getPositiveInteger(query.page, 1);
    const pageSize = Math.min(this.getPositiveInteger(query.limit, 10), 50);
    const where = this.buildOfferWhere(query);

    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.offer.findMany({
        where,
        select: {
          id: true,
          name: true,
          type: true,
          value: true,
          maxDiscountAmount: true,
          isActive: true,
          priority: true,
          startAt: true,
          endAt: true,
          createdAt: true,
          updatedAt: true,
          buyXGetYConfig: {
            select: {
              buyQuantity: true,
              getQuantity: true,
            },
          },
          _count: {
            select: {
              targets: true,
            },
          },
        },
        orderBy: [
          {
            priority: 'desc',
          },
          {
            createdAt: 'desc',
          },
        ],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.offer.count({
        where,
      }),
    ]);
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

    return {
      items: items.map((offer) => ({
        ...offer,
        targetCount: offer._count.targets,
        _count: undefined,
      })),
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages,
        hasPreviousPage: page > 1,
        hasNextPage: page < totalPages,
      },
    };
  }

  async findOne(id: string) {
    const offer = await this.prisma.offer.findUnique({
      where: {
        id,
      },
      include: this.getOfferInclude(),
    });

    if (!offer) {
      throw new NotFoundException('Offer not found');
    }

    return this.toOfferDetail(offer);
  }

  async findTargets(offerId: string) {
    await this.ensureOfferExists(offerId);

    const targets = await this.prisma.offerTarget.findMany({
      where: {
        offerId,
      },
      include: this.getOfferTargetInclude(),
      orderBy: {
        createdAt: 'asc',
      },
    });

    return targets.map((target) => this.toOfferTargetView(target));
  }

  async createTarget(offerId: string, dto: CreateOfferTargetDto) {
    await this.ensureOfferExists(offerId);
    const target = this.normalizeOfferTarget(dto);

    await this.validateTargetEntityExists(target);
    await this.ensureTargetIsNotDuplicate(offerId, target);

    return this.prisma.offerTarget
      .create({
        data: {
          offerId,
          productId: target.productId,
          categoryId: target.categoryId,
          variantId: target.variantId,
        },
        include: this.getOfferTargetInclude(),
      })
      .then((createdTarget) => this.toOfferTargetView(createdTarget))
      .catch((error: unknown) => {
        this.handleDuplicateTargetError(error);
        throw error;
      });
  }

  async createTargets(offerId: string, dto: BulkCreateOfferTargetsDto) {
    await this.ensureOfferExists(offerId);

    if (!dto.targets?.length) {
      throw new BadRequestException('targets must contain at least one item');
    }

    const targets = dto.targets.map((target) =>
      this.normalizeOfferTarget(target),
    );

    this.ensureNoDuplicateTargetsInPayload(targets);

    await this.validateTargetEntitiesExist(targets);
    await this.ensureTargetsAreNotDuplicates(offerId, targets);

    return this.prisma
      .$transaction(async (tx) => {
        const createdTargets = [];

        for (const target of targets) {
          createdTargets.push(
            await tx.offerTarget.create({
              data: {
                offerId,
                productId: target.productId,
                categoryId: target.categoryId,
                variantId: target.variantId,
              },
              include: this.getOfferTargetInclude(),
            }),
          );
        }

        return createdTargets;
      })
      .then((createdTargets) =>
        createdTargets.map((target) => this.toOfferTargetView(target)),
      )
      .catch((error: unknown) => {
        this.handleDuplicateTargetError(error);
        throw error;
      });
  }

  async update(id: string, dto: UpdateOfferDto) {
    this.rejectTypeChange(dto);
    const offer = await this.ensureOfferExists(id);
    this.validateDateRange(
      dto.startAt === undefined ? offer.startAt : dto.startAt,
      dto.endAt === undefined ? offer.endAt : dto.endAt,
    );

    if (offer.type === OfferType.BUY_X_GET_Y) {
      await this.validateBuyXGetYUpdatePayload(dto, offer.buyXGetYConfig);

      return this.prisma.$transaction(async (tx) => {
        await tx.offer.update({
          where: {
            id,
          },
          data: this.buildOfferUpdateData(dto, offer.type),
        });

        if (this.hasBuyXGetYFields(dto)) {
          await tx.offerBuyXGetY.upsert({
            where: {
              offerId: id,
            },
            create: {
              offerId: id,
              buyQuantity:
                dto.buyQuantity ?? offer.buyXGetYConfig?.buyQuantity ?? 1,
              getQuantity:
                dto.getQuantity ?? offer.buyXGetYConfig?.getQuantity ?? 1,
              rewardProductId:
                dto.rewardProductId === undefined
                  ? (offer.buyXGetYConfig?.rewardProductId ?? null)
                  : this.nullableTrim(dto.rewardProductId),
              rewardVariantId:
                dto.rewardVariantId === undefined
                  ? (offer.buyXGetYConfig?.rewardVariantId ?? null)
                  : this.nullableTrim(dto.rewardVariantId),
            },
            update: {
              ...(dto.buyQuantity !== undefined && {
                buyQuantity: dto.buyQuantity,
              }),
              ...(dto.getQuantity !== undefined && {
                getQuantity: dto.getQuantity,
              }),
              ...(dto.rewardProductId !== undefined && {
                rewardProductId: this.nullableTrim(dto.rewardProductId),
              }),
              ...(dto.rewardVariantId !== undefined && {
                rewardVariantId: this.nullableTrim(dto.rewardVariantId),
              }),
            },
          });
        }

        return tx.offer.findUnique({
          where: {
            id,
          },
          include: this.getOfferInclude(),
        });
      });
    }

    this.validateDiscountOfferUpdatePayload(dto, offer.type);

    return this.prisma.offer.update({
      where: {
        id,
      },
      data: this.buildOfferUpdateData(dto, offer.type),
      include: this.getOfferInclude(),
    });
  }

  async setActive(id: string, isActive: boolean) {
    await this.ensureOfferExists(id);

    return this.prisma.offer.update({
      where: {
        id,
      },
      data: {
        isActive,
      },
      include: this.getOfferInclude(),
    });
  }

  async delete(id: string) {
    await this.ensureOfferExists(id);

    return this.prisma.offer.delete({
      where: {
        id,
      },
    });
  }

  async deleteTarget(offerId: string, targetId: string) {
    await this.ensureOfferExists(offerId);
    const target = await this.prisma.offerTarget.findFirst({
      where: {
        id: targetId,
        offerId,
      },
      select: {
        id: true,
      },
    });

    if (!target) {
      throw new NotFoundException('Offer target not found');
    }

    return this.prisma.offerTarget.delete({
      where: {
        id: targetId,
      },
    });
  }

  private normalizeOfferTarget(
    dto: CreateOfferTargetDto,
  ): NormalizedOfferTarget {
    const productId = this.nullableTrim(dto.productId);
    const categoryId = this.nullableTrim(dto.categoryId);
    const variantId = this.nullableTrim(dto.variantId);
    const providedTargets = [
      productId
        ? { targetType: 'PRODUCT' as const, targetId: productId }
        : null,
      categoryId
        ? { targetType: 'CATEGORY' as const, targetId: categoryId }
        : null,
      variantId
        ? { targetType: 'VARIANT' as const, targetId: variantId }
        : null,
    ].filter(
      (
        target,
      ): target is {
        targetType: NormalizedOfferTarget['targetType'];
        targetId: string;
      } => target !== null,
    );

    if (providedTargets.length !== 1) {
      throw new BadRequestException(
        'Exactly one of productId, categoryId, or variantId is required',
      );
    }

    const target = providedTargets[0];

    return {
      productId,
      categoryId,
      variantId,
      targetType: target.targetType,
      targetId: target.targetId,
      duplicateKey: `${target.targetType}:${target.targetId}`,
    };
  }

  private async validateTargetEntityExists(target: NormalizedOfferTarget) {
    if (target.productId) {
      const count = await this.prisma.product.count({
        where: {
          id: target.productId,
          deletedAt: null,
        },
      });

      if (!count) {
        throw new NotFoundException('Product not found');
      }
    }

    if (target.categoryId) {
      const count = await this.prisma.category.count({
        where: {
          id: target.categoryId,
          deletedAt: null,
        },
      });

      if (!count) {
        throw new NotFoundException('Category not found');
      }
    }

    if (target.variantId) {
      const count = await this.prisma.productVariant.count({
        where: {
          id: target.variantId,
          deletedAt: null,
        },
      });

      if (!count) {
        throw new NotFoundException('Variant not found');
      }
    }
  }

  private async validateTargetEntitiesExist(targets: NormalizedOfferTarget[]) {
    const productIds = this.uniqueValues(
      targets.map((target) => target.productId),
    );
    const categoryIds = this.uniqueValues(
      targets.map((target) => target.categoryId),
    );
    const variantIds = this.uniqueValues(
      targets.map((target) => target.variantId),
    );

    const [productCount, categoryCount, variantCount] =
      await this.prisma.$transaction([
        this.prisma.product.count({
          where: {
            id: {
              in: productIds,
            },
            deletedAt: null,
          },
        }),
        this.prisma.category.count({
          where: {
            id: {
              in: categoryIds,
            },
            deletedAt: null,
          },
        }),
        this.prisma.productVariant.count({
          where: {
            id: {
              in: variantIds,
            },
            deletedAt: null,
          },
        }),
      ]);

    if (productCount !== productIds.length) {
      throw new NotFoundException('One or more products were not found');
    }

    if (categoryCount !== categoryIds.length) {
      throw new NotFoundException('One or more categories were not found');
    }

    if (variantCount !== variantIds.length) {
      throw new NotFoundException('One or more variants were not found');
    }
  }

  private ensureNoDuplicateTargetsInPayload(targets: NormalizedOfferTarget[]) {
    const seenTargets = new Set<string>();

    for (const target of targets) {
      if (seenTargets.has(target.duplicateKey)) {
        throw new BadRequestException(
          `Duplicate target in request: ${target.duplicateKey}`,
        );
      }

      seenTargets.add(target.duplicateKey);
    }
  }

  private async ensureTargetIsNotDuplicate(
    offerId: string,
    target: NormalizedOfferTarget,
  ) {
    const existingTarget = await this.prisma.offerTarget.findFirst({
      where: {
        offerId,
        productId: target.productId ?? undefined,
        categoryId: target.categoryId ?? undefined,
        variantId: target.variantId ?? undefined,
      },
      select: {
        id: true,
      },
    });

    if (existingTarget) {
      throw new ConflictException('Offer target already exists');
    }
  }

  private async ensureTargetsAreNotDuplicates(
    offerId: string,
    targets: NormalizedOfferTarget[],
  ) {
    const existingTargets = await this.prisma.offerTarget.findMany({
      where: {
        offerId,
        OR: targets.map((target) => ({
          productId: target.productId ?? undefined,
          categoryId: target.categoryId ?? undefined,
          variantId: target.variantId ?? undefined,
        })),
      },
      include: this.getOfferTargetInclude(),
    });

    if (existingTargets.length) {
      const duplicateTargets = existingTargets
        .map((target) => this.toOfferTargetView(target).targetKey)
        .join(', ');

      throw new ConflictException(
        `One or more offer targets already exist: ${duplicateTargets}`,
      );
    }
  }

  private handleDuplicateTargetError(error: unknown): void {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Offer target already exists');
    }
  }

  private async validateCreatePayload(dto: CreateOfferDto) {
    if (dto.type === OfferType.PERCENTAGE) {
      this.validatePercentageValue(dto.value);
      this.rejectBuyXGetYFields(dto);
      return;
    }

    if (dto.type === OfferType.FIXED_AMOUNT) {
      this.validateFixedAmountValue(dto.value);
      this.rejectBuyXGetYFields(dto);
      return;
    }

    if (dto.type === OfferType.BUY_X_GET_Y) {
      if (dto.value !== undefined && dto.value !== null) {
        throw new BadRequestException(
          'value is not supported for BUY_X_GET_Y offers',
        );
      }

      if (!dto.buyQuantity || !dto.getQuantity) {
        throw new BadRequestException(
          'buyQuantity and getQuantity are required for BUY_X_GET_Y offers',
        );
      }

      await this.validateRewardTargets(
        this.nullableTrim(dto.rewardProductId),
        this.nullableTrim(dto.rewardVariantId),
      );
    }
  }

  private async validateBuyXGetYUpdatePayload(
    dto: UpdateOfferDto,
    config: {
      buyQuantity: number;
      getQuantity: number;
      rewardProductId: string | null;
      rewardVariantId: string | null;
    } | null,
  ) {
    if (dto.value !== undefined && dto.value !== null) {
      throw new BadRequestException(
        'value is not supported for BUY_X_GET_Y offers',
      );
    }

    const rewardProductId =
      dto.rewardProductId === undefined
        ? (config?.rewardProductId ?? null)
        : this.nullableTrim(dto.rewardProductId);
    const rewardVariantId =
      dto.rewardVariantId === undefined
        ? (config?.rewardVariantId ?? null)
        : this.nullableTrim(dto.rewardVariantId);

    await this.validateRewardTargets(rewardProductId, rewardVariantId);
  }

  private validateDiscountOfferUpdatePayload(
    dto: UpdateOfferDto,
    type: OfferType,
  ) {
    this.rejectBuyXGetYFields(dto);

    if (dto.value === undefined) {
      return;
    }

    if (type === OfferType.PERCENTAGE) {
      this.validatePercentageValue(dto.value);
      return;
    }

    this.validateFixedAmountValue(dto.value);
  }

  private validatePercentageValue(value: number | null | undefined) {
    if (value === undefined || value === null) {
      throw new BadRequestException('value is required for PERCENTAGE offers');
    }

    if (value <= 0 || value > 100) {
      throw new BadRequestException(
        'PERCENTAGE offer value must be greater than 0 and no more than 100',
      );
    }
  }

  private validateFixedAmountValue(value: number | null | undefined) {
    if (value === undefined || value === null) {
      throw new BadRequestException(
        'value is required for FIXED_AMOUNT offers',
      );
    }

    if (value <= 0) {
      throw new BadRequestException(
        'FIXED_AMOUNT offer value must be greater than 0',
      );
    }
  }

  private rejectBuyXGetYFields(dto: CreateOfferDto | UpdateOfferDto) {
    if (this.hasBuyXGetYFields(dto)) {
      throw new BadRequestException(
        'BUY_X_GET_Y fields are only supported for BUY_X_GET_Y offers',
      );
    }
  }

  private rejectTypeChange(dto: UpdateOfferDto) {
    if ('type' in dto) {
      throw new BadRequestException('Offer type cannot be changed');
    }
  }

  private hasBuyXGetYFields(dto: CreateOfferDto | UpdateOfferDto) {
    return (
      dto.buyQuantity !== undefined ||
      dto.getQuantity !== undefined ||
      dto.rewardProductId !== undefined ||
      dto.rewardVariantId !== undefined
    );
  }

  private async validateRewardTargets(
    rewardProductId: string | null,
    rewardVariantId: string | null,
  ) {
    if (rewardProductId && rewardVariantId) {
      throw new BadRequestException(
        'Only one reward target can be selected for BUY_X_GET_Y offers',
      );
    }

    if (rewardProductId) {
      const productCount = await this.prisma.product.count({
        where: {
          id: rewardProductId,
          deletedAt: null,
        },
      });

      if (!productCount) {
        throw new NotFoundException('Reward product not found');
      }
    }

    if (rewardVariantId) {
      const variantCount = await this.prisma.productVariant.count({
        where: {
          id: rewardVariantId,
          deletedAt: null,
        },
      });

      if (!variantCount) {
        throw new NotFoundException('Reward variant not found');
      }
    }
  }

  private validateDateRange(
    startAt: string | Date | null | undefined,
    endAt: string | Date | null | undefined,
  ) {
    if (!startAt || !endAt) {
      return;
    }

    const startDate = startAt instanceof Date ? startAt : new Date(startAt);
    const endDate = endAt instanceof Date ? endAt : new Date(endAt);

    if (endDate <= startDate) {
      throw new BadRequestException('endAt must be later than startAt');
    }
  }

  private async ensureOfferExists(id: string) {
    const offer = await this.prisma.offer.findUnique({
      where: {
        id,
      },
      include: {
        buyXGetYConfig: true,
      },
    });

    if (!offer) {
      throw new NotFoundException('Offer not found');
    }

    return offer;
  }

  private buildOfferWhere(query: OfferQueryDto) {
    return {
      ...(query.search?.trim() && {
        OR: [
          {
            name: {
              contains: query.search.trim(),
              mode: 'insensitive' as const,
            },
          },
          {
            description: {
              contains: query.search.trim(),
              mode: 'insensitive' as const,
            },
          },
        ],
      }),
      ...(query.type && {
        type: query.type,
      }),
      ...(query.isActive !== undefined && {
        isActive: query.isActive === 'true',
      }),
      ...(query.startAt && {
        startAt: {
          gte: new Date(query.startAt),
        },
      }),
      ...(query.endAt && {
        endAt: {
          lte: new Date(query.endAt),
        },
      }),
    };
  }

  private buildOfferUpdateData(dto: UpdateOfferDto, type: OfferType) {
    return {
      ...(dto.name !== undefined && {
        name: dto.name.trim(),
      }),
      ...(dto.description !== undefined && {
        description: this.nullableTrim(dto.description),
      }),
      ...(dto.value !== undefined && {
        value: type === OfferType.BUY_X_GET_Y ? null : dto.value,
      }),
      ...(dto.maxDiscountAmount !== undefined && {
        maxDiscountAmount: dto.maxDiscountAmount,
      }),
      ...(dto.startAt !== undefined && {
        startAt: this.toNullableDate(dto.startAt),
      }),
      ...(dto.endAt !== undefined && {
        endAt: this.toNullableDate(dto.endAt),
      }),
      ...(dto.isActive !== undefined && {
        isActive: dto.isActive,
      }),
      ...(dto.priority !== undefined && {
        priority: dto.priority,
      }),
    };
  }

  private getOfferInclude() {
    return {
      buyXGetYConfig: {
        include: {
          rewardProduct: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          rewardVariant: {
            select: {
              id: true,
              sku: true,
              productId: true,
            },
          },
        },
      },
      targets: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          variant: {
            select: {
              id: true,
              sku: true,
              productId: true,
            },
          },
        },
      },
    };
  }

  private getOfferTargetInclude() {
    return {
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      variant: {
        select: {
          id: true,
          sku: true,
          productId: true,
        },
      },
    };
  }

  private toOfferDetail<T extends OfferDetailInput>(offer: T) {
    return {
      ...offer,
      targets: offer.targets.map((target) => this.toOfferTargetView(target)),
    };
  }

  private toOfferTargetView(target: OfferTargetViewInput) {
    const targetType = this.getOfferTargetType(target);

    return {
      ...target,
      targetType,
      targetKey: targetType
        ? `${targetType}:${this.getOfferTargetId(target)}`
        : null,
    };
  }

  private getOfferTargetType(target: OfferTargetViewInput) {
    if (target.productId) {
      return 'PRODUCT';
    }

    if (target.categoryId) {
      return 'CATEGORY';
    }

    if (target.variantId) {
      return 'VARIANT';
    }

    return null;
  }

  private getOfferTargetId(target: OfferTargetViewInput) {
    return target.productId ?? target.categoryId ?? target.variantId;
  }

  private uniqueValues(values: Array<string | null>) {
    return [
      ...new Set(values.filter((value): value is string => Boolean(value))),
    ];
  }

  private nullableTrim(value: string | null | undefined): string | null {
    const trimmed = value?.trim();

    return trimmed || null;
  }

  private toNullableDate(value: string | Date | null | undefined): Date | null {
    if (!value) {
      return null;
    }

    return value instanceof Date ? value : new Date(value);
  }

  private getPositiveInteger(value: string | undefined, fallback: number) {
    const parsedValue = Number(value);

    return Number.isInteger(parsedValue) && parsedValue > 0
      ? parsedValue
      : fallback;
  }
}
