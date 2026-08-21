import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class SetProductAttributeValueDto {
  @IsString()
  @IsNotEmpty()
  attributeId!: string;

  @IsOptional()
  @IsString()
  textValue?: string;

  @IsOptional()
  @IsNumber({
    maxDecimalPlaces: 4,
  })
  numberValue?: number;

  @IsOptional()
  @IsBoolean()
  booleanValue?: boolean;

  @IsOptional()
  @IsString()
  optionId?: string;

  @IsOptional()
  @IsArray()
  @IsString({
    each: true,
  })
  optionIds?: string[];
}
