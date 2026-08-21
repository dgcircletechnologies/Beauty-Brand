import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';

import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { SetProductAttributeValueDto } from '../dto/set-product-attribute-value.dto';
import { UpdateProductAttributeValueDto } from '../dto/update-product-attribute-value.dto';
import { VariantAttributeValueService } from '../variant-attribute-value.service';

@Controller('admin/products/:productId/variants/:variantId/attributes')
export class AdminVariantAttributeValueController {
  constructor(
    private readonly variantAttributeValueService: VariantAttributeValueService,
  ) {}

  @Post()
  @ResponseMessage('Variant attribute value set successfully')
  set(
    @Param('productId') productId: string,
    @Param('variantId') variantId: string,
    @Body() dto: SetProductAttributeValueDto,
  ) {
    return this.variantAttributeValueService.set(productId, variantId, dto);
  }

  @Get()
  @ResponseMessage('Variant attribute values fetched successfully')
  findByVariant(
    @Param('productId') productId: string,
    @Param('variantId') variantId: string,
  ) {
    return this.variantAttributeValueService.findByVariant(
      productId,
      variantId,
    );
  }

  @Patch(':attributeId')
  @ResponseMessage('Variant attribute value updated successfully')
  update(
    @Param('productId') productId: string,
    @Param('variantId') variantId: string,
    @Param('attributeId') attributeId: string,
    @Body() dto: UpdateProductAttributeValueDto,
  ) {
    return this.variantAttributeValueService.set(productId, variantId, {
      ...dto,
      attributeId,
    });
  }

  @Delete(':attributeId')
  @ResponseMessage('Variant attribute value deleted successfully')
  remove(
    @Param('productId') productId: string,
    @Param('variantId') variantId: string,
    @Param('attributeId') attributeId: string,
  ) {
    return this.variantAttributeValueService.remove(
      productId,
      variantId,
      attributeId,
    );
  }
}
