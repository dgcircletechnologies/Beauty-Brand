import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { ShippingRateCalculation } from '../../generated/prisma/enums.cjs';
import { CurrencyService } from '../currency/currency.service';
import { PrismaService } from '../database/prisma.service';
import { CreateShippingRateDto } from './dto/create-shipping-rate.dto';
import { CreateShippingZoneDto } from './dto/create-shipping-zone.dto';
import { CreateZoneCountryDto } from './dto/create-zone-country.dto';
import { UpdateShippingRateDto } from './dto/update-shipping-rate.dto';
import { UpdateShippingZoneDto } from './dto/update-shipping-zone.dto';
import { UpdateZoneCountryDto } from './dto/update-zone-country.dto';

type ShippingRateWithZone = Awaited<
  ReturnType<ShippingService['findEligibleRates']>
>[number];

@Injectable()
export class ShippingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly currencyService: CurrencyService,
  ) {}

  findAdminZones() {
    return this.prisma.shippingZone.findMany({
      where: {
        deletedAt: null,
      },
      include: {
        countries: {
          orderBy: {
            countryName: 'asc',
          },
        },
        rates: {
          where: {
            deletedAt: null,
          },
          include: {
            currency: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  findActiveCountries() {
    return this.prisma.zoneCountry.findMany({
      where: {
        isActive: true,
        zone: {
          isActive: true,
          deletedAt: null,
          rates: {
            some: {
              deletedAt: null,
              isActive: true,
            },
          },
        },
      },
      select: {
        id: true,
        countryCode: true,
        countryName: true,
        zone: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      orderBy: {
        countryName: 'asc',
      },
    });
  }

  async getCheckoutAvailability(countryCode: string, baseSubtotal: number) {
    const normalizedCountryCode = this.normalizeCountryCode(countryCode);
    const country = await this.prisma.zoneCountry.findFirst({
      where: {
        countryCode: normalizedCountryCode,
        isActive: true,
        zone: {
          deletedAt: null,
          isActive: true,
        },
      },
      select: {
        id: true,
        countryCode: true,
        countryName: true,
        zone: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    if (!country) {
      return {
        country: null,
        zone: null,
        activeRateCount: 0,
        rates: [],
        message: 'This address country is not assigned to an active shipping zone.',
      };
    }

    const [activeRateCount, rates] = await Promise.all([
      this.prisma.shippingRate.count({
        where: {
          zoneId: country.zone.id,
          deletedAt: null,
          isActive: true,
        },
      }),
      this.findEligibleRates(normalizedCountryCode, baseSubtotal),
    ]);

    return {
      country: {
        id: country.id,
        countryCode: country.countryCode,
        countryName: country.countryName,
      },
      zone: country.zone,
      activeRateCount,
      rates,
      message: this.getAvailabilityMessage(
        country.zone.name,
        activeRateCount,
        rates.length,
      ),
    };
  }

  createZone(dto: CreateShippingZoneDto) {
    return this.prisma.shippingZone
      .create({
        data: {
          name: dto.name.trim(),
          code: this.normalizeCode(dto.code),
          isActive: dto.isActive ?? true,
        },
      })
      .catch((error: unknown) => {
        this.handleUniqueError(error, 'Shipping zone code already exists');
        throw error;
      });
  }

  async updateZone(zoneId: string, dto: UpdateShippingZoneDto) {
    await this.ensureZoneExists(zoneId);

    return this.prisma.shippingZone
      .update({
        where: {
          id: zoneId,
        },
        data: {
          ...(dto.name !== undefined && {
            name: dto.name.trim(),
          }),
          ...(dto.code !== undefined && {
            code: this.normalizeCode(dto.code),
          }),
          ...(dto.isActive !== undefined && {
            isActive: dto.isActive,
          }),
        },
      })
      .catch((error: unknown) => {
        this.handleUniqueError(error, 'Shipping zone code already exists');
        throw error;
      });
  }

  async softDeleteZone(zoneId: string) {
    await this.ensureZoneExists(zoneId);

    return this.prisma.shippingZone.update({
      where: {
        id: zoneId,
      },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });
  }

  async addCountry(zoneId: string, dto: CreateZoneCountryDto) {
    await this.ensureZoneExists(zoneId);

    return this.prisma.zoneCountry
      .create({
        data: {
          zoneId,
          countryCode: this.normalizeCountryCode(dto.countryCode),
          countryName: dto.countryName.trim(),
          isActive: dto.isActive ?? true,
        },
      })
      .catch((error: unknown) => {
        this.handleUniqueError(error, 'Country is already assigned to a zone');
        throw error;
      });
  }

  async updateCountry(countryId: string, dto: UpdateZoneCountryDto) {
    await this.ensureCountryExists(countryId);

    return this.prisma.zoneCountry
      .update({
        where: {
          id: countryId,
        },
        data: {
          ...(dto.countryCode !== undefined && {
            countryCode: this.normalizeCountryCode(dto.countryCode),
          }),
          ...(dto.countryName !== undefined && {
            countryName: dto.countryName.trim(),
          }),
          ...(dto.isActive !== undefined && {
            isActive: dto.isActive,
          }),
        },
      })
      .catch((error: unknown) => {
        this.handleUniqueError(error, 'Country is already assigned to a zone');
        throw error;
      });
  }

  async deleteCountry(countryId: string) {
    await this.ensureCountryExists(countryId);

    return this.prisma.zoneCountry.delete({
      where: {
        id: countryId,
      },
    });
  }

  async createRate(dto: CreateShippingRateDto) {
    await Promise.all([
      this.ensureZoneExists(dto.zoneId),
      this.currencyService.ensureActiveCurrency(dto.currencyCode),
    ]);

    return this.prisma.shippingRate.create({
      data: {
        zoneId: dto.zoneId,
        name: dto.name.trim(),
        serviceCode: this.nullableTrim(dto.serviceCode),
        calculation: dto.calculation ?? ShippingRateCalculation.FLAT,
        amount: dto.amount,
        currencyCode: dto.currencyCode.trim().toUpperCase(),
        minOrderAmount: dto.minOrderAmount ?? null,
        maxOrderAmount: dto.maxOrderAmount ?? null,
        estimatedDaysMin: dto.estimatedDaysMin ?? null,
        estimatedDaysMax: dto.estimatedDaysMax ?? null,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async updateRate(rateId: string, dto: UpdateShippingRateDto) {
    await this.ensureRateExists(rateId);

    if (dto.zoneId) {
      await this.ensureZoneExists(dto.zoneId);
    }

    if (dto.currencyCode) {
      await this.currencyService.ensureActiveCurrency(dto.currencyCode);
    }

    return this.prisma.shippingRate.update({
      where: {
        id: rateId,
      },
      data: {
        ...(dto.zoneId !== undefined && {
          zoneId: dto.zoneId,
        }),
        ...(dto.name !== undefined && {
          name: dto.name.trim(),
        }),
        ...(dto.serviceCode !== undefined && {
          serviceCode: this.nullableTrim(dto.serviceCode),
        }),
        ...(dto.calculation !== undefined && {
          calculation: dto.calculation,
        }),
        ...(dto.amount !== undefined && {
          amount: dto.amount,
        }),
        ...(dto.currencyCode !== undefined && {
          currencyCode: dto.currencyCode.trim().toUpperCase(),
        }),
        ...(dto.minOrderAmount !== undefined && {
          minOrderAmount: dto.minOrderAmount,
        }),
        ...(dto.maxOrderAmount !== undefined && {
          maxOrderAmount: dto.maxOrderAmount,
        }),
        ...(dto.estimatedDaysMin !== undefined && {
          estimatedDaysMin: dto.estimatedDaysMin,
        }),
        ...(dto.estimatedDaysMax !== undefined && {
          estimatedDaysMax: dto.estimatedDaysMax,
        }),
        ...(dto.isActive !== undefined && {
          isActive: dto.isActive,
        }),
      },
    });
  }

  async softDeleteRate(rateId: string) {
    await this.ensureRateExists(rateId);

    return this.prisma.shippingRate.update({
      where: {
        id: rateId,
      },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });
  }

  findEligibleRates(countryCode: string, baseSubtotal: number) {
    return this.prisma.shippingRate.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        zone: {
          deletedAt: null,
          isActive: true,
          countries: {
            some: {
              countryCode: this.normalizeCountryCode(countryCode),
              isActive: true,
            },
          },
        },
        OR: [
          {
            minOrderAmount: null,
          },
          {
            minOrderAmount: {
              lte: baseSubtotal,
            },
          },
        ],
        AND: [
          {
            OR: [
              {
                maxOrderAmount: null,
              },
              {
                maxOrderAmount: {
                  gte: baseSubtotal,
                },
              },
            ],
          },
        ],
      },
      include: {
        zone: true,
        currency: true,
      },
      orderBy: [
        {
          amount: 'asc',
        },
        {
          createdAt: 'asc',
        },
      ],
    });
  }

  async getRateForCheckout(
    rateId: string,
    countryCode: string,
    baseSubtotal: number,
  ) {
    const rates = await this.findEligibleRates(countryCode, baseSubtotal);
    const rate = rates.find((candidate) => candidate.id === rateId);

    if (!rate) {
      throw new BadRequestException(
        'Selected shipping rate is not available for this address',
      );
    }

    return rate;
  }

  async toBaseAmount(rate: Pick<ShippingRateWithZone, 'amount' | 'currencyCode'>) {
    const baseCurrency = await this.currencyService.getBaseCurrency();
    const amount = Number(rate.amount);

    if (rate.currencyCode === baseCurrency.code) {
      return amount;
    }

    const exchangeRate = await this.currencyService.getLatestRate(
      baseCurrency.code,
      rate.currencyCode,
    );

    return amount / exchangeRate.rate;
  }

  private async ensureZoneExists(zoneId: string) {
    const zone = await this.prisma.shippingZone.findFirst({
      where: {
        id: zoneId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!zone) {
      throw new NotFoundException('Shipping zone not found');
    }
  }

  private async ensureCountryExists(countryId: string) {
    const country = await this.prisma.zoneCountry.findUnique({
      where: {
        id: countryId,
      },
      select: {
        id: true,
      },
    });

    if (!country) {
      throw new NotFoundException('Zone country not found');
    }
  }

  private async ensureRateExists(rateId: string) {
    const rate = await this.prisma.shippingRate.findFirst({
      where: {
        id: rateId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!rate) {
      throw new NotFoundException('Shipping rate not found');
    }
  }

  private normalizeCode(code: string) {
    return code.trim().toUpperCase();
  }

  private normalizeCountryCode(code: string) {
    return code.trim().toUpperCase();
  }

  private getAvailabilityMessage(
    zoneName: string,
    activeRateCount: number,
    eligibleRateCount: number,
  ) {
    if (!activeRateCount) {
      return `Shipping zone ${zoneName} has no active shipping rates.`;
    }

    if (!eligibleRateCount) {
      return `Shipping zone ${zoneName} has active rates, but none match this cart subtotal. Check the rate min/max order amounts.`;
    }

    return `Shipping zone ${zoneName} is available.`;
  }

  private nullableTrim(value?: string | null): string | null {
    const trimmed = value?.trim();
    return trimmed || null;
  }

  private handleUniqueError(error: unknown, message: string): void {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(message);
    }
  }
}
