import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

import { UserRole } from '../../generated/prisma/enums.cjs';
import { CommonModule } from '../common/common.module';
import { AccessTokenMiddleware } from '../common/middleware/access-token.middleware';
import { allowRoles } from '../common/middleware/role.middleware';
import { CurrencyModule } from '../currency/currency.module';
import { DatabaseModule } from '../database/database.module';
import { OfferModule } from '../offer/offer.module';
import { ShippingModule } from '../shipping/shipping.module';
import { AdminOrderController } from './admin/admin-order.controller';
import { CustomerOrderController } from './customer/customer-order.controller';
import { OrderService } from './order.service';

@Module({
  imports: [
    DatabaseModule,
    CommonModule,
    CurrencyModule,
    OfferModule,
    ShippingModule,
    JwtModule.register({}),
    ConfigModule,
  ],
  controllers: [CustomerOrderController, AdminOrderController],
  providers: [OrderService],
  exports: [OrderService],
})
export class OrderModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AccessTokenMiddleware, allowRoles(UserRole.CUSTOMER))
      .forRoutes(CustomerOrderController);

    consumer
      .apply(
        AccessTokenMiddleware,
        allowRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN),
      )
      .forRoutes(AdminOrderController);
  }
}
