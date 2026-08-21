import { Test, TestingModule } from '@nestjs/testing';

import { AttributeDataType } from '../../generated/prisma/enums.cjs';
import { PrismaService } from '../database/prisma.service';
import { VariantAttributeValueService } from './variant-attribute-value.service';

type VariantAttributeValueDelegateMock = {
  create: jest.Mock;
  deleteMany: jest.Mock;
  findMany: jest.Mock;
};

describe('VariantAttributeValueService', () => {
  let service: VariantAttributeValueService;
  const productVariant = {
    findFirst: jest.fn(),
  };
  const attributeDefinition = {
    findFirst: jest.fn(),
  };
  const attributeOption = {
    findFirst: jest.fn(),
  };
  const variantAttributeValue: VariantAttributeValueDelegateMock = {
    create: jest.fn(),
    deleteMany: jest.fn(),
    findMany: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const runTransaction = <T>(
      callback: (tx: {
        variantAttributeValue: VariantAttributeValueDelegateMock;
      }) => T,
    ) =>
      callback({
        variantAttributeValue,
      });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VariantAttributeValueService,
        {
          provide: PrismaService,
          useValue: {
            productVariant,
            attributeDefinition,
            attributeOption,
            variantAttributeValue,
            $transaction: jest.fn(runTransaction),
          },
        },
      ],
    }).compile();

    service = module.get<VariantAttributeValueService>(
      VariantAttributeValueService,
    );
  });

  it('sets a variant text attribute value', async () => {
    const expectedValues = [
      {
        id: 'value_1',
        textValue: '100ml',
      },
    ];

    productVariant.findFirst.mockResolvedValue({
      id: 'variant_1',
    });
    attributeDefinition.findFirst.mockResolvedValue({
      id: 'attribute_1',
      dataType: AttributeDataType.TEXT,
    });
    variantAttributeValue.findMany.mockResolvedValue(expectedValues);

    await expect(
      service.set('product_1', 'variant_1', {
        attributeId: 'attribute_1',
        textValue: ' 100ml ',
      }),
    ).resolves.toBe(expectedValues);

    expect(variantAttributeValue.deleteMany).toHaveBeenCalledWith({
      where: {
        variantId: 'variant_1',
        attributeId: 'attribute_1',
      },
    });
    expect(variantAttributeValue.create).toHaveBeenCalledWith({
      data: {
        variantId: 'variant_1',
        attributeId: 'attribute_1',
        textValue: '100ml',
      },
    });
  });
});
