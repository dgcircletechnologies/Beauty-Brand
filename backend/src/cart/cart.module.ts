import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

import { UserRole } from '../../generated/prisma/enums.cjs';
import { CommonModule } from '../common/common.module';
import { AccessTokenMiddleware } from '../common/middleware/access-token.middleware';
import { allowRoles } from '../common/middleware/role.middleware';
import { CurrencyModule } from '../currency/currency.module';
import { DatabaseModule } from '../database/database.module';
import { CartService } from './cart.service';
import { CustomerCartController } from './customer/customer-cart.controller';

@Module({
  imports: [
    DatabaseModule,
    CommonModule,
    CurrencyModule,
    JwtModule.register({}),
    ConfigModule,
  ],
  controllers: [CustomerCartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AccessTokenMiddleware, allowRoles(UserRole.CUSTOMER))
      .forRoutes(CustomerCartController);
  }
}
