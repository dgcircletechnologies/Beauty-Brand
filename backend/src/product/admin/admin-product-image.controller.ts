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
import { AssignVariantImagesDto } from '../dto/assign-variant-images.dto';
import { UpdateProductImageDto } from '../dto/update-product-image.dto';
import { ProductImageService } from '../product-image.service';

@Controller('admin/products/:productId/images')
export class AdminProductImageController {
  constructor(private readonly productImageService: ProductImageService) {}

  @Get()
  @ResponseMessage('Product images fetched successfully')
  findByProduct(@Param('productId') productId: string) {
    return this.productImageService.findByProduct(productId);
  }

  @Post()
  @UseInterceptors(
    FilesInterceptor('images', 12, {
      storage: memoryStorage(),
    }),
  )
  @ResponseMessage('Product images uploaded successfully')
  uploadProductImages(
    @Param('productId') productId: string,
    @UploadedFiles() files: Express.Multer.File[] = [],
  ) {
    return this.productImageService.uploadProductImages(productId, files);
  }

  @Patch(':imageId')
  @ResponseMessage('Product image updated successfully')
  updateImage(
    @Param('productId') productId: string,
    @Param('imageId') imageId: string,
    @Body() dto: UpdateProductImageDto,
  ) {
    return this.productImageService.updateImage(productId, imageId, dto);
  }

  @Delete(':imageId')
  @ResponseMessage('Product image deleted successfully')
  deleteImage(
    @Param('productId') productId: string,
    @Param('imageId') imageId: string,
  ) {
    return this.productImageService.deleteImage(productId, imageId);
  }
}

@Controller('admin/products/:productId/variants/:variantId/images')
export class AdminVariantImageController {
  constructor(private readonly productImageService: ProductImageService) {}

  @Post()
  @UseInterceptors(
    FilesInterceptor('images', 12, {
      storage: memoryStorage(),
    }),
  )
  @ResponseMessage('Variant images uploaded successfully')
  uploadVariantImages(
    @Param('productId') productId: string,
    @Param('variantId') variantId: string,
    @UploadedFiles() files: Express.Multer.File[] = [],
  ) {
    return this.productImageService.uploadVariantImages(
      productId,
      variantId,
      files,
    );
  }

  @Patch()
  @ResponseMessage('Variant images assigned successfully')
  assignVariantImages(
    @Param('productId') productId: string,
    @Param('variantId') variantId: string,
    @Body() dto: AssignVariantImagesDto,
  ) {
    return this.productImageService.assignVariantImages(
      productId,
      variantId,
      dto,
    );
  }
}
