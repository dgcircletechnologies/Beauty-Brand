import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

import { UserRole } from '../../generated/prisma/enums.cjs';
import { CommonModule } from '../common/common.module';
import { AccessTokenMiddleware } from '../common/middleware/access-token.middleware';
import { allowRoles } from '../common/middleware/role.middleware';
import { DatabaseModule } from '../database/database.module';
import { AccountService } from './account.service';
import { CustomerAccountController } from './customer/customer-account.controller';

@Module({
  imports: [DatabaseModule, CommonModule, JwtModule.register({}), ConfigModule],
  controllers: [CustomerAccountController],
  providers: [AccountService],
})
export class AccountModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(
        AccessTokenMiddleware,
        allowRoles(UserRole.CUSTOMER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
      )
      .forRoutes(CustomerAccountController);
  }
}
