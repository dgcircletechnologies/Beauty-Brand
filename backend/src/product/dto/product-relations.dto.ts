import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class ProductIngredientInputDto {
  @IsString()
  @IsNotEmpty()
  ingredientId!: string;

  @IsOptional()
  @IsString()
  purpose?: string;

  @IsOptional()
  @IsString()
  concentration?: string;

  @IsOptional()
  @IsBoolean()
  isKeyIngredient?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class ProductRelationsDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({
    each: true,
  })
  @Type(() => ProductIngredientInputDto)
  ingredients?: ProductIngredientInputDto[];

  @IsOptional()
  @IsArray()
  @IsString({
    each: true,
  })
  audienceIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({
    each: true,
  })
  skinTypeIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({
    each: true,
  })
  ageGroupIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({
    each: true,
  })
  hairProfileIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({
    each: true,
  })
  concernIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({
    each: true,
  })
  benefitIds?: string[];
}
