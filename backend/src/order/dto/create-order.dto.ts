import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateOrderDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  cartItemIds?: string[];

  @IsString()
  @IsNotEmpty()
  shippingAddressId!: string;

  @IsOptional()
  @IsString()
  billingAddressId?: string;

  @IsString()
  @IsNotEmpty()
  shippingRateId!: string;

  @IsOptional()
  @IsString()
  currencyCode?: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
