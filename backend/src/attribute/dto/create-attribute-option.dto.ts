import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateAttributeOptionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  label!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  value!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
