import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';

import { AssignProductCategoryDto } from '../dto/assign-product-category.dto';
import { UpdateProductCategoryDto } from '../dto/update-product-category.dto';
import { ProductCategoryService } from '../product-category.service';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';

@Controller('admin/products/:productId/categories')
export class AdminProductCategoryController {
  constructor(
    private readonly productCategoryService: ProductCategoryService,
  ) {}

  @Post()
  @ResponseMessage('Product category assigned successfully')
  assign(
    @Param('productId') productId: string,
    @Body() dto: AssignProductCategoryDto,
  ) {
    return this.productCategoryService.assign(productId, dto);
  }

  @Get()
  @ResponseMessage('Product categories fetched successfully')
  findByProduct(@Param('productId') productId: string) {
    return this.productCategoryService.findByProduct(productId);
  }

  @Patch(':categoryId')
  @ResponseMessage('Product category updated successfully')
  update(
    @Param('productId') productId: string,
    @Param('categoryId') categoryId: string,
    @Body() dto: UpdateProductCategoryDto,
  ) {
    return this.productCategoryService.update(productId, categoryId, dto);
  }

  @Delete(':categoryId')
  @ResponseMessage('Product category removed successfully')
  remove(
    @Param('productId') productId: string,
    @Param('categoryId') categoryId: string,
  ) {
    return this.productCategoryService.remove(productId, categoryId);
  }
}
