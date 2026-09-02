import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

import { OfferType } from '../../../generated/prisma/enums.cjs';

export class CreateOfferDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsEnum(OfferType)
  type!: OfferType;

  @IsOptional()
  @IsNumber({
    maxDecimalPlaces: 2,
  })
  @Min(0)
  value?: number | null;

  @IsOptional()
  @IsNumber({
    maxDecimalPlaces: 2,
  })
  @Min(0)
  maxDiscountAmount?: number | null;

  @IsOptional()
  @IsDateString()
  startAt?: string | null;

  @IsOptional()
  @IsDateString()
  endAt?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  priority?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  buyQuantity?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  getQuantity?: number;

  @IsOptional()
  @IsString()
  rewardProductId?: string | null;

  @IsOptional()
  @IsString()
  rewardVariantId?: string | null;
}
