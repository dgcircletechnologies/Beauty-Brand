import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

import { ProductStatus } from '../../../generated/prisma/enums.cjs';
import { ProductRelationsDto } from './product-relations.dto';

export class UpdateProductDto extends ProductRelationsDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  shortDescription?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  usageInstructions?: string;

  @IsOptional()
  @IsString()
  warnings?: string;

  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;
}
