import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

import { CurrencyStatus } from '../../../generated/prisma/enums.cjs';

export class UpdateCurrencyDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(12)
  symbol?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(8)
  decimalDigits?: number;

  @IsOptional()
  @IsEnum(CurrencyStatus)
  status?: CurrencyStatus;

  @IsOptional()
  @IsBoolean()
  isBase?: boolean;
}
