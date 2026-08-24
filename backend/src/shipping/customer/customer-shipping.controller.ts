import { Controller, Get } from '@nestjs/common';

import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { ShippingService } from '../shipping.service';

@Controller('shipping')
export class CustomerShippingController {
  constructor(private readonly shippingService: ShippingService) {}

  @Get('countries')
  @ResponseMessage('Shipping countries fetched successfully')
  findCountries() {
    return this.shippingService.findActiveCountries();
  }
}
