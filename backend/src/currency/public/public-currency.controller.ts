import { Controller, Get } from '@nestjs/common';

import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { CurrencyService } from '../currency.service';

@Controller('currencies')
export class PublicCurrencyController {
  constructor(private readonly currencyService: CurrencyService) {}

  @Get()
  @ResponseMessage('Currencies fetched successfully')
  findCurrencies() {
    return this.currencyService.findPublicCurrencies();
  }
}
