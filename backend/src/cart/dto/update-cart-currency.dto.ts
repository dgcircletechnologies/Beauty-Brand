import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class UpdateCartCurrencyDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z]{3}$/)
  currencyCode!: string;
}
