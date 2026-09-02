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
import { BulkCreateOfferTargetsDto } from '../dto/bulk-create-offer-targets.dto';
import { CreateOfferDto } from '../dto/create-offer.dto';
import { CreateOfferTargetDto } from '../dto/create-offer-target.dto';
import { OfferQueryDto } from '../dto/offer-query.dto';
import { UpdateOfferStatusDto } from '../dto/update-offer-status.dto';
import { UpdateOfferDto } from '../dto/update-offer.dto';
import { OfferService } from '../offer.service';

@Controller('admin/offers')
export class AdminOfferController {
  constructor(private readonly offerService: OfferService) {}

  @Post()
  @ResponseMessage('Offer created successfully')
  create(@Body() dto: CreateOfferDto) {
    return this.offerService.create(dto);
  }

  @Get()
  @ResponseMessage('Offers fetched successfully')
  findAll(@Query() query: OfferQueryDto) {
    return this.offerService.findAll(query);
  }

  @Get(':id')
  @ResponseMessage('Offer fetched successfully')
  findOne(@Param('id') id: string) {
    return this.offerService.findOne(id);
  }

  @Get(':offerId/targets')
  @ResponseMessage('Offer targets fetched successfully')
  findTargets(@Param('offerId') offerId: string) {
    return this.offerService.findTargets(offerId);
  }

  @Post(':offerId/targets')
  @ResponseMessage('Offer target created successfully')
  createTarget(
    @Param('offerId') offerId: string,
    @Body() dto: CreateOfferTargetDto,
  ) {
    return this.offerService.createTarget(offerId, dto);
  }

  @Post(':offerId/targets/bulk')
  @ResponseMessage('Offer targets created successfully')
  createTargets(
    @Param('offerId') offerId: string,
    @Body() dto: BulkCreateOfferTargetsDto,
  ) {
    return this.offerService.createTargets(offerId, dto);
  }

  @Patch(':id/status')
  @ResponseMessage('Offer status updated successfully')
  setActive(@Param('id') id: string, @Body() dto: UpdateOfferStatusDto) {
    return this.offerService.setActive(id, dto.isActive);
  }

  @Patch(':id')
  @ResponseMessage('Offer updated successfully')
  update(@Param('id') id: string, @Body() dto: UpdateOfferDto) {
    return this.offerService.update(id, dto);
  }

  @Delete(':id')
  @ResponseMessage('Offer deleted successfully')
  delete(@Param('id') id: string) {
    return this.offerService.delete(id);
  }

  @Delete(':offerId/targets/:targetId')
  @ResponseMessage('Offer target deleted successfully')
  deleteTarget(
    @Param('offerId') offerId: string,
    @Param('targetId') targetId: string,
  ) {
    return this.offerService.deleteTarget(offerId, targetId);
  }
}
