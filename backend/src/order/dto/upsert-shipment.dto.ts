import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';

import { ShipmentStatus } from '../../../generated/prisma/enums.cjs';

export class UpsertShipmentDto {
  @IsOptional()
  @IsEnum(ShipmentStatus)
  status?: ShipmentStatus;

  @IsOptional()
  @IsString()
  carrier?: string;

  @IsOptional()
  @IsString()
  service?: string;

  @IsOptional()
  @IsString()
  trackingNumber?: string;

  @IsOptional()
  @IsString()
  trackingUrl?: string;

  @IsOptional()
  @IsDateString()
  estimatedDeliveryAt?: string;
}
