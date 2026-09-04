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
    await this.deleteStaleRefreshTokens();

    const currentTokenHash = currentRefreshToken
      ? this.hashRefreshToken(currentRefreshToken)
      : null;
    const sessions = await this.prisma.refreshToken.findMany({
      where: {
        userId,
      },
      orderBy: {
        lastUsedAt: 'desc',
      },
    });
    const now = new Date();
    const inactiveHistoryDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const sessionGroups = new Map<string, typeof sessions>();

    for (const session of sessions) {
      const group = sessionGroups.get(session.sessionId) ?? [];
      group.push(session);
      sessionGroups.set(session.sessionId, group);
    }

    const sessionSummaries = [...sessionGroups.entries()]
      .map(([sessionId, tokens]) => {
        const latestToken = tokens.reduce((latest, token) => {
          const latestDate = latest.lastUsedAt ?? latest.createdAt;
          const tokenDate = token.lastUsedAt ?? token.createdAt;

          return tokenDate > latestDate ? token : latest;
        });
        const activeToken = tokens.find(
          (token) =>
            !token.revokedAt &&
            !token.replacedAt &&
            !token.reusedAt &&
            token.expiresAt > now,
        );

        return {
          id: sessionId,
          ipAddress: latestToken.ipAddress,
          userAgent: latestToken.userAgent,
          deviceLabel: latestToken.deviceLabel,
          location: latestToken.location,
          lastUsedAt: latestToken.lastUsedAt,
          createdAt: tokens.reduce(
            (createdAt, token) =>
              token.createdAt < createdAt ? token.createdAt : createdAt,
            latestToken.createdAt,
          ),
          expiresAt: activeToken?.expiresAt ?? latestToken.expiresAt,
          revokedAt: activeToken ? null : latestToken.revokedAt,
          isCurrent: tokens.some(
            (token) => currentTokenHash === token.tokenHash,
          ),
          isActive: Boolean(activeToken),
        };
      })
      .filter(
        (session) =>
          session.isActive ||
          (session.lastUsedAt ?? session.createdAt) > inactiveHistoryDate,
      );

    return {
      activeSessionCount: sessionSummaries.filter((session) => session.isActive)
        .length,
      sessions: sessionSummaries.sort((left, right) => {
        const leftDate = left.lastUsedAt ?? left.createdAt;
        const rightDate = right.lastUsedAt ?? right.createdAt;

        return rightDate.getTime() - leftDate.getTime();
      }),
    };
  }

  async revokeSession(userId: string, sessionId: string) {
    const result = await this.prisma.refreshToken.updateMany({
      where: {
        sessionId,
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    if (result.count < 1) {
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

  private async deleteStaleRefreshTokens() {
    const retentionDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    await this.prisma.refreshToken.deleteMany({
      where: {
        OR: [
          {
            expiresAt: {
              lt: retentionDate,
            },
          },
          {
            revokedAt: {
              lt: retentionDate,
            },
          },
          {
            replacedAt: {
              lt: retentionDate,
            },
          },
        ],
      },
    });
  }
}
