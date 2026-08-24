import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateProductImageDto {
  @IsOptional()
  @IsString()
  altText?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @IsOptional()
  @IsString()
  variantId?: string | null;
}
