import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

import { UserRole } from '../../generated/prisma/enums.cjs';
import { CommonModule } from '../common/common.module';
import { AccessTokenMiddleware } from '../common/middleware/access-token.middleware';
import { allowRoles } from '../common/middleware/role.middleware';
import { DatabaseModule } from '../database/database.module';
import { OrderModule } from '../order/order.module';
import { AdminPaymentController } from './admin/admin-payment.controller';
import { CustomerPaymentController } from './customer/customer-payment.controller';
import { PaymentService } from './payment.service';
import { RazorpayWebhookController } from './razorpay-webhook.controller';

@Module({
  imports: [
    DatabaseModule,
    CommonModule,
    OrderModule,
    JwtModule.register({}),
    ConfigModule,
  ],
  controllers: [
    CustomerPaymentController,
    AdminPaymentController,
    RazorpayWebhookController,
  ],
  providers: [PaymentService],
})
export class PaymentModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AccessTokenMiddleware, allowRoles(UserRole.CUSTOMER))
      .forRoutes(CustomerPaymentController);

    consumer
      .apply(
        AccessTokenMiddleware,
        allowRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN),
      )
      .forRoutes(AdminPaymentController);
  }
}
