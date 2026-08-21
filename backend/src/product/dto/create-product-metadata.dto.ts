import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateProductMetadataDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message:
      'slug must contain lowercase letters, numbers, and single hyphens only',
  })
  slug!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateIngredientDto extends CreateProductMetadataDto {
  @IsOptional()
  @IsString()
  @MaxLength(180)
  inciName?: string;

  @IsOptional()
  @IsString()
  benefits?: string;

  @IsOptional()
  @IsString()
  warnings?: string;
}

export class CreateAgeGroupDto extends CreateProductMetadataDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  minAge?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxAge?: number;
}
