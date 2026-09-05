import { Controller, Get, Param, Query } from '@nestjs/common';

import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { CategoryService } from '../category.service';

@Controller('categories')
export class CategoryPublicController {
  constructor(private readonly categoryService: CategoryService) {}

  @Get()
  @ResponseMessage('Categories fetched successfully')
  findPublicCategories(@Query('sort') sort?: string) {
    return this.categoryService.findPublicCategories({ sort });
  }

  @Get(':slug/products')
  @ResponseMessage('Category products fetched successfully')
  findPublicProductsBySlug(@Param('slug') slug: string) {
    return this.categoryService.findPublicProductsBySlug(slug);
  }

  @Get(':slug')
  @ResponseMessage('Category fetched successfully')
  findPublicBySlug(@Param('slug') slug: string) {
    return this.categoryService.findPublicBySlug(slug);
  }
}
