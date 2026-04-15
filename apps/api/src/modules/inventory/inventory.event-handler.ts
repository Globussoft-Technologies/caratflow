// ─── Inventory Event Handler ──────────────────────────────────
// Subscribes to cross-domain events that affect inventory.

import { Injectable, OnModuleInit } from '@nestjs/common';
import { EventBusService } from '../../event-bus/event-bus.service';
import { PrismaService } from '../../common/prisma.service';
import { InventoryService } from './inventory.service';
import type {
  RetailSaleCompletedEvent,
  ManufacturingJobCompletedEvent,
  WholesaleConsignmentReturnedEvent,
  DomainEvent,
} from '@caratflow/shared-types';
import { MovementType } from '@caratflow/shared-types';

@Injectable()
export class InventoryEventHandler implements OnModuleInit {
  constructor(
    private readonly eventBus: EventBusService,
    private readonly prisma: PrismaService,
    private readonly inventoryService: InventoryService,
  ) {}

  onModuleInit() {
    this.eventBus.subscribe('retail.sale.completed', this.handleSaleCompleted.bind(this));
    this.eventBus.subscribe('manufacturing.job.completed', this.handleJobCompleted.bind(this));
    this.eventBus.subscribe('wholesale.consignment.returned', this.handleConsignmentReturned.bind(this));
  }

  /**
   * When a retail sale is completed, decrement stock for each sold item.
   */
  private async handleSaleCompleted(event: DomainEvent) {
    const { tenantId, userId, payload } = event as RetailSaleCompletedEvent;
    const { saleId, items } = payload;

    for (const item of items) {
      try {
        // Find the stock item at the default location (sale location)
        // In a real implementation, the sale event would include locationId
        const stockItems = await this.findStockItemsForProduct(tenantId, item.productId);
        if (stockItems.length > 0) {
          const stockItem = stockItems[0]!;
          await this.inventoryService.recordMovement(tenantId, userId, {
            stockItemId: stockItem.id,
            movementType: MovementType.OUT,
            quantityChange: -1,
            referenceType: 'RETAIL_SALE',
            referenceId: saleId,
            notes: `Sold via retail sale ${saleId}`,
          });
        }
      } catch (error) {
        console.error(`[InventoryEventHandler] Failed to decrement stock for product ${item.productId}:`, error);
      }
    }
  }

  /**
   * When a manufacturing job is completed, add the finished product to stock.
   */
  private async handleJobCompleted(event: DomainEvent) {
    const { tenantId, userId, payload } = event as ManufacturingJobCompletedEvent;
    const { jobOrderId, outputProductId } = payload;

    try {
      const stockItems = await this.findStockItemsForProduct(tenantId, outputProductId);
      if (stockItems.length > 0) {
        const stockItem = stockItems[0]!;
        await this.inventoryService.recordMovement(tenantId, userId, {
          stockItemId: stockItem.id,
          movementType: MovementType.PRODUCTION,
          quantityChange: 1,
          referenceType: 'MANUFACTURING_JOB',
          referenceId: jobOrderId,
          notes: `Produced from manufacturing job ${jobOrderId}`,
        });
      }
    } catch (error) {
      console.error(`[InventoryEventHandler] Failed to add finished goods for job ${jobOrderId}:`, error);
    }
  }

  /**
   * When consignment goods are returned, adjust the consignment stock.
   */
  private async handleConsignmentReturned(event: DomainEvent) {
    const { tenantId, userId, payload } = event as WholesaleConsignmentReturnedEvent;
    const { consignmentId, returnedItems } = payload;

    for (const item of returnedItems) {
      try {
        const stockItems = await this.findStockItemsForProduct(tenantId, item.productId);
        if (stockItems.length > 0) {
          const stockItem = stockItems[0]!;
          await this.inventoryService.recordMovement(tenantId, userId, {
            stockItemId: stockItem.id,
            movementType: MovementType.RETURN,
            quantityChange: 1,
            referenceType: 'CONSIGNMENT_RETURN',
            referenceId: consignmentId,
            notes: `Returned from consignment ${consignmentId}`,
          });
        }
      } catch (error) {
        console.error(`[InventoryEventHandler] Failed to adjust consignment stock for product ${item.productId}:`, error);
      }
    }
  }

  private async findStockItemsForProduct(tenantId: string, productId: string) {
    return this.prisma.stockItem.findMany({
      where: { tenantId, productId },
      orderBy: { updatedAt: 'desc' },
      take: 1,
    });
  }
}
