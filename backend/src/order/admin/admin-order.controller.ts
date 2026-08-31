import { Body, Controller, Delete, Get, Param, Patch, Req } from '@nestjs/common';

import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import type { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';
import { DecideCancellationDto } from '../dto/decide-cancellation.dto';
import { UpdateOrderStatusDto } from '../dto/update-order-status.dto';
import { UpsertShipmentDto } from '../dto/upsert-shipment.dto';
import { OrderService } from '../order.service';

@Controller('admin/orders')
export class AdminOrderController {
  constructor(private readonly orderService: OrderService) {}

  @Get()
  @ResponseMessage('Admin orders fetched successfully')
  getOrders() {
    return this.orderService.getAdminOrders();
  }

  @Patch(':orderId/status')
  @ResponseMessage('Order status updated successfully')
  updateOrderStatus(
    @Req() request: AuthenticatedRequest,
    @Param('orderId') orderId: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.orderService.updateOrderStatus(request.user.id, orderId, dto);
  }

  @Delete(':orderId')
  @ResponseMessage('Order deleted successfully')
  deleteOrder(
    @Req() request: AuthenticatedRequest,
    @Param('orderId') orderId: string,
  ) {
    return this.orderService.deleteUnpaidOrder(request.user.id, orderId);
  }

  @Patch('cancellation-requests/:requestId')
  @ResponseMessage('Cancellation request updated successfully')
  decideCancellation(
    @Req() request: AuthenticatedRequest,
    @Param('requestId') requestId: string,
    @Body() dto: DecideCancellationDto,
  ) {
    return this.orderService.decideCancellation(
      request.user.id,
      requestId,
      dto,
    );
  }

  @Patch(':orderId/shipment')
  @ResponseMessage('Shipment updated successfully')
  upsertShipment(
    @Req() request: AuthenticatedRequest,
    @Param('orderId') orderId: string,
    @Body() dto: UpsertShipmentDto,
  ) {
    return this.orderService.upsertShipment(request.user.id, orderId, dto);
  }
}
