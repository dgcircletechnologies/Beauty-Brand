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
export class ProductAttributeValueService {
  constructor(private readonly prisma: PrismaService) {}

  async set(productId: string, dto: SetProductAttributeValueDto) {
    await this.ensureActiveProductExists(productId);

    const attribute = await this.getActiveAttribute(dto.attributeId);
    const valueRows = await this.buildValueRows(attribute, dto);

    return this.prisma.$transaction(async (tx) => {
      await tx.productAttributeValue.deleteMany({
        where: {
          productId,
          attributeId: dto.attributeId,
        },
      });

      for (const valueRow of valueRows) {
        await tx.productAttributeValue.create({
          data: {
            productId,
            attributeId: dto.attributeId,
            ...valueRow,
          },
        });
      }

      return tx.productAttributeValue.findMany({
        where: {
          productId,
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

  async findByProduct(productId: string) {
    await this.ensureActiveProductExists(productId);

    return this.prisma.productAttributeValue.findMany({
      where: {
        productId,
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

  async remove(productId: string, attributeId: string) {
    await this.ensureActiveProductExists(productId);

    const result = await this.prisma.productAttributeValue.deleteMany({
      where: {
        productId,
        attributeId,
      },
    });

    if (result.count === 0) {
      throw new NotFoundException('Product attribute value not found');
    }

    return {
      deleted: true,
      count: result.count,
    };
  }

  private async ensureActiveProductExists(productId: string) {
    const product = await this.prisma.product.findFirst({
      where: {
        id: productId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
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
