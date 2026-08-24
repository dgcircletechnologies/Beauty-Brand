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
import { CreateShippingRateDto } from '../dto/create-shipping-rate.dto';
import { CreateShippingZoneDto } from '../dto/create-shipping-zone.dto';
import { CreateZoneCountryDto } from '../dto/create-zone-country.dto';
import { UpdateShippingRateDto } from '../dto/update-shipping-rate.dto';
import { UpdateShippingZoneDto } from '../dto/update-shipping-zone.dto';
import { UpdateZoneCountryDto } from '../dto/update-zone-country.dto';
import { ShippingService } from '../shipping.service';

@Controller('admin/shipping')
export class AdminShippingController {
  constructor(private readonly shippingService: ShippingService) {}

  @Get('zones')
  @ResponseMessage('Shipping zones fetched successfully')
  findZones() {
    return this.shippingService.findAdminZones();
  }

  @Post('zones')
  @ResponseMessage('Shipping zone created successfully')
  createZone(@Body() dto: CreateShippingZoneDto) {
    return this.shippingService.createZone(dto);
  }

  @Patch('zones/:zoneId')
  @ResponseMessage('Shipping zone updated successfully')
  updateZone(
    @Param('zoneId') zoneId: string,
    @Body() dto: UpdateShippingZoneDto,
  ) {
    return this.shippingService.updateZone(zoneId, dto);
  }

  @Delete('zones/:zoneId')
  @ResponseMessage('Shipping zone deleted successfully')
  deleteZone(@Param('zoneId') zoneId: string) {
    return this.shippingService.softDeleteZone(zoneId);
  }

  @Post('zones/:zoneId/countries')
  @ResponseMessage('Shipping country added successfully')
  addCountry(
    @Param('zoneId') zoneId: string,
    @Body() dto: CreateZoneCountryDto,
  ) {
    return this.shippingService.addCountry(zoneId, dto);
  }

  @Patch('countries/:countryId')
  @ResponseMessage('Shipping country updated successfully')
  updateCountry(
    @Param('countryId') countryId: string,
    @Body() dto: UpdateZoneCountryDto,
  ) {
    return this.shippingService.updateCountry(countryId, dto);
  }

  @Delete('countries/:countryId')
  @ResponseMessage('Shipping country removed successfully')
  deleteCountry(@Param('countryId') countryId: string) {
    return this.shippingService.deleteCountry(countryId);
  }

  @Post('rates')
  @ResponseMessage('Shipping rate created successfully')
  createRate(@Body() dto: CreateShippingRateDto) {
    return this.shippingService.createRate(dto);
  }

  @Patch('rates/:rateId')
  @ResponseMessage('Shipping rate updated successfully')
  updateRate(
    @Param('rateId') rateId: string,
    @Body() dto: UpdateShippingRateDto,
  ) {
    return this.shippingService.updateRate(rateId, dto);
  }

  @Delete('rates/:rateId')
  @ResponseMessage('Shipping rate deleted successfully')
  deleteRate(@Param('rateId') rateId: string) {
    return this.shippingService.softDeleteRate(rateId);
  }
}
