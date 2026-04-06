// ─── B2C Features Event Handler ─────────────────────────────────
// Subscribes to domain events from other modules:
// - inventory.stock.adjusted -> trigger back-in-stock notifications
// - retail.sale.completed / ecommerce.order.received -> mark abandoned carts recovered
// - storefront.order.placed -> mark abandoned carts recovered

import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { EventBusService } from '../../event-bus/event-bus.service';
import { BackInStockService } from './back-in-stock.service';
import { AbandonedCartService } from './abandoned-cart.service';
import type {
  InventoryStockAdjustedEvent,
  RetailSaleCompletedEvent,
  EcommerceOrderReceivedEvent,
  StorefrontOrderPlacedEvent,
} from '@caratflow/shared-types';

@Injectable()
export class B2cFeaturesEventHandler implements OnModuleInit {
  private readonly logger = new Logger(B2cFeaturesEventHandler.name);

  constructor(
    private readonly eventBus: EventBusService,
    private readonly backInStockService: BackInStockService,
    private readonly abandonedCartService: AbandonedCartService,
  ) {}

  onModuleInit() {
    // ─── Back-in-stock: when inventory goes from 0 to >0 ────
    this.eventBus.subscribe('inventory.stock.adjusted', async (event) => {
      const e = event as InventoryStockAdjustedEvent;
      const { tenantId } = e;
      const { productId, quantityChange } = e.payload;

      // Only trigger if stock increased (quantityChange > 0)
      if (quantityChange <= 0) return;

      try {
        const notified = await this.backInStockService.notifySubscribers(tenantId, productId);
        if (notified > 0) {
          this.logger.log(
            `Back-in-stock: notified ${notified} subscribers for product ${productId}`,
          );
        }
      } catch (err) {
        this.logger.error(`Failed to process back-in-stock for product ${productId}: ${err}`);
      }
    });

    // ─── Abandoned cart recovery: retail sale completed ──────
    this.eventBus.subscribe('retail.sale.completed', async (event) => {
      const e = event as RetailSaleCompletedEvent;
      const { tenantId } = e;
      const { saleId, customerId } = e.payload;

      try {
        // Find any abandoned carts for this customer and mark recovered
        // We look up by customerId since the cartSessionId may differ
        const carts = await this.findAbandonedCartsForCustomer(tenantId, customerId);
        for (const cart of carts) {
          await this.abandonedCartService.markRecovered(tenantId, cart.cartSessionId, saleId);
          this.logger.log(`Abandoned cart ${cart.id} recovered via retail sale ${saleId}`);
        }
      } catch (err) {
        this.logger.error(`Failed to mark abandoned cart recovered for sale ${saleId}: ${err}`);
      }
    });

    // ─── Abandoned cart recovery: e-commerce order received ──
    this.eventBus.subscribe('ecommerce.order.received', async (event) => {
      const e = event as EcommerceOrderReceivedEvent;
      const { tenantId } = e;
      const { orderId, customerEmail } = e.payload;

      try {
        // Look up by email since e-commerce orders may not have customerId
        const carts = await this.findAbandonedCartsByEmail(tenantId, customerEmail);
        for (const cart of carts) {
          await this.abandonedCartService.markRecovered(tenantId, cart.cartSessionId, orderId);
          this.logger.log(`Abandoned cart ${cart.id} recovered via e-commerce order ${orderId}`);
        }
      } catch (err) {
        this.logger.error(
          `Failed to mark abandoned cart recovered for ecommerce order ${orderId}: ${err}`,
        );
      }
    });

    // ─── Abandoned cart recovery: storefront order placed ────
    this.eventBus.subscribe('storefront.order.placed', async (event) => {
      const e = event as StorefrontOrderPlacedEvent;
      const { tenantId } = e;
      const { orderId, customerId } = e.payload;

      try {
        const carts = await this.findAbandonedCartsForCustomer(tenantId, customerId);
        for (const cart of carts) {
          await this.abandonedCartService.markRecovered(tenantId, cart.cartSessionId, orderId);
          this.logger.log(`Abandoned cart ${cart.id} recovered via storefront order ${orderId}`);
        }
      } catch (err) {
        this.logger.error(
          `Failed to mark abandoned cart recovered for storefront order ${orderId}: ${err}`,
        );
      }
    });

    this.logger.log('B2C Features event handlers registered');
  }

  /**
   * Find active (non-recovered, non-expired) abandoned carts for a customer.
   */
  private async findAbandonedCartsForCustomer(tenantId: string, customerId: string) {
    // Access prisma through the service's protected member
    const prisma = (this.abandonedCartService as unknown as { prisma: { abandonedCart: { findMany: Function } } }).prisma;
    return prisma.abandonedCart.findMany({
      where: {
        tenantId,
        customerId,
        status: { notIn: ['RECOVERED', 'EXPIRED'] },
      },
    });
  }

  /**
   * Find active abandoned carts by customer email.
   */
  private async findAbandonedCartsByEmail(tenantId: string, email: string) {
    const prisma = (this.abandonedCartService as unknown as { prisma: { abandonedCart: { findMany: Function } } }).prisma;
    return prisma.abandonedCart.findMany({
      where: {
        tenantId,
        customerEmail: email,
        status: { notIn: ['RECOVERED', 'EXPIRED'] },
      },
    });
  }
}
