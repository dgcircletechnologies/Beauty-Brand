import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

import { UserRole } from '../../generated/prisma/enums.cjs';
import { CommonModule } from '../common/common.module';
import { AccessTokenMiddleware } from '../common/middleware/access-token.middleware';
import { allowRoles } from '../common/middleware/role.middleware';
import { DatabaseModule } from '../database/database.module';
import { AdminAttributeDefinitionController } from './admin/admin-attribute-definition.controller';
import { AdminAttributeOptionController } from './admin/admin-attribute-option.controller';
import { AdminCategoryAttributeController } from './admin/admin-category-attribute.controller';
import { AdminProductAttributeValueController } from './admin/admin-product-attribute-value.controller';
import { AdminVariantAttributeValueController } from './admin/admin-variant-attribute-value.controller';
import { AttributeDefinitionService } from './attribute-definition.service';
import { AttributeOptionService } from './attribute-option.service';
import { CategoryAttributeService } from './category-attribute.service';
import { ProductAttributeValueService } from './product-attribute-value.service';
import { VariantAttributeValueService } from './variant-attribute-value.service';

@Module({
  imports: [DatabaseModule, CommonModule, JwtModule.register({}), ConfigModule],
  controllers: [
    AdminAttributeDefinitionController,
    AdminAttributeOptionController,
    AdminProductAttributeValueController,
    AdminVariantAttributeValueController,
    AdminCategoryAttributeController,
  ],
  providers: [
    AttributeDefinitionService,
    AttributeOptionService,
    ProductAttributeValueService,
    VariantAttributeValueService,
    CategoryAttributeService,
  ],
  exports: [
    AttributeDefinitionService,
    AttributeOptionService,
    ProductAttributeValueService,
    VariantAttributeValueService,
    CategoryAttributeService,
  ],
})
export class AttributeModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(
        AccessTokenMiddleware,
        allowRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN),
      )
      .forRoutes(
        AdminAttributeDefinitionController,
        AdminAttributeOptionController,
        AdminProductAttributeValueController,
        AdminVariantAttributeValueController,
        AdminCategoryAttributeController,
      );
  }
}
