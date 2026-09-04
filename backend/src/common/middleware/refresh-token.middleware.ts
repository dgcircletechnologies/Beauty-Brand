import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { NextFunction, Request, Response } from 'express';

import { PrismaService } from 'src/database/prisma.service';
import { AuthenticatedRequest } from '../interfaces/authenticated-request.interface';
import { RefreshTokenPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class RefreshTokenMiddleware implements NestMiddleware {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async use(request: Request, _response: Response, next: NextFunction) {
    const token = this.extractRefreshToken(request);
    const payload = await this.verifyRefreshToken(token);

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.prisma.user.findUnique({
      where: {
        id: payload.sub,
      },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        deletedAt: true,
      },
    });

    if (!user || user.deletedAt) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    (request as AuthenticatedRequest).user = {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
    };
    (request as AuthenticatedRequest).refreshToken = token;

    next();
  }

  private extractRefreshToken(request: Request): string {
    const cookieToken = this.extractCookieValue(request, 'refreshToken');

    if (!cookieToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    return cookieToken;
  }

  private extractCookieValue(request: Request, name: string): string | null {
    const cookieHeader = request.headers.cookie;

    if (!cookieHeader) {
      return null;
    }

    const cookie = cookieHeader
      .split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${name}=`));

    return cookie ? decodeURIComponent(cookie.slice(name.length + 1)) : null;
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
}
