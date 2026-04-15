import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { EventBusService } from '../../event-bus/event-bus.service';
import type {
  RetailCustomOrderCreatedEvent,
  InventoryStockAdjustedEvent,
  DomainEvent,
} from '@caratflow/shared-types';

@Injectable()
export class ManufacturingEventHandler implements OnModuleInit {
  private readonly logger = new Logger(ManufacturingEventHandler.name);

  constructor(private readonly eventBus: EventBusService) {}

  onModuleInit() {
    this.eventBus.subscribe('retail.custom_order.created', (event: DomainEvent) => this.handleCustomOrderCreated(event as RetailCustomOrderCreatedEvent));
    this.eventBus.subscribe('inventory.stock.adjusted', (event: DomainEvent) => this.handleStockAdjusted(event as InventoryStockAdjustedEvent));
  }

  private async handleCustomOrderCreated(event: RetailCustomOrderCreatedEvent) {
    this.logger.log(
      `Custom order created: ${event.payload.orderId} for customer ${event.payload.customerId}. ` +
        `Consider creating a manufacturing job order.`,
    );
    // In a full implementation, this could:
    // 1. Create a suggested job order in DRAFT status
    // 2. Send a notification to the production manager
    // 3. Link the custom order to the job order
  }

  private async handleStockAdjusted(event: InventoryStockAdjustedEvent) {
    this.logger.log(
      `Stock adjusted for product ${event.payload.productId} at location ${event.payload.locationId}. ` +
        `Checking material availability for pending jobs.`,
    );
    // In a full implementation, this could:
    // 1. Check pending job orders that need this material
    // 2. Update material availability status on those jobs
    // 3. Notify production if materials are now available
  }
}
