import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

import { UserRole } from '../../generated/prisma/enums.cjs';
import { CommonModule } from '../common/common.module';
import { AccessTokenMiddleware } from '../common/middleware/access-token.middleware';
import { allowRoles } from '../common/middleware/role.middleware';
import { DatabaseModule } from '../database/database.module';
import { OfferModule } from '../offer/offer.module';
import { AdminProductMetadataController } from './admin/admin-product-metadata.controller';
import { AdminProductController } from './admin/admin-product.controller';
import {
  AdminProductImageController,
  AdminVariantImageController,
} from './admin/admin-product-image.controller';
import { AdminProductVariantController } from './admin/admin-product-variant.controller';
import { CloudinaryProductImageService } from './cloudinary-product-image.service';
import { CustomerProductReviewController } from './customer/customer-product-review.controller';
import { ProductImageService } from './product-image.service';
import { ProductMetadataService } from './product-metadata.service';
import { ProductReviewService } from './product-review.service';
import { ProductService } from './product.service';
import { ProductPublicController } from './public/public-product.controller';
import { ProductVariantService } from './variant/product-variant.service';

@Module({
  imports: [
    DatabaseModule,
    CommonModule,
    JwtModule.register({}),
    ConfigModule,
    OfferModule,
  ],
  controllers: [
    ProductPublicController,
    AdminProductController,
    AdminProductImageController,
    AdminVariantImageController,
    AdminProductVariantController,
    AdminProductMetadataController,
    CustomerProductReviewController,
  ],
  providers: [
    ProductService,
    ProductVariantService,
    ProductMetadataService,
    ProductReviewService,
    ProductImageService,
    CloudinaryProductImageService,
  ],
  exports: [
    ProductService,
    ProductVariantService,
    ProductMetadataService,
    ProductReviewService,
    ProductImageService,
  ],
})
export class ProductModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(
        AccessTokenMiddleware,
        allowRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN),
      )
      .forRoutes(
        AdminProductController,
        AdminProductImageController,
        AdminVariantImageController,
        AdminProductVariantController,
        AdminProductMetadataController,
      );

    consumer
      .apply(AccessTokenMiddleware, allowRoles(UserRole.CUSTOMER))
      .forRoutes(CustomerProductReviewController);
  }
}
