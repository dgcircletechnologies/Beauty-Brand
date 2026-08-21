import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../database/prisma.service';
import { AttributeOptionService } from './attribute-option.service';

describe('AttributeOptionService', () => {
  let service: AttributeOptionService;
  const attributeDefinition = {
    findFirst: jest.fn(),
  };
  const attributeOption = {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttributeOptionService,
        {
          provide: PrismaService,
          useValue: {
            attributeDefinition,
            attributeOption,
          },
        },
      ],
    }).compile();

    service = module.get<AttributeOptionService>(AttributeOptionService);
  });

  it('creates an option for an active attribute', async () => {
    const expectedOption = {
      id: 'option_1',
      value: 'oily',
    };

    attributeDefinition.findFirst.mockResolvedValue({
      id: 'attribute_1',
    });
    attributeOption.create.mockResolvedValue(expectedOption);

    await expect(
      service.create('attribute_1', {
        label: ' Oily ',
        value: ' OILY ',
      }),
    ).resolves.toBe(expectedOption);

    expect(attributeOption.create).toHaveBeenCalledWith({
      data: {
        attributeDefinitionId: 'attribute_1',
        label: 'Oily',
        value: 'oily',
        sortOrder: 0,
        isActive: true,
      },
    });
  });

  it('rejects options for missing attributes', async () => {
    attributeDefinition.findFirst.mockResolvedValue(null);

    await expect(
      service.create('missing_attribute', {
        label: 'Oily',
        value: 'oily',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('converts duplicate option errors into conflicts', async () => {
    attributeDefinition.findFirst.mockResolvedValue({
      id: 'attribute_1',
    });
    attributeOption.create.mockRejectedValue({
      code: 'P2002',
    });

    await expect(
      service.create('attribute_1', {
        label: 'Oily',
        value: 'oily',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
