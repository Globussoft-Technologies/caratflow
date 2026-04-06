// ─── Storefront Event Handler ──────────────────────────────────
// Subscribes to cross-domain events relevant to storefront:
// - inventory.stock.adjusted -> update stock availability
// - india.rates.updated -> invalidate rate cache, recalculate featured

import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { EventBusService } from '../../event-bus/event-bus.service';
import { PrismaService } from '../../common/prisma.service';
import { StorefrontPricingService } from './storefront.pricing.service';
import { StorefrontAbandonedCartService } from './storefront.abandoned-cart.service';

@Injectable()
export class StorefrontEventHandler implements OnModuleInit {
  private readonly logger = new Logger(StorefrontEventHandler.name);

  constructor(
    private readonly eventBus: EventBusService,
    private readonly prisma: PrismaService,
    private readonly pricingService: StorefrontPricingService,
    private readonly abandonedCartService: StorefrontAbandonedCartService,
  ) {}

  onModuleInit() {
    // ─── Stock Adjustment ───────────────────────────────────────
    this.eventBus.subscribe('inventory.stock.adjusted', async (event) => {
      if (event.type !== 'inventory.stock.adjusted') return;

      const { productId, quantityChange } = event.payload;
      this.logger.log(
        `[Storefront] Stock adjusted: product=${productId}, change=${quantityChange}`,
      );

      // If stock went to zero, we could trigger back-in-stock notifications
      // when it comes back. For now, just log.
      const stockAgg = await this.prisma.stockItem.aggregate({
        where: { tenantId: event.tenantId, productId },
        _sum: { quantityOnHand: true, quantityReserved: true },
      });

      const available = (stockAgg._sum.quantityOnHand ?? 0) - (stockAgg._sum.quantityReserved ?? 0);

      if (available <= 0) {
        this.logger.log(`[Storefront] Product ${productId} is now out of stock`);
      }
    });

    // ─── Metal Rate Updated ─────────────────────────────────────
    this.eventBus.subscribe('india.metal_rate.updated', async (event) => {
      if (event.type !== 'india.metal_rate.updated') return;

      this.logger.log(
        `[Storefront] Metal rate updated for tenant=${event.tenantId}`,
      );

      // Invalidate the pricing service cache so new requests get fresh rates
      this.pricingService.invalidateRateCache(event.tenantId);
    });

    // ─── Order Completed -> Mark Abandoned Cart as Recovered ────
    this.eventBus.subscribe('storefront.order.completed', async (event) => {
      if (event.type !== 'storefront.order.completed') return;

      const { customerId } = event.payload;
      this.logger.log(
        `[Storefront] Order completed for customer=${customerId}, checking abandoned carts`,
      );

      // Find any cart for this customer and mark abandoned record as recovered
      const cart = await this.prisma.cart.findFirst({
        where: { tenantId: event.tenantId, customerId },
      });
      if (cart) {
        await this.abandonedCartService.markRecovered(
          event.tenantId,
          cart.sessionId,
          event.payload.orderId,
        );
      }
    });
  }
}
