import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

import { UserRole } from '../../generated/prisma/enums.cjs';
import { CommonModule } from '../common/common.module';
import { AccessTokenMiddleware } from '../common/middleware/access-token.middleware';
import { allowRoles } from '../common/middleware/role.middleware';
import { DatabaseModule } from '../database/database.module';
import { AdminCurrencyController } from './admin/admin-currency.controller';
import { CurrencyService } from './currency.service';
import { PublicCurrencyController } from './public/public-currency.controller';

@Module({
  imports: [DatabaseModule, CommonModule, JwtModule.register({}), ConfigModule],
  controllers: [AdminCurrencyController, PublicCurrencyController],
  providers: [CurrencyService],
  exports: [CurrencyService],
})
export class CurrencyModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(
        AccessTokenMiddleware,
        allowRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN),
      )
      .forRoutes(AdminCurrencyController);
  }
}
