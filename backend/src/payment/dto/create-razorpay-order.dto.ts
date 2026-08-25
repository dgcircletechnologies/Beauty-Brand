import { IsArray, IsOptional, IsString } from 'class-validator';

export class CreateRazorpayOrderDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  cartItemIds?: string[];

  @IsString()
  shippingAddressId!: string;

  @IsOptional()
  @IsString()
  billingAddressId?: string;

  @IsString()
  shippingRateId!: string;

  @IsOptional()
  @IsString()
  currencyCode?: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;
}
