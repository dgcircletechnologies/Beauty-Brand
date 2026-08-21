import { Module } from '@nestjs/common';

import { AttributeModule } from '../attribute/attribute.module';
import { CategoryModule } from '../category/category.module';
import { ProductModule } from '../product/product.module';

@Module({
  imports: [ProductModule, CategoryModule, AttributeModule],
})
export class AdminModule {}
