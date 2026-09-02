import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, ValidateNested } from 'class-validator';

import { CreateOfferTargetDto } from './create-offer-target.dto';

export class BulkCreateOfferTargetsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({
    each: true,
  })
  @Type(() => CreateOfferTargetDto)
  targets!: CreateOfferTargetDto[];
}
