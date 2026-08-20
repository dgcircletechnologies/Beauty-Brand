import { Module } from '@nestjs/common';

import { CategoryModule } from '../category/category.module';
import { ProductModule } from '../product/product.module';

@Module({
  imports: [ProductModule, CategoryModule],
})
export class AdminModule {}
