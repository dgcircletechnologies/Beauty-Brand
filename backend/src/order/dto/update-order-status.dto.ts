import { IsEnum, IsOptional, IsString } from 'class-validator';

import { OrderStatus } from '../../../generated/prisma/enums.cjs';

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus)
  status!: OrderStatus;

  @IsOptional()
  @IsString()
  reason?: string;
}
