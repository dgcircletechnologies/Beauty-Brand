import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateExchangeRateDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z]{3}$/)
  baseCurrencyCode!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z]{3}$/)
  quoteCurrencyCode!: string;

  @IsNumber({
    maxDecimalPlaces: 8,
  })
  @Min(0.00000001)
  rate!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  provider!: string;

  @IsDateString()
  effectiveAt!: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
