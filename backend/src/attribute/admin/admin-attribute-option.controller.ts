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
  findByAttribute(
    @Param('attributeId') attributeId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.attributeOptionService.findByAttribute(attributeId, {
      page,
      pageSize,
      search,
      status,
    });
  }

  @Get('value-availability/:value')
  @ResponseMessage('Attribute option value availability checked successfully')
  checkValueAvailability(
    @Param('attributeId') attributeId: string,
    @Param('value') value: string,
  ) {
    return this.attributeOptionService.checkValueAvailability(
      attributeId,
      value,
    );
  }

  @Get(':optionId')
  @ResponseMessage('Attribute option fetched successfully')
  findOne(
    @Param('attributeId') attributeId: string,
    @Param('optionId') optionId: string,
  ) {
    return this.attributeOptionService.findOne(attributeId, optionId);
  }

  @Patch(':optionId/active')
  @ResponseMessage('Attribute option status updated successfully')
  setActive(
    @Param('attributeId') attributeId: string,
    @Param('optionId') optionId: string,
    @Body() dto: { isActive: boolean },
  ) {
    return this.attributeOptionService.setActive(
      attributeId,
      optionId,
      dto.isActive,
    );
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
