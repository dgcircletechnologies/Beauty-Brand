import {
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

import { USER_GENDERS } from '../../account/dto/update-profile.dto';
import type { UserGenderValue } from '../../account/dto/update-profile.dto';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsOptional()
  @IsString()
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
