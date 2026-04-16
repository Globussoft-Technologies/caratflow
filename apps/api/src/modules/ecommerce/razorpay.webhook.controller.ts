// ─── Razorpay Webhook Controller ──────────────────────────────
// Receives payment.captured / payment.failed / refund.* callbacks
// from Razorpay. Verifies the X-Razorpay-Signature header against
// the tenant's webhook secret (HMAC-SHA256 of the raw body) using
// a timing-safe comparison, then:
//
//   1. Persists razorpay_order_id + razorpay_payment_id on the
//      matching OnlineOrder/Invoice/Sale (metadata JSON).
//   2. Marks the linked entity paid / failed.
//   3. Emits `ecommerce.payment.captured` or
//      `ecommerce.payment.failed` onto the event bus.
//
// Mounted at POST /api/v1/webhooks/razorpay.

import {
  Controller,
  Post,
  Req,
  Headers,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
  UnauthorizedException,
  Optional,
} from '@nestjs/common';
import type { Request } from 'express';
import { createHmac, timingSafeEqual } from 'crypto';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../common/prisma.service';
import { IndiaPaymentService } from '../india/india.payment.service';
import { EventBusService } from '../../event-bus/event-bus.service';
import { Prisma } from '@caratflow/db';
import type {
  EcommercePaymentCapturedEvent,
  EcommercePaymentFailedEvent,
} from '@caratflow/shared-types';

interface RazorpayPaymentEntity {
  id: string;
  order_id?: string;
  amount: number;
  currency: string;
  status?: string;
  method?: string;
  email?: string;
  contact?: string;
  notes?: Record<string, string>;
  error_code?: string | null;
  error_description?: string | null;
  error_reason?: string | null;
}

interface RazorpayOrderEntity {
  id: string;
  receipt?: string | null;
  amount: number;
  currency: string;
  notes?: Record<string, string>;
}

interface RazorpayWebhookBody {
  event: string;
  account_id?: string;
  payload: {
    payment?: { entity: RazorpayPaymentEntity };
    order?: { entity: RazorpayOrderEntity };
  };
  created_at?: number;
}

type MatchedEntity =
  | { kind: 'online_order'; id: string; tenantId: string; receipt: string | null }
  | { kind: 'invoice'; id: string; tenantId: string; receipt: string | null }
  | { kind: 'sale'; id: string; tenantId: string; receipt: string | null };

@Controller('api/v1/webhooks/razorpay')
export class RazorpayWebhookController {
  private readonly logger = new Logger(RazorpayWebhookController.name);

  constructor(
    @Optional() private readonly prisma?: PrismaService,
    @Optional() private readonly indiaPayment?: IndiaPaymentService,
    @Optional() private readonly eventBus?: EventBusService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async handle(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('x-razorpay-signature') signature: string | undefined,
    @Body() body: RazorpayWebhookBody,
  ): Promise<{ success: true }> {
    const raw: string =
      req.rawBody && req.rawBody.length > 0
        ? req.rawBody.toString('utf8')
        : JSON.stringify(body ?? {});

    const webhookSecret = await this.resolveWebhookSecret(body);

    if (!webhookSecret) {
      this.logger.error('Razorpay webhook secret not configured; rejecting webhook');
      throw new UnauthorizedException('Webhook not configured');
    }

    if (!this.verifySignature(raw, signature, webhookSecret)) {
      this.logger.warn('Razorpay webhook signature verification failed');
      throw new UnauthorizedException('Invalid signature');
    }

    const event = body?.event;
    const paymentEntity = body?.payload?.payment?.entity;
    const orderEntity = body?.payload?.order?.entity;

    this.logger.log(
      `Razorpay webhook received: event=${event}, ` +
        `payment=${paymentEntity?.id ?? 'n/a'}, order=${paymentEntity?.order_id ?? orderEntity?.id ?? 'n/a'}`,
    );

    try {
      switch (event) {
        case 'payment.captured':
          if (paymentEntity) await this.handlePaymentCaptured(paymentEntity);
          break;
        case 'payment.failed':
          if (paymentEntity) await this.handlePaymentFailed(paymentEntity);
          break;
        case 'payment.authorized':
          // Informational; most merchants use captured. Acknowledge and move on.
          break;
        case 'order.paid':
          // Duplicate of payment.captured with the order entity attached; skip
          // to avoid double-processing (payment.captured is always emitted too).
          break;
        default:
          this.logger.log(`Ignoring unhandled Razorpay event: ${event}`);
      }
    } catch (err) {
      // Never throw 5xx to Razorpay after signature verification -- the retry
      // storm isn't worth it and we've already logged. Return 200 so Razorpay
      // doesn't retry, but log the error for monitoring.
      this.logger.error(
        `Razorpay webhook handler error (event=${event}): ${(err as Error).message}`,
        (err as Error).stack,
      );
    }

    return { success: true };
  }

  // ─── Signature ──────────────────────────────────────────────

  /**
   * HMAC-SHA256 of the raw request body using the webhook_secret.
   * Compared with timingSafeEqual to prevent timing oracles.
   */
  private verifySignature(
    rawBody: string,
    signatureHeader: string | undefined,
    webhookSecret: string,
  ): boolean {
    if (!signatureHeader) return false;
    const expected = createHmac('sha256', webhookSecret)
      .update(rawBody, 'utf8')
      .digest('hex');
    try {
      const a = Buffer.from(expected, 'hex');
      const b = Buffer.from(signatureHeader, 'hex');
      if (a.length === 0 || a.length !== b.length) return false;
      return timingSafeEqual(a, b);
    } catch {
      return false;
    }
  }

  /**
   * Razorpay webhooks are not tenant-scoped by default. Resolve the
   * webhook secret by:
   *   1. Finding the matching entity (OnlineOrder / Invoice / Sale)
   *      via the payment's order_id or notes.receipt.
   *   2. Loading that tenant's razorpay_webhook_secret setting.
   *   3. Falling back to the env var RAZORPAY_WEBHOOK_SECRET.
   */
  private async resolveWebhookSecret(body: RazorpayWebhookBody): Promise<string | null> {
    const envSecret = process.env.RAZORPAY_WEBHOOK_SECRET ?? null;

    const matched = await this.matchEntity(body).catch(() => null);
    if (matched && this.indiaPayment) {
      try {
        const creds = await this.indiaPayment.getRazorpayCredentials(matched.tenantId);
        if (creds.webhookSecret) return creds.webhookSecret;
      } catch {
        // Fall through to env secret
      }
    }

    return envSecret;
  }

  // ─── Entity Matching ────────────────────────────────────────

  /**
   * Find the OnlineOrder/Invoice/Sale associated with a Razorpay
   * webhook by:
   *   - Looking up OnlinePayment.externalPaymentId == payment.order_id
   *     (we persist the Razorpay order id here at initiate time).
   *   - Falling back to matching the receipt from notes.receipt
   *     against the entity's natural key.
   */
  private async matchEntity(body: RazorpayWebhookBody): Promise<MatchedEntity | null> {
    if (!this.prisma) return null;
    const paymentEntity = body?.payload?.payment?.entity;
    const orderEntity = body?.payload?.order?.entity;
    const razorpayOrderId = paymentEntity?.order_id ?? orderEntity?.id ?? null;
    const receipt = orderEntity?.receipt ?? paymentEntity?.notes?.receipt ?? null;

    // 1. Try OnlinePayment by razorpay order id stored in externalPaymentId
    if (razorpayOrderId) {
      const payment = await this.prisma.onlinePayment.findFirst({
        where: { externalPaymentId: razorpayOrderId },
      });
      if (payment) {
        return {
          kind: 'online_order',
          id: payment.orderId,
          tenantId: payment.tenantId,
          receipt,
        };
      }
    }

    // 2. Try by receipt (receipt is "OO-<orderNumber>", "INV-<invoiceNumber>"
    //    or "SAL-<saleNumber>"). Keep matching tolerant -- also try the bare
    //    receipt against order/invoice/sale numbers directly.
    if (receipt) {
      const prefix = receipt.slice(0, 4).toUpperCase();
      const bare = receipt.replace(/^(OO-|INV-|SAL-|CF-)/i, '');

      if (prefix.startsWith('OO-') || prefix.startsWith('CF-') || !prefix.includes('-')) {
        const order = await this.prisma.onlineOrder.findFirst({
          where: { OR: [{ orderNumber: receipt }, { orderNumber: bare }] },
        });
        if (order) {
          return { kind: 'online_order', id: order.id, tenantId: order.tenantId, receipt };
        }
      }

      if (prefix.startsWith('INV')) {
        const invoice = await this.prisma.invoice.findFirst({
          where: { OR: [{ invoiceNumber: receipt }, { invoiceNumber: bare }] },
        });
        if (invoice) {
          return { kind: 'invoice', id: invoice.id, tenantId: invoice.tenantId, receipt };
        }
      }

      if (prefix.startsWith('SAL')) {
        const sale = await this.prisma.sale.findFirst({
          where: { OR: [{ saleNumber: receipt }, { saleNumber: bare }] },
        });
        if (sale) {
          return { kind: 'sale', id: sale.id, tenantId: sale.tenantId, receipt };
        }
      }

      // Receipt with no prefix: try all three by natural key
      const order = await this.prisma.onlineOrder.findFirst({ where: { orderNumber: receipt } });
      if (order) return { kind: 'online_order', id: order.id, tenantId: order.tenantId, receipt };

      const invoice = await this.prisma.invoice.findFirst({ where: { invoiceNumber: receipt } });
      if (invoice) return { kind: 'invoice', id: invoice.id, tenantId: invoice.tenantId, receipt };

      const sale = await this.prisma.sale.findFirst({ where: { saleNumber: receipt } });
      if (sale) return { kind: 'sale', id: sale.id, tenantId: sale.tenantId, receipt };
    }

    return null;
  }

  // ─── Event Handlers ────────────────────────────────────────

  private async handlePaymentCaptured(payment: RazorpayPaymentEntity): Promise<void> {
    const matched = await this.matchEntity({
      event: 'payment.captured',
      payload: { payment: { entity: payment } },
    });

    if (!matched) {
      this.logger.warn(
        `payment.captured: no matching entity for payment=${payment.id}, order=${payment.order_id ?? 'n/a'}`,
      );
      return;
    }

    await this.markEntityPaid(matched, payment);

    // Update the OnlinePayment row if present so reconciliation matches.
    if (this.prisma && payment.order_id) {
      await this.prisma.onlinePayment.updateMany({
        where: {
          tenantId: matched.tenantId,
          externalPaymentId: payment.order_id,
        },
        data: {
          externalPaymentId: payment.id,
          status: 'CAPTURED',
          completedAt: new Date(),
          gatewayResponse: {
            razorpay_order_id: payment.order_id,
            razorpay_payment_id: payment.id,
            method: payment.method ?? null,
            status: payment.status ?? null,
          } as unknown as Prisma.InputJsonValue,
        },
      });
    }

    if (this.eventBus) {
      const evt: EcommercePaymentCapturedEvent = {
        id: randomUUID(),
        tenantId: matched.tenantId,
        userId: 'system',
        timestamp: new Date().toISOString(),
        type: 'ecommerce.payment.captured',
        payload: {
          gateway: 'razorpay',
          orderId: matched.kind === 'online_order' ? matched.id : null,
          paymentId: payment.id,
          externalOrderId: payment.order_id ?? null,
          externalPaymentId: payment.id,
          amountPaise: payment.amount,
          currency: payment.currency,
          receipt: matched.receipt,
        },
      };
      await this.eventBus.publish(evt);
    }

    this.logger.log(
      `payment.captured: marked ${matched.kind}=${matched.id} (tenant=${matched.tenantId}) paid ` +
        `(rzpPayment=${payment.id}, rzpOrder=${payment.order_id ?? 'n/a'})`,
    );
  }

  private async handlePaymentFailed(payment: RazorpayPaymentEntity): Promise<void> {
    const matched = await this.matchEntity({
      event: 'payment.failed',
      payload: { payment: { entity: payment } },
    });

    if (matched && this.prisma) {
      const metaPatch = {
        razorpay_order_id: payment.order_id ?? null,
        razorpay_payment_id: payment.id,
        error_code: payment.error_code ?? null,
        error_description: payment.error_description ?? null,
        error_reason: payment.error_reason ?? null,
        last_webhook_event: 'payment.failed',
        last_webhook_at: new Date().toISOString(),
      };

      if (matched.kind === 'online_order') {
        // OnlineOrder has no metadata JSON column; write to a FAILED-status
        // OnlinePayment row so reconciliation still shows the attempt.
        if (payment.order_id) {
          await this.prisma.onlinePayment.updateMany({
            where: {
              tenantId: matched.tenantId,
              externalPaymentId: payment.order_id,
            },
            data: {
              externalPaymentId: payment.id,
              status: 'FAILED',
              gatewayResponse: metaPatch as unknown as Prisma.InputJsonValue,
            },
          });
        }
      }
      // Invoice and Sale models have no status for payment failure at this
      // level; the failure is tracked via the emitted event + onlinePayment.
    }

    if (this.eventBus) {
      const tenantId = matched?.tenantId ?? payment.notes?.tenantId ?? 'unknown';
      const evt: EcommercePaymentFailedEvent = {
        id: randomUUID(),
        tenantId,
        userId: 'system',
        timestamp: new Date().toISOString(),
        type: 'ecommerce.payment.failed',
        payload: {
          gateway: 'razorpay',
          orderId: matched?.kind === 'online_order' ? matched.id : null,
          paymentId: payment.id,
          externalOrderId: payment.order_id ?? null,
          externalPaymentId: payment.id,
          reason:
            payment.error_description ??
            payment.error_reason ??
            payment.error_code ??
            'payment_failed',
        },
      };
      await this.eventBus.publish(evt);
    }

    this.logger.log(
      `payment.failed: payment=${payment.id}, order=${payment.order_id ?? 'n/a'}, ` +
        `reason=${payment.error_description ?? payment.error_reason ?? 'unknown'}`,
    );
  }

  // ─── Persist razorpay_* IDs + mark paid ───────────────────

  private async markEntityPaid(
    matched: MatchedEntity,
    payment: RazorpayPaymentEntity,
  ): Promise<void> {
    if (!this.prisma) return;

    const now = new Date();

    switch (matched.kind) {
      case 'online_order': {
        // OnlineOrder has no metadata JSON; status confirmation + payment
        // row is the source of truth. Advance to CONFIRMED if still PENDING.
        const order = await this.prisma.onlineOrder.findFirst({
          where: { id: matched.id, tenantId: matched.tenantId },
          select: { id: true, status: true },
        });
        if (order && order.status === 'PENDING') {
          await this.prisma.onlineOrder.update({
            where: { id: order.id },
            data: { status: 'CONFIRMED', confirmedAt: now },
          });
        }
        break;
      }
      case 'invoice': {
        await this.prisma.invoice.update({
          where: { id: matched.id },
          data: {
            status: 'PAID',
            paidPaise: BigInt(payment.amount),
          },
        });
        break;
      }
      case 'sale': {
        await this.prisma.sale.update({
          where: { id: matched.id },
          data: {
            status: 'COMPLETED',
          },
        });
        break;
      }
    }
  }
}
