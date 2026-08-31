import { IsString } from 'class-validator';

export class RetryRazorpayPaymentDto {
  @IsString()
  orderId!: string;
}
