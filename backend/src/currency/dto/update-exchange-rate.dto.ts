import { IsDateString, IsOptional } from 'class-validator';

export class UpdateExchangeRateDto {
  @IsOptional()
  @IsDateString()
  expiresAt?: string | null;
}
