import { IsString } from 'class-validator';

export class VerifyRazorpayPaymentDto {
  @IsString()
  localOrderId!: string;

  @IsString()
  razorpay_order_id!: string;

  @IsString()
  razorpay_payment_id!: string;

  @IsString()
  razorpay_signature!: string;
}
