// ─── E-Commerce Payment Service ───────────────────────────────
// Payment gateway management, initiate payment (Razorpay/Stripe),
// verify webhook signature, process capture/refund, reconcile.

import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { createHmac } from 'crypto';
import type {
  PaymentGatewayInput,
  PaymentGatewayResponse,
  OnlinePaymentInput,
  PaymentResponse,
  PaymentListFilter,
  RazorpayWebhookPayload,
  StripeWebhookPayload,
} from '@caratflow/shared-types';
import type { PaginatedResult, Pagination } from '@caratflow/shared-types';
import { OnlinePaymentStatus, PaymentGatewayType } from '@caratflow/shared-types';
import { PrismaService } from '../../common/prisma.service';
import { TenantAwareService } from '../../common/base.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class EcommercePaymentService extends TenantAwareService {
  private readonly logger = new Logger(EcommercePaymentService.name);

  constructor(prisma: PrismaService) {
    super(prisma);
  }

  // ─── Payment Gateway CRUD ─────────────────────────────────────

  async createGateway(tenantId: string, userId: string, input: PaymentGatewayInput): Promise<PaymentGatewayResponse> {
    // If this is the default, unset other defaults
    if (input.isDefault) {
      await this.prisma.paymentGateway.updateMany({
        where: { tenantId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const gateway = await this.prisma.paymentGateway.create({
      data: {
        id: uuidv4(),
        tenantId,
        name: input.name,
        gatewayType: input.gatewayType,
        apiKey: input.apiKey ?? null,
        apiSecret: input.apiSecret ?? null,
        webhookSecret: input.webhookSecret ?? null,
        isActive: input.isActive ?? true,
        isDefault: input.isDefault ?? false,
        supportedMethods: input.supportedMethods ?? undefined,
        settings: input.settings ?? undefined,
        createdBy: userId,
        updatedBy: userId,
      },
    });

    return this.mapGatewayToResponse(gateway);
  }

  async getGateway(tenantId: string, gatewayId: string): Promise<PaymentGatewayResponse> {
    const gateway = await this.prisma.paymentGateway.findFirst({
      where: { id: gatewayId, tenantId },
    });
    if (!gateway) {
      throw new NotFoundException('Payment gateway not found');
    }
    return this.mapGatewayToResponse(gateway);
  }

  async listGateways(tenantId: string): Promise<PaymentGatewayResponse[]> {
    const gateways = await this.prisma.paymentGateway.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
    return gateways.map((g) => this.mapGatewayToResponse(g));
  }

  async updateGateway(
    tenantId: string,
    userId: string,
    gatewayId: string,
    input: Partial<PaymentGatewayInput>,
  ): Promise<PaymentGatewayResponse> {
    const existing = await this.prisma.paymentGateway.findFirst({
      where: { id: gatewayId, tenantId },
    });
    if (!existing) {
      throw new NotFoundException('Payment gateway not found');
    }

    if (input.isDefault) {
      await this.prisma.paymentGateway.updateMany({
        where: { tenantId, isDefault: true, id: { not: gatewayId } },
        data: { isDefault: false },
      });
    }

    const updated = await this.prisma.paymentGateway.update({
      where: { id: gatewayId },
      data: {
        name: input.name ?? undefined,
        gatewayType: input.gatewayType ?? undefined,
        apiKey: input.apiKey ?? undefined,
        apiSecret: input.apiSecret ?? undefined,
        webhookSecret: input.webhookSecret ?? undefined,
        isActive: input.isActive ?? undefined,
        isDefault: input.isDefault ?? undefined,
        supportedMethods: input.supportedMethods ?? undefined,
        settings: input.settings ?? undefined,
        updatedBy: userId,
      },
    });

    return this.mapGatewayToResponse(updated);
  }

  // ─── Online Payment Operations ────────────────────────────────

  /**
   * Initiate a payment. In production, this would call the gateway API.
   */
  async initiatePayment(tenantId: string, userId: string, input: OnlinePaymentInput): Promise<PaymentResponse> {
    const gateway = await this.prisma.paymentGateway.findFirst({
      where: { id: input.gatewayId, tenantId, isActive: true },
    });
    if (!gateway) {
      throw new NotFoundException('Payment gateway not found or inactive');
    }

    const order = await this.prisma.onlineOrder.findFirst({
      where: { id: input.orderId, tenantId },
    });
    if (!order) {
      throw new NotFoundException('Online order not found');
    }

    const payment = await this.prisma.onlinePayment.create({
      data: {
        id: uuidv4(),
        tenantId,
        orderId: input.orderId,
        gatewayId: input.gatewayId,
        method: input.method ?? null,
        amountPaise: BigInt(input.amountPaise),
        currencyCode: input.currencyCode ?? 'INR',
        status: 'INITIATED',
        initiatedAt: new Date(),
        createdBy: userId,
        updatedBy: userId,
      },
    });

    this.logger.log(`Payment initiated: ${payment.id} for order ${input.orderId}, gateway ${gateway.gatewayType}`);

    return this.mapPaymentToResponse(payment);
  }

  /**
   * Capture a payment (mark as captured after gateway confirms).
   */
  async capturePayment(
    tenantId: string,
    paymentId: string,
    externalPaymentId: string,
    gatewayResponse?: Record<string, unknown>,
  ): Promise<PaymentResponse> {
    const payment = await this.prisma.onlinePayment.findFirst({
      where: { id: paymentId, tenantId },
    });
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    const updated = await this.prisma.onlinePayment.update({
      where: { id: paymentId },
      data: {
        externalPaymentId,
        status: 'CAPTURED',
        completedAt: new Date(),
        gatewayResponse: gatewayResponse ?? undefined,
      },
    });

    return this.mapPaymentToResponse(updated);
  }

  /**
   * Refund a payment.
   */
  async refundPayment(
    tenantId: string,
    paymentId: string,
    refundAmountPaise?: number,
  ): Promise<PaymentResponse> {
    const payment = await this.prisma.onlinePayment.findFirst({
      where: { id: paymentId, tenantId },
    });
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status !== 'CAPTURED') {
      throw new BadRequestException('Only captured payments can be refunded');
    }

    const amountToRefund = refundAmountPaise ?? Number(payment.amountPaise);
    const isPartial = amountToRefund < Number(payment.amountPaise);

    const updated = await this.prisma.onlinePayment.update({
      where: { id: paymentId },
      data: {
        status: isPartial ? 'PARTIALLY_REFUNDED' : 'REFUNDED',
        refundedAt: new Date(),
        refundAmountPaise: BigInt(amountToRefund),
      },
    });

    return this.mapPaymentToResponse(updated);
  }

  /**
   * Verify Razorpay webhook signature.
   */
  verifyRazorpaySignature(body: string, signature: string, secret: string): boolean {
    const expectedSignature = createHmac('sha256', secret)
      .update(body)
      .digest('hex');
    return expectedSignature === signature;
  }

  /**
   * Verify Stripe webhook signature.
   */
  verifyStripeSignature(body: string, sigHeader: string, secret: string): boolean {
    const parts = sigHeader.split(',');
    let timestamp = '';
    let signature = '';

    for (const part of parts) {
      const [key, value] = part.split('=');
      if (key === 't') timestamp = value ?? '';
      if (key === 'v1') signature = value ?? '';
    }

    if (!timestamp || !signature) return false;

    const payload = `${timestamp}.${body}`;
    const expected = createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    return expected === signature;
  }

  /**
   * Process Razorpay webhook payload.
   */
  async processRazorpayWebhook(
    tenantId: string,
    payload: RazorpayWebhookPayload,
  ): Promise<void> {
    const eventType = payload.event;

    if (eventType === 'payment.captured' && payload.payload.payment) {
      const paymentEntity = payload.payload.payment.entity;
      // Find the payment by external ID or order reference
      const payment = await this.prisma.onlinePayment.findFirst({
        where: {
          tenantId,
          OR: [
            { externalPaymentId: paymentEntity.id },
            // Try to match by amount and status for new payments
          ],
        },
      });

      if (payment) {
        await this.capturePayment(tenantId, payment.id, paymentEntity.id, {
          razorpay_payment_id: paymentEntity.id,
          method: paymentEntity.method,
          status: paymentEntity.status,
        });
      }
    }

    if (eventType === 'refund.created' && payload.payload.refund) {
      const refundEntity = payload.payload.refund.entity;
      const payment = await this.prisma.onlinePayment.findFirst({
        where: {
          tenantId,
          externalPaymentId: refundEntity.payment_id,
        },
      });

      if (payment) {
        await this.refundPayment(tenantId, payment.id, refundEntity.amount);
      }
    }
  }

  /**
   * Process Stripe webhook payload.
   */
  async processStripeWebhook(
    tenantId: string,
    payload: StripeWebhookPayload,
  ): Promise<void> {
    const eventType = payload.type;
    const obj = payload.data.object;

    if (eventType === 'payment_intent.succeeded') {
      const payment = await this.prisma.onlinePayment.findFirst({
        where: {
          tenantId,
          externalPaymentId: obj.id as string,
        },
      });

      if (payment) {
        await this.capturePayment(tenantId, payment.id, obj.id as string, obj);
      }
    }

    if (eventType === 'charge.refunded') {
      const paymentIntentId = (obj.payment_intent as string) ?? '';
      const payment = await this.prisma.onlinePayment.findFirst({
        where: {
          tenantId,
          externalPaymentId: paymentIntentId,
        },
      });

      if (payment) {
        const refundAmount = (obj.amount_refunded as number) ?? Number(payment.amountPaise);
        await this.refundPayment(tenantId, payment.id, refundAmount);
      }
    }
  }

  /**
   * List payments with filters.
   */
  async listPayments(
    tenantId: string,
    filters: PaymentListFilter,
    pagination: Pagination,
  ): Promise<PaginatedResult<PaymentResponse>> {
    const where: Record<string, unknown> = { tenantId };

    if (filters.orderId) where.orderId = filters.orderId;
    if (filters.gatewayId) where.gatewayId = filters.gatewayId;
    if (filters.status) where.status = filters.status;
    if (filters.search) {
      where.OR = [
        { externalPaymentId: { contains: filters.search } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.onlinePayment.findMany({
        where,
        orderBy: { createdAt: pagination.sortOrder ?? 'desc' },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      }),
      this.prisma.onlinePayment.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pagination.limit);

    return {
      items: items.map((p) => this.mapPaymentToResponse(p)),
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages,
      hasNext: pagination.page < totalPages,
      hasPrevious: pagination.page > 1,
    };
  }

  // ─── Private Helpers ──────────────────────────────────────────

  private mapGatewayToResponse(g: Record<string, unknown>): PaymentGatewayResponse {
    return {
      id: g.id as string,
      tenantId: g.tenantId as string,
      name: g.name as string,
      gatewayType: g.gatewayType as PaymentGatewayType,
      isActive: g.isActive as boolean,
      isDefault: g.isDefault as boolean,
      supportedMethods: g.supportedMethods ?? null,
      settings: g.settings ?? null,
      createdAt: new Date(g.createdAt as string),
      updatedAt: new Date(g.updatedAt as string),
    };
  }

  private mapPaymentToResponse(p: Record<string, unknown>): PaymentResponse {
    return {
      id: p.id as string,
      tenantId: p.tenantId as string,
      orderId: p.orderId as string,
      gatewayId: p.gatewayId as string,
      externalPaymentId: (p.externalPaymentId as string) ?? null,
      method: (p.method as string) ?? null,
      amountPaise: Number(p.amountPaise),
      currencyCode: p.currencyCode as string,
      status: p.status as OnlinePaymentStatus,
      gatewayResponse: p.gatewayResponse ?? null,
      initiatedAt: p.initiatedAt ? new Date(p.initiatedAt as string) : null,
      completedAt: p.completedAt ? new Date(p.completedAt as string) : null,
      refundedAt: p.refundedAt ? new Date(p.refundedAt as string) : null,
      refundAmountPaise: p.refundAmountPaise ? Number(p.refundAmountPaise) : null,
      createdAt: new Date(p.createdAt as string),
      updatedAt: new Date(p.updatedAt as string),
    };
  }
}
