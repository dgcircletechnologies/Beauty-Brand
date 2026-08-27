import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { CurrencyStatus } from '../../generated/prisma/enums.cjs';
import { PrismaService } from '../database/prisma.service';
import { CreateCurrencyDto } from './dto/create-currency.dto';
import { CreateExchangeRateDto } from './dto/create-exchange-rate.dto';
import { UpdateCurrencyDto } from './dto/update-currency.dto';
import { UpdateExchangeRateDto } from './dto/update-exchange-rate.dto';

@Injectable()
export class CurrencyService {
  constructor(private readonly prisma: PrismaService) {}

  async findPublicCurrencies() {
    const currencies = await this.prisma.currency.findMany({
      where: {
        status: CurrencyStatus.ACTIVE,
      },
      orderBy: [
        {
          isBase: 'desc',
        },
        {
          code: 'asc',
        },
      ],
    });

    const baseCurrency = currencies.find((currency) => currency.isBase);

    if (!baseCurrency) {
      return currencies.map((currency) => ({
        ...currency,
        baseCurrencyCode: currency.code,
        rate: currency.isBase ? 1 : null,
      }));
    }

    const quoteCurrencyCodes = currencies
      .filter((currency) => currency.code !== baseCurrency.code)
      .map((currency) => currency.code);

    const now = new Date();
    const exchangeRates = quoteCurrencyCodes.length
      ? await this.prisma.exchangeRate.findMany({
          where: {
            baseCurrencyCode: baseCurrency.code,
            quoteCurrencyCode: {
              in: quoteCurrencyCodes,
            },
            effectiveAt: {
              lte: now,
            },
            OR: [
              {
                expiresAt: null,
              },
              {
                expiresAt: {
                  gt: now,
                },
              },
            ],
          },
          orderBy: {
            effectiveAt: 'desc',
          },
        })
      : [];

    const latestRateByQuoteCurrency = new Map<string, number>();

    for (const exchangeRate of exchangeRates) {
      if (!latestRateByQuoteCurrency.has(exchangeRate.quoteCurrencyCode)) {
        latestRateByQuoteCurrency.set(
          exchangeRate.quoteCurrencyCode,
          Number(exchangeRate.rate),
        );
      }
    }

    return currencies.map((currency) => ({
      ...currency,
      baseCurrencyCode: baseCurrency.code,
      rate:
        currency.code === baseCurrency.code
          ? 1
          : (latestRateByQuoteCurrency.get(currency.code) ?? null),
    }));
  }

  findAdminCurrencies() {
    return this.prisma.currency.findMany({
      orderBy: [
        {
          isBase: 'desc',
        },
        {
          code: 'asc',
        },
      ],
    });
  }

  async createCurrency(dto: CreateCurrencyDto) {
    const code = this.normalizeCurrencyCode(dto.code);

    return this.prisma
      .$transaction(async (tx) => {
        if (dto.isBase) {
          await tx.currency.updateMany({
            where: {
              isBase: true,
            },
            data: {
              isBase: false,
            },
          });
        }

        return tx.currency.create({
          data: {
            code,
            name: dto.name.trim(),
            symbol: this.nullableTrim(dto.symbol),
            decimalDigits: dto.decimalDigits ?? 2,
            status: dto.status ?? CurrencyStatus.ACTIVE,
            isBase: dto.isBase ?? false,
          },
        });
      })
      .catch((error: unknown) => {
        this.handleUniqueCurrencyError(error);
        throw error;
      });
  }

  async updateCurrency(code: string, dto: UpdateCurrencyDto) {
    const currencyCode = this.normalizeCurrencyCode(code);
    await this.ensureCurrencyExists(currencyCode);

    return this.prisma.$transaction(async (tx) => {
      if (dto.isBase) {
        await tx.currency.updateMany({
          where: {
            isBase: true,
            code: {
              not: currencyCode,
            },
          },
          data: {
            isBase: false,
          },
        });
      }

      return tx.currency.update({
        where: {
          code: currencyCode,
        },
        data: {
          ...(dto.name !== undefined && {
            name: dto.name.trim(),
          }),
          ...(dto.symbol !== undefined && {
            symbol: this.nullableTrim(dto.symbol),
          }),
          ...(dto.decimalDigits !== undefined && {
            decimalDigits: dto.decimalDigits,
          }),
          ...(dto.status !== undefined && {
            status: dto.status,
          }),
          ...(dto.isBase !== undefined && {
            isBase: dto.isBase,
          }),
        },
      });
    });
  }

  async getBaseCurrency() {
    const baseCurrency = await this.prisma.currency.findFirst({
      where: {
        isBase: true,
        status: CurrencyStatus.ACTIVE,
      },
    });

    if (!baseCurrency) {
      throw new NotFoundException('Base currency is not configured');
    }

    return baseCurrency;
  }

  async ensureActiveCurrency(code: string) {
    const currency = await this.prisma.currency.findFirst({
      where: {
        code: this.normalizeCurrencyCode(code),
        status: CurrencyStatus.ACTIVE,
      },
    });

    if (!currency) {
      throw new NotFoundException('Active currency not found');
    }

    return currency;
  }

  findAdminExchangeRates() {
    return this.prisma.exchangeRate.findMany({
      include: {
        baseCurrency: true,
        quoteCurrency: true,
      },
      orderBy: {
        effectiveAt: 'desc',
      },
      take: 100,
    });
  }

  async createExchangeRate(dto: CreateExchangeRateDto) {
    const baseCurrencyCode = this.normalizeCurrencyCode(dto.baseCurrencyCode);
    const quoteCurrencyCode = this.normalizeCurrencyCode(dto.quoteCurrencyCode);
    const effectiveAt = new Date(dto.effectiveAt);
    const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;

    if (baseCurrencyCode === quoteCurrencyCode) {
      throw new BadRequestException(
        'Base and quote currency must be different',
      );
    }

    if (Number(dto.rate) <= 0) {
      throw new BadRequestException('Exchange rate must be greater than 0');
    }

    if (expiresAt && expiresAt <= effectiveAt) {
      throw new BadRequestException(
        'Expiry date must be later than effective date',
      );
    }

    await Promise.all([
      this.ensureActiveCurrency(baseCurrencyCode),
      this.ensureActiveCurrency(quoteCurrencyCode),
    ]);

    return this.prisma.exchangeRate
      .create({
        data: {
          baseCurrencyCode,
          quoteCurrencyCode,
          rate: dto.rate,
          provider: dto.provider.trim(),
          effectiveAt,
          expiresAt,
        },
        include: {
          baseCurrency: true,
          quoteCurrency: true,
        },
      })
      .catch((error: unknown) => {
        this.handleUniqueExchangeRateError(error);
        throw error;
      });
  }

  async updateExchangeRate(id: string, dto: UpdateExchangeRateDto) {
    await this.ensureExchangeRateExists(id);

    return this.prisma.exchangeRate.update({
      where: {
        id,
      },
      data: {
        ...(dto.expiresAt !== undefined && {
          expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        }),
      },
      include: {
        baseCurrency: true,
        quoteCurrency: true,
      },
    });
  }

  async getLatestRate(baseCurrencyCode: string, quoteCurrencyCode: string) {
    const normalizedBase = this.normalizeCurrencyCode(baseCurrencyCode);
    const normalizedQuote = this.normalizeCurrencyCode(quoteCurrencyCode);

    if (normalizedBase === normalizedQuote) {
      return {
        rate: 1,
        effectiveAt: null,
        provider: 'identity',
      };
    }

    await Promise.all([
      this.ensureActiveCurrency(normalizedBase),
      this.ensureActiveCurrency(normalizedQuote),
    ]);

    const now = new Date();
    const exchangeRate = await this.prisma.exchangeRate.findFirst({
      where: {
        baseCurrencyCode: normalizedBase,
        quoteCurrencyCode: normalizedQuote,
        effectiveAt: {
          lte: now,
        },
        OR: [
          {
            expiresAt: null,
          },
          {
            expiresAt: {
              gt: now,
            },
          },
        ],
      },
      orderBy: {
        effectiveAt: 'desc',
      },
    });

    if (!exchangeRate) {
      throw new NotFoundException('Exchange rate not found');
    }

    return {
      rate: Number(exchangeRate.rate),
      effectiveAt: exchangeRate.effectiveAt,
      provider: exchangeRate.provider,
    };
  }

  private async ensureCurrencyExists(code: string) {
    const currency = await this.prisma.currency.findUnique({
      where: {
        code,
      },
      select: {
        code: true,
      },
    });

    if (!currency) {
      throw new NotFoundException('Currency not found');
    }
  }

  private async ensureExchangeRateExists(id: string) {
    const exchangeRate = await this.prisma.exchangeRate.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
      },
    });

    if (!exchangeRate) {
      throw new NotFoundException('Exchange rate not found');
    }
  }

  private normalizeCurrencyCode(code: string): string {
    return code.trim().toUpperCase();
  }

  private nullableTrim(value?: string): string | null {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  }

  private handleUniqueCurrencyError(error: unknown): void {
    if (this.isUniqueError(error)) {
      throw new ConflictException('Currency already exists');
    }
  }

  private handleUniqueExchangeRateError(error: unknown): void {
    if (this.isUniqueError(error)) {
      throw new ConflictException(
        'Exchange rate already exists for this effective date',
      );
    }
  }

  private isUniqueError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002'
    );
  }
}
