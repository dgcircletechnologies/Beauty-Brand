import { Controller, Headers, Post, Req } from '@nestjs/common';
import { Request } from 'express';

import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { PaymentService } from './payment.service';

@Controller('payments/razorpay/webhook')
export class RazorpayWebhookController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post()
  @ResponseMessage('Razorpay webhook received')
  handleWebhook(
    @Headers('x-razorpay-signature') signature: string | undefined,
    @Req() request: Request & { rawBody?: Buffer },
  ) {
    const rawBody = request.rawBody ?? Buffer.from(JSON.stringify(request.body));
    return this.paymentService.handleRazorpayWebhook(signature, rawBody);
  }
}
