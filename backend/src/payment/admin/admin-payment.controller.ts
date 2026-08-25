import { Controller, Get, Param } from '@nestjs/common';

import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { PaymentService } from '../payment.service';

@Controller('admin/payments')
export class AdminPaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Get()
  @ResponseMessage('Payments fetched successfully')
  getPayments() {
    return this.paymentService.getAdminPayments();
  }

  @Get(':paymentId')
  @ResponseMessage('Payment fetched successfully')
  getPayment(@Param('paymentId') paymentId: string) {
    return this.paymentService.getAdminPayment(paymentId);
  }
}
