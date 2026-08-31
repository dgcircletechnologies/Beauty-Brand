import {
  Body,
  Controller,
  Param,
  Post,
  Req,
} from '@nestjs/common';

import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import type { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';
import { CreateProductReviewDto } from '../dto/create-product-review.dto';
import { ProductReviewService } from '../product-review.service';

@Controller('products/:productId/reviews')
export class CustomerProductReviewController {
  constructor(private readonly productReviewService: ProductReviewService) {}

  @Post()
  @ResponseMessage('Review submitted successfully')
  createOrUpdateReview(
    @Req() request: AuthenticatedRequest,
    @Param('productId') productId: string,
    @Body() dto: CreateProductReviewDto,
  ) {
    return this.productReviewService.upsertProductReview(
      request.user.id,
      productId,
      dto,
    );
  }
}
