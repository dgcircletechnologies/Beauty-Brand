import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpdateProductAttributeValueDto {
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
