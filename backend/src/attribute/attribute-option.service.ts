import {
  ConflictException,
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { AttributeDataType } from '../../generated/prisma/enums.cjs';
import { PrismaService } from '../database/prisma.service';
import { CreateAttributeOptionDto } from './dto/create-attribute-option.dto';
import { UpdateAttributeOptionDto } from './dto/update-attribute-option.dto';

@Injectable()
export class AttributeOptionService {
  constructor(private readonly prisma: PrismaService) {}

  async create(attributeDefinitionId: string, dto: CreateAttributeOptionDto) {
    await this.ensureActiveAttributeExists(attributeDefinitionId);

    return this.prisma.attributeOption
      .create({
        data: {
          attributeDefinitionId,
          label: dto.label.trim(),
          value: this.normalizeValue(dto.value),
          sortOrder: dto.sortOrder ?? 0,
          isActive: dto.isActive ?? true,
        },
      })
      .catch((error: unknown) => {
        this.handleUniqueOptionError(error);
        throw error;
      });
  }

  async findByAttribute(
    attributeDefinitionId: string,
    query?: {
      page?: string;
      pageSize?: string;
      search?: string;
      status?: string;
    },
  ) {
    await this.ensureActiveAttributeExists(attributeDefinitionId);

    if (!query?.page && !query?.pageSize) {
      return this.prisma.attributeOption.findMany({
        where: {
          attributeDefinitionId,
          deletedAt: null,
        },
        orderBy: [
          {
            sortOrder: 'asc',
          },
          {
            label: 'asc',
          },
        ],
      });
    }

    const page = this.getPositiveInteger(query.page, 1);
    const pageSize = Math.min(this.getPositiveInteger(query.pageSize, 10), 50);
    const where = {
      attributeDefinitionId,
      deletedAt: null,
      ...(query.search?.trim() && {
        OR: [
          {
            label: {
              contains: query.search.trim(),
              mode: 'insensitive' as const,
            },
          },
          {
            value: {
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
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.attributeOption.findMany({
        where,
        orderBy: [
          {
            sortOrder: 'asc',
          },
          {
            label: 'asc',
          },
        ],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.attributeOption.count({
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

  async checkValueAvailability(
    attributeDefinitionId: string,
    value: string,
  ) {
    await this.ensureActiveAttributeExists(attributeDefinitionId);

    const normalizedValue = this.normalizeValue(value);
    const option = await this.prisma.attributeOption.findUnique({
      where: {
        attributeDefinitionId_value: {
          attributeDefinitionId,
          value: normalizedValue,
        },
      },
      select: {
        id: true,
        label: true,
        deletedAt: true,
      },
    });

    return {
      value: normalizedValue,
      available: !option,
      option: option
        ? {
            id: option.id,
            label: option.label,
            deletedAt: option.deletedAt,
          }
        : null,
    };
  }

  async findOne(attributeDefinitionId: string, optionId: string) {
    return this.getActiveOption(attributeDefinitionId, optionId);
  }

  async update(
    attributeDefinitionId: string,
    optionId: string,
    dto: UpdateAttributeOptionDto,
  ) {
    await this.getActiveOption(attributeDefinitionId, optionId);

    return this.prisma.attributeOption
      .update({
        where: {
          id: optionId,
        },
        data: {
          ...(dto.label !== undefined && {
            label: dto.label.trim(),
          }),
          ...(dto.sortOrder !== undefined && {
            sortOrder: dto.sortOrder,
          }),
        },
      })
      .catch((error: unknown) => {
        this.handleUniqueOptionError(error);
        throw error;
      });
  }

  async setActive(
    attributeDefinitionId: string,
    optionId: string,
    isActive: boolean,
  ) {
    await this.getActiveOption(attributeDefinitionId, optionId);

    return this.prisma.attributeOption.update({
      where: {
        id: optionId,
      },
      data: {
        isActive,
      },
    });
  }

  async softDelete(attributeDefinitionId: string, optionId: string) {
    await this.getActiveOption(attributeDefinitionId, optionId);

    return this.prisma.attributeOption.update({
      where: {
        id: optionId,
      },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });
  }

  private async ensureActiveAttributeExists(id: string) {
    const attribute = await this.prisma.attributeDefinition.findFirst({
      where: {
        id,
        deletedAt: null,
        isActive: true,
      },
      select: {
        id: true,
        dataType: true,
      },
    });

    if (!attribute) {
      throw new NotFoundException('Attribute definition not found');
    }

    if (
      attribute.dataType !== AttributeDataType.SELECT &&
      attribute.dataType !== AttributeDataType.MULTI_SELECT
    ) {
      throw new BadRequestException(
        'Options can only be created for SELECT or MULTI_SELECT attributes',
      );
    }
  }

  private async getActiveOption(
    attributeDefinitionId: string,
    optionId: string,
  ) {
    const option = await this.prisma.attributeOption.findFirst({
      where: {
        id: optionId,
        attributeDefinitionId,
        deletedAt: null,
      },
    });

    if (!option) {
      throw new NotFoundException('Attribute option not found');
    }

    return option;
  }

  private normalizeValue(value: string): string {
    return value.trim().toLowerCase();
  }

  private getPositiveInteger(value: string | undefined, fallback: number) {
    const parsedValue = Number(value);

    return Number.isInteger(parsedValue) && parsedValue > 0
      ? parsedValue
      : fallback;
  }

  private handleUniqueOptionError(error: unknown): void {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(
        'An option with this value already exists for this attribute',
      );
    }
  }
}
