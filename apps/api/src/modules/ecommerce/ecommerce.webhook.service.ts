// ─── E-Commerce Webhook Service ───────────────────────────────
// Receive, log, route to appropriate handler (order created,
// payment captured, etc.), retry failed webhooks.

import { Injectable, Logger } from '@nestjs/common';
import type { WebhookPayload } from '@caratflow/shared-types';
import { Prisma } from '@caratflow/db';
import { PrismaService } from '../../common/prisma.service';
import { TenantAwareService } from '../../common/base.service';
import { EcommerceShopifyService } from './ecommerce.shopify.service';
import { EcommercePaymentService } from './ecommerce.payment.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class EcommerceWebhookService extends TenantAwareService {
  private readonly logger = new Logger(EcommerceWebhookService.name);

  constructor(
    prisma: PrismaService,
    private readonly shopifyService: EcommerceShopifyService,
    private readonly paymentService: EcommercePaymentService,
  ) {
    super(prisma);
  }

  /**
   * Receive and log a webhook, then route to the appropriate handler.
   */
  async handleWebhook(
    tenantId: string,
    source: string,
    eventType: string,
    payload: Record<string, unknown>,
    channelId?: string,
    gatewayId?: string,
  ): Promise<{ webhookLogId: string; status: string }> {
    // Log the webhook
    const logId = uuidv4();
    await this.prisma.webhookLog.create({
      data: {
        id: logId,
        tenantId,
        channelId: channelId ?? null,
        gatewayId: gatewayId ?? null,
        source,
        eventType,
        payload: payload as Prisma.InputJsonValue,
        status: 'RECEIVED',
      },
    });

    try {
      await this.routeWebhook(tenantId, source, eventType, payload, channelId, gatewayId);

      // Mark as processed
      await this.prisma.webhookLog.update({
        where: { id: logId },
        data: { status: 'PROCESSED', processedAt: new Date() },
      });

      return { webhookLogId: logId, status: 'PROCESSED' };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(`Webhook processing failed: ${source}/${eventType} - ${errorMessage}`);

      await this.prisma.webhookLog.update({
        where: { id: logId },
        data: { status: 'FAILED', error: errorMessage },
      });

      return { webhookLogId: logId, status: 'FAILED' };
    }
  }

  /**
   * Route webhook to the appropriate handler based on source and event type.
   */
  private async routeWebhook(
    tenantId: string,
    source: string,
    eventType: string,
    payload: Record<string, unknown>,
    channelId?: string,
    gatewayId?: string,
  ): Promise<void> {
    switch (source.toLowerCase()) {
      case 'shopify':
        if (channelId) {
          if (eventType.startsWith('orders/')) {
            await this.shopifyService.processOrderWebhook(
              tenantId,
              channelId,
              payload as unknown as import('@caratflow/shared-types').ShopifyWebhookPayload,
            );
          }
          // Other Shopify events: products/*, fulfillments/*, etc.
        }
        break;

      case 'razorpay':
        await this.paymentService.processRazorpayWebhook(
          tenantId,
          payload as unknown as import('@caratflow/shared-types').RazorpayWebhookPayload,
        );
        break;

      case 'stripe':
        await this.paymentService.processStripeWebhook(
          tenantId,
          payload as unknown as import('@caratflow/shared-types').StripeWebhookPayload,
        );
        break;

      default:
        this.logger.warn(`Unknown webhook source: ${source}, eventType: ${eventType}`);
    }
  }

  /**
   * Retry a failed webhook.
   */
  async retryWebhook(tenantId: string, webhookLogId: string): Promise<{ status: string }> {
    const log = await this.prisma.webhookLog.findFirst({
      where: { id: webhookLogId, tenantId, status: 'FAILED' },
    });

    if (!log) {
      throw new Error('Webhook log not found or not in FAILED status');
    }

    const payload = log.payload as Record<string, unknown>;

    return this.handleWebhook(
      tenantId,
      log.source,
      log.eventType,
      payload,
      log.channelId ?? undefined,
      log.gatewayId ?? undefined,
    );
  }

  /**
   * List webhook logs with filters.
   */
  async listWebhookLogs(
    tenantId: string,
    filters: { source?: string; status?: string; channelId?: string; gatewayId?: string },
    pagination: { page: number; limit: number; sortOrder?: 'asc' | 'desc' },
  ) {
    const where: Record<string, unknown> = { tenantId };

    if (filters.source) where.source = filters.source;
    if (filters.status) where.status = filters.status;
    if (filters.channelId) where.channelId = filters.channelId;
    if (filters.gatewayId) where.gatewayId = filters.gatewayId;

    const [items, total] = await Promise.all([
      this.prisma.webhookLog.findMany({
        where,
        orderBy: { createdAt: pagination.sortOrder ?? 'desc' },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      }),
      this.prisma.webhookLog.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pagination.limit);

    return {
      items: items.map((log) => ({
        id: log.id,
        tenantId: log.tenantId,
        channelId: log.channelId,
        gatewayId: log.gatewayId,
        source: log.source,
        eventType: log.eventType,
        payload: log.payload,
        status: log.status,
        processedAt: log.processedAt,
        error: log.error,
        createdAt: log.createdAt,
        updatedAt: log.updatedAt,
      })),
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages,
      hasNext: pagination.page < totalPages,
      hasPrevious: pagination.page > 1,
    };
  }
}
