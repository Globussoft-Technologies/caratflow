// ─── Recommendations Event Handler ────────────────────────────
// Subscribes to cross-domain events to update recommendation data:
// - retail.sale.completed -> trackPurchase
// - storefront.order.completed -> trackPurchase
// - inventory.item.created -> (log for new arrivals awareness)

import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { EventBusService } from '../../event-bus/event-bus.service';
import { RecommendationsBehaviorService } from './recommendations.behavior.service';

@Injectable()
export class RecommendationsEventHandler implements OnModuleInit {
  private readonly logger = new Logger(RecommendationsEventHandler.name);

  constructor(
    private readonly eventBus: EventBusService,
    private readonly behaviorService: RecommendationsBehaviorService,
  ) {}

  onModuleInit(): void {
    // ─── Retail Sale Completed ─────────────────────────────────
    this.eventBus.subscribe('retail.sale.completed', async (event) => {
      if (event.type !== 'retail.sale.completed') return;

      const { customerId, totalPaise, items } = event.payload;
      if (!customerId) return;

      this.logger.log(
        `[Recommendations] Retail sale completed: customer=${customerId}, items=${items.length}`,
      );

      const productIds = items
        .map((item) => item.productId)
        .filter((id): id is string => !!id);

      if (productIds.length > 0) {
        await this.behaviorService.trackPurchase(
          event.tenantId,
          customerId,
          productIds,
          totalPaise,
        );
      }
    });

    // ─── Storefront Order Completed ────────────────────────────
    this.eventBus.subscribe('storefront.order.completed', async (event) => {
      if (event.type !== 'storefront.order.completed') return;

      const { customerId, totalPaise, orderId } = event.payload;
      if (!customerId) return;

      this.logger.log(
        `[Recommendations] Storefront order completed: customer=${customerId}, order=${orderId}`,
      );

      // We need to look up order items to get product IDs
      // The event payload doesn't carry full item details, so we query
      // This is acceptable for an async event handler
      try {
        // Import prisma indirectly through behavior service
        // For now, use the behavior service's full profile rebuild
        // which will pick up the new order data
        await this.behaviorService.buildBehaviorProfile(event.tenantId, customerId);
      } catch (err) {
        this.logger.error(
          `[Recommendations] Failed to update behavior for storefront order: ${(err as Error).message}`,
        );
      }
    });

    // ─── Inventory Item Created ────────────────────────────────
    this.eventBus.subscribe('inventory.item.created', async (event) => {
      if (event.type !== 'inventory.item.created') return;

      const { productId } = event.payload;
      this.logger.log(
        `[Recommendations] New inventory item created: product=${productId}. ` +
        `Product will appear in new arrivals feed automatically.`,
      );

      // New arrivals are served directly from Product.createdAt ordering,
      // so no additional action is needed here. This handler exists for
      // future enrichment (e.g., triggering similarity recomputation).
    });
  }
}
