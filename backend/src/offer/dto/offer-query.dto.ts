import {
  IsBooleanString,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';

import { OfferType } from '../../../generated/prisma/enums.cjs';

export class OfferQueryDto {
  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  limit?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(OfferType)
  type?: OfferType;

  @IsOptional()
  @IsBooleanString()
  isActive?: string;

  @IsOptional()
  @IsDateString()
  startAt?: string;

  @IsOptional()
  @IsDateString()
  endAt?: string;
}
