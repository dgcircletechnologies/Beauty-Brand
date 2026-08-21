import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { AttributeDataType } from '../../generated/prisma/enums.cjs';
import { PrismaService } from '../database/prisma.service';
import { SetProductAttributeValueDto } from './dto/set-product-attribute-value.dto';

type AttributeForValue = {
  id: string;
  dataType: AttributeDataType;
};

@Injectable()
export class VariantAttributeValueService {
  constructor(private readonly prisma: PrismaService) {}

  async set(
    productId: string,
    variantId: string,
    dto: SetProductAttributeValueDto,
  ) {
    await this.ensureActiveVariantExists(productId, variantId);

    const attribute = await this.getActiveAttribute(dto.attributeId);
    const valueRows = await this.buildValueRows(attribute, dto);

    return this.prisma.$transaction(async (tx) => {
      await tx.variantAttributeValue.deleteMany({
        where: {
          variantId,
          attributeId: dto.attributeId,
        },
      });

      for (const valueRow of valueRows) {
        await tx.variantAttributeValue.create({
          data: {
            variantId,
            attributeId: dto.attributeId,
            ...valueRow,
          },
        });
      }

      return tx.variantAttributeValue.findMany({
        where: {
          variantId,
          attributeId: dto.attributeId,
        },
        include: {
          attribute: true,
          option: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
      });
    });
  }

  async findByVariant(productId: string, variantId: string) {
    await this.ensureActiveVariantExists(productId, variantId);

    return this.prisma.variantAttributeValue.findMany({
      where: {
        variantId,
      },
      include: {
        attribute: true,
        option: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async remove(productId: string, variantId: string, attributeId: string) {
    await this.ensureActiveVariantExists(productId, variantId);

    const result = await this.prisma.variantAttributeValue.deleteMany({
      where: {
        variantId,
        attributeId,
      },
    });

    if (result.count === 0) {
      throw new NotFoundException('Variant attribute value not found');
    }

    return {
      deleted: true,
      count: result.count,
    };
  }

  private async ensureActiveVariantExists(
    productId: string,
    variantId: string,
  ) {
    const variant = await this.prisma.productVariant.findFirst({
      where: {
        id: variantId,
        productId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!variant) {
      throw new NotFoundException('Product variant not found');
    }
  }

  private async getActiveAttribute(
    attributeId: string,
  ): Promise<AttributeForValue> {
    const attribute = await this.prisma.attributeDefinition.findFirst({
      where: {
        id: attributeId,
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

    return attribute;
  }

  private async ensureActiveOptionBelongsToAttribute(
    attributeId: string,
    optionId: string,
  ) {
    const option = await this.prisma.attributeOption.findFirst({
      where: {
        id: optionId,
        attributeDefinitionId: attributeId,
        deletedAt: null,
        isActive: true,
      },
      select: {
        id: true,
      },
    });

    if (!option) {
      throw new BadRequestException(
        'Attribute option does not belong to this attribute',
      );
    }
  }

  private async buildValueRows(
    attribute: AttributeForValue,
    dto: SetProductAttributeValueDto,
  ) {
    switch (attribute.dataType) {
      case AttributeDataType.TEXT:
        if (!dto.textValue?.trim()) {
          throw new BadRequestException(
            'textValue is required for TEXT attributes',
          );
        }

        return [
          {
            textValue: dto.textValue.trim(),
          },
        ];

      case AttributeDataType.NUMBER:
        if (dto.numberValue === undefined) {
          throw new BadRequestException(
            'numberValue is required for NUMBER attributes',
          );
        }

        return [
          {
            numberValue: dto.numberValue,
          },
        ];

      case AttributeDataType.BOOLEAN:
        if (dto.booleanValue === undefined) {
          throw new BadRequestException(
            'booleanValue is required for BOOLEAN attributes',
          );
        }

        return [
          {
            booleanValue: dto.booleanValue,
          },
        ];

      case AttributeDataType.SELECT:
        if (!dto.optionId) {
          throw new BadRequestException(
            'optionId is required for SELECT attributes',
          );
        }

        await this.ensureActiveOptionBelongsToAttribute(
          attribute.id,
          dto.optionId,
        );

        return [
          {
            optionId: dto.optionId,
          },
        ];

      case AttributeDataType.MULTI_SELECT: {
        const optionIds = [...new Set(dto.optionIds ?? [])];

        if (optionIds.length === 0) {
          throw new BadRequestException(
            'optionIds is required for MULTI_SELECT attributes',
          );
        }

        for (const optionId of optionIds) {
          await this.ensureActiveOptionBelongsToAttribute(
            attribute.id,
            optionId,
          );
        }

        return optionIds.map((optionId) => ({
          optionId,
        }));
      }
    }
  }
}
