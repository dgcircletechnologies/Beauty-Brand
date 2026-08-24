import { IsArray, IsOptional, IsString } from 'class-validator';

export class CheckoutPreviewDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  cartItemIds?: string[];

  @IsOptional()
  @IsString()
  currencyCode?: string;

  @IsOptional()
  @IsString()
  shippingAddressId?: string;

  @IsOptional()
  @IsString()
  shippingRateId?: string;
}
