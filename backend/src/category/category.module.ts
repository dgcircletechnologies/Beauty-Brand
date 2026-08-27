import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

import { UserRole } from '../../generated/prisma/enums.cjs';
import { CommonModule } from '../common/common.module';
import { AccessTokenMiddleware } from '../common/middleware/access-token.middleware';
import { allowRoles } from '../common/middleware/role.middleware';
import { DatabaseModule } from '../database/database.module';
import { AdminCategoryController } from './admin/admin-category.controller';
import { AdminCategoryImageController } from './admin/admin-category-image.controller';
import { AdminProductCategoryController } from './admin/admin-product-category.controller';
import { CategoryImageService } from './category-image.service';
import { CategoryService } from './category.service';
import { CloudinaryCategoryImageService } from './cloudinary-category-image.service';
import { ProductCategoryService } from './product-category.service';
import { CategoryPublicController } from './public/public-category.controller';

@Module({
  imports: [DatabaseModule, CommonModule, JwtModule.register({}), ConfigModule],
  controllers: [
    AdminCategoryController,
    AdminCategoryImageController,
    AdminProductCategoryController,
    CategoryPublicController,
  ],
  providers: [
    CategoryService,
    ProductCategoryService,
    CategoryImageService,
    CloudinaryCategoryImageService,
  ],
  exports: [CategoryService, ProductCategoryService, CategoryImageService],
})
export class CategoryModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(
        AccessTokenMiddleware,
        allowRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN),
      )
      .forRoutes(
        AdminCategoryController,
        AdminCategoryImageController,
        AdminProductCategoryController,
      );
  }
}
