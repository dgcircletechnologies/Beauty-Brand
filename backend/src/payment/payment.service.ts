import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual, createHash } from 'crypto';

import { PaymentStatus } from '../../generated/prisma/enums.cjs';
import { PrismaService } from '../database/prisma.service';
import { OrderService } from '../order/order.service';
import { CreateRazorpayOrderDto } from './dto/create-razorpay-order.dto';
import { VerifyRazorpayPaymentDto } from './dto/verify-razorpay-payment.dto';

type RazorpayOrderResponse = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  receipt?: string;
};

type RazorpayPaymentResponse = {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  status: string;
  captured: boolean;
  method?: string;
  error_code?: string;
  error_description?: string;
};

@Injectable()
export class PaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly orderService: OrderService,
  ) {}

  async createRazorpayOrder(userId: string, dto: CreateRazorpayOrderDto) {
    const localOrder = await this.orderService.createPendingPaymentOrder(
      userId,
      dto,
    );
    const payment = await this.prisma.paymentTransaction.findFirst({
      where: {
        orderId: localOrder.id,
        provider: 'razorpay',
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!payment) {
      throw new InternalServerErrorException('Payment transaction not created');
    }

    const razorpayOrder = await this.createRazorpayApiOrder({
      amount: this.toSmallestUnit(Number(payment.amount)),
      currency: payment.currencyCode,
      receipt: localOrder.orderNumber,
      notes: {
        localOrderId: localOrder.id,
        orderNumber: localOrder.orderNumber,
        userId,
      },
    });

    await this.prisma.paymentTransaction.update({
      where: {
        id: payment.id,
      },
      data: {
        providerIntentId: razorpayOrder.id,
        status: PaymentStatus.PROCESSING,
        metadata: {
          ...(typeof payment.metadata === 'object' &&
            payment.metadata !== null &&
            !Array.isArray(payment.metadata) &&
            payment.metadata),
          razorpayOrder,
        },
      },
    });

    return {
      keyId: this.requiredConfig('RAZORPAY_KEY_ID'),
      localOrderId: localOrder.id,
      orderNumber: localOrder.orderNumber,
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      customerEmail: localOrder.customerEmail,
      customerPhone: localOrder.customerPhone,
    };
  }

  async verifyRazorpayPayment(userId: string, dto: VerifyRazorpayPaymentDto) {
    this.verifyCheckoutSignature(dto);

    const payment = await this.fetchRazorpayPayment(dto.razorpay_payment_id);

    if (
      payment.order_id !== dto.razorpay_order_id ||
      !['captured', 'authorized'].includes(payment.status)
    ) {
      throw new BadRequestException('Razorpay payment is not successful');
    }

    return this.orderService.confirmPaidOrder(dto.localOrderId, userId, {
      provider: 'razorpay',
      providerPaymentId: dto.razorpay_payment_id,
      providerOrderId: dto.razorpay_order_id,
      signature: dto.razorpay_signature,
      rawResponse: payment as unknown as Record<string, unknown>,
    });
  }

  async getAdminPayments() {
    const payments = await this.prisma.paymentTransaction.findMany({
      include: {
        order: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        currency: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 200,
    });

    return payments.map((payment) => this.toPaymentView(payment));
  }

  async getAdminPayment(paymentId: string) {
    const payment = await this.prisma.paymentTransaction.findUnique({
      where: {
        id: paymentId,
      },
      include: {
        order: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        currency: true,
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return this.toPaymentView(payment);
  }

  async handleRazorpayWebhook(signature: string | undefined, rawBody: Buffer) {
    const webhookSecret = this.requiredConfig('RAZORPAY_WEBHOOK_SECRET');
    const bodyText = rawBody.toString('utf8');
    const expectedSignature = createHmac('sha256', webhookSecret)
      .update(bodyText)
      .digest('hex');

    if (!signature || !this.safeCompare(signature, expectedSignature)) {
      throw new BadRequestException('Invalid Razorpay webhook signature');
    }

    const payload = JSON.parse(bodyText) as {
      event?: string;
      created_at?: number;
      payload?: {
        payment?: {
          entity?: RazorpayPaymentResponse;
        };
        order?: {
          entity?: {
            id?: string;
            status?: string;
          };
        };
      };
    };
    const eventType = payload.event ?? 'unknown';
    const providerEventId = `${eventType}-${payload.created_at ?? Date.now()}-${createHash('sha256')
      .update(bodyText)
      .digest('hex')
      .slice(0, 16)}`;

    const event = await this.prisma.paymentWebhookEvent.upsert({
      where: {
        provider_providerEventId: {
          provider: 'razorpay',
          providerEventId,
        },
      },
      update: {},
      create: {
        provider: 'razorpay',
        providerEventId,
        eventType,
        payloadHash: createHash('sha256').update(bodyText).digest('hex'),
      },
    });

    if (event.processedAt) {
      return {
        received: true,
        duplicate: true,
      };
    }

    try {
      if (['payment.captured', 'order.paid'].includes(eventType)) {
        const payment = payload.payload?.payment?.entity;
        const razorpayOrderId =
          payment?.order_id ?? payload.payload?.order?.entity?.id;

        if (razorpayOrderId) {
          const transaction = await this.prisma.paymentTransaction.findFirst({
            where: {
              provider: 'razorpay',
              providerIntentId: razorpayOrderId,
            },
          });

          if (transaction) {
            await this.orderService.confirmPaidOrder(transaction.orderId, null, {
              provider: 'razorpay',
              providerPaymentId: payment?.id ?? null,
              providerOrderId: razorpayOrderId,
              signature: null,
              rawResponse: payload as Record<string, unknown>,
            });
          }
        }
      }

      if (eventType === 'payment.failed') {
        const payment = payload.payload?.payment?.entity;

        if (payment?.order_id) {
          await this.prisma.paymentTransaction.updateMany({
            where: {
              provider: 'razorpay',
              providerIntentId: payment.order_id,
            },
            data: {
              providerTransactionId: payment.id,
              status: PaymentStatus.FAILED,
              failureCode: payment.error_code,
              failureReason: payment.error_description,
              processedAt: new Date(),
            },
          });
        }
      }

      await this.prisma.paymentWebhookEvent.update({
        where: {
          id: event.id,
        },
        data: {
          processedAt: new Date(),
        },
      });
    } catch (error) {
      await this.prisma.paymentWebhookEvent.update({
        where: {
          id: event.id,
        },
        data: {
          processingError:
            error instanceof Error ? error.message : 'Webhook processing failed',
        },
      });
      throw error;
    }

    return {
      received: true,
    };
  }

  private async createRazorpayApiOrder(payload: {
    amount: number;
    currency: string;
    receipt: string;
    notes: Record<string, string>;
  }) {
    return this.razorpayRequest<RazorpayOrderResponse>('/orders', {
      method: 'POST',
      body: JSON.stringify({
        amount: payload.amount,
        currency: payload.currency,
        receipt: payload.receipt,
        notes: payload.notes,
        payment_capture: 1,
      }),
    });
  }

  private async fetchRazorpayPayment(paymentId: string) {
    return this.razorpayRequest<RazorpayPaymentResponse>(
      `/payments/${paymentId}`,
      {
        method: 'GET',
      },
    );
  }

  private async razorpayRequest<T>(path: string, init: RequestInit) {
    const keyId = this.requiredConfig('RAZORPAY_KEY_ID');
    const keySecret = this.requiredConfig('RAZORPAY_KEY_SECRET');
    const response = await fetch(`https://api.razorpay.com/v1${path}`, {
      ...init,
      headers: {
        Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString(
          'base64',
        )}`,
        'Content-Type': 'application/json',
        ...init.headers,
      },
    });
    const payload = (await response.json().catch(() => null)) as
      | T
      | { error?: { description?: string } }
      | null;

    if (!response.ok) {
      throw new BadRequestException(
        payload &&
          typeof payload === 'object' &&
          'error' in payload &&
          payload.error?.description
          ? payload.error.description
          : 'Razorpay request failed',
      );
    }

    return payload as T;
  }

  private verifyCheckoutSignature(dto: VerifyRazorpayPaymentDto) {
    const keySecret = this.requiredConfig('RAZORPAY_KEY_SECRET');
    const expectedSignature = createHmac('sha256', keySecret)
      .update(`${dto.razorpay_order_id}|${dto.razorpay_payment_id}`)
      .digest('hex');

    if (!this.safeCompare(dto.razorpay_signature, expectedSignature)) {
      throw new BadRequestException('Invalid Razorpay payment signature');
    }
  }

  private safeCompare(actual: string, expected: string) {
    const actualBuffer = Buffer.from(actual);
    const expectedBuffer = Buffer.from(expected);

    return (
      actualBuffer.length === expectedBuffer.length &&
      timingSafeEqual(actualBuffer, expectedBuffer)
    );
  }

  private toSmallestUnit(amount: number) {
    return Math.round(amount * 100);
  }

  private requiredConfig(key: string) {
    const value = this.configService.get<string>(key);

    if (!value) {
      throw new Error(`${key} is required`);
    }

    return value;
  }

  private toPaymentView(payment: any) {
    return {
      ...payment,
      amount: Number(payment.amount),
      order: payment.order
        ? {
            id: payment.order.id,
            orderNumber: payment.order.orderNumber,
            status: payment.order.status,
            customerEmail: payment.order.customerEmail,
            customerPhone: payment.order.customerPhone,
            totalAmount: Number(payment.order.totalAmount),
            user: payment.order.user,
          }
        : null,
    };
  }
}
