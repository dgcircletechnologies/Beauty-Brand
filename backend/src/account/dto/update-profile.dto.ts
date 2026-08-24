import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export const USER_GENDERS = [
  'FEMALE',
  'MALE',
  'NON_BINARY',
  'PREFER_NOT_TO_SAY',
] as const;

export type UserGenderValue = (typeof USER_GENDERS)[number];

export class UpdateProfileDto {
  @IsString()
  @MaxLength(80)
  firstName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  lastName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsIn(USER_GENDERS)
  gender?: UserGenderValue;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(130)
  age?: number;
}
