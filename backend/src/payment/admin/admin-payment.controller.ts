import { Body, Controller, Get, Param, Put } from '@nestjs/common';

import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { UpdateRazorpaySettingsDto } from '../dto/update-razorpay-settings.dto';
import { PaymentService } from '../payment.service';

@Controller('admin/payments')
export class AdminPaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Get()
  @ResponseMessage('Payments fetched successfully')
  getPayments() {
    return this.paymentService.getAdminPayments();
  }

  @Get('settings/razorpay')
  @ResponseMessage('Razorpay settings fetched successfully')
  getRazorpaySettings() {
    return this.paymentService.getRazorpaySettings();
  }

  @Put('settings/razorpay')
  @ResponseMessage('Razorpay settings updated successfully')
  updateRazorpaySettings(@Body() dto: UpdateRazorpaySettingsDto) {
    return this.paymentService.updateRazorpaySettings(dto);
  }

  @Get(':paymentId')
  @ResponseMessage('Payment fetched successfully')
  getPayment(@Param('paymentId') paymentId: string) {
    return this.paymentService.getAdminPayment(paymentId);
  }
}
