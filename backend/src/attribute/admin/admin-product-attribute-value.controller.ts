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
import { ProductAttributeValueService } from '../product-attribute-value.service';

@Controller('admin/products/:productId/attributes')
export class AdminProductAttributeValueController {
  constructor(
    private readonly productAttributeValueService: ProductAttributeValueService,
  ) {}

  @Post()
  @ResponseMessage('Product attribute value set successfully')
  set(
    @Param('productId') productId: string,
    @Body() dto: SetProductAttributeValueDto,
  ) {
    return this.productAttributeValueService.set(productId, dto);
  }

  @Get()
  @ResponseMessage('Product attribute values fetched successfully')
  findByProduct(@Param('productId') productId: string) {
    return this.productAttributeValueService.findByProduct(productId);
  }

  @Patch(':attributeId')
  @ResponseMessage('Product attribute value updated successfully')
  update(
    @Param('productId') productId: string,
    @Param('attributeId') attributeId: string,
    @Body() dto: UpdateProductAttributeValueDto,
  ) {
    return this.productAttributeValueService.set(productId, {
      ...dto,
      attributeId,
    });
  }

  @Delete(':attributeId')
  @ResponseMessage('Product attribute value deleted successfully')
  remove(
    @Param('productId') productId: string,
    @Param('attributeId') attributeId: string,
  ) {
    return this.productAttributeValueService.remove(productId, attributeId);
  }
}
