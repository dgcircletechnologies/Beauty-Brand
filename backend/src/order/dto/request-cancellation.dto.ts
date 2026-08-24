import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RequestCancellationDto {
  @IsString()
  @IsNotEmpty()
  reason!: string;

  @IsOptional()
  @IsString()
  details?: string;
}
