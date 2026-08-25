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
import { AttributeDefinitionService } from '../attribute-definition.service';
import { CreateAttributeDefinitionDto } from '../dto/create-attribute-definition.dto';
import { UpdateAttributeDefinitionDto } from '../dto/update-attribute-definition.dto';

@Controller('admin/attributes')
export class AdminAttributeDefinitionController {
  constructor(
    private readonly attributeDefinitionService: AttributeDefinitionService,
  ) {}

  @Post()
  @ResponseMessage('Attribute created successfully')
  create(@Body() dto: CreateAttributeDefinitionDto) {
    return this.attributeDefinitionService.create(dto);
  }

  @Get()
  @ResponseMessage('Attributes fetched successfully')
  findAll(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('dataType') dataType?: string,
  ) {
    return this.attributeDefinitionService.findAll({
      page,
      pageSize,
      search,
      status,
      dataType,
    });
  }

  @Get('slug-availability/:slug')
  @ResponseMessage('Attribute slug availability checked successfully')
  checkSlugAvailability(
    @Param('slug') slug: string,
    @Query('excludeId') excludeId?: string,
  ) {
    return this.attributeDefinitionService.checkSlugAvailability(
      slug,
      excludeId,
    );
  }

  @Get(':id')
  @ResponseMessage('Attribute fetched successfully')
  findOne(@Param('id') id: string) {
    return this.attributeDefinitionService.findOne(id);
  }

  @Patch(':id/active')
  @ResponseMessage('Attribute status updated successfully')
  setActive(
    @Param('id') id: string,
    @Body() dto: { isActive: boolean },
  ) {
    return this.attributeDefinitionService.setActive(id, dto.isActive);
  }

  @Patch(':id')
  @ResponseMessage('Attribute updated successfully')
  update(@Param('id') id: string, @Body() dto: UpdateAttributeDefinitionDto) {
    return this.attributeDefinitionService.update(id, dto);
  }

  @Delete(':id')
  @ResponseMessage('Attribute deleted successfully')
  softDelete(@Param('id') id: string) {
    return this.attributeDefinitionService.softDelete(id);
  }
}
