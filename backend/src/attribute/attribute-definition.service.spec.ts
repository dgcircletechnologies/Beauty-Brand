import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { AttributeDataType } from '../../generated/prisma/enums.cjs';
import { PrismaService } from '../database/prisma.service';
import { AttributeDefinitionService } from './attribute-definition.service';

describe('AttributeDefinitionService', () => {
  let service: AttributeDefinitionService;
  const attributeDefinition = {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttributeDefinitionService,
        {
          provide: PrismaService,
          useValue: {
            attributeDefinition,
          },
        },
      ],
    }).compile();

    service = module.get<AttributeDefinitionService>(
      AttributeDefinitionService,
    );
  });

  it('creates an attribute definition with normalized slug', async () => {
    const expectedAttribute = {
      id: 'attribute_1',
      slug: 'skin-type',
    };

    attributeDefinition.create.mockResolvedValue(expectedAttribute);

    await expect(
      service.create({
        name: ' Skin Type ',
        slug: 'skin-type',
        dataType: AttributeDataType.SELECT,
      }),
    ).resolves.toBe(expectedAttribute);

    expect(attributeDefinition.create).toHaveBeenCalledWith({
      data: {
        name: 'Skin Type',
        slug: 'skin-type',
        description: null,
        dataType: AttributeDataType.SELECT,
        isActive: true,
      },
    });
  });

  it('converts duplicate slug errors into conflicts', async () => {
    attributeDefinition.create.mockRejectedValue({
      code: 'P2002',
    });

    await expect(
      service.create({
        name: 'Skin Type',
        slug: 'skin-type',
        dataType: AttributeDataType.SELECT,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
