import { Module } from '@nestjs/common';

import { AttributeModule } from '../attribute/attribute.module';
import { CategoryModule } from '../category/category.module';
import { CurrencyModule } from '../currency/currency.module';
import { OfferModule } from '../offer/offer.module';
import { ProductModule } from '../product/product.module';

@Module({
  imports: [
    ProductModule,
    CategoryModule,
    AttributeModule,
    CurrencyModule,
    OfferModule,
  ],
})
export class AdminModule {}
