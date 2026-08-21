import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

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

  async findByAttribute(attributeDefinitionId: string) {
    await this.ensureActiveAttributeExists(attributeDefinitionId);

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
          ...(dto.value !== undefined && {
            value: this.normalizeValue(dto.value),
          }),
          ...(dto.sortOrder !== undefined && {
            sortOrder: dto.sortOrder,
          }),
          ...(dto.isActive !== undefined && {
            isActive: dto.isActive,
          }),
        },
      })
      .catch((error: unknown) => {
        this.handleUniqueOptionError(error);
        throw error;
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
      },
    });

    if (!attribute) {
      throw new NotFoundException('Attribute definition not found');
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
