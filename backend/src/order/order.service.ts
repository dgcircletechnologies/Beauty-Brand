import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';

import { Prisma } from '../../generated/prisma/client.cjs';
import {
  CancellationRequestStatus,
  CartStatus,
  OfferType,
  OrderAddressType,
  OrderStatus,
  PaymentStatus,
  ProductStatus,
  ShipmentStatus,
} from '../../generated/prisma/enums.cjs';
import { CurrencyService } from '../currency/currency.service';
import { PrismaService } from '../database/prisma.service';
import {
  OfferResolverResult,
  OfferResolverService,
} from '../offer/services/offer-resolver.service';
import { ShippingService } from '../shipping/shipping.service';
import { CheckoutPreviewDto } from './dto/checkout-preview.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { DecideCancellationDto } from './dto/decide-cancellation.dto';
import { RequestCancellationDto } from './dto/request-cancellation.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { UpsertShipmentDto } from './dto/upsert-shipment.dto';

type ActiveCart = Awaited<ReturnType<OrderService['getActiveCart']>>;
type ActiveCartItem = ActiveCart['items'][number];
type OrderRewardVariant = ActiveCartItem['variant'];

type TrustedCheckoutItem = {
  id: string;
  cartItemId?: string;
  sourceCartItemId?: string;
  productId: string;
  variantId: string;
  productName: string;
  variantLabel: string;
  sku: string;
  quantity: number;
  unitBasePrice: Prisma.Decimal;
  unitDiscountAmount: Prisma.Decimal;
  unitFinalPrice: Prisma.Decimal;
  lineBaseSubtotal: Prisma.Decimal;
  lineDiscountAmount: Prisma.Decimal;
  lineFinalSubtotal: Prisma.Decimal;
  taxAmount: Prisma.Decimal;
  hasOffer: boolean;
  offer: {
    id: string;
    name: string;
    type: OfferType;
    value: string | null;
    maxDiscountAmount: string | null;
  } | null;
  buyXGetY: OfferResolverResult['buyXGetY'];
  isOfferReward: boolean;
  sourceOfferId?: string | null;
  sourceOrderItemId?: string | null;
  sourceVariant?: OrderRewardVariant;
};

@Injectable()
export class OrderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly currencyService: CurrencyService,
    private readonly shippingService: ShippingService,
    private readonly offerResolverService: OfferResolverService,
  ) {}

  async getCheckoutPreview(userId: string, dto: CheckoutPreviewDto) {
    const cart = await this.getActiveCart(userId);
    const items = this.pickCartItems(cart.items, dto.cartItemIds);

    this.ensureCheckoutItems(items);

    const totals = await this.calculateTotals(
      dto.currencyCode ?? cart.currencyCode,
      items,
    );
    const shippingAvailability = dto.shippingAddressId
      ? await this.getShippingAvailability(
          dto.shippingAddressId,
          userId,
          totals,
        )
      : {
          country: null,
          zone: null,
          activeRateCount: 0,
          rates: [],
          message: 'Select a shipping address to see shipping methods.',
        };
    const automaticShippingRate = this.pickAutomaticShippingRate(
      shippingAvailability.rates,
    );
    const shippingRates = automaticShippingRate
      ? await this.toDisplayShippingRates([automaticShippingRate], totals)
      : [];
    const selectedShippingRate =
      shippingRates.find((rate) => rate.id === dto.shippingRateId) ??
      shippingRates[0] ??
      null;
    const baseShippingAmount = selectedShippingRate?.baseAmount ?? 0;
    const displayShippingAmount = selectedShippingRate?.displayAmount ?? 0;
    const baseTotalAmount = this.roundMoney(
      totals.baseSubtotal + baseShippingAmount,
      totals.baseCurrency.decimalDigits,
    );
    const displayTotalAmount = this.roundMoney(
      totals.displaySubtotal + displayShippingAmount,
      totals.displayCurrency.decimalDigits,
    );

    return {
      cartId: cart.id,
      currency: totals.displayCurrency,
      exchangeRate: totals.rate,
      baseCurrency: totals.baseCurrency,
      items: items.map((item) => this.toCheckoutItem(item, totals)),
      rewardItems: totals.rewardItems.map((item) =>
        this.toCheckoutRewardItem(item, totals),
      ),
      itemCount: items.reduce((total, item) => total + item.quantity, 0),
      baseSubtotal: totals.baseSubtotal,
      displaySubtotal: totals.displaySubtotal,
      subtotal: totals.displaySubtotal,
      baseShippingAmount,
      displayShippingAmount,
      shippingAmount: displayShippingAmount,
      taxAmount: 0,
      discountAmount: totals.discountAmount,
      rewardSavings: totals.rewardSavings,
      baseTotalAmount,
      displayTotalAmount,
      totalAmount: displayTotalAmount,
      shippingRates,
      shippingAvailability: {
        country: shippingAvailability.country,
        zone: shippingAvailability.zone,
        activeRateCount: shippingAvailability.activeRateCount,
        eligibleRateCount: shippingAvailability.rates.length,
        message: shippingAvailability.message,
      },
      selectedShippingRate,
      selectedCartItemIds: items.map((item) => item.id),
    };
  }

  async getCustomerOrders(
    userId: string,
    query: { page?: string; pageSize?: string } = {},
  ) {
    const page = this.getPositiveInteger(query.page, 1);
    const pageSize = Math.min(this.getPositiveInteger(query.pageSize, 10), 20);
    const where = {
      userId,
    };
    const [orders, totalItems] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: this.orderInclude(),
        orderBy: {
          createdAt: 'desc',
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.order.count({
        where,
      }),
    ]);
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const safePage = Math.min(page, totalPages);

    const safeOrders =
      safePage === page
        ? orders
        : await this.prisma.order.findMany({
            where,
            include: this.orderInclude(),
            orderBy: {
              createdAt: 'desc',
            },
            skip: (safePage - 1) * pageSize,
            take: pageSize,
          });

    return {
      items: safeOrders.map((order) => this.toOrderView(order)),
      pagination: {
        page: safePage,
        pageSize,
        totalItems,
        totalPages,
        hasPreviousPage: safePage > 1,
        hasNextPage: safePage < totalPages,
      },
    };
  }

  async getCustomerOrderById(userId: string, orderId: string) {
    const order = await this.getCustomerOrder(userId, orderId);

    return this.toOrderView(order);
  }

  async createOrder(userId: string, dto: CreateOrderDto) {
    const order = await this.createPendingPaymentOrder(userId, dto);
    return this.confirmPaidOrder(order.id, userId, {
      provider: 'manual',
      providerPaymentId: null,
      providerOrderId: null,
      signature: null,
      rawResponse: {
        source: 'legacy_checkout',
      },
    });
  }

  async createPendingPaymentOrder(userId: string, dto: CreateOrderDto) {
    const requestIdempotencyKey = this.normalizeCheckoutIdempotencyKey(
      userId,
      dto.idempotencyKey,
    );

    if (requestIdempotencyKey) {
      const existingOrder = await this.prisma.order.findUnique({
        where: {
          idempotencyKey: requestIdempotencyKey,
        },
        include: this.orderInclude(),
      });

      if (existingOrder) {
        if (existingOrder.userId !== userId) {
          throw new BadRequestException('Invalid checkout request');
        }

        return this.toOrderView(existingOrder);
      }
    }

    const cart = await this.getActiveCart(userId);
    const items = this.pickCartItems(cart.items, dto.cartItemIds);

    this.ensureCheckoutItems(items);

    const [shippingAddress, billingAddress, user, totals] = await Promise.all([
      this.getAddress(userId, dto.shippingAddressId),
      this.getAddress(userId, dto.billingAddressId ?? dto.shippingAddressId),
      this.getUser(userId),
      this.calculateTotals(dto.currencyCode ?? cart.currencyCode, items),
    ]);
    const shippingRate = await this.shippingService.getRateForCheckout(
      dto.shippingRateId,
      shippingAddress.countryCode,
      totals.baseSubtotal,
    );
    const baseShippingAmount = this.roundMoney(
      await this.shippingService.toBaseAmount(shippingRate),
      totals.baseCurrency.decimalDigits,
    );
    const baseTotalAmount = this.roundMoney(
      totals.baseSubtotal + baseShippingAmount,
      totals.baseCurrency.decimalDigits,
    );
    const displayShippingAmount = this.roundMoney(
      baseShippingAmount * totals.rate,
      totals.displayCurrency.decimalDigits,
    );
    const displayTotalAmount = this.roundMoney(
      totals.displaySubtotal + displayShippingAmount,
      totals.displayCurrency.decimalDigits,
    );

    const orderNumber = this.generateOrderNumber();
    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          userId,
          orderNumber,
          idempotencyKey: requestIdempotencyKey ?? `${orderNumber}-${userId}`,
          status: OrderStatus.PENDING_PAYMENT,
          baseCurrencyCode: totals.baseCurrency.code,
          displayCurrencyCode: totals.displayCurrency.code,
          exchangeRate: totals.rate,
          exchangeRateEffectiveAt: totals.exchangeRateEffectiveAt,
          subtotal: totals.baseSubtotal,
          shippingAmount: baseShippingAmount,
          taxAmount: 0,
          discountAmount: totals.discountAmount,
          rewardSavings: totals.rewardSavings,
          totalAmount: baseTotalAmount,
          shippingRateId: shippingRate.id,
          shippingMethodName: shippingRate.name,
          shippingServiceCode: shippingRate.serviceCode,
          customerEmail: user.email,
          customerPhone:
            this.nullableTrim(dto.customerPhone) ??
            shippingAddress.phone ??
            user.phone,
          placedAt: now,
          items: {
            create: [...totals.paidOrderItems, ...totals.rewardOrderItems],
          },
          addresses: {
            create: [
              this.toAddressSnapshot(
                OrderAddressType.SHIPPING,
                shippingAddress,
              ),
              this.toAddressSnapshot(OrderAddressType.BILLING, billingAddress),
            ],
          },
          statusHistory: {
            create: {
              fromStatus: null,
              toStatus: OrderStatus.PENDING_PAYMENT,
              changedByUserId: userId,
              reason: 'Order created pending payment',
            },
          },
          shipments: {
            create: {
              status: ShipmentStatus.PENDING,
            },
          },
          payments: {
            create: {
              provider: 'razorpay',
              idempotencyKey: `${orderNumber}-razorpay`,
              status: PaymentStatus.PENDING,
              amount: baseTotalAmount,
              currencyCode: totals.baseCurrency.code,
              metadata: {
                cartId: cart.id,
                selectedCartItemIds: items.map((item) => item.id),
                displayAmount: displayTotalAmount,
                displayCurrencyCode: totals.displayCurrency.code,
                stockReserved: true,
              },
            },
          },
        },
        include: this.orderInclude(),
      });

      for (const item of [
        ...totals.paidOrderItems,
        ...totals.rewardOrderItems,
      ]) {
        await tx.productVariant.update({
          where: {
            id: item.variantId,
          },
          data: {
            stockQuantity: {
              decrement: item.quantity,
            },
          },
        });
      }

      await tx.cartItem.deleteMany({
        where: {
          cartId: cart.id,
          id: {
            in: items.map((item) => item.id),
          },
        },
      });

      const remainingItems = await tx.cartItem.count({
        where: {
          cartId: cart.id,
        },
      });

      if (remainingItems === 0) {
        await tx.cart.update({
          where: {
            id: cart.id,
          },
          data: {
            status: CartStatus.CONVERTED,
          },
        });
      }

      return this.toOrderView(order);
    });
  }

  async confirmPaidOrder(
    orderId: string,
    userId: string | null,
    payment: {
      provider: string;
      providerPaymentId: string | null;
      providerOrderId: string | null;
      signature: string | null;
      rawResponse: Record<string, unknown> | null;
    },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: {
          id: orderId,
          ...(userId && {
            userId,
          }),
        },
        include: {
          items: true,
          payments: true,
          displayCurrency: true,
        },
      });

      if (!order) {
        throw new NotFoundException('Order not found');
      }

      const existingPayment =
        order.payments.find(
          (transaction) =>
            transaction.providerIntentId === payment.providerOrderId,
        ) ?? order.payments[0];

      if (!existingPayment) {
        throw new NotFoundException('Payment transaction not found');
      }

      if (
        existingPayment.status !== PaymentStatus.SUCCEEDED &&
        !this.hasReservedStock(existingPayment.metadata)
      ) {
        for (const item of order.items) {
          await tx.productVariant.update({
            where: {
              id: item.variantId,
            },
            data: {
              stockQuantity: {
                decrement: item.quantity,
              },
            },
          });
        }
      }

      await tx.paymentTransaction.update({
        where: {
          id: existingPayment.id,
        },
        data: {
          providerTransactionId: payment.providerPaymentId,
          providerIntentId:
            payment.providerOrderId ?? existingPayment.providerIntentId,
          status: PaymentStatus.SUCCEEDED,
          processedAt: new Date(),
          metadata: JSON.parse(
            JSON.stringify({
              ...(typeof existingPayment.metadata === 'object' &&
                existingPayment.metadata !== null &&
                !Array.isArray(existingPayment.metadata) &&
                existingPayment.metadata),
              razorpaySignature: payment.signature,
              rawResponse: payment.rawResponse,
            }),
          ),
        },
      });

      const metadata =
        typeof existingPayment.metadata === 'object' &&
        existingPayment.metadata !== null &&
        !Array.isArray(existingPayment.metadata)
          ? (existingPayment.metadata as {
              cartId?: string;
              selectedCartItemIds?: string[];
            })
          : {};

      if (metadata.cartId && metadata.selectedCartItemIds?.length) {
        await tx.cartItem.deleteMany({
          where: {
            cartId: metadata.cartId,
            id: {
              in: metadata.selectedCartItemIds,
            },
          },
        });

        const remainingItems = await tx.cartItem.count({
          where: {
            cartId: metadata.cartId,
          },
        });

        if (remainingItems === 0) {
          await tx.cart.update({
            where: {
              id: metadata.cartId,
            },
            data: {
              status: CartStatus.CONVERTED,
            },
          });
        }
      }

      await tx.order.update({
        where: {
          id: order.id,
        },
        data: {
          paidAt: new Date(),
        },
      });

      await this.changeOrderStatus(
        tx,
        order.id,
        order.status,
        OrderStatus.PROCESSING,
        order.userId,
        'Payment confirmed',
      );

      const updatedOrder = await tx.order.findUnique({
        where: {
          id: order.id,
        },
        include: this.orderInclude(),
      });

      return updatedOrder ? this.toOrderView(updatedOrder) : null;
    });
  }

  async markPaymentFailed(orderId: string, reason?: string | null) {
    const order = await this.getOrder(orderId);

    if (
      order.status !== OrderStatus.PENDING_PAYMENT &&
      order.status !== OrderStatus.PAYMENT_FAILED
    ) {
      return this.toOrderView(order);
    }

    return this.prisma.$transaction(async (tx) => {
      await this.changeOrderStatus(
        tx,
        order.id,
        order.status,
        OrderStatus.PAYMENT_FAILED,
        order.userId,
        reason ?? 'Payment failed',
      );

      const updatedOrder = await tx.order.findUnique({
        where: {
          id: order.id,
        },
        include: this.orderInclude(),
      });

      return updatedOrder ? this.toOrderView(updatedOrder) : null;
    });
  }

  async requestCancellation(
    userId: string,
    orderId: string,
    dto: RequestCancellationDto,
  ) {
    const order = await this.getCustomerOrder(userId, orderId);

    const nonCancellableStatuses: OrderStatus[] = [
      OrderStatus.CANCELLED,
      OrderStatus.DELIVERED,
      OrderStatus.SHIPPED,
    ];

    if (nonCancellableStatuses.includes(order.status)) {
      throw new BadRequestException('This order cannot be cancelled');
    }

    const pendingRequest = order.cancellationRequests.find(
      (request) => request.status === CancellationRequestStatus.PENDING,
    );

    if (pendingRequest) {
      throw new ConflictException('A cancellation request is already pending');
    }

    return this.prisma.$transaction(async (tx) => {
      const request = await tx.cancellationRequest.create({
        data: {
          orderId,
          requestedByUserId: userId,
          reason: dto.reason.trim(),
          details: this.nullableTrim(dto.details),
        },
      });

      await this.changeOrderStatus(
        tx,
        orderId,
        order.status,
        OrderStatus.CANCELLATION_REQUESTED,
        userId,
        'Customer requested cancellation',
      );

      return request;
    });
  }

  async getAdminOrders() {
    const orders = await this.prisma.order.findMany({
      include: this.orderInclude(),
      orderBy: {
        createdAt: 'desc',
      },
      take: 200,
    });

    return orders.map((order) => this.toOrderView(order));
  }

  async updateOrderStatus(
    adminUserId: string,
    orderId: string,
    dto: UpdateOrderStatusDto,
  ) {
    const order = await this.getOrder(orderId);

    return this.prisma.$transaction(async (tx) => {
      if (dto.status === OrderStatus.CANCELLED) {
        await this.restockOrderItemsForCancellation(tx, order);
      }

      await this.changeOrderStatus(
        tx,
        orderId,
        order.status,
        dto.status,
        adminUserId,
        this.nullableTrim(dto.reason),
      );

      if (dto.status === OrderStatus.SHIPPED) {
        await this.markShipmentStatus(tx, orderId, ShipmentStatus.IN_TRANSIT);
      }

      if (dto.status === OrderStatus.DELIVERED) {
        await this.markShipmentStatus(tx, orderId, ShipmentStatus.DELIVERED);
      }

      const updatedOrder = await tx.order.findUnique({
        where: {
          id: orderId,
        },
        include: this.orderInclude(),
      });

      return updatedOrder ? this.toOrderView(updatedOrder) : null;
    });
  }

  async deleteUnpaidOrder(adminUserId: string, orderId: string) {
    const order = await this.getOrder(orderId);

    if (
      order.status !== OrderStatus.PENDING_PAYMENT &&
      order.status !== OrderStatus.PAYMENT_FAILED
    ) {
      throw new BadRequestException(
        'Only pending or failed payment orders can be deleted',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      await this.restockOrderItemsForCancellation(tx, order);
      await tx.paymentTransaction.deleteMany({
        where: {
          orderId,
        },
      });
      await tx.notification.updateMany({
        where: {
          orderId,
        },
        data: {
          orderId: null,
        },
      });
      await tx.order.delete({
        where: {
          id: orderId,
        },
      });

      return {
        deleted: true,
        orderId,
        deletedByUserId: adminUserId,
      };
    });
  }

  async decideCancellation(
    adminUserId: string,
    requestId: string,
    dto: DecideCancellationDto,
  ) {
    const request = await this.prisma.cancellationRequest.findUnique({
      where: {
        id: requestId,
      },
      include: {
        order: {
          include: {
            items: true,
            payments: true,
          },
        },
      },
    });

    if (!request) {
      throw new NotFoundException('Cancellation request not found');
    }

    if (request.status !== CancellationRequestStatus.PENDING) {
      throw new BadRequestException('Cancellation request is already decided');
    }

    const nextOrderStatus =
      dto.status === CancellationRequestStatus.APPROVED
        ? OrderStatus.CANCELLED
        : OrderStatus.PROCESSING;

    return this.prisma.$transaction(async (tx) => {
      await tx.cancellationRequest.update({
        where: {
          id: requestId,
        },
        data: {
          status: dto.status,
          decidedByUserId: adminUserId,
          decisionNote: this.nullableTrim(dto.decisionNote),
          decidedAt: new Date(),
        },
      });

      if (dto.status === CancellationRequestStatus.APPROVED) {
        await this.restockOrderItemsForCancellation(tx, request.order);

        await tx.shipment.updateMany({
          where: {
            orderId: request.orderId,
          },
          data: {
            status: ShipmentStatus.CANCELLED,
          },
        });
      }

      await this.changeOrderStatus(
        tx,
        request.orderId,
        request.order.status,
        nextOrderStatus,
        adminUserId,
        this.nullableTrim(dto.decisionNote) ?? `Cancellation ${dto.status}`,
      );

      const updatedOrder = await tx.order.findUnique({
        where: {
          id: request.orderId,
        },
        include: this.orderInclude(),
      });

      return updatedOrder ? this.toOrderView(updatedOrder) : null;
    });
  }

  async upsertShipment(
    adminUserId: string,
    orderId: string,
    dto: UpsertShipmentDto,
  ) {
    const order = await this.getOrder(orderId);
    const data = {
      ...(dto.status !== undefined && {
        status: dto.status,
      }),
      carrier: this.nullableTrim(dto.carrier),
      service: this.nullableTrim(dto.service),
      trackingNumber: this.nullableTrim(dto.trackingNumber),
      trackingUrl: this.nullableTrim(dto.trackingUrl),
      estimatedDeliveryAt: dto.estimatedDeliveryAt
        ? new Date(dto.estimatedDeliveryAt)
        : null,
      ...(dto.status === ShipmentStatus.IN_TRANSIT && {
        shippedAt: new Date(),
      }),
      ...(dto.status === ShipmentStatus.DELIVERED && {
        deliveredAt: new Date(),
      }),
    };

    return this.prisma.$transaction(async (tx) => {
      const existingShipment = await tx.shipment.findFirst({
        where: {
          orderId,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      const shipment = existingShipment
        ? await tx.shipment.update({
            where: {
              id: existingShipment.id,
            },
            data,
          })
        : await tx.shipment.create({
            data: {
              orderId,
              status: dto.status ?? ShipmentStatus.PENDING,
              carrier: data.carrier,
              service: data.service,
              trackingNumber: data.trackingNumber,
              trackingUrl: data.trackingUrl,
              estimatedDeliveryAt: data.estimatedDeliveryAt,
            },
          });

      if (dto.status === ShipmentStatus.IN_TRANSIT) {
        await this.changeOrderStatus(
          tx,
          orderId,
          order.status,
          OrderStatus.SHIPPED,
          adminUserId,
          'Shipment marked in transit',
        );
      }

      if (dto.status === ShipmentStatus.DELIVERED) {
        await this.changeOrderStatus(
          tx,
          orderId,
          order.status,
          OrderStatus.DELIVERED,
          adminUserId,
          'Shipment marked delivered',
        );
      }

      return shipment;
    });
  }

  private async getActiveCart(userId: string) {
    const cart = await this.prisma.cart.findFirst({
      where: {
        userId,
        status: CartStatus.ACTIVE,
      },
      include: {
        currency: true,
        items: {
          include: {
            variant: {
              include: {
                product: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    return cart;
  }

  private pickCartItems<T extends { id: string }>(
    items: T[],
    cartItemIds?: string[],
  ) {
    const selectedIds = [...new Set(cartItemIds?.filter(Boolean) ?? [])];

    if (!selectedIds.length) {
      return items;
    }

    const selectedItems = items.filter((item) => selectedIds.includes(item.id));

    if (selectedItems.length !== selectedIds.length) {
      throw new BadRequestException(
        'One or more selected cart items are invalid',
      );
    }

    return selectedItems;
  }

  private ensureCheckoutItems(
    items: Awaited<ReturnType<OrderService['getActiveCart']>>['items'],
  ) {
    if (!items.length) {
      throw new BadRequestException('Select at least one item to checkout');
    }

    for (const item of items) {
      if (item.variant.product.deletedAt) {
        throw new BadRequestException(
          `${item.variant.product.name} is no longer available`,
        );
      }

      if (item.variant.product.status !== ProductStatus.PUBLISHED) {
        throw new BadRequestException(
          `${item.variant.product.name} is currently unavailable`,
        );
      }

      if (item.variant.deletedAt || !item.variant.isActive) {
        throw new BadRequestException(
          `${item.variant.product.name} option is no longer available`,
        );
      }

      if (item.quantity > item.variant.stockQuantity) {
        throw new BadRequestException(
          `Only ${item.variant.stockQuantity} item(s) are available for ${item.variant.product.name}`,
        );
      }
    }
  }

  private async calculateTotals(
    displayCurrencyCode: string,
    items: Awaited<ReturnType<OrderService['getActiveCart']>>['items'],
  ) {
    const baseCurrency = await this.currencyService.getBaseCurrency();
    const exchangeRate = await this.currencyService.getLatestRate(
      baseCurrency.code,
      displayCurrencyCode,
    );
    const displayCurrency =
      await this.currencyService.ensureActiveCurrency(displayCurrencyCode);
    const rate = new Prisma.Decimal(exchangeRate.rate);
    const pricingByVariantId =
      await this.offerResolverService.resolveForVariants(
        items.map((item) => item.variantId),
      );
    const checkoutItems = items.map((item) =>
      this.toTrustedCheckoutItem(item, pricingByVariantId.get(item.variantId)),
    );
    const rewardItems = await this.toTrustedRewardItems(checkoutItems);
    const baseSubtotal = checkoutItems.reduce(
      (total, item) => total.plus(item.lineFinalSubtotal),
      new Prisma.Decimal(0),
    );
    const basePreDiscountSubtotal = checkoutItems.reduce(
      (total, item) => total.plus(item.lineBaseSubtotal),
      new Prisma.Decimal(0),
    );
    const discountAmount = checkoutItems.reduce(
      (total, item) => total.plus(item.lineDiscountAmount),
      new Prisma.Decimal(0),
    );
    const rewardSavings = rewardItems.reduce(
      (total, item) => total.plus(item.lineDiscountAmount),
      new Prisma.Decimal(0),
    );

    return {
      baseCurrency,
      displayCurrency,
      rate: exchangeRate.rate,
      rateDecimal: rate,
      exchangeRateEffectiveAt: exchangeRate.effectiveAt,
      checkoutItems,
      rewardItems,
      paidOrderItems: checkoutItems.map((item) => this.toOrderItemData(item)),
      rewardOrderItems: rewardItems.map((item) => this.toOrderItemData(item)),
      basePreDiscountSubtotal: this.decimalToRoundedNumber(
        basePreDiscountSubtotal,
        baseCurrency.decimalDigits,
      ),
      discountAmount: this.decimalToRoundedNumber(
        discountAmount,
        baseCurrency.decimalDigits,
      ),
      rewardSavings: this.decimalToRoundedNumber(
        rewardSavings,
        baseCurrency.decimalDigits,
      ),
      baseSubtotal: this.decimalToRoundedNumber(
        baseSubtotal,
        baseCurrency.decimalDigits,
      ),
      displaySubtotal: this.decimalToRoundedNumber(
        baseSubtotal.mul(rate),
        displayCurrency.decimalDigits,
      ),
    };
  }

  private toCheckoutItem(
    item: Awaited<ReturnType<OrderService['getActiveCart']>>['items'][number],
    totals: Awaited<ReturnType<OrderService['calculateTotals']>>,
  ) {
    const checkoutItem = totals.checkoutItems.find(
      (resolvedItem) => resolvedItem.cartItemId === item.id,
    );

    if (!checkoutItem) {
      throw new BadRequestException('Unable to calculate checkout item');
    }

    const displayUnitPrice = this.decimalToRoundedNumber(
      checkoutItem.unitFinalPrice.mul(totals.rateDecimal),
      totals.displayCurrency.decimalDigits,
    );
    const displayLineTotal = this.decimalToRoundedNumber(
      checkoutItem.lineFinalSubtotal.mul(totals.rateDecimal),
      totals.displayCurrency.decimalDigits,
    );

    return {
      cartItemId: item.id,
      productId: item.variant.product.id,
      variantId: item.variant.id,
      productName: item.variant.product.name,
      sku: item.variant.sku,
      quantity: item.quantity,
      baseUnitPrice: this.decimalToRoundedNumber(
        checkoutItem.unitBasePrice,
        totals.baseCurrency.decimalDigits,
      ),
      baseLineTotal: this.decimalToRoundedNumber(
        checkoutItem.lineFinalSubtotal,
        totals.baseCurrency.decimalDigits,
      ),
      displayUnitPrice,
      displayLineTotal,
      unitPrice: displayUnitPrice,
      lineTotal: displayLineTotal,
      pricing: {
        unitBasePrice: this.decimalToMoney(checkoutItem.unitBasePrice),
        unitDiscountAmount: this.decimalToMoney(
          checkoutItem.unitDiscountAmount,
        ),
        unitFinalPrice: this.decimalToMoney(checkoutItem.unitFinalPrice),
        lineBaseSubtotal: this.decimalToMoney(checkoutItem.lineBaseSubtotal),
        lineDiscountAmount: this.decimalToMoney(
          checkoutItem.lineDiscountAmount,
        ),
        lineFinalSubtotal: this.decimalToMoney(checkoutItem.lineFinalSubtotal),
        hasOffer: checkoutItem.hasOffer,
        offer: checkoutItem.offer,
        buyXGetY: checkoutItem.buyXGetY,
      },
    };
  }

  private toCheckoutRewardItem(
    item: TrustedCheckoutItem,
    totals: Awaited<ReturnType<OrderService['calculateTotals']>>,
  ) {
    return {
      isOfferReward: true,
      sourceOfferId: item.sourceOfferId,
      sourceCartItemId: item.sourceCartItemId,
      productId: item.productId,
      variantId: item.variantId,
      productName: item.productName,
      sku: item.sku,
      quantity: item.quantity,
      unitPrice: this.decimalToMoney(item.unitBasePrice),
      discountAmount: this.decimalToMoney(item.lineDiscountAmount),
      finalUnitPrice: this.decimalToMoney(item.unitFinalPrice),
      lineTotal: this.decimalToMoney(item.lineFinalSubtotal),
      displayUnitPrice: this.decimalToRoundedNumber(
        item.unitBasePrice.mul(totals.rateDecimal),
        totals.displayCurrency.decimalDigits,
      ),
      displayLineTotal: 0,
      offer: item.offer,
    };
  }

  private toTrustedCheckoutItem(
    item: ActiveCartItem,
    resolvedPricing?: OfferResolverResult,
  ): TrustedCheckoutItem {
    const unitBasePrice = resolvedPricing
      ? resolvedPricing.basePrice
      : new Prisma.Decimal(item.variant.price);
    const unitDiscountAmount =
      resolvedPricing?.discountAmount ?? new Prisma.Decimal(0);
    const unitFinalPrice =
      resolvedPricing?.finalPrice ?? new Prisma.Decimal(item.variant.price);
    const lineBaseSubtotal = unitBasePrice.mul(item.quantity);
    const lineDiscountAmount = unitDiscountAmount.mul(item.quantity);
    const lineFinalSubtotal = unitFinalPrice.mul(item.quantity);
    const orderItemId = this.generateSnapshotItemId();
    const offer = resolvedPricing?.offer
      ? this.toOfferSnapshot(resolvedPricing.offer)
      : null;

    return {
      id: orderItemId,
      cartItemId: item.id,
      productId: item.variant.product.id,
      variantId: item.variant.id,
      productName: item.variant.product.name,
      variantLabel: item.variant.sku,
      sku: item.variant.sku,
      quantity: item.quantity,
      unitBasePrice,
      unitDiscountAmount,
      unitFinalPrice,
      lineBaseSubtotal,
      lineDiscountAmount,
      lineFinalSubtotal,
      taxAmount: new Prisma.Decimal(0),
      hasOffer: resolvedPricing?.hasOffer ?? false,
      offer,
      buyXGetY: resolvedPricing?.buyXGetY ?? null,
      isOfferReward: false,
      sourceOfferId: null,
      sourceOrderItemId: null,
      sourceVariant: item.variant,
    };
  }

  private async toTrustedRewardItems(
    checkoutItems: TrustedCheckoutItem[],
  ): Promise<TrustedCheckoutItem[]> {
    const rewardItems: TrustedCheckoutItem[] = [];

    for (const item of checkoutItems) {
      if (
        !item.hasOffer ||
        !item.offer ||
        !item.buyXGetY ||
        !item.sourceVariant
      ) {
        continue;
      }

      const rewardGroups = Math.floor(
        item.quantity / item.buyXGetY.buyQuantity,
      );
      const quantity = rewardGroups * item.buyXGetY.getQuantity;

      if (quantity <= 0) {
        continue;
      }

      const rewardVariant = await this.findRewardVariant(
        item.sourceVariant,
        item.buyXGetY,
      );

      if (!rewardVariant) {
        throw new BadRequestException(
          'Configured offer reward is no longer available. Please refresh your cart.',
        );
      }

      if (quantity > rewardVariant.stockQuantity) {
        throw new BadRequestException(
          `Only ${rewardVariant.stockQuantity} reward item(s) are available for ${rewardVariant.product.name}`,
        );
      }

      const unitBasePrice = new Prisma.Decimal(rewardVariant.price);
      const lineBaseSubtotal = unitBasePrice.mul(quantity);

      rewardItems.push({
        id: this.generateSnapshotItemId(),
        sourceCartItemId: item.cartItemId,
        productId: rewardVariant.product.id,
        variantId: rewardVariant.id,
        productName: rewardVariant.product.name,
        variantLabel: rewardVariant.sku,
        sku: rewardVariant.sku,
        quantity,
        unitBasePrice,
        unitDiscountAmount: unitBasePrice,
        unitFinalPrice: new Prisma.Decimal(0),
        lineBaseSubtotal,
        lineDiscountAmount: lineBaseSubtotal,
        lineFinalSubtotal: new Prisma.Decimal(0),
        taxAmount: new Prisma.Decimal(0),
        hasOffer: true,
        offer: item.offer,
        buyXGetY: null,
        isOfferReward: true,
        sourceOfferId: item.offer.id,
        sourceOrderItemId: item.id,
        sourceVariant: rewardVariant,
      });
    }

    this.ensureCombinedStockAvailable([...checkoutItems, ...rewardItems]);

    return rewardItems;
  }

  private async findRewardVariant(
    sourceVariant: OrderRewardVariant,
    bogo: NonNullable<OfferResolverResult['buyXGetY']>,
  ): Promise<OrderRewardVariant | null> {
    if (bogo.rewardVariantId) {
      return this.prisma.productVariant.findFirst({
        where: {
          id: bogo.rewardVariantId,
          deletedAt: null,
          isActive: true,
          product: {
            deletedAt: null,
            status: ProductStatus.PUBLISHED,
          },
        },
        include: {
          product: true,
        },
      });
    }

    if (bogo.rewardProductId) {
      return this.prisma.productVariant.findFirst({
        where: {
          productId: bogo.rewardProductId,
          deletedAt: null,
          isActive: true,
          product: {
            deletedAt: null,
            status: ProductStatus.PUBLISHED,
          },
        },
        include: {
          product: true,
        },
        orderBy: {
          price: 'asc',
        },
      });
    }

    return sourceVariant;
  }

  private ensureCombinedStockAvailable(items: TrustedCheckoutItem[]) {
    const quantityByVariantId = new Map<string, number>();
    const stockByVariantId = new Map<string, number>();
    const productNameByVariantId = new Map<string, string>();

    for (const item of items) {
      quantityByVariantId.set(
        item.variantId,
        (quantityByVariantId.get(item.variantId) ?? 0) + item.quantity,
      );

      if (item.sourceVariant) {
        stockByVariantId.set(item.variantId, item.sourceVariant.stockQuantity);
        productNameByVariantId.set(item.variantId, item.productName);
      } else if (!stockByVariantId.has(item.variantId)) {
        stockByVariantId.set(item.variantId, item.quantity);
        productNameByVariantId.set(item.variantId, item.productName);
      }
    }

    for (const [variantId, quantity] of quantityByVariantId) {
      const stockQuantity = stockByVariantId.get(variantId) ?? 0;

      if (quantity > stockQuantity) {
        throw new BadRequestException(
          `Only ${stockQuantity} item(s) are available for ${productNameByVariantId.get(variantId) ?? 'this product'}`,
        );
      }
    }
  }

  private toOrderItemData(item: TrustedCheckoutItem) {
    return {
      id: item.id,
      productId: item.productId,
      variantId: item.variantId,
      productName: item.productName,
      variantLabel: item.variantLabel,
      sku: item.sku,
      quantity: item.quantity,
      baseUnitPrice: item.unitBasePrice,
      unitPrice: item.unitFinalPrice,
      lineSubtotal: item.lineBaseSubtotal,
      taxAmount: item.taxAmount,
      discountAmount: item.lineDiscountAmount,
      unitDiscountAmount: item.unitDiscountAmount,
      appliedOfferId: item.offer?.id ?? null,
      appliedOfferName: item.offer?.name ?? null,
      appliedOfferType: item.offer?.type ?? null,
      appliedOfferValue: item.offer?.value ?? null,
      appliedOfferMaxDiscountAmount: item.offer?.maxDiscountAmount ?? null,
      isOfferReward: item.isOfferReward,
      sourceOfferId: item.sourceOfferId ?? null,
      sourceOrderItemId: item.sourceOrderItemId ?? null,
      lineTotal: item.lineFinalSubtotal,
    };
  }

  private toOfferSnapshot(offer: NonNullable<OfferResolverResult['offer']>) {
    return {
      id: offer.id,
      name: offer.name,
      type: offer.type,
      value: this.nullableDecimalToMoney(offer.value),
      maxDiscountAmount: this.nullableDecimalToMoney(offer.maxDiscountAmount),
    };
  }

  private async getShippingAvailability(
    shippingAddressId: string,
    userId: string,
    totals: Awaited<ReturnType<OrderService['calculateTotals']>>,
  ) {
    const shippingAddress = await this.getAddress(userId, shippingAddressId);
    return this.shippingService.getCheckoutAvailability(
      shippingAddress.countryCode,
      totals.baseSubtotal,
    );
  }

  private async toDisplayShippingRates(
    rates: Awaited<
      ReturnType<ShippingService['getCheckoutAvailability']>
    >['rates'],
    totals: Awaited<ReturnType<OrderService['calculateTotals']>>,
  ) {
    return Promise.all(
      rates.map(async (rate) => {
        const baseAmount = this.roundMoney(
          await this.shippingService.toBaseAmount(rate),
          totals.baseCurrency.decimalDigits,
        );
        const displayAmount = this.roundMoney(
          baseAmount * totals.rate,
          totals.displayCurrency.decimalDigits,
        );

        return {
          id: rate.id,
          name: rate.name,
          serviceCode: rate.serviceCode,
          calculation: rate.calculation,
          estimatedDaysMin: rate.estimatedDaysMin,
          estimatedDaysMax: rate.estimatedDaysMax,
          baseAmount,
          displayAmount,
          amount: displayAmount,
          currency: totals.displayCurrency,
          zone: {
            id: rate.zone.id,
            name: rate.zone.name,
            code: rate.zone.code,
          },
        };
      }),
    );
  }

  private pickAutomaticShippingRate(
    rates: Awaited<
      ReturnType<ShippingService['getCheckoutAvailability']>
    >['rates'],
  ) {
    return [...rates].sort((first, second) => {
      const firstMin = Number(first.minOrderAmount ?? 0);
      const secondMin = Number(second.minOrderAmount ?? 0);

      if (firstMin !== secondMin) {
        return secondMin - firstMin;
      }

      const firstMax =
        first.maxOrderAmount === null
          ? Number.POSITIVE_INFINITY
          : Number(first.maxOrderAmount);
      const secondMax =
        second.maxOrderAmount === null
          ? Number.POSITIVE_INFINITY
          : Number(second.maxOrderAmount);

      if (firstMax !== secondMax) {
        return firstMax - secondMax;
      }

      const firstAmount = Number(first.amount);
      const secondAmount = Number(second.amount);

      if (firstAmount !== secondAmount) {
        return firstAmount - secondAmount;
      }

      return first.createdAt.getTime() - second.createdAt.getTime();
    })[0];
  }

  private async getAddress(userId: string, addressId: string) {
    const address = await this.prisma.address.findFirst({
      where: {
        id: addressId,
        userId,
        deletedAt: null,
      },
    });

    if (!address) {
      throw new NotFoundException('Address not found');
    }

    return address;
  }

  private async getUser(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        deletedAt: null,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  private async getCustomerOrder(userId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        userId,
      },
      include: this.orderInclude(),
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  private async getOrder(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: {
        id: orderId,
      },
      include: this.orderInclude(),
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  private async changeOrderStatus(
    tx: Pick<PrismaService, 'order' | 'orderStatusHistory'>,
    orderId: string,
    fromStatus: OrderStatus,
    toStatus: OrderStatus,
    changedByUserId: string,
    reason?: string | null,
  ) {
    const now = new Date();

    await tx.order.update({
      where: {
        id: orderId,
      },
      data: {
        status: toStatus,
        ...(toStatus === OrderStatus.CANCELLED && {
          cancelledAt: now,
        }),
        ...(toStatus === OrderStatus.DELIVERED && {
          deliveredAt: now,
        }),
      },
    });

    if (fromStatus !== toStatus) {
      await tx.orderStatusHistory.create({
        data: {
          orderId,
          fromStatus,
          toStatus,
          changedByUserId,
          reason,
        },
      });
    }
  }

  private async restockOrderItemsForCancellation(tx: any, order: any) {
    if (!this.shouldRestockOnCancellation(order)) {
      return;
    }

    for (const item of order.items) {
      await tx.productVariant.update({
        where: {
          id: item.variantId,
        },
        data: {
          stockQuantity: {
            increment: item.quantity,
          },
        },
      });
    }
  }

  private shouldRestockOnCancellation(order: any) {
    if (order.status === OrderStatus.CANCELLED) {
      return false;
    }

    const payments = Array.isArray(order.payments) ? order.payments : [];

    return payments.some(
      (payment: any) =>
        payment.status === PaymentStatus.SUCCEEDED ||
        this.hasReservedStock(payment.metadata),
    );
  }

  private hasReservedStock(metadata: unknown) {
    return (
      typeof metadata === 'object' &&
      metadata !== null &&
      !Array.isArray(metadata) &&
      (metadata as { stockReserved?: unknown }).stockReserved === true
    );
  }

  private async markShipmentStatus(
    tx: Pick<PrismaService, 'shipment'>,
    orderId: string,
    status: ShipmentStatus,
  ) {
    await tx.shipment.updateMany({
      where: {
        orderId,
      },
      data: {
        status,
        ...(status === ShipmentStatus.IN_TRANSIT && {
          shippedAt: new Date(),
        }),
        ...(status === ShipmentStatus.DELIVERED && {
          deliveredAt: new Date(),
        }),
      },
    });
  }

  private toAddressSnapshot(
    type: OrderAddressType,
    address: {
      firstName: string;
      lastName: string;
      company: string | null;
      line1: string;
      line2: string | null;
      city: string;
      stateOrProvince: string | null;
      postalCode: string;
      countryCode: string;
      phone: string | null;
    },
  ) {
    return {
      type,
      firstName: address.firstName,
      lastName: address.lastName,
      company: address.company,
      line1: address.line1,
      line2: address.line2,
      city: address.city,
      stateOrProvince: address.stateOrProvince,
      postalCode: address.postalCode,
      countryCode: address.countryCode,
      phone: address.phone,
    };
  }

  private orderInclude() {
    return {
      items: {
        include: {
          product: {
            include: {
              images: {
                where: {
                  deletedAt: null,
                },
                orderBy: this.getOrderImageOrderBy(),
              },
            },
          },
          variant: {
            include: {
              images: {
                where: {
                  deletedAt: null,
                },
                orderBy: this.getOrderImageOrderBy(),
              },
            },
          },
        },
        orderBy: {
          createdAt: 'asc' as const,
        },
      },
      addresses: true,
      statusHistory: {
        orderBy: {
          createdAt: 'asc' as const,
        },
      },
      shipments: {
        orderBy: {
          createdAt: 'desc' as const,
        },
      },
      cancellationRequests: {
        orderBy: {
          requestedAt: 'desc' as const,
        },
      },
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
      payments: {
        orderBy: {
          createdAt: 'desc' as const,
        },
      },
      displayCurrency: true,
    };
  }

  private toOrderView(order: any) {
    const exchangeRate = Number(order.exchangeRate);
    const decimalDigits = order.displayCurrency?.decimalDigits ?? 2;
    const convert = (amount: number | string) =>
      this.roundMoney(Number(amount) * exchangeRate, decimalDigits);

    return {
      ...order,
      baseSubtotal: Number(order.subtotal),
      baseShippingAmount: Number(order.shippingAmount),
      baseTaxAmount: Number(order.taxAmount),
      baseDiscountAmount: Number(order.discountAmount),
      baseRewardSavings: Number(order.rewardSavings ?? 0),
      baseTotalAmount: Number(order.totalAmount),
      displaySubtotal: convert(order.subtotal),
      displayShippingAmount: convert(order.shippingAmount),
      displayTaxAmount: convert(order.taxAmount),
      displayDiscountAmount: convert(order.discountAmount),
      displayRewardSavings: convert(order.rewardSavings ?? 0),
      displayTotalAmount: convert(order.totalAmount),
      subtotal: Number(order.subtotal),
      shippingAmount: Number(order.shippingAmount),
      taxAmount: Number(order.taxAmount),
      discountAmount: Number(order.discountAmount),
      rewardSavings: Number(order.rewardSavings ?? 0),
      totalAmount: Number(order.totalAmount),
      items: order.items.map((item: any) => ({
        ...item,
        baseUnitPrice: Number(item.baseUnitPrice),
        unitDiscountAmount: Number(item.unitDiscountAmount ?? 0),
        finalUnitPrice: Number(item.unitPrice),
        baseLineTotal: Number(item.lineSubtotal),
        lineBaseSubtotal: Number(item.lineSubtotal),
        lineDiscountAmount: Number(item.discountAmount),
        lineFinalSubtotal: Number(item.lineTotal),
        displayUnitPrice: convert(item.unitPrice),
        displayLineTotal: convert(item.lineTotal),
        unitPrice: Number(item.unitPrice),
        discountAmount: Number(item.discountAmount),
        lineTotal: Number(item.lineTotal),
        offer: item.appliedOfferId
          ? {
              id: item.appliedOfferId,
              name: item.appliedOfferName,
              type: item.appliedOfferType,
              value:
                item.appliedOfferValue === null ||
                item.appliedOfferValue === undefined
                  ? null
                  : String(item.appliedOfferValue),
              maxDiscountAmount:
                item.appliedOfferMaxDiscountAmount === null ||
                item.appliedOfferMaxDiscountAmount === undefined
                  ? null
                  : String(item.appliedOfferMaxDiscountAmount),
            }
          : null,
        isOfferReward: item.isOfferReward ?? false,
        sourceOfferId: item.sourceOfferId ?? null,
        sourceOrderItemId: item.sourceOrderItemId ?? null,
        image: item.variant?.images?.[0] ?? item.product?.images?.[0] ?? null,
        product: undefined,
        variant: undefined,
      })),
    };
  }

  private getOrderImageOrderBy() {
    return [
      {
        isPrimary: 'desc' as const,
      },
      {
        sortOrder: 'asc' as const,
      },
      {
        createdAt: 'asc' as const,
      },
    ];
  }

  private getPositiveInteger(value: string | undefined, fallback: number) {
    const parsed = Number.parseInt(value ?? '', 10);

    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  private generateOrderNumber() {
    return `BW-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  }

  private generateSnapshotItemId() {
    return randomUUID();
  }

  private normalizeCheckoutIdempotencyKey(
    userId: string,
    idempotencyKey?: string,
  ) {
    const trimmedKey = idempotencyKey?.trim();

    return trimmedKey ? `${userId}:${trimmedKey}` : null;
  }

  private roundMoney(amount: number, decimalDigits: number): number {
    const factor = 10 ** decimalDigits;
    return Math.round((amount + Number.EPSILON) * factor) / factor;
  }

  private decimalToRoundedNumber(
    amount: Prisma.Decimal,
    decimalDigits: number,
  ): number {
    return new Prisma.Decimal(amount.toFixed(decimalDigits)).toNumber();
  }

  private decimalToMoney(value: Prisma.Decimal) {
    return value.toFixed(2);
  }

  private nullableDecimalToMoney(value: Prisma.Decimal | null) {
    return value ? value.toFixed(2) : null;
  }

  private nullableTrim(value?: string | null): string | null {
    const trimmed = value?.trim();
    return trimmed || null;
  }
}
