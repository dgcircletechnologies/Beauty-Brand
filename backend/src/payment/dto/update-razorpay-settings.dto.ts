import { IsOptional, IsString } from 'class-validator';

export class UpdateRazorpaySettingsDto {
  @IsOptional()
  @IsString()
  keyId?: string;

  @IsOptional()
  @IsString()
  keySecret?: string;

  @IsOptional()
  @IsString()
  webhookSecret?: string;
}
