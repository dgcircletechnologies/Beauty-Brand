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
import { CategoryAttributeService } from '../category-attribute.service';
import { AssignCategoryAttributeDto } from '../dto/assign-category-attribute.dto';
import { UpdateCategoryAttributeDto } from '../dto/update-category-attribute.dto';

@Controller('admin/categories/:categoryId/attributes')
export class AdminCategoryAttributeController {
  constructor(
    private readonly categoryAttributeService: CategoryAttributeService,
  ) {}

  @Post()
  @ResponseMessage('Category attribute assigned successfully')
  assign(
    @Param('categoryId') categoryId: string,
    @Body() dto: AssignCategoryAttributeDto,
  ) {
    return this.categoryAttributeService.assign(categoryId, dto);
  }

  @Get()
  @ResponseMessage('Category attributes fetched successfully')
  findByCategory(@Param('categoryId') categoryId: string) {
    return this.categoryAttributeService.findByCategory(categoryId);
  }

  @Patch(':attributeDefinitionId')
  @ResponseMessage('Category attribute updated successfully')
  update(
    @Param('categoryId') categoryId: string,
    @Param('attributeDefinitionId') attributeDefinitionId: string,
    @Body() dto: UpdateCategoryAttributeDto,
  ) {
    return this.categoryAttributeService.update(
      categoryId,
      attributeDefinitionId,
      dto,
    );
  }

  @Delete(':attributeDefinitionId')
  @ResponseMessage('Category attribute removed successfully')
  remove(
    @Param('categoryId') categoryId: string,
    @Param('attributeDefinitionId') attributeDefinitionId: string,
  ) {
    return this.categoryAttributeService.remove(
      categoryId,
      attributeDefinitionId,
    );
  }
}
