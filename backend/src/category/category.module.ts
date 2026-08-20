import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

import { UserRole } from '../../generated/prisma/enums.cjs';
import { CommonModule } from '../common/common.module';
import { AccessTokenMiddleware } from '../common/middleware/access-token.middleware';
import { allowRoles } from '../common/middleware/role.middleware';
import { DatabaseModule } from '../database/database.module';
import { AdminCategoryController } from './admin/admin-category.controller';
import { AdminProductCategoryController } from './admin/admin-product-category.controller';
import { CategoryService } from './category.service';
import { ProductCategoryService } from './product-category.service';
import { CategoryPublicController } from './public/public-category.controller';

@Module({
  imports: [DatabaseModule, CommonModule, JwtModule.register({}), ConfigModule],
  controllers: [
    AdminCategoryController,
    AdminProductCategoryController,
    CategoryPublicController,
  ],
  providers: [CategoryService, ProductCategoryService],
  exports: [CategoryService, ProductCategoryService],
})
export class CategoryModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(
        AccessTokenMiddleware,
        allowRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN),
      )
      .forRoutes(AdminCategoryController, AdminProductCategoryController);
  }
}
