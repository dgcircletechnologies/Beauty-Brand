import {
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import type { Request } from 'express';

import { PrismaService } from 'src/database/prisma.service';
import { MailService } from '../common/mail/mail.service';
import {
  AccessTokenPayload,
  RefreshTokenPayload,
} from '../common/interfaces/jwt-payload.interface';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResendVerificationEmailDto } from './dto/resend-verification-email.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
  ) {}

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();

    const existingUser = await this.prisma.user.findUnique({
      where: {
        email,
      },
      select: {
        id: true,
      },
    });

    if (existingUser) {
      throw new ConflictException('An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const verificationToken = this.generatePlainToken();

    const user = await this.prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email,
          passwordHash,
          firstName: dto.firstName.trim(),
          lastName: dto.lastName?.trim() || null,
          phone: dto.phone?.trim() || null,
          gender: dto.gender ?? null,
          age: dto.age ?? null,
        },
        select: this.userSelect(),
      });

      await tx.emailVerificationToken.create({
        data: {
          userId: createdUser.id,
          tokenHash: this.hashToken(verificationToken),
          expiresAt: this.getEmailVerificationExpiryDate(),
        },
      });

      return createdUser;
    });

    await this.mailService.sendVerificationEmail({
      to: user.email,
      name: user.firstName,
      token: verificationToken,
    });

    return user;
  }

  async login(dto: LoginDto, request?: Request) {
    const email = dto.email.trim().toLowerCase();

    const user = await this.prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (!user?.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.emailVerifiedAt) {
      throw new ForbiddenException('Please verify your email first');
    }

    const passwordMatches = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const accessToken = await this.generateAccessToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    const sessionId = this.generatePlainToken();
    const refreshToken = await this.generateRefreshToken({
      id: user.id,
    });

    await this.prisma.$transaction(async (tx) => {
      await tx.refreshToken.create({
        data: {
          sessionId,
          userId: user.id,
          tokenHash: this.hashRefreshToken(refreshToken.token),
          jti: refreshToken.jti,
          expiresAt: this.getRefreshTokenExpiryDate(),
          ...this.getSessionMetadata(request),
        },
      });

      await tx.user.update({
        where: {
          id: user.id,
        },
        data: {
          lastLoginAt: new Date(),
        },
      });
    });

    return {
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        emailVerifiedAt: user.emailVerifiedAt,
      },
      accessToken,
      refreshToken: refreshToken.token,
    };
  }

  async refresh(userId: string, refreshToken: string, request?: Request) {
    const payload = await this.verifyRefreshToken(refreshToken);

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokenHash = this.hashRefreshToken(refreshToken);

    const storedToken = await this.prisma.refreshToken.findUnique({
      where: {
        tokenHash,
      },
      include: {
        user: true,
      },
    });

    if (!storedToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (!this.safeHashCompare(tokenHash, storedToken.tokenHash)) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (
      storedToken.userId !== payload.sub ||
      storedToken.userId !== userId ||
      storedToken.expiresAt <= new Date() ||
      storedToken.user.deletedAt
    ) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (
      storedToken.revokedAt ||
      storedToken.replacedAt ||
      storedToken.reusedAt
    ) {
      await this.revokeRefreshTokenSessionForReuse(storedToken);
      throw new UnauthorizedException('Refresh token reuse detected');
    }

    const nextRefreshToken = await this.generateRefreshToken({
      id: storedToken.user.id,
    });
    const accessToken = await this.generateAccessToken({
      id: storedToken.user.id,
      email: storedToken.user.email,
      role: storedToken.user.role,
    });
    const now = new Date();
    const sessionMetadata = this.getSessionMetadata(request);

    try {
      await this.prisma.$transaction(async (tx) => {
        const nextToken = await tx.refreshToken.create({
          data: {
            sessionId: storedToken.sessionId,
            userId: storedToken.userId,
            tokenHash: this.hashRefreshToken(nextRefreshToken.token),
            jti: nextRefreshToken.jti,
            expiresAt: this.getRefreshTokenExpiryDate(),
            ...sessionMetadata,
          },
        });

        const rotationResult = await tx.refreshToken.updateMany({
          where: {
            id: storedToken.id,
            revokedAt: null,
            replacedAt: null,
            reusedAt: null,
          },
          data: {
            revokedAt: now,
            replacedAt: now,
            replacedByTokenId: nextToken.id,
            ...sessionMetadata,
          },
        });

        if (rotationResult.count !== 1) {
          throw new UnauthorizedException('Refresh token reuse detected');
        }
      });
    } catch (error) {
      if (
        error instanceof UnauthorizedException &&
        error.message === 'Refresh token reuse detected'
      ) {
        await this.revokeRefreshTokenSessionForReuse(storedToken);
      }

      throw error;
    }

    void this.deleteStaleRefreshTokens();

    return {
      user: {
        id: storedToken.user.id,
        firstName: storedToken.user.firstName,
        lastName: storedToken.user.lastName,
        email: storedToken.user.email,
        phone: storedToken.user.phone,
        gender: storedToken.user.gender,
        age: storedToken.user.age,
        role: storedToken.user.role,
        status: storedToken.user.status,
        emailVerifiedAt: storedToken.user.emailVerifiedAt,
      },
      accessToken,
      refreshToken: nextRefreshToken.token,
    };
  }

  async logout(userId: string, refreshToken: string) {
    const tokenHash = this.hashRefreshToken(refreshToken);

    const result = await this.prisma.refreshToken.deleteMany({
      where: {
        userId,
        tokenHash,
      },
    });

    if (result.count !== 1) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return {
      loggedOut: true,
    };
  }

  async logoutAll(userId: string) {
    await this.prisma.refreshToken.deleteMany({
      where: {
        userId,
      },
    });

    return {
      loggedOut: true,
    };
  }

  async verifyEmail(dto: VerifyEmailDto) {
    const tokenHash = this.hashToken(dto.token);

    const storedToken = await this.prisma.emailVerificationToken.findUnique({
      where: {
        tokenHash,
      },
    });

    if (
      !storedToken ||
      storedToken.consumedAt ||
      storedToken.expiresAt <= new Date()
    ) {
      throw new UnauthorizedException('Invalid or expired verification token');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: {
          id: storedToken.userId,
        },
        data: {
          emailVerifiedAt: new Date(),
          status: 'ACTIVE',
        },
      });

      await tx.emailVerificationToken.update({
        where: {
          id: storedToken.id,
        },
        data: {
          consumedAt: new Date(),
        },
      });
    });

    const user = await this.prisma.user.findUnique({
      where: {
        id: storedToken.userId,
      },
      select: {
        email: true,
        firstName: true,
      },
    });

    if (user) {
      await this.mailService.sendWelcomeEmail({
        to: user.email,
        name: user.firstName,
      });
    }

    return {
      verified: true,
    };
  }

  async resendVerificationEmail(dto: ResendVerificationEmailDto) {
    const email = dto.email.trim().toLowerCase();

    const user = await this.prisma.user.findUnique({
      where: {
        email,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        emailVerifiedAt: true,
        deletedAt: true,
      },
    });

    if (!user || user.deletedAt || user.emailVerifiedAt) {
      return this.verificationEmailResponse();
    }

    await this.ensureEmailSendLimitNotExceeded('emailVerification', user.id);

    const verificationToken = this.generatePlainToken();

    await this.prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hashToken(verificationToken),
        expiresAt: this.getEmailVerificationExpiryDate(),
      },
    });

    await this.mailService.sendVerificationEmail({
      to: user.email,
      name: user.firstName,
      token: verificationToken,
    });

    return this.verificationEmailResponse();
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const email = dto.email.trim().toLowerCase();

    const user = await this.prisma.user.findUnique({
      where: {
        email,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        deletedAt: true,
      },
    });

    if (!user || user.deletedAt) {
      return this.passwordResetRequestResponse();
    }

    await this.ensureEmailSendLimitNotExceeded('passwordReset', user.id);

    const resetToken = this.generatePlainToken();

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hashToken(resetToken),
        expiresAt: this.getPasswordResetExpiryDate(),
      },
    });

    await this.mailService.sendPasswordResetEmail({
      to: user.email,
      name: user.firstName,
      token: resetToken,
    });

    return this.passwordResetRequestResponse();
  }

  async resetPassword(dto: ResetPasswordDto) {
    const tokenHash = this.hashToken(dto.token);

    const storedToken = await this.prisma.passwordResetToken.findUnique({
      where: {
        tokenHash,
      },
    });

    if (
      !storedToken ||
      storedToken.consumedAt ||
      storedToken.expiresAt <= new Date()
    ) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: {
          id: storedToken.userId,
        },
        data: {
          passwordHash,
        },
      });

      await tx.passwordResetToken.update({
        where: {
          id: storedToken.id,
        },
        data: {
          consumedAt: new Date(),
        },
      });

      await tx.refreshToken.deleteMany({
        where: {
          userId: storedToken.userId,
        },
      });
    });

    return {
      passwordReset: true,
    };
  }

  private async generateAccessToken(user: {
    id: string;
    email: string;
    role: string;
  }): Promise<string> {
    const payload: AccessTokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      type: 'access',
    };

    return this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.getAccessTokenLifetime(),
    });
  }

  private async generateRefreshToken(user: {
    id: string;
  }): Promise<{ token: string; jti: string }> {
    const jti = this.generatePlainToken();
    const payload: RefreshTokenPayload = {
      sub: user.id,
      jti,
      type: 'refresh',
    };

    const token = await this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.getRefreshTokenLifetime(),
    });

    return {
      token,
      jti,
    };
  }

  private async verifyRefreshToken(
    token: string,
  ): Promise<RefreshTokenPayload> {
    try {
      return await this.jwtService.verifyAsync<RefreshTokenPayload>(token, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private hashRefreshToken(token: string): string {
    const secret =
      this.configService.get<string>('REFRESH_TOKEN_HASH_SECRET') ??
      this.configService.getOrThrow<string>('JWT_REFRESH_SECRET');

    return createHmac('sha256', secret).update(token).digest('hex');
  }

  private hashToken(token: string): string {
    const secret =
      this.configService.get<string>('ONE_TIME_TOKEN_HASH_SECRET') ??
      this.configService.get<string>('REFRESH_TOKEN_HASH_SECRET') ??
      this.configService.getOrThrow<string>('JWT_REFRESH_SECRET');

    return createHmac('sha256', secret).update(token).digest('hex');
  }

  private generatePlainToken(): string {
    return randomBytes(32).toString('base64url');
  }

  private async revokeRefreshTokenSessionForReuse(token: {
    id: string;
    userId: string;
    sessionId: string;
  }) {
    const now = new Date();

    await this.prisma.$transaction([
      this.prisma.refreshToken.update({
        where: {
          id: token.id,
        },
        data: {
          reusedAt: now,
          revokedAt: now,
        },
      }),
      this.prisma.refreshToken.updateMany({
        where: {
          userId: token.userId,
          sessionId: token.sessionId,
          revokedAt: null,
        },
        data: {
          revokedAt: now,
        },
      }),
    ]);
  }

  private async deleteStaleRefreshTokens() {
    const retentionDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    await this.prisma.refreshToken
      .deleteMany({
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
      })
      .catch(() => undefined);
  }

  private safeHashCompare(left: string, right: string): boolean {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);

    return (
      leftBuffer.length === rightBuffer.length &&
      timingSafeEqual(leftBuffer, rightBuffer)
    );
  }

  private getAccessTokenLifetime(): number {
    return this.getPositiveNumberConfig('JWT_ACCESS_EXPIRES_IN_SECONDS', 900);
  }

  private getRefreshTokenLifetime(): number {
    return this.getPositiveNumberConfig(
      'JWT_REFRESH_EXPIRES_IN_SECONDS',
      604800,
    );
  }

  private getRefreshTokenExpiryDate(): Date {
    return new Date(Date.now() + this.getRefreshTokenLifetime() * 1000);
  }

  private getSessionMetadata(request?: Request) {
    const userAgent =
      this.getHeaderValue(request, 'user-agent')?.slice(0, 500) ?? null;

    return {
      ipAddress: this.getRequestIp(request),
      userAgent,
      deviceLabel: this.getDeviceLabel(userAgent),
      location: this.getRequestLocation(request),
      lastUsedAt: new Date(),
    };
  }

  private getRequestIp(request?: Request): string | null {
    const forwardedFor = this.getHeaderValue(request, 'x-forwarded-for');
    const forwardedIp = forwardedFor?.split(',')[0]?.trim();

    return (
      forwardedIp ||
      request?.socket.remoteAddress?.replace('::ffff:', '') ||
      null
    );
  }

  private getRequestLocation(request?: Request): string | null {
    const city =
      this.getHeaderValue(request, 'x-vercel-ip-city') ||
      this.getHeaderValue(request, 'x-city');
    const region =
      this.getHeaderValue(request, 'x-vercel-ip-country-region') ||
      this.getHeaderValue(request, 'x-region');
    const country =
      this.getHeaderValue(request, 'cf-ipcountry') ||
      this.getHeaderValue(request, 'x-vercel-ip-country') ||
      this.getHeaderValue(request, 'x-country-code');

    return [city, region, country].filter(Boolean).join(', ') || null;
  }

  private getHeaderValue(request: Request | undefined, key: string) {
    const value = request?.headers[key];

    return Array.isArray(value) ? value[0] : value;
  }

  private getDeviceLabel(userAgent: string | null): string | null {
    if (!userAgent) {
      return null;
    }

    let browser = 'Browser';

    if (userAgent.includes('Edg/')) {
      browser = 'Microsoft Edge';
    } else if (userAgent.includes('Chrome/')) {
      browser = 'Chrome';
    } else if (userAgent.includes('Firefox/')) {
      browser = 'Firefox';
    } else if (userAgent.includes('Safari/')) {
      browser = 'Safari';
    }

    let platform: string | null = null;

    if (userAgent.includes('Windows')) {
      platform = 'Windows';
    } else if (userAgent.includes('Macintosh')) {
      platform = 'macOS';
    } else if (userAgent.includes('Android')) {
      platform = 'Android';
    } else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
      platform = 'iOS';
    } else if (userAgent.includes('Linux')) {
      platform = 'Linux';
    }

    return platform ? `${browser} on ${platform}` : browser;
  }

  private getEmailVerificationExpiryDate(): Date {
    return this.getExpiryDateFromMinutesConfig(
      'EMAIL_VERIFICATION_EXPIRES_IN_MINUTES',
      60,
    );
  }

  private getPasswordResetExpiryDate(): Date {
    return this.getExpiryDateFromMinutesConfig(
      'PASSWORD_RESET_EXPIRES_IN_MINUTES',
      15,
    );
  }

  private getExpiryDateFromMinutesConfig(key: string, fallback: number): Date {
    return new Date(
      Date.now() + this.getPositiveNumberConfig(key, fallback) * 60 * 1000,
    );
  }

  private async ensureEmailSendLimitNotExceeded(
    type: 'emailVerification' | 'passwordReset',
    userId: string,
  ) {
    const createdAfter = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const count =
      type === 'emailVerification'
        ? await this.prisma.emailVerificationToken.count({
            where: {
              userId,
              createdAt: {
                gte: createdAfter,
              },
            },
          })
        : await this.prisma.passwordResetToken.count({
            where: {
              userId,
              createdAt: {
                gte: createdAfter,
              },
            },
          });

    if (count >= 3) {
      throw new HttpException(
        'You can request only 3 emails in 24 hours',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private getPositiveNumberConfig(key: string, fallback: number): number {
    const value = Number(this.configService.get<string>(key) ?? fallback);

    return Number.isFinite(value) && value > 0 ? value : fallback;
  }

  private userSelect() {
    return {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      gender: true,
      age: true,
      role: true,
      status: true,
      emailVerifiedAt: true,
      createdAt: true,
    };
  }

  private passwordResetRequestResponse() {
    return {
      message: 'If this email exists, a reset link has been sent',
    };
  }

  private verificationEmailResponse() {
    return {
      message: 'If this account needs verification, an email has been sent',
    };
  }
}
