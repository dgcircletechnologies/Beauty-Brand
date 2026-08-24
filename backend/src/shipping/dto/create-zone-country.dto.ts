import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateZoneCountryDto {
  @IsString()
  @IsNotEmpty()
  countryCode!: string;

  @IsString()
  @IsNotEmpty()
  countryName!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
