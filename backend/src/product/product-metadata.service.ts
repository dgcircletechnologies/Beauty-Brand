import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../database/prisma.service';
import {
  CreateAgeGroupDto,
  CreateIngredientDto,
  CreateProductMetadataDto,
} from './dto/create-product-metadata.dto';
import {
  UpdateAgeGroupDto,
  UpdateIngredientDto,
  UpdateProductMetadataDto,
} from './dto/update-product-metadata.dto';

export type ProductMetadataResource =
  | 'ingredients'
  | 'audiences'
  | 'skin-types'
  | 'age-groups'
  | 'hair-profiles'
  | 'concerns'
  | 'benefits'
  | 'tags';

type ProductMetadataEntity =
  | 'ingredient'
  | 'audience'
  | 'skin type'
  | 'age group'
  | 'hair profile'
  | 'concern'
  | 'benefit'
  | 'tag';

@Injectable()
export class ProductMetadataService {
  constructor(private readonly prisma: PrismaService) {}

  findAllMetadataOptions() {
    const activeWhere = {
      deletedAt: null,
      isActive: true,
    };

    const orderBy = {
      name: 'asc' as const,
    };

    return Promise.all([
      this.prisma.ingredient.findMany({
        where: activeWhere,
        orderBy,
      }),
      this.prisma.audience.findMany({
        where: activeWhere,
        orderBy,
      }),
      this.prisma.skinType.findMany({
        where: activeWhere,
        orderBy,
      }),
      this.prisma.ageGroup.findMany({
        where: activeWhere,
        orderBy,
      }),
      this.prisma.hairProfile.findMany({
        where: activeWhere,
        orderBy,
      }),
      this.prisma.concern.findMany({
        where: activeWhere,
        orderBy,
      }),
      this.prisma.benefit.findMany({
        where: activeWhere,
        orderBy,
      }),
      this.prisma.tag.findMany({
        where: activeWhere,
        orderBy,
      }),
      this.prisma.category.findMany({
        where: activeWhere,
        orderBy,
      }),
    ]).then(
      ([
        ingredients,
        audiences,
        skinTypes,
        ageGroups,
        hairProfiles,
        concerns,
        benefits,
        tags,
        categories,
      ]) => ({
        ingredients,
        audiences,
        skinTypes,
        ageGroups,
        hairProfiles,
        concerns,
        benefits,
        tags,
        categories,
      }),
    );
  }

  createIngredient(dto: CreateIngredientDto) {
    return this.prisma.ingredient
      .create({
        data: {
          ...this.getCreateData(dto),
          inciName: this.nullableTrim(dto.inciName),
          benefits: this.nullableTrim(dto.benefits),
          warnings: this.nullableTrim(dto.warnings),
        },
      })
      .catch((error: unknown) => {
        this.handleUniqueSlugError(error, 'ingredient');
        throw error;
      });
  }

  findAllIngredients() {
    return this.prisma.ingredient.findMany({
      where: {
        deletedAt: null,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async findIngredient(id: string) {
    const ingredient = await this.prisma.ingredient.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!ingredient) {
      throw new NotFoundException('Ingredient not found');
    }

    return ingredient;
  }

  async updateIngredient(id: string, dto: UpdateIngredientDto) {
    await this.findIngredient(id);

    return this.prisma.ingredient
      .update({
        where: {
          id,
        },
        data: {
          ...this.getUpdateData(dto),
          ...(dto.inciName !== undefined && {
            inciName: this.nullableTrim(dto.inciName),
          }),
          ...(dto.benefits !== undefined && {
            benefits: this.nullableTrim(dto.benefits),
          }),
          ...(dto.warnings !== undefined && {
            warnings: this.nullableTrim(dto.warnings),
          }),
        },
      })
      .catch((error: unknown) => {
        this.handleUniqueSlugError(error, 'ingredient');
        throw error;
      });
  }

  async softDeleteIngredient(id: string) {
    await this.findIngredient(id);

    return this.prisma.ingredient.update({
      where: {
        id,
      },
      data: this.getSoftDeleteData(),
    });
  }

  createAgeGroup(dto: CreateAgeGroupDto) {
    this.ensureValidAgeRange(dto.minAge, dto.maxAge);

    return this.prisma.ageGroup
      .create({
        data: {
          ...this.getCreateData(dto),
          minAge: dto.minAge ?? null,
          maxAge: dto.maxAge ?? null,
        },
      })
      .catch((error: unknown) => {
        this.handleUniqueSlugError(error, 'age group');
        throw error;
      });
  }

  findAllAgeGroups() {
    return this.prisma.ageGroup.findMany({
      where: {
        deletedAt: null,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async findAgeGroup(id: string) {
    const ageGroup = await this.prisma.ageGroup.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!ageGroup) {
      throw new NotFoundException('Age group not found');
    }

    return ageGroup;
  }

  async updateAgeGroup(id: string, dto: UpdateAgeGroupDto) {
    const existingAgeGroup = await this.findAgeGroup(id);
    const minAge =
      dto.minAge !== undefined ? dto.minAge : existingAgeGroup.minAge;
    const maxAge =
      dto.maxAge !== undefined ? dto.maxAge : existingAgeGroup.maxAge;

    this.ensureValidAgeRange(minAge, maxAge);

    return this.prisma.ageGroup
      .update({
        where: {
          id,
        },
        data: {
          ...this.getUpdateData(dto),
          ...(dto.minAge !== undefined && {
            minAge: dto.minAge,
          }),
          ...(dto.maxAge !== undefined && {
            maxAge: dto.maxAge,
          }),
        },
      })
      .catch((error: unknown) => {
        this.handleUniqueSlugError(error, 'age group');
        throw error;
      });
  }

  async softDeleteAgeGroup(id: string) {
    await this.findAgeGroup(id);

    return this.prisma.ageGroup.update({
      where: {
        id,
      },
      data: this.getSoftDeleteData(),
    });
  }

  create(resource: ProductMetadataResource, dto: CreateProductMetadataDto) {
    switch (resource) {
      case 'audiences':
        return this.createAudience(dto);
      case 'skin-types':
        return this.createSkinType(dto);
      case 'hair-profiles':
        return this.createHairProfile(dto);
      case 'concerns':
        return this.createConcern(dto);
      case 'benefits':
        return this.createBenefit(dto);
      case 'tags':
        return this.createTag(dto);
      default:
        throw new BadRequestException('Unsupported metadata resource');
    }
  }

  findAll(resource: ProductMetadataResource) {
    switch (resource) {
      case 'audiences':
        return this.findAllAudiences();
      case 'skin-types':
        return this.findAllSkinTypes();
      case 'hair-profiles':
        return this.findAllHairProfiles();
      case 'concerns':
        return this.findAllConcerns();
      case 'benefits':
        return this.findAllBenefits();
      case 'tags':
        return this.findAllTags();
      default:
        throw new BadRequestException('Unsupported metadata resource');
    }
  }

  findOne(resource: ProductMetadataResource, id: string) {
    switch (resource) {
      case 'audiences':
        return this.findAudience(id);
      case 'skin-types':
        return this.findSkinType(id);
      case 'hair-profiles':
        return this.findHairProfile(id);
      case 'concerns':
        return this.findConcern(id);
      case 'benefits':
        return this.findBenefit(id);
      case 'tags':
        return this.findTag(id);
      default:
        throw new BadRequestException('Unsupported metadata resource');
    }
  }

  update(
    resource: ProductMetadataResource,
    id: string,
    dto: UpdateProductMetadataDto,
  ) {
    switch (resource) {
      case 'audiences':
        return this.updateAudience(id, dto);
      case 'skin-types':
        return this.updateSkinType(id, dto);
      case 'hair-profiles':
        return this.updateHairProfile(id, dto);
      case 'concerns':
        return this.updateConcern(id, dto);
      case 'benefits':
        return this.updateBenefit(id, dto);
      case 'tags':
        return this.updateTag(id, dto);
      default:
        throw new BadRequestException('Unsupported metadata resource');
    }
  }

  softDelete(resource: ProductMetadataResource, id: string) {
    switch (resource) {
      case 'audiences':
        return this.softDeleteAudience(id);
      case 'skin-types':
        return this.softDeleteSkinType(id);
      case 'hair-profiles':
        return this.softDeleteHairProfile(id);
      case 'concerns':
        return this.softDeleteConcern(id);
      case 'benefits':
        return this.softDeleteBenefit(id);
      case 'tags':
        return this.softDeleteTag(id);
      default:
        throw new BadRequestException('Unsupported metadata resource');
    }
  }

  private createAudience(dto: CreateProductMetadataDto) {
    return this.prisma.audience
      .create({
        data: this.getCreateData(dto),
      })
      .catch((error: unknown) => {
        this.handleUniqueSlugError(error, 'audience');
        throw error;
      });
  }

  private findAllAudiences() {
    return this.prisma.audience.findMany({
      where: {
        deletedAt: null,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  private async findAudience(id: string) {
    const audience = await this.prisma.audience.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!audience) {
      throw new NotFoundException('Audience not found');
    }

    return audience;
  }

  private async updateAudience(id: string, dto: UpdateProductMetadataDto) {
    await this.findAudience(id);

    return this.prisma.audience
      .update({
        where: {
          id,
        },
        data: this.getUpdateData(dto),
      })
      .catch((error: unknown) => {
        this.handleUniqueSlugError(error, 'audience');
        throw error;
      });
  }

  private async softDeleteAudience(id: string) {
    await this.findAudience(id);

    return this.prisma.audience.update({
      where: {
        id,
      },
      data: this.getSoftDeleteData(),
    });
  }

  private createSkinType(dto: CreateProductMetadataDto) {
    return this.prisma.skinType
      .create({
        data: this.getCreateData(dto),
      })
      .catch((error: unknown) => {
        this.handleUniqueSlugError(error, 'skin type');
        throw error;
      });
  }

  private findAllSkinTypes() {
    return this.prisma.skinType.findMany({
      where: {
        deletedAt: null,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  private async findSkinType(id: string) {
    const skinType = await this.prisma.skinType.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!skinType) {
      throw new NotFoundException('Skin type not found');
    }

    return skinType;
  }

  private async updateSkinType(id: string, dto: UpdateProductMetadataDto) {
    await this.findSkinType(id);

    return this.prisma.skinType
      .update({
        where: {
          id,
        },
        data: this.getUpdateData(dto),
      })
      .catch((error: unknown) => {
        this.handleUniqueSlugError(error, 'skin type');
        throw error;
      });
  }

  private async softDeleteSkinType(id: string) {
    await this.findSkinType(id);

    return this.prisma.skinType.update({
      where: {
        id,
      },
      data: this.getSoftDeleteData(),
    });
  }

  private createHairProfile(dto: CreateProductMetadataDto) {
    return this.prisma.hairProfile
      .create({
        data: this.getCreateData(dto),
      })
      .catch((error: unknown) => {
        this.handleUniqueSlugError(error, 'hair profile');
        throw error;
      });
  }

  private findAllHairProfiles() {
    return this.prisma.hairProfile.findMany({
      where: {
        deletedAt: null,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  private async findHairProfile(id: string) {
    const hairProfile = await this.prisma.hairProfile.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!hairProfile) {
      throw new NotFoundException('Hair profile not found');
    }

    return hairProfile;
  }

  private async updateHairProfile(id: string, dto: UpdateProductMetadataDto) {
    await this.findHairProfile(id);

    return this.prisma.hairProfile
      .update({
        where: {
          id,
        },
        data: this.getUpdateData(dto),
      })
      .catch((error: unknown) => {
        this.handleUniqueSlugError(error, 'hair profile');
        throw error;
      });
  }

  private async softDeleteHairProfile(id: string) {
    await this.findHairProfile(id);

    return this.prisma.hairProfile.update({
      where: {
        id,
      },
      data: this.getSoftDeleteData(),
    });
  }

  private createConcern(dto: CreateProductMetadataDto) {
    return this.prisma.concern
      .create({
        data: this.getCreateData(dto),
      })
      .catch((error: unknown) => {
        this.handleUniqueSlugError(error, 'concern');
        throw error;
      });
  }

  private findAllConcerns() {
    return this.prisma.concern.findMany({
      where: {
        deletedAt: null,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  private async findConcern(id: string) {
    const concern = await this.prisma.concern.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!concern) {
      throw new NotFoundException('Concern not found');
    }

    return concern;
  }

  private async updateConcern(id: string, dto: UpdateProductMetadataDto) {
    await this.findConcern(id);

    return this.prisma.concern
      .update({
        where: {
          id,
        },
        data: this.getUpdateData(dto),
      })
      .catch((error: unknown) => {
        this.handleUniqueSlugError(error, 'concern');
        throw error;
      });
  }

  private async softDeleteConcern(id: string) {
    await this.findConcern(id);

    return this.prisma.concern.update({
      where: {
        id,
      },
      data: this.getSoftDeleteData(),
    });
  }

  private createBenefit(dto: CreateProductMetadataDto) {
    return this.prisma.benefit
      .create({
        data: this.getCreateData(dto),
      })
      .catch((error: unknown) => {
        this.handleUniqueSlugError(error, 'benefit');
        throw error;
      });
  }

  private findAllBenefits() {
    return this.prisma.benefit.findMany({
      where: {
        deletedAt: null,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  private async findBenefit(id: string) {
    const benefit = await this.prisma.benefit.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!benefit) {
      throw new NotFoundException('Benefit not found');
    }

    return benefit;
  }

  private async updateBenefit(id: string, dto: UpdateProductMetadataDto) {
    await this.findBenefit(id);

    return this.prisma.benefit
      .update({
        where: {
          id,
        },
        data: this.getUpdateData(dto),
      })
      .catch((error: unknown) => {
        this.handleUniqueSlugError(error, 'benefit');
        throw error;
      });
  }

  private async softDeleteBenefit(id: string) {
    await this.findBenefit(id);

    return this.prisma.benefit.update({
      where: {
        id,
      },
      data: this.getSoftDeleteData(),
    });
  }

  private createTag(dto: CreateProductMetadataDto) {
    return this.prisma.tag
      .create({
        data: this.getTagCreateData(dto),
      })
      .catch((error: unknown) => {
        this.handleUniqueSlugError(error, 'tag');
        throw error;
      });
  }

  private findAllTags() {
    return this.prisma.tag.findMany({
      where: {
        deletedAt: null,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  private async findTag(id: string) {
    const tag = await this.prisma.tag.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!tag) {
      throw new NotFoundException('Tag not found');
    }

    return tag;
  }

  private async updateTag(id: string, dto: UpdateProductMetadataDto) {
    await this.findTag(id);

    return this.prisma.tag
      .update({
        where: {
          id,
        },
        data: this.getTagUpdateData(dto),
      })
      .catch((error: unknown) => {
        this.handleUniqueSlugError(error, 'tag');
        throw error;
      });
  }

  private async softDeleteTag(id: string) {
    await this.findTag(id);

    return this.prisma.tag.update({
      where: {
        id,
      },
      data: this.getSoftDeleteData(),
    });
  }

  private getCreateData(dto: CreateProductMetadataDto) {
    return {
      name: dto.name.trim(),
      slug: this.normalizeSlug(dto.slug),
      description: this.nullableTrim(dto.description),
      isActive: dto.isActive ?? true,
    };
  }

  private getUpdateData(dto: UpdateProductMetadataDto) {
    return {
      ...(dto.name !== undefined && {
        name: dto.name.trim(),
      }),
      ...(dto.slug !== undefined && {
        slug: this.normalizeSlug(dto.slug),
      }),
      ...(dto.description !== undefined && {
        description: this.nullableTrim(dto.description),
      }),
      ...(dto.isActive !== undefined && {
        isActive: dto.isActive,
      }),
    };
  }

  private getTagCreateData(dto: CreateProductMetadataDto) {
    return {
      name: dto.name.trim(),
      slug: this.normalizeSlug(dto.slug),
      isActive: dto.isActive ?? true,
    };
  }

  private getTagUpdateData(dto: UpdateProductMetadataDto) {
    return {
      ...(dto.name !== undefined && {
        name: dto.name.trim(),
      }),
      ...(dto.slug !== undefined && {
        slug: this.normalizeSlug(dto.slug),
      }),
      ...(dto.isActive !== undefined && {
        isActive: dto.isActive,
      }),
    };
  }

  private getSoftDeleteData() {
    return {
      deletedAt: new Date(),
      isActive: false,
    };
  }

  private ensureValidAgeRange(
    minAge: number | null | undefined,
    maxAge: number | null | undefined,
  ): void {
    if (
      minAge !== null &&
      minAge !== undefined &&
      maxAge !== null &&
      maxAge !== undefined &&
      minAge > maxAge
    ) {
      throw new BadRequestException(
        'minAge must be less than or equal to maxAge',
      );
    }
  }

  private normalizeSlug(slug: string): string {
    return slug.trim().toLowerCase();
  }

  private nullableTrim(value: string | null | undefined): string | null {
    const trimmed = value?.trim();

    return trimmed || null;
  }

  private handleUniqueSlugError(
    error: unknown,
    entity: ProductMetadataEntity,
  ): void {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(`A ${entity} with this slug already exists`);
    }
  }
}
