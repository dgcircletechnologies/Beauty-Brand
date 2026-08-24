import { Module } from '@nestjs/common';

import { CurrencyModule } from '../currency/currency.module';
import { ProductModule } from '../product/product.module';

@Module({
  imports: [ProductModule, CurrencyModule],
})
export class PublicModule {}
