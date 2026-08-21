import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

import { AttributeDataType } from '../../../generated/prisma/enums.cjs';

export class CreateAttributeDefinitionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message:
      'slug must contain lowercase letters, numbers, and single hyphens only',
  })
  slug!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(AttributeDataType)
  dataType!: AttributeDataType;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
