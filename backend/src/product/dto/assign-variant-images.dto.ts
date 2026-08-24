import { IsArray, IsString } from 'class-validator';

export class AssignVariantImagesDto {
  @IsArray()
  @IsString({ each: true })
  imageIds!: string[];
}
