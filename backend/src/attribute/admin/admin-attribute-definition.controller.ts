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
  findAll() {
    return this.attributeDefinitionService.findAll();
  }

  @Get(':id')
  @ResponseMessage('Attribute fetched successfully')
  findOne(@Param('id') id: string) {
    return this.attributeDefinitionService.findOne(id);
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
