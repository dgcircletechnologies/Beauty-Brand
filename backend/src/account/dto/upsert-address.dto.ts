import {
  IsBoolean,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';

export class UpsertAddressDto {
  @IsOptional()
  @IsString()
  @MaxLength(60)
  label?: string;

  @IsString()
  @MaxLength(80)
  firstName!: string;

  @IsString()
  @MaxLength(80)
  lastName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  company?: string;

  @IsString()
  @MaxLength(180)
  line1!: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  line2?: string;

  @IsString()
  @MaxLength(90)
  city!: string;

  @IsOptional()
  @IsString()
  @MaxLength(90)
  stateOrProvince?: string;

  @IsString()
  @MaxLength(30)
  postalCode!: string;

  @IsString()
  @Length(2, 2)
  countryCode!: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsBoolean()
  isDefaultShipping?: boolean;

  @IsOptional()
  @IsBoolean()
  isDefaultBilling?: boolean;
}
