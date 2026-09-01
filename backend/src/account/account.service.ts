import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../database/prisma.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpsertAddressDto } from './dto/upsert-address.dto';

@Injectable()
export class AccountService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

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

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        deletedAt: null,
      },
      select: {
        id: true,
        passwordHash: true,
      },
    });

    if (!user?.passwordHash) {
      throw new NotFoundException('User not found');
    }

    const passwordMatches = await bcrypt.compare(
      dto.currentPassword,
      user.passwordHash,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const nextPasswordHash = await bcrypt.hash(dto.newPassword, 12);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: {
          id: userId,
        },
        data: {
          passwordHash: nextPasswordHash,
        },
      }),
      this.prisma.refreshToken.deleteMany({
        where: {
          userId,
        },
      }),
    ]);

    return {
      passwordChanged: true,
    };
  }

  async getSessions(userId: string, currentRefreshToken?: string) {
    const currentTokenHash = currentRefreshToken
      ? this.hashRefreshToken(currentRefreshToken)
      : null;
    const sessions = await this.prisma.refreshToken.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    const now = new Date();

    return {
      activeSessionCount: sessions.filter(
        (session) => !session.revokedAt && session.expiresAt > now,
      ).length,
      sessions: sessions.map((session) => ({
        id: session.id,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        deviceLabel: session.deviceLabel,
        location: session.location,
        lastUsedAt: session.lastUsedAt,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
        revokedAt: session.revokedAt,
        isCurrent: currentTokenHash === session.tokenHash,
        isActive: !session.revokedAt && session.expiresAt > now,
      })),
    };
  }

  async revokeSession(userId: string, sessionId: string) {
    const result = await this.prisma.refreshToken.deleteMany({
      where: {
        id: sessionId,
        userId,
      },
    });

    if (result.count !== 1) {
      throw new BadRequestException('Session not found');
    }

    return {
      revoked: true,
    };
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
      lastName: dto.lastName?.trim() ?? '',
      company: this.nullableTrim(dto.company),
      line1: dto.line1.trim(),
      line2: this.nullableTrim(dto.line2),
      city: dto.city.trim(),
      stateOrProvince: dto.stateOrProvince.trim(),
      postalCode: dto.postalCode.trim(),
      countryCode: dto.countryCode.trim().toUpperCase(),
      phone: dto.phone.trim(),
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

  private hashRefreshToken(token: string): string {
    const secret =
      this.configService.get<string>('REFRESH_TOKEN_HASH_SECRET') ??
      this.configService.getOrThrow<string>('JWT_REFRESH_SECRET');

    return createHmac('sha256', secret).update(token).digest('hex');
  }
}
