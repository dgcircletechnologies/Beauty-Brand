import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

import { ShippingRateCalculation } from '../../../generated/prisma/enums.cjs';

export class CreateShippingRateDto {
  @IsString()
  @IsNotEmpty()
  zoneId!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  serviceCode?: string;

  @IsOptional()
  @IsEnum(ShippingRateCalculation)
  calculation?: ShippingRateCalculation;

  @IsNumber()
  @Min(0)
  amount!: number;

  @IsString()
  @IsNotEmpty()
  currencyCode!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minOrderAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxOrderAmount?: number;

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
