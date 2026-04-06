// ─── Pre-Order Event Handler ──────────────────────────────────
// Subscribes to inventory.stock.adjusted to auto-notify pre-order
// customers when stock arrives for a product they pre-ordered.

import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { EventBusService } from '../../event-bus/event-bus.service';
import { PrismaService } from '../../common/prisma.service';
import { PreOrderService } from './preorder.service';

@Injectable()
export class PreOrderEventHandler implements OnModuleInit {
  private readonly logger = new Logger(PreOrderEventHandler.name);

  constructor(
    private readonly eventBus: EventBusService,
    private readonly prisma: PrismaService,
    private readonly preOrderService: PreOrderService,
  ) {}

  onModuleInit() {
    // When stock is adjusted (e.g., new stock arrives), check if there
    // are pending pre-orders for that product and notify customers.
    this.eventBus.subscribe('inventory.stock.adjusted', async (event) => {
      if (event.type !== 'inventory.stock.adjusted') return;

      const { productId, quantityChange } = event.payload;

      // Only react to stock increases
      if (quantityChange <= 0) return;

      this.logger.log(
        `[PreOrder] Stock increased for product ${productId} by ${quantityChange}, checking pre-orders`,
      );

      // Check if there are any confirmed/in-production pre-orders for this product
      const pendingPreOrders = await this.prisma.preOrder.count({
        where: {
          tenantId: event.tenantId,
          productId,
          status: { in: ['CONFIRMED', 'IN_PRODUCTION'] },
        },
      });

      if (pendingPreOrders > 0) {
        this.logger.log(
          `[PreOrder] Found ${pendingPreOrders} pending pre-orders for product ${productId}, notifying customers`,
        );

        try {
          const notified = await this.preOrderService.notifyPreOrderCustomers(
            event.tenantId,
            event.userId,
            productId,
          );
          this.logger.log(
            `[PreOrder] Successfully notified ${notified} pre-order customers for product ${productId}`,
          );
        } catch (error) {
          this.logger.error(
            `[PreOrder] Failed to notify pre-order customers for product ${productId}`,
            error instanceof Error ? error.stack : String(error),
          );
        }
      }

      // Also run backorder auto-detection
      try {
        await this.preOrderService.autoDetectBackorder(event.tenantId, productId);
      } catch (error) {
        this.logger.error(
          `[PreOrder] Failed to run backorder auto-detection for product ${productId}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    });
  }
}
