import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  CancellationRequestStatus,
  CartStatus,
  OrderAddressType,
  OrderStatus,
  PaymentStatus,
  ProductStatus,
  ShipmentStatus,
} from '../../generated/prisma/enums.cjs';
import { CurrencyService } from '../currency/currency.service';
import { PrismaService } from '../database/prisma.service';
import { ShippingService } from '../shipping/shipping.service';
import { CheckoutPreviewDto } from './dto/checkout-preview.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { DecideCancellationDto } from './dto/decide-cancellation.dto';
import { RequestCancellationDto } from './dto/request-cancellation.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { UpsertShipmentDto } from './dto/upsert-shipment.dto';

@Injectable()
export class OrderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly currencyService: CurrencyService,
    private readonly shippingService: ShippingService,
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
      ? await this.getShippingAvailability(dto.shippingAddressId, userId, totals)
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
      itemCount: items.reduce((total, item) => total + item.quantity, 0),
      baseSubtotal: totals.baseSubtotal,
      displaySubtotal: totals.displaySubtotal,
      subtotal: totals.displaySubtotal,
      baseShippingAmount,
      displayShippingAmount,
      shippingAmount: displayShippingAmount,
      taxAmount: 0,
      discountAmount: 0,
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
          idempotencyKey: `${orderNumber}-${userId}`,
          status: OrderStatus.PENDING_PAYMENT,
          baseCurrencyCode: totals.baseCurrency.code,
          displayCurrencyCode: totals.displayCurrency.code,
          exchangeRate: totals.rate,
          exchangeRateEffectiveAt: totals.exchangeRateEffectiveAt,
          subtotal: totals.baseSubtotal,
          shippingAmount: baseShippingAmount,
          taxAmount: 0,
          discountAmount: 0,
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
            create: items.map((item) => {
              const baseUnitPrice = Number(item.variant.price);
              const lineSubtotal = this.roundMoney(
                baseUnitPrice * item.quantity,
                totals.baseCurrency.decimalDigits,
              );

              return {
                productId: item.variant.product.id,
                variantId: item.variant.id,
                productName: item.variant.product.name,
                variantLabel: item.variant.sku,
                sku: item.variant.sku,
                quantity: item.quantity,
                baseUnitPrice,
                unitPrice: baseUnitPrice,
                lineSubtotal,
                taxAmount: 0,
                discountAmount: 0,
                lineTotal: lineSubtotal,
              };
            }),
          },
          addresses: {
            create: [
              this.toAddressSnapshot(OrderAddressType.SHIPPING, shippingAddress),
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
              },
            },
          },
        },
        include: this.orderInclude(),
      });

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
          (transaction) => transaction.providerIntentId === payment.providerOrderId,
        ) ?? order.payments[0];

      if (!existingPayment) {
        throw new NotFoundException('Payment transaction not found');
      }

      if (existingPayment.status !== PaymentStatus.SUCCEEDED) {
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
        for (const item of request.order.items) {
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
      throw new BadRequestException('One or more selected cart items are invalid');
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
    const displayCurrency = await this.currencyService.ensureActiveCurrency(
      displayCurrencyCode,
    );
    const baseSubtotal = items.reduce(
      (total, item) => total + Number(item.variant.price) * item.quantity,
      0,
    );

    return {
      baseCurrency,
      displayCurrency,
      rate: exchangeRate.rate,
      exchangeRateEffectiveAt: exchangeRate.effectiveAt,
      baseSubtotal: this.roundMoney(baseSubtotal, baseCurrency.decimalDigits),
      displaySubtotal: this.roundMoney(
        baseSubtotal * exchangeRate.rate,
        displayCurrency.decimalDigits,
      ),
    };
  }

  private toCheckoutItem(
    item: Awaited<ReturnType<OrderService['getActiveCart']>>['items'][number],
    totals: Awaited<ReturnType<OrderService['calculateTotals']>>,
  ) {
    const baseUnitPrice = Number(item.variant.price);
    const displayUnitPrice = this.roundMoney(
      baseUnitPrice * totals.rate,
      totals.displayCurrency.decimalDigits,
    );
    const displayLineTotal = this.roundMoney(
      displayUnitPrice * item.quantity,
      totals.displayCurrency.decimalDigits,
    );

    return {
      cartItemId: item.id,
      productId: item.variant.product.id,
      variantId: item.variant.id,
      productName: item.variant.product.name,
      sku: item.variant.sku,
      quantity: item.quantity,
      baseUnitPrice,
      baseLineTotal: this.roundMoney(
        baseUnitPrice * item.quantity,
        totals.baseCurrency.decimalDigits,
      ),
      displayUnitPrice,
      displayLineTotal,
      unitPrice: displayUnitPrice,
      lineTotal: displayLineTotal,
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

  private toAddressSnapshot(type: OrderAddressType, address: {
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
  }) {
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
      baseTotalAmount: Number(order.totalAmount),
      displaySubtotal: convert(order.subtotal),
      displayShippingAmount: convert(order.shippingAmount),
      displayTaxAmount: convert(order.taxAmount),
      displayDiscountAmount: convert(order.discountAmount),
      displayTotalAmount: convert(order.totalAmount),
      subtotal: Number(order.subtotal),
      shippingAmount: Number(order.shippingAmount),
      taxAmount: Number(order.taxAmount),
      discountAmount: Number(order.discountAmount),
      totalAmount: Number(order.totalAmount),
      items: order.items.map((item: any) => ({
        ...item,
        baseUnitPrice: Number(item.baseUnitPrice),
        baseLineTotal: Number(item.lineTotal),
        displayUnitPrice: convert(item.unitPrice),
        displayLineTotal: convert(item.lineTotal),
        unitPrice: Number(item.unitPrice),
        lineTotal: Number(item.lineTotal),
        image:
          item.variant?.images?.[0] ??
          item.product?.images?.[0] ??
          null,
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

  private roundMoney(amount: number, decimalDigits: number): number {
    const factor = 10 ** decimalDigits;
    return Math.round((amount + Number.EPSILON) * factor) / factor;
  }

  private nullableTrim(value?: string | null): string | null {
    const trimmed = value?.trim();
    return trimmed || null;
  }
}
