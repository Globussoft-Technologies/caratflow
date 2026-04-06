// ─── Wishlist Service ───────────────────────────────────────────
// Add/remove products, price snapshots, price alert monitoring.

import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { TenantAwareService } from '../../common/base.service';
import { PrismaService } from '../../common/prisma.service';
import { EventBusService } from '../../event-bus/event-bus.service';
import { CrmNotificationService } from '../crm/crm.notification.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class WishlistService extends TenantAwareService {
  private readonly logger = new Logger(WishlistService.name);

  constructor(
    prisma: PrismaService,
    private readonly eventBus: EventBusService,
    private readonly notificationService: CrmNotificationService,
  ) {
    super(prisma);
  }

  async addToWishlist(tenantId: string, customerId: string, productId: string) {
    // Fetch the product to get the current price
    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId },
      select: { id: true, sellingPricePaise: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const priceAtAddPaise = product.sellingPricePaise ?? BigInt(0);

    return this.prisma.wishlist.upsert({
      where: {
        tenantId_customerId_productId: {
          tenantId,
          customerId,
          productId,
        },
      },
      update: {
        // Re-adding: update the snapshot price
        priceAtAddPaise,
        addedAt: new Date(),
      },
      create: {
        tenantId,
        customerId,
        productId,
        priceAtAddPaise,
      },
    });
  }

  async removeFromWishlist(tenantId: string, customerId: string, productId: string) {
    const existing = await this.prisma.wishlist.findUnique({
      where: {
        tenantId_customerId_productId: {
          tenantId,
          customerId,
          productId,
        },
      },
    });

    if (!existing) {
      throw new NotFoundException('Wishlist item not found');
    }

    return this.prisma.wishlist.delete({
      where: { id: existing.id },
    });
  }

  async getWishlist(tenantId: string, customerId: string) {
    const items = await this.prisma.wishlist.findMany({
      where: { tenantId, customerId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            productType: true,
            images: true,
            sellingPricePaise: true,
          },
        },
      },
      orderBy: { addedAt: 'desc' },
    });

    return items.map((item) => {
      const currentPrice = item.product.sellingPricePaise;
      const addedPrice = item.priceAtAddPaise;

      let priceChange: 'UP' | 'DOWN' | 'SAME' = 'SAME';
      if (currentPrice !== null && currentPrice > addedPrice) {
        priceChange = 'UP';
      } else if (currentPrice !== null && currentPrice < addedPrice) {
        priceChange = 'DOWN';
      }

      return {
        id: item.id,
        productId: item.productId,
        addedAt: item.addedAt,
        priceAtAddPaise: item.priceAtAddPaise,
        currentPricePaise: currentPrice,
        priceChange,
        priceAlertEnabled: item.priceAlertEnabled,
        priceAlertThresholdPaise: item.priceAlertThresholdPaise,
        priceAlertTriggered: item.priceAlertTriggered,
        product: item.product,
      };
    });
  }

  async getWishlistCount(tenantId: string, customerId: string): Promise<number> {
    return this.prisma.wishlist.count({
      where: { tenantId, customerId },
    });
  }

  async enablePriceAlert(
    tenantId: string,
    customerId: string,
    productId: string,
    thresholdPaise: number,
  ) {
    const item = await this.prisma.wishlist.findUnique({
      where: {
        tenantId_customerId_productId: {
          tenantId,
          customerId,
          productId,
        },
      },
    });

    if (!item) {
      throw new NotFoundException('Product not in wishlist. Add it first.');
    }

    return this.prisma.wishlist.update({
      where: { id: item.id },
      data: {
        priceAlertEnabled: true,
        priceAlertThresholdPaise: BigInt(thresholdPaise),
        priceAlertTriggered: false,
      },
    });
  }

  async disablePriceAlert(tenantId: string, customerId: string, productId: string) {
    const item = await this.prisma.wishlist.findUnique({
      where: {
        tenantId_customerId_productId: {
          tenantId,
          customerId,
          productId,
        },
      },
    });

    if (!item) {
      throw new NotFoundException('Product not in wishlist');
    }

    return this.prisma.wishlist.update({
      where: { id: item.id },
      data: {
        priceAlertEnabled: false,
        priceAlertTriggered: false,
      },
    });
  }

  /**
   * BullMQ cron job: Check all active price alerts.
   * For each alert-enabled wishlist item, compare the current product price
   * with the customer's threshold. If price dropped below threshold, notify
   * the customer and mark the alert as triggered.
   */
  async checkPriceAlerts(tenantId: string): Promise<number> {
    const alertItems = await this.prisma.wishlist.findMany({
      where: {
        tenantId,
        priceAlertEnabled: true,
        priceAlertTriggered: false,
      },
      include: {
        product: {
          select: { id: true, name: true, sellingPricePaise: true },
        },
        customer: {
          select: { id: true, firstName: true, email: true, phone: true },
        },
      },
    });

    let notifiedCount = 0;

    for (const item of alertItems) {
      const currentPrice = item.product.sellingPricePaise;
      const threshold = item.priceAlertThresholdPaise;

      if (currentPrice === null || threshold === null) continue;

      if (currentPrice <= threshold) {
        try {
          // Mark as triggered
          await this.prisma.wishlist.update({
            where: { id: item.id },
            data: { priceAlertTriggered: true },
          });

          // Send notification via CRM notification service
          if (item.customer.email || item.customer.phone) {
            const channel = item.customer.email ? 'EMAIL' : 'WHATSAPP';
            await this.notificationService.sendNotification(tenantId, 'SYSTEM', {
              customerId: item.customerId,
              channel: channel as 'EMAIL' | 'WHATSAPP' | 'SMS',
              subject: `Price drop alert: ${item.product.name}`,
              body: `Good news, ${item.customer.firstName}! The price of "${item.product.name}" has dropped to your target price. Don't miss out!`,
            });
          }

          // Publish event
          await this.eventBus.publish({
            id: uuidv4(),
            tenantId,
            userId: 'SYSTEM',
            timestamp: new Date().toISOString(),
            type: 'b2c.price_alert.triggered',
            payload: {
              customerId: item.customerId,
              productId: item.productId,
              thresholdPaise: Number(threshold),
              currentPricePaise: Number(currentPrice),
            },
          });

          notifiedCount++;
        } catch (err) {
          this.logger.error(
            `Failed to process price alert for wishlist ${item.id}: ${err}`,
          );
        }
      }
    }

    this.logger.log(`Price alert check completed: ${notifiedCount} alerts triggered`);
    return notifiedCount;
  }
}
