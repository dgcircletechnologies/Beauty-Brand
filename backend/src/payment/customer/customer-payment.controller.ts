import { Body, Controller, Post, Req } from '@nestjs/common';

import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import type { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';
import { CreateRazorpayOrderDto } from '../dto/create-razorpay-order.dto';
import { RetryRazorpayPaymentDto } from '../dto/retry-razorpay-payment.dto';
import { VerifyRazorpayPaymentDto } from '../dto/verify-razorpay-payment.dto';
import { PaymentService } from '../payment.service';

@Controller('payments/razorpay')
export class CustomerPaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('create-order')
  @ResponseMessage('Razorpay order created successfully')
  createRazorpayOrder(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateRazorpayOrderDto,
  ) {
    return this.paymentService.createRazorpayOrder(request.user.id, dto);
  }

  @Post('retry')
  @ResponseMessage('Razorpay retry order created successfully')
  retryRazorpayPayment(
    @Req() request: AuthenticatedRequest,
    @Body() dto: RetryRazorpayPaymentDto,
  ) {
    return this.paymentService.retryRazorpayPayment(request.user.id, dto);
  }

  @Post('verify')
  @ResponseMessage('Razorpay payment verified successfully')
  verifyRazorpayPayment(
    @Req() request: AuthenticatedRequest,
    @Body() dto: VerifyRazorpayPaymentDto,
  ) {
    return this.paymentService.verifyRazorpayPayment(request.user.id, dto);
  }
}
