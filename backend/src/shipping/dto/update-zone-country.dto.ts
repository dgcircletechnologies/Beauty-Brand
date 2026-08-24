import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateZoneCountryDto {
  @IsOptional()
  @IsString()
  countryCode?: string;

  @IsOptional()
  @IsString()
  countryName?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
