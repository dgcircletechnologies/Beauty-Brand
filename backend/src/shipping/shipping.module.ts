import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

import { UserRole } from '../../generated/prisma/enums.cjs';
import { CommonModule } from '../common/common.module';
import { AccessTokenMiddleware } from '../common/middleware/access-token.middleware';
import { allowRoles } from '../common/middleware/role.middleware';
import { CurrencyModule } from '../currency/currency.module';
import { DatabaseModule } from '../database/database.module';
import { AdminShippingController } from './admin/admin-shipping.controller';
import { CustomerShippingController } from './customer/customer-shipping.controller';
import { ShippingService } from './shipping.service';

@Module({
  imports: [
    DatabaseModule,
    CommonModule,
    CurrencyModule,
    JwtModule.register({}),
    ConfigModule,
  ],
  controllers: [AdminShippingController, CustomerShippingController],
  providers: [ShippingService],
  exports: [ShippingService],
})
export class ShippingModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(
        AccessTokenMiddleware,
        allowRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN),
      )
      .forRoutes(AdminShippingController);

    consumer
      .apply(AccessTokenMiddleware, allowRoles(UserRole.CUSTOMER))
      .forRoutes(CustomerShippingController);
  }
}
