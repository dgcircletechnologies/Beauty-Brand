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

import { CategoryService } from '../category.service';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';

@Controller('admin/categories')
export class AdminCategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Post()
  @ResponseMessage('Category created successfully')
  create(@Body() dto: CreateCategoryDto) {
    return this.categoryService.create(dto);
  }

  @Get()
  @ResponseMessage('Categories fetched successfully')
  findAll() {
    return this.categoryService.findAll();
  }

  @Get('slug-availability/:slug')
  @ResponseMessage('Category slug availability checked successfully')
  checkSlugAvailability(
    @Param('slug') slug: string,
    @Query('excludeId') excludeId?: string,
  ) {
    return this.categoryService.checkSlugAvailability(slug, excludeId);
  }

  @Get(':id')
  @ResponseMessage('Category fetched successfully')
  findOne(@Param('id') id: string) {
    return this.categoryService.findOne(id);
  }

  @Patch(':id')
  @ResponseMessage('Category updated successfully')
  update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoryService.update(id, dto);
  }

  @Delete(':id')
  @ResponseMessage('Category deleted successfully')
  delete(@Param('id') id: string) {
    return this.categoryService.delete(id);
  }
}
