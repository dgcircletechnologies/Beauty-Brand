import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';

import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import type { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';
import { CreateOrderDto } from '../dto/create-order.dto';
import { RequestCancellationDto } from '../dto/request-cancellation.dto';
import { OrderService } from '../order.service';

@Controller('orders')
export class CustomerOrderController {
  constructor(private readonly orderService: OrderService) {}

  @Get('checkout')
  @ResponseMessage('Checkout preview fetched successfully')
  getCheckoutPreview(
    @Req() request: AuthenticatedRequest,
    @Query('cartItemIds') cartItemIds?: string[] | string,
    @Query('currencyCode') currencyCode?: string,
    @Query('shippingAddressId') shippingAddressId?: string,
    @Query('shippingRateId') shippingRateId?: string,
  ) {
    return this.orderService.getCheckoutPreview(request.user.id, {
      cartItemIds: this.parseCartItemIds(cartItemIds),
      currencyCode,
      shippingAddressId,
      shippingRateId,
    });
  }

  @Post('checkout')
  @ResponseMessage('Order placed successfully')
  createOrder(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateOrderDto,
  ) {
    return this.orderService.createOrder(request.user.id, dto);
  }

  @Get()
  @ResponseMessage('Orders fetched successfully')
  getOrders(@Req() request: AuthenticatedRequest) {
    return this.orderService.getCustomerOrders(request.user.id);
  }

  @Post(':orderId/cancellation-requests')
  @ResponseMessage('Cancellation request submitted successfully')
  requestCancellation(
    @Req() request: AuthenticatedRequest,
    @Param('orderId') orderId: string,
    @Body() dto: RequestCancellationDto,
  ) {
    return this.orderService.requestCancellation(request.user.id, orderId, dto);
  }

  private parseCartItemIds(value?: string[] | string): string[] | undefined {
    if (!value) {
      return undefined;
    }

    const values = Array.isArray(value) ? value : [value];

    return values
      .flatMap((item) => item.split(','))
      .map((item) => item.trim())
      .filter(Boolean);
  }
}
