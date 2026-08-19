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
import { AccessTokenPayload } from '../interfaces/jwt-payload.interface';
import { AuthenticatedRequest } from '../interfaces/authenticated-request.interface';

@Injectable()
export class AccessTokenMiddleware
  implements NestMiddleware
{
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

    const payload = await this.verifyAccessToken(token);

    if (payload.type !== 'access') {
      throw new UnauthorizedException(
        'Invalid access token',
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
        'Invalid access token',
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
        'Access token is required',
      );
    }

    return token;
  }

  private async verifyAccessToken(
    token: string,
  ): Promise<AccessTokenPayload> {
    try {
      return await this.jwtService.verifyAsync<
        AccessTokenPayload
      >(token, {
        secret:
          this.configService.getOrThrow<string>(
            'JWT_ACCESS_SECRET',
          ),
      });
    } catch {
      throw new UnauthorizedException(
        'Invalid access token',
      );
    }
  }
}
