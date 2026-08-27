import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { CategoryImageService } from '../category-image.service';
import { UpdateCategoryImageDto } from '../dto/update-category-image.dto';

@Controller('admin/categories/:categoryId/images')
export class AdminCategoryImageController {
  constructor(private readonly categoryImageService: CategoryImageService) {}

  @Get()
  @ResponseMessage('Category images fetched successfully')
  findByCategory(@Param('categoryId') categoryId: string) {
    return this.categoryImageService.findByCategory(categoryId);
  }

  @Post()
  @UseInterceptors(
    FilesInterceptor('images', 8, {
      storage: memoryStorage(),
    }),
  )
  @ResponseMessage('Category images uploaded successfully')
  uploadCategoryImages(
    @Param('categoryId') categoryId: string,
    @UploadedFiles() files: Express.Multer.File[] = [],
  ) {
    return this.categoryImageService.uploadCategoryImages(categoryId, files);
  }

  @Patch(':imageId')
  @ResponseMessage('Category image updated successfully')
  updateImage(
    @Param('categoryId') categoryId: string,
    @Param('imageId') imageId: string,
    @Body() dto: UpdateCategoryImageDto,
  ) {
    return this.categoryImageService.updateImage(categoryId, imageId, dto);
  }

  @Delete(':imageId')
  @ResponseMessage('Category image deleted successfully')
  deleteImage(
    @Param('categoryId') categoryId: string,
    @Param('imageId') imageId: string,
  ) {
    return this.categoryImageService.deleteImage(categoryId, imageId);
  }
}
