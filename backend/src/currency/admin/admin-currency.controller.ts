import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';

import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { CurrencyService } from '../currency.service';
import { CreateCurrencyDto } from '../dto/create-currency.dto';
import { CreateExchangeRateDto } from '../dto/create-exchange-rate.dto';
import { UpdateCurrencyDto } from '../dto/update-currency.dto';
import { UpdateExchangeRateDto } from '../dto/update-exchange-rate.dto';

@Controller('admin/currencies')
export class AdminCurrencyController {
  constructor(private readonly currencyService: CurrencyService) {}

  @Get()
  @ResponseMessage('Currencies fetched successfully')
  findCurrencies() {
    return this.currencyService.findAdminCurrencies();
  }

  @Post()
  @ResponseMessage('Currency created successfully')
  createCurrency(@Body() dto: CreateCurrencyDto) {
    return this.currencyService.createCurrency(dto);
  }

  @Patch(':code')
  @ResponseMessage('Currency updated successfully')
  updateCurrency(@Param('code') code: string, @Body() dto: UpdateCurrencyDto) {
    return this.currencyService.updateCurrency(code, dto);
  }

  @Get('exchange-rates')
  @ResponseMessage('Exchange rates fetched successfully')
  findExchangeRates() {
    return this.currencyService.findAdminExchangeRates();
  }

  @Post('exchange-rates')
  @ResponseMessage('Exchange rate created successfully')
  createExchangeRate(@Body() dto: CreateExchangeRateDto) {
    return this.currencyService.createExchangeRate(dto);
  }

  @Patch('exchange-rates/:id')
  @ResponseMessage('Exchange rate updated successfully')
  updateExchangeRate(
    @Param('id') id: string,
    @Body() dto: UpdateExchangeRateDto,
  ) {
    return this.currencyService.updateExchangeRate(id, dto);
  }
}
