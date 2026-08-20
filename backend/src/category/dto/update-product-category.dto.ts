import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';

export class UpdateProductCategoryDto {
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
