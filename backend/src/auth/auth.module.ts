import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ConfigModule } from '@nestjs/config';
import { AccessTokenMiddleware } from '../common/middleware/access-token.middleware';
import { RefreshTokenMiddleware } from '../common/middleware/refresh-token.middleware';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [
    JwtModule.register({}),
    ConfigModule,
    CommonModule,
  ],
  controllers: [
    AuthController,
  ],
  providers: [
    AuthService,
  ],
  exports: [
    AuthService,
  ],
})
export class AuthModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RefreshTokenMiddleware).forRoutes(
      {
        path: 'auth/refresh',
        method: RequestMethod.POST,
      },
    );

    consumer.apply(AccessTokenMiddleware).forRoutes(
      {
        path: 'auth/logout',
        method: RequestMethod.POST,
      },
      {
        path: 'auth/logout-all',
        method: RequestMethod.POST,
      },
    );
  }
}
