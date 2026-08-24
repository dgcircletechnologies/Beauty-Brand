import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';

import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import type { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';
import { CartService } from '../cart.service';
import { AddCartItemDto } from '../dto/add-cart-item.dto';
import { UpdateCartCurrencyDto } from '../dto/update-cart-currency.dto';
import { UpdateCartItemDto } from '../dto/update-cart-item.dto';

@Controller('cart')
export class CustomerCartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ResponseMessage('Cart fetched successfully')
  getCart(@Req() request: AuthenticatedRequest) {
    return this.cartService.getActiveCart(request.user.id);
  }

  @Post('items')
  @ResponseMessage('Cart item added successfully')
  addItem(@Req() request: AuthenticatedRequest, @Body() dto: AddCartItemDto) {
    return this.cartService.addItem(request.user.id, dto);
  }

  @Patch('items/:itemId')
  @ResponseMessage('Cart item updated successfully')
  updateItem(
    @Req() request: AuthenticatedRequest,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartService.updateItem(request.user.id, itemId, dto);
  }

  @Delete('items/:itemId')
  @ResponseMessage('Cart item removed successfully')
  removeItem(
    @Req() request: AuthenticatedRequest,
    @Param('itemId') itemId: string,
  ) {
    return this.cartService.removeItem(request.user.id, itemId);
  }

  @Delete('items')
  @ResponseMessage('Cart cleared successfully')
  clearCart(@Req() request: AuthenticatedRequest) {
    return this.cartService.clearCart(request.user.id);
  }

  @Patch('currency')
  @ResponseMessage('Cart currency updated successfully')
  updateCurrency(
    @Req() request: AuthenticatedRequest,
    @Body() dto: UpdateCartCurrencyDto,
  ) {
    return this.cartService.updateCurrency(request.user.id, dto);
  }
}
