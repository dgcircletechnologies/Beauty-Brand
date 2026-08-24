import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

import { ShippingRateCalculation } from '../../../generated/prisma/enums.cjs';

export class UpdateShippingRateDto {
  @IsOptional()
  @IsString()
  zoneId?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  serviceCode?: string;

  @IsOptional()
  @IsEnum(ShippingRateCalculation)
  calculation?: ShippingRateCalculation;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsString()
  currencyCode?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minOrderAmount?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxOrderAmount?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  estimatedDaysMin?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  estimatedDaysMax?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
