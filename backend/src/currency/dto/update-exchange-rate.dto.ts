import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateExchangeRateDto {
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{3}$/)
  baseCurrencyCode?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{3}$/)
  quoteCurrencyCode?: string;

  @IsOptional()
  @IsNumber({
    maxDecimalPlaces: 8,
  })
  @Min(0.00000001)
  rate?: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  provider?: string;

  @IsOptional()
  @IsDateString()
  effectiveAt?: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string | null;
}
