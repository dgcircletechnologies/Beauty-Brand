import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  NextFunction,
  Request,
  Response,
} from 'express';

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

  async use(
    request: Request,
    _response: Response,
    next: NextFunction,
  ) {
    const token = this.extractBearerToken(request);
    const payload = await this.verifyRefreshToken(token);

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException(
        'Invalid refresh token',
      );
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
      throw new UnauthorizedException(
        'Invalid refresh token',
      );
    }

    (request as AuthenticatedRequest).user = {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
    };

    next();
  }

  private extractBearerToken(request: Request): string {
    const [type, token] =
      request.headers.authorization?.split(' ') ?? [];

    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException(
        'Refresh token is required',
      );
    }

    return token;
  }

  private async verifyRefreshToken(
    token: string,
  ): Promise<RefreshTokenPayload> {
    try {
      return await this.jwtService.verifyAsync<
        RefreshTokenPayload
      >(token, {
        secret:
          this.configService.getOrThrow<string>(
            'JWT_REFRESH_SECRET',
          ),
      });
    } catch {
      throw new UnauthorizedException(
        'Invalid refresh token',
      );
    }
  }
}
