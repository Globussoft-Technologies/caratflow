// ─── Storefront Abandoned Cart Service ─────────────────────────
// Detect abandoned carts, send recovery emails/WhatsApp, track recovery.
// Uses the AbandonedCart model from b2c-features.prisma.

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { TenantAwareService } from '../../common/base.service';
import { EventBusService } from '../../event-bus/event-bus.service';
import { StorefrontPricingService } from './storefront.pricing.service';
import { v4 as uuidv4 } from 'uuid';

/** Carts idle for more than this are considered abandoned */
const ABANDONED_THRESHOLD_HOURS = 1;

@Injectable()
export class StorefrontAbandonedCartService extends TenantAwareService {
  private readonly logger = new Logger(StorefrontAbandonedCartService.name);

  constructor(
    prisma: PrismaService,
    private readonly eventBus: EventBusService,
    private readonly pricingService: StorefrontPricingService,
  ) {
    super(prisma);
  }

  /**
   * Detect abandoned carts for a tenant. Designed to run as a BullMQ cron job.
   * Looks for carts with items that haven't had checkout activity in the threshold period.
   */
  async detectAbandoned(tenantId: string): Promise<number> {
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - ABANDONED_THRESHOLD_HOURS);

    // Find carts with items that were updated before the cutoff
    const candidates = await this.prisma.cart.findMany({
      where: {
        tenantId,
        updatedAt: { lt: cutoff },
        expiresAt: { gt: new Date() },
        items: { some: {} },
      },
      include: { items: true },
    });

    let detectedCount = 0;

    for (const cart of candidates) {
      if (cart.items.length === 0) continue;

      // Check if already tracked
      const existing = await this.prisma.abandonedCart.findFirst({
        where: { tenantId, cartSessionId: cart.sessionId },
      });
      if (existing) continue;

      // Calculate approximate total
      const productIds = cart.items.map((i) => i.productId);
      const products = await this.prisma.product.findMany({
        where: { id: { in: productIds }, tenantId },
      });
      const productMap = new Map(products.map((p) => [p.id, p]));

      let totalPaise = 0;
      for (const item of cart.items) {
        const product = productMap.get(item.productId);
        if (!product) continue;
        const pricing = await this.pricingService.calculateLiveProductPrice(tenantId, {
          productType: product.productType,
          metalPurity: product.metalPurity,
          metalWeightMg: product.metalWeightMg,
          makingCharges: product.makingCharges,
          wastagePercent: product.wastagePercent,
          sellingPricePaise: product.sellingPricePaise,
        });
        totalPaise += pricing.totalPricePaise * item.quantity;
      }

      // Get customer details if available
      let customerEmail: string | null = null;
      let customerPhone: string | null = null;
      if (cart.customerId) {
        const customer = await this.prisma.customer.findFirst({
          where: { id: cart.customerId, tenantId },
          select: { email: true, phone: true },
        });
        customerEmail = customer?.email ?? null;
        customerPhone = customer?.phone ?? null;
      }

      // Serialize cart items for the abandoned record
      const itemsJson = cart.items.map((item) => {
        const product = productMap.get(item.productId);
        return {
          productId: item.productId,
          productName: product?.name ?? 'Unknown',
          quantity: item.quantity,
        };
      });

      // Create abandoned cart record (using b2c-features schema)
      await this.prisma.abandonedCart.create({
        data: {
          id: uuidv4(),
          tenantId,
          cartSessionId: cart.sessionId,
          customerId: cart.customerId ?? null,
          customerEmail,
          customerPhone,
          items: itemsJson,
          totalPaise: BigInt(totalPaise),
          itemCount: cart.items.length,
          status: 'DETECTED',
        },
      });

      // Publish event
      await this.eventBus.publish({
        id: uuidv4(),
        tenantId,
        userId: cart.customerId ?? 'system',
        timestamp: new Date().toISOString(),
        type: 'storefront.cart.abandoned',
        payload: {
          cartId: cart.id,
          customerId: cart.customerId,
          email: customerEmail,
          totalPaise,
          itemCount: cart.items.length,
        },
      });

      detectedCount++;
    }

    if (detectedCount > 0) {
      this.logger.log(`Detected ${detectedCount} abandoned carts for tenant ${tenantId}`);
    }

    return detectedCount;
  }

  /**
   * Send a recovery email for an abandoned cart.
   */
  async sendRecoveryEmail(tenantId: string, cartSessionId: string): Promise<void> {
    const abandoned = await this.prisma.abandonedCart.findFirst({
      where: {
        tenantId,
        cartSessionId,
        status: { in: ['DETECTED', 'REMINDER_1_SENT'] },
      },
    });

    if (!abandoned) {
      this.logger.warn(`No abandoned cart found for sessionId=${cartSessionId}`);
      return;
    }

    if (!abandoned.customerEmail && !abandoned.customerId) {
      this.logger.warn(`No email available for abandoned cart session=${cartSessionId}`);
      return;
    }

    // In production, this would call an email service (SES, SendGrid, etc.)
    this.logger.log(
      `[Recovery Email] Sending to ${abandoned.customerEmail ?? 'customer ' + abandoned.customerId} for cart session=${cartSessionId}`,
    );

    // Update reminder status based on which reminder this is
    const updateData: Record<string, unknown> = {};
    if (!abandoned.firstReminderSentAt) {
      updateData.firstReminderSentAt = new Date();
      updateData.status = 'REMINDER_1_SENT';
    } else if (!abandoned.secondReminderSentAt) {
      updateData.secondReminderSentAt = new Date();
      updateData.status = 'REMINDER_2_SENT';
    } else {
      updateData.thirdReminderSentAt = new Date();
      updateData.status = 'REMINDER_3_SENT';
    }

    await this.prisma.abandonedCart.update({
      where: { id: abandoned.id },
      data: updateData,
    });
  }

  /**
   * Send a recovery WhatsApp message for an abandoned cart.
   */
  async sendRecoveryWhatsapp(tenantId: string, cartSessionId: string): Promise<void> {
    const abandoned = await this.prisma.abandonedCart.findFirst({
      where: {
        tenantId,
        cartSessionId,
        status: { in: ['DETECTED', 'REMINDER_1_SENT', 'REMINDER_2_SENT'] },
      },
    });

    if (!abandoned) {
      this.logger.warn(`No abandoned cart found for sessionId=${cartSessionId}`);
      return;
    }

    if (!abandoned.customerPhone) {
      this.logger.warn(`No phone available for abandoned cart session=${cartSessionId}`);
      return;
    }

    // In production, this would call a WhatsApp Business API
    this.logger.log(
      `[Recovery WhatsApp] Sending to ${abandoned.customerPhone} for cart session=${cartSessionId}`,
    );

    // Progress the reminder sequence
    const updateData: Record<string, unknown> = {};
    if (!abandoned.firstReminderSentAt) {
      updateData.firstReminderSentAt = new Date();
      updateData.status = 'REMINDER_1_SENT';
    } else if (!abandoned.secondReminderSentAt) {
      updateData.secondReminderSentAt = new Date();
      updateData.status = 'REMINDER_2_SENT';
    } else {
      updateData.thirdReminderSentAt = new Date();
      updateData.status = 'REMINDER_3_SENT';
    }

    await this.prisma.abandonedCart.update({
      where: { id: abandoned.id },
      data: updateData,
    });
  }

  /**
   * Mark an abandoned cart as recovered (customer completed checkout).
   */
  async markRecovered(tenantId: string, cartSessionId: string, orderId?: string): Promise<void> {
    const abandoned = await this.prisma.abandonedCart.findFirst({
      where: { tenantId, cartSessionId },
    });

    if (!abandoned) return;

    await this.prisma.abandonedCart.update({
      where: { id: abandoned.id },
      data: {
        status: 'RECOVERED',
        recoveredAt: new Date(),
        recoveredOrderId: orderId ?? null,
      },
    });
  }

  /**
   * Expire old abandoned carts that haven't been recovered.
   */
  async expireOldCarts(tenantId: string): Promise<number> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await this.prisma.abandonedCart.updateMany({
      where: {
        tenantId,
        status: { in: ['DETECTED', 'REMINDER_1_SENT', 'REMINDER_2_SENT', 'REMINDER_3_SENT'] },
        abandonedAt: { lt: thirtyDaysAgo },
      },
      data: { status: 'EXPIRED' },
    });

    return result.count;
  }
}
