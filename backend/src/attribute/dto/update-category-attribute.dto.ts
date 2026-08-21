import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';

export class UpdateCategoryAttributeDto {
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @IsOptional()
  @IsBoolean()
  isVariantAttribute?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
