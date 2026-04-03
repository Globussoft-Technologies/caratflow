// ─── E-Commerce Event Handler ─────────────────────────────────
// Subscribes to cross-domain events relevant to e-commerce:
// - inventory.stock.adjusted -> sync stock to channels
// - retail.sale.completed -> update click-and-collect status

import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { EventBusService } from '../../event-bus/event-bus.service';
import { PrismaService } from '../../common/prisma.service';
import { EcommerceShopifyService } from './ecommerce.shopify.service';

@Injectable()
export class EcommerceEventHandler implements OnModuleInit {
  private readonly logger = new Logger(EcommerceEventHandler.name);

  constructor(
    private readonly eventBus: EventBusService,
    private readonly prisma: PrismaService,
    private readonly shopifyService: EcommerceShopifyService,
  ) {}

  onModuleInit() {
    // Subscribe to inventory stock adjustments to sync to online channels
    this.eventBus.subscribe('inventory.stock.adjusted', async (event) => {
      if (event.type === 'inventory.stock.adjusted') {
        const { productId, locationId, quantityChange, reason } = event.payload;
        this.logger.log(
          `[Ecommerce] Stock adjusted: product=${productId}, location=${locationId}, change=${quantityChange}, reason=${reason}`,
        );

        // Find all active channels for this tenant
        const channels = await this.prisma.salesChannel.findMany({
          where: { tenantId: event.tenantId, isActive: true },
        });

        // Calculate new total available quantity across all locations
        const stockAgg = await this.prisma.stockItem.aggregate({
          where: { tenantId: event.tenantId, productId },
          _sum: { quantityOnHand: true, quantityReserved: true },
        });

        const availableQty = (stockAgg._sum.quantityOnHand ?? 0) - (stockAgg._sum.quantityReserved ?? 0);

        // Sync to each channel that has this product listed
        for (const channel of channels) {
          if (channel.channelType === 'SHOPIFY') {
            await this.shopifyService.syncInventoryToShopify(
              event.tenantId,
              channel.id,
              productId,
              Math.max(0, availableQty),
            );
          }
          // Other channels: Amazon, Flipkart, etc. would be handled here
        }
      }
    });

    // Subscribe to retail sale completion to check for click-and-collect updates
    this.eventBus.subscribe('retail.sale.completed', async (event) => {
      if (event.type === 'retail.sale.completed') {
        const { saleId, customerId, totalPaise, items } = event.payload;
        this.logger.log(
          `[Ecommerce] Retail sale completed: saleId=${saleId}, customer=${customerId}, total=${totalPaise}`,
        );

        // Check if any click-and-collect items are related to this sale's products
        // This would be a more complex lookup in production
        // For now, log for visibility
        for (const item of items) {
          const catalogItems = await this.prisma.catalogItem.findMany({
            where: {
              tenantId: event.tenantId,
              productId: item.productId,
              syncStatus: 'SYNCED',
            },
          });

          if (catalogItems.length > 0) {
            // Mark catalog items as potentially out of sync since stock changed
            await this.prisma.catalogItem.updateMany({
              where: {
                tenantId: event.tenantId,
                productId: item.productId,
                syncStatus: 'SYNCED',
              },
              data: { syncStatus: 'OUT_OF_SYNC' },
            });
          }
        }
      }
    });
  }
}
