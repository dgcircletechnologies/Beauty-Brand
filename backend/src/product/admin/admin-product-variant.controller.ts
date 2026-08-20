import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';

import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { CreateProductVariantDto } from '../variant/dto/create-product-variant.dto';
import { UpdateProductVariantDto } from '../variant/dto/update-product-variant.dto';
import { ProductVariantService } from '../variant/product-variant.service';

@Controller('admin/products/:productId/variants')
export class AdminProductVariantController {
  constructor(private readonly productVariantService: ProductVariantService) {}

  @Post()
  @ResponseMessage('Product variant created successfully')
  create(
    @Param('productId') productId: string,
    @Body() dto: CreateProductVariantDto,
  ) {
    return this.productVariantService.create(productId, dto);
  }

  @Get()
  @ResponseMessage('Product variants fetched successfully')
  findByProduct(@Param('productId') productId: string) {
    return this.productVariantService.findByProduct(productId);
  }

  @Get(':variantId')
  @ResponseMessage('Product variant fetched successfully')
  findOne(
    @Param('productId') productId: string,
    @Param('variantId') variantId: string,
  ) {
    return this.productVariantService.findOne(productId, variantId);
  }

  @Patch(':variantId')
  @ResponseMessage('Product variant updated successfully')
  update(
    @Param('productId') productId: string,
    @Param('variantId') variantId: string,
    @Body() dto: UpdateProductVariantDto,
  ) {
    return this.productVariantService.update(productId, variantId, dto);
  }

  @Delete(':variantId')
  @ResponseMessage('Product variant deleted successfully')
  softDelete(
    @Param('productId') productId: string,
    @Param('variantId') variantId: string,
  ) {
    return this.productVariantService.softDelete(productId, variantId);
  }
}
