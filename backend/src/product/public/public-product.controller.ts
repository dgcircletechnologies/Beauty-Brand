import { Controller, Get, Param } from '@nestjs/common';

import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { ProductService } from '../product.service';

@Controller('products')
export class ProductPublicController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  @ResponseMessage('Products fetched successfully')
  findPublicProducts() {
    return this.productService.findPublicProducts();
  }

  @Get(':slug')
  @ResponseMessage('Product fetched successfully')
  findPublicProductBySlug(@Param('slug') slug: string) {
    return this.productService.findPublicProductBySlug(slug);
  }
}
