import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

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

  findAll() {
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

  async update(id: string, dto: UpdateAttributeDefinitionDto) {
    await this.getActiveAttributeById(id);

    return this.prisma.attributeDefinition
      .update({
        where: {
          id,
        },
        data: {
          ...(dto.name !== undefined && {
            name: dto.name.trim(),
          }),
          ...(dto.slug !== undefined && {
            slug: this.normalizeSlug(dto.slug),
          }),
          ...(dto.description !== undefined && {
            description: this.nullableTrim(dto.description),
          }),
          ...(dto.dataType !== undefined && {
            dataType: dto.dataType,
          }),
          ...(dto.isActive !== undefined && {
            isActive: dto.isActive,
          }),
        },
      })
      .catch((error: unknown) => {
        this.handleUniqueSlugError(error);
        throw error;
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
