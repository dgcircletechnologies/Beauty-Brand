import { IsOptional, IsString } from 'class-validator';

export class CreateOfferTargetDto {
  @IsOptional()
  @IsString()
  productId?: string | null;

  @IsOptional()
  @IsString()
  categoryId?: string | null;

  @IsOptional()
  @IsString()
  variantId?: string | null;
}
