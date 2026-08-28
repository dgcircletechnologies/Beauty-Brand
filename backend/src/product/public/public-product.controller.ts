import { Controller, Get, Param, Query } from '@nestjs/common';

import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { PublicProductQueryDto } from '../dto/public-product-query.dto';
import { ProductService } from '../product.service';

@Controller('products')
export class ProductPublicController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  @ResponseMessage('Products fetched successfully')
  findPublicProducts(@Query() query: PublicProductQueryDto) {
    return this.productService.findPublicProducts(query);
  }

  @Get(':slug')
  @ResponseMessage('Product fetched successfully')
  findPublicProductBySlug(@Param('slug') slug: string) {
    return this.productService.findPublicProductBySlug(slug);
  }
}
