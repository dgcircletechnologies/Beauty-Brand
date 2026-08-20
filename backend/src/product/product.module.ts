import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

import { UserRole } from '../../generated/prisma/enums.cjs';
import { CommonModule } from '../common/common.module';
import { AccessTokenMiddleware } from '../common/middleware/access-token.middleware';
import { allowRoles } from '../common/middleware/role.middleware';
import { DatabaseModule } from '../database/database.module';
import { AdminProductController } from './admin/admin-product.controller';
import { AdminProductVariantController } from './admin/admin-product-variant.controller';
import { ProductService } from './product.service';
import { ProductPublicController } from './public/public-product.controller';
import { ProductVariantService } from './variant/product-variant.service';

@Module({
  imports: [DatabaseModule, CommonModule, JwtModule.register({}), ConfigModule],
  controllers: [
    ProductPublicController,
    AdminProductController,
    AdminProductVariantController,
  ],
  providers: [ProductService, ProductVariantService],
  exports: [ProductService, ProductVariantService],
})
export class ProductModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(
        AccessTokenMiddleware,
        allowRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN),
      )
      .forRoutes(AdminProductController, AdminProductVariantController);
  }
}
