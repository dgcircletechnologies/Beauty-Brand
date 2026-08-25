import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { AttributeDataType } from '../../generated/prisma/enums.cjs';
import { PrismaService } from '../database/prisma.service';
import { CreateAttributeDefinitionDto } from './dto/create-attribute-definition.dto';
import { UpdateAttributeDefinitionDto } from './dto/update-attribute-definition.dto';

@Injectable()
export class AttributeDefinitionService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateAttributeDefinitionDto) {
    return this.prisma.attributeDefinition
      .create({
        data: {
          name: dto.name.trim(),
          slug: this.normalizeSlug(dto.slug),
          description: this.nullableTrim(dto.description),
          dataType: dto.dataType,
          isActive: dto.isActive ?? true,
        },
      })
      .catch((error: unknown) => {
        this.handleUniqueSlugError(error);
        throw error;
      });
  }

  async findAll(query?: {
    page?: string;
    pageSize?: string;
    search?: string;
    status?: string;
    dataType?: string;
  }) {
    if (!query?.page && !query?.pageSize) {
      return this.prisma.attributeDefinition.findMany({
        where: {
          deletedAt: null,
        },
        orderBy: {
          name: 'asc',
        },
      });
    }

    const page = this.getPositiveInteger(query.page, 1);
    const pageSize = Math.min(this.getPositiveInteger(query.pageSize, 10), 50);
    const where = {
      deletedAt: null,
      ...(query.search?.trim() && {
        OR: [
          {
            name: {
              contains: query.search.trim(),
              mode: 'insensitive' as const,
            },
          },
          {
            slug: {
              contains: query.search.trim().toLowerCase(),
              mode: 'insensitive' as const,
            },
          },
        ],
      }),
      ...(query.status === 'active' && {
        isActive: true,
      }),
      ...(query.status === 'inactive' && {
        isActive: false,
      }),
      ...(this.isAttributeDataType(query.dataType) && {
        dataType: query.dataType,
      }),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.attributeDefinition.findMany({
        where,
        orderBy: {
          name: 'asc',
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.attributeDefinition.count({
        where,
      }),
    ]);
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    return {
      items,
      total,
      page,
      pageSize,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };
  }

  findAllUnpaginated() {
    return this.prisma.attributeDefinition.findMany({
      where: {
        deletedAt: null,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async findOne(id: string) {
    return this.getActiveAttributeById(id);
  }

  async checkSlugAvailability(slug: string, excludeId?: string) {
    const normalizedSlug = this.normalizeSlug(slug);
    const attribute = await this.prisma.attributeDefinition.findUnique({
      where: {
        slug: normalizedSlug,
      },
      select: {
        id: true,
        name: true,
        deletedAt: true,
      },
    });

    const isAvailable = !attribute || attribute.id === excludeId;

    return {
      slug: normalizedSlug,
      available: isAvailable,
      attribute: attribute
        ? {
            id: attribute.id,
            name: attribute.name,
            deletedAt: attribute.deletedAt,
          }
        : null,
    };
  }

  async update(id: string, dto: UpdateAttributeDefinitionDto) {
    await this.getActiveAttributeById(id);

    return this.prisma.attributeDefinition.update({
      where: {
        id,
      },
      data: {
        ...(dto.name !== undefined && {
          name: dto.name.trim(),
        }),
        ...(dto.description !== undefined && {
          description: this.nullableTrim(dto.description),
        }),
      },
    });
  }

  async setActive(id: string, isActive: boolean) {
    await this.getActiveAttributeById(id);

    return this.prisma.attributeDefinition.update({
      where: {
        id,
      },
      data: {
        isActive,
      },
    });
  }

  async softDelete(id: string) {
    await this.getActiveAttributeById(id);

    return this.prisma.attributeDefinition.update({
      where: {
        id,
      },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });
  }

  async ensureActiveAttributeExists(id: string) {
    await this.getActiveAttributeById(id);
  }

  private async getActiveAttributeById(id: string) {
    const attribute = await this.prisma.attributeDefinition.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        attributeOptions: {
          where: {
            deletedAt: null,
          },
          orderBy: {
            sortOrder: 'asc',
          },
        },
      },
    });

    if (!attribute) {
      throw new NotFoundException('Attribute definition not found');
    }

    return attribute;
  }

  private normalizeSlug(slug: string): string {
    return slug.trim().toLowerCase();
  }

  private nullableTrim(value: string | undefined): string | null {
    const trimmed = value?.trim();

    return trimmed || null;
  }

  private getPositiveInteger(value: string | undefined, fallback: number) {
    const parsedValue = Number(value);

    return Number.isInteger(parsedValue) && parsedValue > 0
      ? parsedValue
      : fallback;
  }

  private isAttributeDataType(
    value: string | undefined,
  ): value is AttributeDataType {
    return (
      value === AttributeDataType.TEXT ||
      value === AttributeDataType.NUMBER ||
      value === AttributeDataType.BOOLEAN ||
      value === AttributeDataType.SELECT ||
      value === AttributeDataType.MULTI_SELECT
    );
  }

  private handleUniqueSlugError(error: unknown): void {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('An attribute with this slug already exists');
    }
  }
}
