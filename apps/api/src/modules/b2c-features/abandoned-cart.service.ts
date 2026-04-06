// ─── Abandoned Cart Service ─────────────────────────────────────
// Detection, multi-step reminder sending, recovery tracking, stats, cleanup.

import { Injectable, Logger } from '@nestjs/common';
import { TenantAwareService } from '../../common/base.service';
import { PrismaService } from '../../common/prisma.service';
import { EventBusService } from '../../event-bus/event-bus.service';
import { CrmNotificationService } from '../crm/crm.notification.service';
import { CouponService } from './coupon.service';
import { v4 as uuidv4 } from 'uuid';

/** Timing thresholds in milliseconds */
const ONE_HOUR_MS = 60 * 60 * 1000;
const TWENTY_FOUR_HOURS_MS = 24 * ONE_HOUR_MS;
const SEVENTY_TWO_HOURS_MS = 72 * ONE_HOUR_MS;
const THIRTY_DAYS_MS = 30 * 24 * ONE_HOUR_MS;

@Injectable()
export class AbandonedCartService extends TenantAwareService {
  private readonly logger = new Logger(AbandonedCartService.name);

  constructor(
    prisma: PrismaService,
    private readonly eventBus: EventBusService,
    private readonly notificationService: CrmNotificationService,
    private readonly couponService: CouponService,
  ) {
    super(prisma);
  }

  /**
   * BullMQ cron (every 30 min): Find carts with items, no activity for 1 hour,
   * customer has email/phone, create AbandonedCart record.
   *
   * In practice, this queries an external cart/session store. Here we accept
   * a list of stale cart sessions from the storefront layer.
   */
  async detectAbandonedCarts(
    tenantId: string,
    staleCarts: Array<{
      cartSessionId: string;
      customerId?: string;
      customerEmail?: string;
      customerPhone?: string;
      items: Array<{
        productId: string;
        productName: string;
        sku: string;
        pricePaise: number;
        quantity: number;
        imageUrl?: string | null;
      }>;
      totalPaise: number;
      lastActivityAt: Date;
    }>,
  ): Promise<number> {
    const now = new Date();
    let detectedCount = 0;

    for (const cart of staleCarts) {
      // Only process if abandoned for at least 1 hour
      const timeSinceActivity = now.getTime() - cart.lastActivityAt.getTime();
      if (timeSinceActivity < ONE_HOUR_MS) continue;

      // Need at least email or phone for reminders
      if (!cart.customerEmail && !cart.customerPhone) continue;

      // Check if we already have a record for this cart session
      const existing = await this.prisma.abandonedCart.findFirst({
        where: {
          tenantId,
          cartSessionId: cart.cartSessionId,
          status: { notIn: ['RECOVERED', 'EXPIRED'] },
        },
      });

      if (existing) continue;

      // Create abandoned cart record
      await this.prisma.abandonedCart.create({
        data: {
          tenantId,
          cartSessionId: cart.cartSessionId,
          customerId: cart.customerId,
          customerEmail: cart.customerEmail,
          customerPhone: cart.customerPhone,
          items: cart.items,
          totalPaise: BigInt(cart.totalPaise),
          itemCount: cart.items.reduce((sum, item) => sum + item.quantity, 0),
          abandonedAt: cart.lastActivityAt,
          status: 'DETECTED',
        },
      });

      // Publish event
      await this.eventBus.publish({
        id: uuidv4(),
        tenantId,
        userId: 'SYSTEM',
        timestamp: new Date().toISOString(),
        type: 'b2c.abandoned_cart.detected',
        payload: {
          cartId: cart.cartSessionId,
          customerId: cart.customerId ?? null,
          totalPaise: cart.totalPaise,
          itemCount: cart.items.length,
        },
      });

      detectedCount++;
    }

    this.logger.log(`Abandoned cart detection: ${detectedCount} new carts detected`);
    return detectedCount;
  }

  /**
   * BullMQ cron: Send first reminder (email) for DETECTED carts older than 1 hour.
   * Subject: "You left items in your cart"
   */
  async sendReminder1(tenantId: string): Promise<number> {
    const cutoff = new Date(Date.now() - ONE_HOUR_MS);

    const carts = await this.prisma.abandonedCart.findMany({
      where: {
        tenantId,
        status: 'DETECTED',
        abandonedAt: { lte: cutoff },
      },
      include: {
        customer: {
          select: { id: true, firstName: true, email: true },
        },
      },
    });

    let sentCount = 0;

    for (const cart of carts) {
      try {
        if (cart.customerId && (cart.customerEmail || cart.customer?.email)) {
          await this.notificationService.sendNotification(tenantId, 'SYSTEM', {
            customerId: cart.customerId,
            channel: 'EMAIL',
            subject: 'You left items in your cart',
            body: this.buildReminder1Body(cart),
          });
        }

        await this.prisma.abandonedCart.update({
          where: { id: cart.id },
          data: {
            status: 'REMINDER_1_SENT',
            firstReminderSentAt: new Date(),
          },
        });

        sentCount++;
      } catch (err) {
        this.logger.error(`Failed to send reminder 1 for cart ${cart.id}: ${err}`);
      }
    }

    this.logger.log(`Reminder 1: sent ${sentCount} emails`);
    return sentCount;
  }

  /**
   * BullMQ cron: Send second reminder (WhatsApp) for REMINDER_1_SENT carts older than 24 hours.
   * Includes cart items summary + a recovery coupon code.
   */
  async sendReminder2(tenantId: string): Promise<number> {
    const cutoff = new Date(Date.now() - TWENTY_FOUR_HOURS_MS);

    const carts = await this.prisma.abandonedCart.findMany({
      where: {
        tenantId,
        status: 'REMINDER_1_SENT',
        firstReminderSentAt: { lte: cutoff },
      },
      include: {
        customer: {
          select: { id: true, firstName: true, phone: true },
        },
      },
    });

    let sentCount = 0;

    for (const cart of carts) {
      try {
        // Generate a small recovery coupon (5% off)
        let couponCode: string | null = null;
        try {
          const result = await this.couponService.generateBulkCoupons(tenantId, 'SYSTEM', {
            prefix: 'RECOVER',
            count: 1,
            discountType: 'PERCENTAGE',
            discountValue: 500, // 5%
            validFrom: new Date(),
            validTo: new Date(Date.now() + 7 * 24 * ONE_HOUR_MS), // 7 days
            isFirstOrderOnly: false,
            usageLimitPerCustomer: 1,
          });
          couponCode = result.codes[0] ?? null;
        } catch {
          this.logger.warn(`Failed to generate recovery coupon for cart ${cart.id}`);
        }

        if (cart.customerId && (cart.customerPhone || cart.customer?.phone)) {
          await this.notificationService.sendNotification(tenantId, 'SYSTEM', {
            customerId: cart.customerId,
            channel: 'WHATSAPP',
            subject: 'Your cart is waiting for you!',
            body: this.buildReminder2Body(cart, couponCode),
          });
        }

        await this.prisma.abandonedCart.update({
          where: { id: cart.id },
          data: {
            status: 'REMINDER_2_SENT',
            secondReminderSentAt: new Date(),
          },
        });

        sentCount++;
      } catch (err) {
        this.logger.error(`Failed to send reminder 2 for cart ${cart.id}: ${err}`);
      }
    }

    this.logger.log(`Reminder 2: sent ${sentCount} WhatsApp messages`);
    return sentCount;
  }

  /**
   * BullMQ cron: Send third/final reminder (email) for REMINDER_2_SENT carts older than 72 hours.
   * Includes a bigger discount.
   */
  async sendReminder3(tenantId: string): Promise<number> {
    const cutoff = new Date(Date.now() - SEVENTY_TWO_HOURS_MS);

    const carts = await this.prisma.abandonedCart.findMany({
      where: {
        tenantId,
        status: 'REMINDER_2_SENT',
        secondReminderSentAt: { lte: cutoff },
      },
      include: {
        customer: {
          select: { id: true, firstName: true, email: true },
        },
      },
    });

    let sentCount = 0;

    for (const cart of carts) {
      try {
        // Generate a bigger recovery coupon (10% off)
        let couponCode: string | null = null;
        try {
          const result = await this.couponService.generateBulkCoupons(tenantId, 'SYSTEM', {
            prefix: 'LASTCHANCE',
            count: 1,
            discountType: 'PERCENTAGE',
            discountValue: 1000, // 10%
            validFrom: new Date(),
            validTo: new Date(Date.now() + 3 * 24 * ONE_HOUR_MS), // 3 days
            isFirstOrderOnly: false,
            usageLimitPerCustomer: 1,
          });
          couponCode = result.codes[0] ?? null;
        } catch {
          this.logger.warn(`Failed to generate final recovery coupon for cart ${cart.id}`);
        }

        if (cart.customerId && (cart.customerEmail || cart.customer?.email)) {
          await this.notificationService.sendNotification(tenantId, 'SYSTEM', {
            customerId: cart.customerId,
            channel: 'EMAIL',
            subject: 'Last chance! Your cart items are going fast',
            body: this.buildReminder3Body(cart, couponCode),
          });
        }

        await this.prisma.abandonedCart.update({
          where: { id: cart.id },
          data: {
            status: 'REMINDER_3_SENT',
            thirdReminderSentAt: new Date(),
          },
        });

        sentCount++;
      } catch (err) {
        this.logger.error(`Failed to send reminder 3 for cart ${cart.id}: ${err}`);
      }
    }

    this.logger.log(`Reminder 3: sent ${sentCount} final emails`);
    return sentCount;
  }

  /**
   * Mark an abandoned cart as recovered when the customer completes a purchase.
   */
  async markRecovered(tenantId: string, cartSessionId: string, orderId: string) {
    const cart = await this.prisma.abandonedCart.findFirst({
      where: {
        tenantId,
        cartSessionId,
        status: { notIn: ['RECOVERED', 'EXPIRED'] },
      },
    });

    if (!cart) return null;

    const updated = await this.prisma.abandonedCart.update({
      where: { id: cart.id },
      data: {
        status: 'RECOVERED',
        recoveredAt: new Date(),
        recoveredOrderId: orderId,
      },
    });

    // Publish event
    await this.eventBus.publish({
      id: uuidv4(),
      tenantId,
      userId: cart.customerId ?? 'SYSTEM',
      timestamp: new Date().toISOString(),
      type: 'b2c.abandoned_cart.recovered',
      payload: {
        cartId: cart.id,
        orderId,
        totalPaise: Number(cart.totalPaise),
      },
    });

    return updated;
  }

  /**
   * Get abandoned cart statistics for a date range.
   */
  async getAbandonedCartStats(
    tenantId: string,
    dateRange: { from: Date; to: Date },
  ) {
    const where = {
      tenantId,
      abandonedAt: {
        gte: dateRange.from,
        lte: dateRange.to,
      },
    };

    const [allCarts, recoveredCarts] = await Promise.all([
      this.prisma.abandonedCart.findMany({ where }),
      this.prisma.abandonedCart.findMany({
        where: { ...where, status: 'RECOVERED' },
      }),
    ]);

    const totalAbandoned = allCarts.length;
    const totalRecovered = recoveredCarts.length;
    const recoveryRate = totalAbandoned > 0 ? (totalRecovered / totalAbandoned) * 100 : 0;

    const totalRevenueLostPaise = allCarts.reduce(
      (sum, cart) => sum + cart.totalPaise,
      BigInt(0),
    );

    const totalRevenueRecoveredPaise = recoveredCarts.reduce(
      (sum, cart) => sum + cart.totalPaise,
      BigInt(0),
    );

    const averageCartValuePaise = totalAbandoned > 0
      ? totalRevenueLostPaise / BigInt(totalAbandoned)
      : BigInt(0);

    // Count by status
    const byStatus: Record<string, number> = {};
    for (const cart of allCarts) {
      byStatus[cart.status] = (byStatus[cart.status] ?? 0) + 1;
    }

    return {
      totalAbandoned,
      totalRecovered,
      recoveryRate: Math.round(recoveryRate * 100) / 100,
      totalRevenueLostPaise,
      totalRevenueRecoveredPaise,
      averageCartValuePaise,
      byStatus,
    };
  }

  /**
   * BullMQ cron: Mark carts older than 30 days as EXPIRED.
   */
  async cleanupExpired(tenantId: string): Promise<number> {
    const cutoff = new Date(Date.now() - THIRTY_DAYS_MS);

    const result = await this.prisma.abandonedCart.updateMany({
      where: {
        tenantId,
        abandonedAt: { lte: cutoff },
        status: { notIn: ['RECOVERED', 'EXPIRED'] },
      },
      data: { status: 'EXPIRED' },
    });

    this.logger.log(`Cleanup: marked ${result.count} carts as expired`);
    return result.count;
  }

  // ─── Email Body Builders ──────────────────────────────────────

  private buildReminder1Body(cart: {
    items: unknown;
    customer?: { firstName: string } | null;
  }): string {
    const items = cart.items as Array<{ productName: string; quantity: number }>;
    const name = cart.customer?.firstName ?? 'there';
    const itemList = items
      .map((item) => `  - ${item.productName} (x${item.quantity})`)
      .join('\n');

    return (
      `Hi ${name},\n\n` +
      `It looks like you left some beautiful items in your cart:\n\n` +
      `${itemList}\n\n` +
      `Complete your purchase before they're gone!\n\n` +
      `Best regards,\nYour Jewelry Store`
    );
  }

  private buildReminder2Body(
    cart: { items: unknown; customer?: { firstName: string } | null },
    couponCode: string | null,
  ): string {
    const items = cart.items as Array<{ productName: string; quantity: number }>;
    const name = cart.customer?.firstName ?? 'there';
    const itemList = items
      .map((item) => `- ${item.productName} (x${item.quantity})`)
      .join('\n');

    let body =
      `Hi ${name}! Your cart is still waiting for you.\n\n` +
      `Items:\n${itemList}\n\n`;

    if (couponCode) {
      body += `Use code *${couponCode}* for 5% off your order!\n\n`;
    }

    body += `Shop now before these items sell out.`;
    return body;
  }

  private buildReminder3Body(
    cart: { items: unknown; customer?: { firstName: string } | null },
    couponCode: string | null,
  ): string {
    const items = cart.items as Array<{ productName: string; quantity: number }>;
    const name = cart.customer?.firstName ?? 'there';
    const itemList = items
      .map((item) => `  - ${item.productName} (x${item.quantity})`)
      .join('\n');

    let body =
      `Hi ${name},\n\n` +
      `This is your last chance! The items in your cart are in high demand:\n\n` +
      `${itemList}\n\n`;

    if (couponCode) {
      body += `As a special offer, use code ${couponCode} for 10% off -- valid for 3 days only!\n\n`;
    }

    body +=
      `Don't miss out on these beautiful pieces.\n\n` +
      `Best regards,\nYour Jewelry Store`;
    return body;
  }
}
