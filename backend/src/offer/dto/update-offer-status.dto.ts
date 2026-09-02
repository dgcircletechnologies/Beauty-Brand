import { IsBoolean } from 'class-validator';

export class UpdateOfferStatusDto {
  @IsBoolean()
  isActive!: boolean;
}
