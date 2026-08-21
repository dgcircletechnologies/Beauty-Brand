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
import {
  CreateAgeGroupDto,
  CreateIngredientDto,
  CreateProductMetadataDto,
} from '../dto/create-product-metadata.dto';
import {
  UpdateAgeGroupDto,
  UpdateIngredientDto,
  UpdateProductMetadataDto,
} from '../dto/update-product-metadata.dto';
import { ProductMetadataService } from '../product-metadata.service';
import type { ProductMetadataResource } from '../product-metadata.service';

@Controller('admin/product-metadata')
export class AdminProductMetadataController {
  constructor(
    private readonly productMetadataService: ProductMetadataService,
  ) {}

  @Post('ingredients')
  @ResponseMessage('Ingredient created successfully')
  createIngredient(@Body() dto: CreateIngredientDto) {
    return this.productMetadataService.createIngredient(dto);
  }

  @Get('ingredients')
  @ResponseMessage('Ingredients fetched successfully')
  findAllIngredients() {
    return this.productMetadataService.findAllIngredients();
  }

  @Get('ingredients/:id')
  @ResponseMessage('Ingredient fetched successfully')
  findIngredient(@Param('id') id: string) {
    return this.productMetadataService.findIngredient(id);
  }

  @Patch('ingredients/:id')
  @ResponseMessage('Ingredient updated successfully')
  updateIngredient(@Param('id') id: string, @Body() dto: UpdateIngredientDto) {
    return this.productMetadataService.updateIngredient(id, dto);
  }

  @Delete('ingredients/:id')
  @ResponseMessage('Ingredient deleted successfully')
  softDeleteIngredient(@Param('id') id: string) {
    return this.productMetadataService.softDeleteIngredient(id);
  }

  @Post('age-groups')
  @ResponseMessage('Age group created successfully')
  createAgeGroup(@Body() dto: CreateAgeGroupDto) {
    return this.productMetadataService.createAgeGroup(dto);
  }

  @Get('age-groups')
  @ResponseMessage('Age groups fetched successfully')
  findAllAgeGroups() {
    return this.productMetadataService.findAllAgeGroups();
  }

  @Get('age-groups/:id')
  @ResponseMessage('Age group fetched successfully')
  findAgeGroup(@Param('id') id: string) {
    return this.productMetadataService.findAgeGroup(id);
  }

  @Patch('age-groups/:id')
  @ResponseMessage('Age group updated successfully')
  updateAgeGroup(@Param('id') id: string, @Body() dto: UpdateAgeGroupDto) {
    return this.productMetadataService.updateAgeGroup(id, dto);
  }

  @Delete('age-groups/:id')
  @ResponseMessage('Age group deleted successfully')
  softDeleteAgeGroup(@Param('id') id: string) {
    return this.productMetadataService.softDeleteAgeGroup(id);
  }

  @Post(':resource')
  @ResponseMessage('Product metadata created successfully')
  create(
    @Param('resource') resource: ProductMetadataResource,
    @Body() dto: CreateProductMetadataDto,
  ) {
    return this.productMetadataService.create(resource, dto);
  }

  @Get(':resource')
  @ResponseMessage('Product metadata fetched successfully')
  findAll(@Param('resource') resource: ProductMetadataResource) {
    return this.productMetadataService.findAll(resource);
  }

  @Get(':resource/:id')
  @ResponseMessage('Product metadata fetched successfully')
  findOne(
    @Param('resource') resource: ProductMetadataResource,
    @Param('id') id: string,
  ) {
    return this.productMetadataService.findOne(resource, id);
  }

  @Patch(':resource/:id')
  @ResponseMessage('Product metadata updated successfully')
  update(
    @Param('resource') resource: ProductMetadataResource,
    @Param('id') id: string,
    @Body() dto: UpdateProductMetadataDto,
  ) {
    return this.productMetadataService.update(resource, id, dto);
  }

  @Delete(':resource/:id')
  @ResponseMessage('Product metadata deleted successfully')
  softDelete(
    @Param('resource') resource: ProductMetadataResource,
    @Param('id') id: string,
  ) {
    return this.productMetadataService.softDelete(resource, id);
  }
}
