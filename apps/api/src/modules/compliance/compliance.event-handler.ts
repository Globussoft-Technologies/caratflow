// ─── Compliance Event Handler ─────────────────────────────────
// Subscribes to cross-domain events that affect compliance.

import { Injectable, OnModuleInit } from '@nestjs/common';
import { EventBusService } from '../../event-bus/event-bus.service';
import { PrismaService } from '../../common/prisma.service';
import { ComplianceHuidService } from './compliance.huid.service';
import type {
  RetailSaleCompletedEvent,
  InventoryItemCreatedEvent,
  DomainEvent,
} from '@caratflow/shared-types';

@Injectable()
export class ComplianceEventHandler implements OnModuleInit {
  constructor(
    private readonly eventBus: EventBusService,
    private readonly prisma: PrismaService,
    private readonly huidService: ComplianceHuidService,
  ) {}

  onModuleInit() {
    this.eventBus.subscribe('retail.sale.completed', this.handleSaleCompleted.bind(this));
    this.eventBus.subscribe('inventory.item.created', this.handleItemCreated.bind(this));
  }

  /**
   * When a retail sale is completed, verify all gold items have valid HUIDs.
   * Logs a warning if any gold product is sold without HUID.
   */
  private async handleSaleCompleted(event: DomainEvent) {
    const { tenantId, payload } = event as RetailSaleCompletedEvent;
    const { saleId, items } = payload;

    for (const item of items) {
      try {
        const hasHuid = await this.huidService.enforceHuidOnSale(tenantId, item.productId);
        if (!hasHuid) {
          console.warn(
            `[ComplianceEventHandler] Gold product ${item.productId} sold without HUID in sale ${saleId}. ` +
            `This may violate BIS hallmarking requirements.`,
          );
          // In production, this could create an alert or block the sale
        }
      } catch (error) {
        console.error(
          `[ComplianceEventHandler] Failed to check HUID for product ${item.productId}:`,
          error,
        );
      }
    }
  }

  /**
   * When a new inventory item is created, suggest HUID registration
   * for gold products that don't have one.
   */
  private async handleItemCreated(event: DomainEvent) {
    const { tenantId, payload } = event as InventoryItemCreatedEvent;
    const { productId } = payload;

    try {
      const product = await this.prisma.product.findFirst({
        where: { tenantId, id: productId },
      });
      if (!product) return;

      if (product.productType === 'GOLD' && !product.huidNumber) {
        console.info(
          `[ComplianceEventHandler] New gold product ${productId} (SKU: ${product.sku}) ` +
          `does not have HUID. Consider registering for BIS hallmark.`,
        );
        // In production, this could create a notification or task
      }
    } catch (error) {
      console.error(
        `[ComplianceEventHandler] Failed to check HUID suggestion for product ${productId}:`,
        error,
      );
    }
  }
}
