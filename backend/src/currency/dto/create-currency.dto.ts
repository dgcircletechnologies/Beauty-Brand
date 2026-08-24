import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

import { CurrencyStatus } from '../../../generated/prisma/enums.cjs';

export class CreateCurrencyDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z]{3}$/, {
    message: 'code must be a 3-letter uppercase ISO currency code',
  })
  code!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

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
