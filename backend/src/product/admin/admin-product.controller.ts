import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductStatusDto } from '../dto/update-product-status.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { ProductService } from '../product.service';

@Controller('admin/products')
export class AdminProductController {
  constructor(private readonly productService: ProductService) {}

  @Get('metadata')
  @ResponseMessage('Product metadata fetched successfully')
  findProductMetadata() {
    return this.productService.findProductMetadata();
  }

  @Get('slug-availability/:slug')
  @ResponseMessage('Product slug availability checked successfully')
  checkSlugAvailability(
    @Param('slug') slug: string,
    @Query('excludeId') excludeId?: string,
  ) {
    return this.productService.checkSlugAvailability(slug, excludeId);
  }

  @Post()
  @ResponseMessage('Product created successfully')
  create(@Body() dto: CreateProductDto) {
    return this.productService.create(dto);
  }

  @Get()
  @ResponseMessage('Products fetched successfully')
  findAdminProducts() {
    return this.productService.findAdminProducts();
  }

  @Get(':id')
  @ResponseMessage('Product fetched successfully')
  findAdminProductById(@Param('id') id: string) {
    return this.productService.findAdminProductById(id);
  }

  @Patch(':id')
  @ResponseMessage('Product updated successfully')
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productService.update(id, dto);
  }

  @Patch(':id/status')
  @ResponseMessage('Product status updated successfully')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateProductStatusDto) {
    return this.productService.updateStatus(id, dto);
  }

  @Delete(':id')
  @ResponseMessage('Product deleted successfully')
  softDelete(@Param('id') id: string) {
    return this.productService.softDelete(id);
  }
}
