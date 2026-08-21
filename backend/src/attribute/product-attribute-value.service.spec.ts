import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { AttributeDataType } from '../../generated/prisma/enums.cjs';
import { PrismaService } from '../database/prisma.service';
import { ProductAttributeValueService } from './product-attribute-value.service';

type ProductAttributeValueDelegateMock = {
  create: jest.Mock;
  deleteMany: jest.Mock;
  findMany: jest.Mock;
};

type ProductAttributeValueTransactionMock = {
  productAttributeValue: ProductAttributeValueDelegateMock;
};

describe('ProductAttributeValueService', () => {
  let service: ProductAttributeValueService;
  const product = {
    findFirst: jest.fn(),
  };
  const attributeDefinition = {
    findFirst: jest.fn(),
  };
  const attributeOption = {
    findFirst: jest.fn(),
  };
  const productAttributeValue: ProductAttributeValueDelegateMock = {
    create: jest.fn(),
    deleteMany: jest.fn(),
    findMany: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const runTransaction = <T>(
      callback: (tx: ProductAttributeValueTransactionMock) => T,
    ) =>
      callback({
        productAttributeValue,
      });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductAttributeValueService,
        {
          provide: PrismaService,
          useValue: {
            product,
            attributeDefinition,
            attributeOption,
            productAttributeValue,
            $transaction: jest.fn(runTransaction),
          },
        },
      ],
    }).compile();

    service = module.get<ProductAttributeValueService>(
      ProductAttributeValueService,
    );
  });

  it('sets a text product attribute value', async () => {
    const expectedValues = [
      {
        id: 'value_1',
        textValue: 'Gentle',
      },
    ];

    product.findFirst.mockResolvedValue({
      id: 'product_1',
    });
    attributeDefinition.findFirst.mockResolvedValue({
      id: 'attribute_1',
      dataType: AttributeDataType.TEXT,
    });
    productAttributeValue.findMany.mockResolvedValue(expectedValues);

    await expect(
      service.set('product_1', {
        attributeId: 'attribute_1',
        textValue: ' Gentle ',
      }),
    ).resolves.toBe(expectedValues);

    expect(productAttributeValue.deleteMany).toHaveBeenCalledWith({
      where: {
        productId: 'product_1',
        attributeId: 'attribute_1',
      },
    });
    expect(productAttributeValue.create).toHaveBeenCalledWith({
      data: {
        productId: 'product_1',
        attributeId: 'attribute_1',
        textValue: 'Gentle',
      },
    });
  });

  it('sets a select product attribute value', async () => {
    product.findFirst.mockResolvedValue({
      id: 'product_1',
    });
    attributeDefinition.findFirst.mockResolvedValue({
      id: 'attribute_1',
      dataType: AttributeDataType.SELECT,
    });
    attributeOption.findFirst.mockResolvedValue({
      id: 'option_1',
    });
    productAttributeValue.findMany.mockResolvedValue([]);

    await service.set('product_1', {
      attributeId: 'attribute_1',
      optionId: 'option_1',
    });

    expect(attributeOption.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'option_1',
        attributeDefinitionId: 'attribute_1',
        deletedAt: null,
        isActive: true,
      },
      select: {
        id: true,
      },
    });
    expect(productAttributeValue.create).toHaveBeenCalledWith({
      data: {
        productId: 'product_1',
        attributeId: 'attribute_1',
        optionId: 'option_1',
      },
    });
  });

  it('sets multi-select values as multiple rows', async () => {
    product.findFirst.mockResolvedValue({
      id: 'product_1',
    });
    attributeDefinition.findFirst.mockResolvedValue({
      id: 'attribute_1',
      dataType: AttributeDataType.MULTI_SELECT,
    });
    attributeOption.findFirst.mockResolvedValue({
      id: 'option',
    });
    productAttributeValue.findMany.mockResolvedValue([]);

    await service.set('product_1', {
      attributeId: 'attribute_1',
      optionIds: ['option_1', 'option_2', 'option_1'],
    });

    expect(productAttributeValue.create).toHaveBeenCalledTimes(2);
    expect(productAttributeValue.create).toHaveBeenNthCalledWith(1, {
      data: {
        productId: 'product_1',
        attributeId: 'attribute_1',
        optionId: 'option_1',
      },
    });
    expect(productAttributeValue.create).toHaveBeenNthCalledWith(2, {
      data: {
        productId: 'product_1',
        attributeId: 'attribute_1',
        optionId: 'option_2',
      },
    });
  });

  it('rejects wrong value type for text attributes', async () => {
    product.findFirst.mockResolvedValue({
      id: 'product_1',
    });
    attributeDefinition.findFirst.mockResolvedValue({
      id: 'attribute_1',
      dataType: AttributeDataType.TEXT,
    });

    await expect(
      service.set('product_1', {
        attributeId: 'attribute_1',
        numberValue: 10,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
