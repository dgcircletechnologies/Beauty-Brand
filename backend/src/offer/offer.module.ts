import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

import { UserRole } from '../../generated/prisma/enums.cjs';
import { CommonModule } from '../common/common.module';
import { AccessTokenMiddleware } from '../common/middleware/access-token.middleware';
import { allowRoles } from '../common/middleware/role.middleware';
import { DatabaseModule } from '../database/database.module';
import { AdminOfferController } from './admin/admin-offer.controller';
import { OfferService } from './offer.service';
import { OfferResolverService } from './services/offer-resolver.service';

@Module({
  imports: [DatabaseModule, CommonModule, JwtModule.register({}), ConfigModule],
  controllers: [AdminOfferController],
  providers: [OfferService, OfferResolverService],
  exports: [OfferService, OfferResolverService],
})
export class OfferModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(
        AccessTokenMiddleware,
        allowRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN),
      )
      .forRoutes(AdminOfferController);
  }
}
