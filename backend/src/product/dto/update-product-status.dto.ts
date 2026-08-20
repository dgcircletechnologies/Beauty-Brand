import { IsEnum } from 'class-validator';

import { ProductStatus } from '../../../generated/prisma/enums.cjs';

export class UpdateProductStatusDto {
  @IsEnum(ProductStatus)
  status!: ProductStatus;
}
