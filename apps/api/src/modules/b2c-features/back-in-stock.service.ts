// ─── Back In Stock Alert Service ────────────────────────────────
// Subscribe to restock notifications, notify when product is available, unsubscribe.

import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { TenantAwareService } from '../../common/base.service';
import { PrismaService } from '../../common/prisma.service';
import { EventBusService } from '../../event-bus/event-bus.service';
import { CrmNotificationService } from '../crm/crm.notification.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class BackInStockService extends TenantAwareService {
  private readonly logger = new Logger(BackInStockService.name);

  constructor(
    prisma: PrismaService,
    private readonly eventBus: EventBusService,
    private readonly notificationService: CrmNotificationService,
  ) {
    super(prisma);
  }

  async subscribe(
    tenantId: string,
    productId: string,
    email: string,
    customerId?: string,
  ) {
    // Verify product exists
    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId },
      select: { id: true, name: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Check if already subscribed (active)
    const existing = await this.prisma.backInStockAlert.findFirst({
      where: {
        tenantId,
        productId,
        email,
        status: 'ACTIVE',
      },
    });

    if (existing) {
      return existing; // Idempotent
    }

    return this.prisma.backInStockAlert.create({
      data: {
        tenantId,
        customerId,
        email,
        productId,
        status: 'ACTIVE',
      },
    });
  }

  /**
   * Called when stock becomes available for a product.
   * Sends email/push to all active subscribers.
   */
  async notifySubscribers(tenantId: string, productId: string): Promise<number> {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId },
      select: { id: true, name: true, sku: true, sellingPricePaise: true },
    });

    if (!product) {
      this.logger.warn(`Product ${productId} not found for back-in-stock notification`);
      return 0;
    }

    const activeAlerts = await this.prisma.backInStockAlert.findMany({
      where: {
        tenantId,
        productId,
        status: 'ACTIVE',
      },
      include: {
        customer: {
          select: { id: true, firstName: true },
        },
      },
    });

    if (activeAlerts.length === 0) return 0;

    let notifiedCount = 0;

    for (const alert of activeAlerts) {
      try {
        // Send notification
        if (alert.customerId) {
          await this.notificationService.sendNotification(tenantId, 'SYSTEM', {
            customerId: alert.customerId,
            channel: 'EMAIL',
            subject: `${product.name} is back in stock!`,
            body: `Great news${alert.customer?.firstName ? `, ${alert.customer.firstName}` : ''}! "${product.name}" (SKU: ${product.sku}) is back in stock. Shop now before it sells out again!`,
          });
        }

        // Mark as notified
        await this.prisma.backInStockAlert.update({
          where: { id: alert.id },
          data: {
            status: 'NOTIFIED',
            notifiedAt: new Date(),
          },
        });

        notifiedCount++;
      } catch (err) {
        this.logger.error(`Failed to notify subscriber ${alert.id}: ${err}`);
      }
    }

    // Publish summary event
    if (notifiedCount > 0) {
      await this.eventBus.publish({
        id: uuidv4(),
        tenantId,
        userId: 'SYSTEM',
        timestamp: new Date().toISOString(),
        type: 'b2c.back_in_stock.notified',
        payload: {
          productId,
          subscriberCount: notifiedCount,
        },
      });
    }

    this.logger.log(
      `Back-in-stock: notified ${notifiedCount}/${activeAlerts.length} subscribers for product ${productId}`,
    );
    return notifiedCount;
  }

  async unsubscribe(tenantId: string, alertId: string) {
    const alert = await this.prisma.backInStockAlert.findFirst({
      where: { id: alertId, tenantId, status: 'ACTIVE' },
    });

    if (!alert) {
      throw new NotFoundException('Alert subscription not found or already processed');
    }

    return this.prisma.backInStockAlert.update({
      where: { id: alertId },
      data: { status: 'CANCELLED' },
    });
  }

  async getSubscriptions(tenantId: string, customerId: string) {
    return this.prisma.backInStockAlert.findMany({
      where: { tenantId, customerId, status: 'ACTIVE' },
      include: {
        product: {
          select: { id: true, name: true, sku: true, images: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
