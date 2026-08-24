import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../database/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpsertAddressDto } from './dto/upsert-address.dto';

@Injectable()
export class AccountService {
  constructor(private readonly prisma: PrismaService) {}

  getProfile(userId: string) {
    return this.prisma.user.findFirstOrThrow({
      where: {
        id: userId,
        deletedAt: null,
      },
      select: this.userSelect(),
    });
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    return this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        firstName: dto.firstName.trim(),
        lastName: this.nullableTrim(dto.lastName),
        phone: this.nullableTrim(dto.phone),
        gender: dto.gender ?? null,
        age: dto.age ?? null,
      },
      select: this.userSelect(),
    });
  }

  getAddresses(userId: string) {
    return this.prisma.address.findMany({
      where: {
        userId,
        deletedAt: null,
      },
      orderBy: [
        {
          isDefaultShipping: 'desc',
        },
        {
          createdAt: 'desc',
        },
      ],
    });
  }

  createAddress(userId: string, dto: UpsertAddressDto) {
    return this.prisma.$transaction(async (tx) => {
      await this.clearDefaultFlags(tx, userId, dto);

      return tx.address.create({
        data: {
          userId,
          ...this.getAddressData(dto),
        },
      });
    });
  }

  async updateAddress(
    userId: string,
    addressId: string,
    dto: UpsertAddressDto,
  ) {
    await this.ensureAddressBelongsToUser(userId, addressId);

    return this.prisma.$transaction(async (tx) => {
      await this.clearDefaultFlags(tx, userId, dto, addressId);

      return tx.address.update({
        where: {
          id: addressId,
        },
        data: this.getAddressData(dto),
      });
    });
  }

  async deleteAddress(userId: string, addressId: string) {
    await this.ensureAddressBelongsToUser(userId, addressId);

    return this.prisma.address.update({
      where: {
        id: addressId,
      },
      data: {
        deletedAt: new Date(),
        isDefaultShipping: false,
        isDefaultBilling: false,
      },
    });
  }

  private async ensureAddressBelongsToUser(userId: string, addressId: string) {
    const address = await this.prisma.address.findFirst({
      where: {
        id: addressId,
        userId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!address) {
      throw new NotFoundException('Address not found');
    }
  }

  private async clearDefaultFlags(
    tx: Pick<PrismaService, 'address'>,
    userId: string,
    dto: UpsertAddressDto,
    addressId?: string,
  ) {
    const where = {
      userId,
      deletedAt: null,
      ...(addressId && {
        id: {
          not: addressId,
        },
      }),
    };

    if (dto.isDefaultShipping) {
      await tx.address.updateMany({
        where,
        data: {
          isDefaultShipping: false,
        },
      });
    }

    if (dto.isDefaultBilling) {
      await tx.address.updateMany({
        where,
        data: {
          isDefaultBilling: false,
        },
      });
    }
  }

  private getAddressData(dto: UpsertAddressDto) {
    return {
      label: this.nullableTrim(dto.label),
      firstName: dto.firstName.trim(),
      lastName: dto.lastName.trim(),
      company: this.nullableTrim(dto.company),
      line1: dto.line1.trim(),
      line2: this.nullableTrim(dto.line2),
      city: dto.city.trim(),
      stateOrProvince: this.nullableTrim(dto.stateOrProvince),
      postalCode: dto.postalCode.trim(),
      countryCode: dto.countryCode.trim().toUpperCase(),
      phone: this.nullableTrim(dto.phone),
      isDefaultShipping: dto.isDefaultShipping ?? false,
      isDefaultBilling: dto.isDefaultBilling ?? false,
    };
  }

  private userSelect() {
    return {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      gender: true,
      age: true,
      role: true,
      status: true,
      emailVerifiedAt: true,
    };
  }

  private nullableTrim(value?: string): string | null {
    const trimmed = value?.trim();
    return trimmed || null;
  }
}
