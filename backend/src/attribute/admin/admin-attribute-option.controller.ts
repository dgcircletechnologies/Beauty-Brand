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
import { AttributeOptionService } from '../attribute-option.service';
import { CreateAttributeOptionDto } from '../dto/create-attribute-option.dto';
import { UpdateAttributeOptionDto } from '../dto/update-attribute-option.dto';

@Controller('admin/attributes/:attributeId/options')
export class AdminAttributeOptionController {
  constructor(
    private readonly attributeOptionService: AttributeOptionService,
  ) {}

  @Post()
  @ResponseMessage('Attribute option created successfully')
  create(
    @Param('attributeId') attributeId: string,
    @Body() dto: CreateAttributeOptionDto,
  ) {
    return this.attributeOptionService.create(attributeId, dto);
  }

  @Get()
  @ResponseMessage('Attribute options fetched successfully')
  findByAttribute(@Param('attributeId') attributeId: string) {
    return this.attributeOptionService.findByAttribute(attributeId);
  }

  @Get(':optionId')
  @ResponseMessage('Attribute option fetched successfully')
  findOne(
    @Param('attributeId') attributeId: string,
    @Param('optionId') optionId: string,
  ) {
    return this.attributeOptionService.findOne(attributeId, optionId);
  }

  @Patch(':optionId')
  @ResponseMessage('Attribute option updated successfully')
  update(
    @Param('attributeId') attributeId: string,
    @Param('optionId') optionId: string,
    @Body() dto: UpdateAttributeOptionDto,
  ) {
    return this.attributeOptionService.update(attributeId, optionId, dto);
  }

  @Delete(':optionId')
  @ResponseMessage('Attribute option deleted successfully')
  softDelete(
    @Param('attributeId') attributeId: string,
    @Param('optionId') optionId: string,
  ) {
    return this.attributeOptionService.softDelete(attributeId, optionId);
  }
}
