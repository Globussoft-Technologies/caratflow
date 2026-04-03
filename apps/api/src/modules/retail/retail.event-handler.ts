// ─── Retail Event Handler ──────────────────────────────────────
// Subscribes to cross-domain events relevant to retail operations.

import { Injectable, OnModuleInit } from '@nestjs/common';
import { EventBusService } from '../../event-bus/event-bus.service';

@Injectable()
export class RetailEventHandler implements OnModuleInit {
  constructor(private readonly eventBus: EventBusService) {}

  onModuleInit() {
    // Subscribe to inventory events -- items available for POS catalog
    this.eventBus.subscribe('inventory.item.created', async (event) => {
      if (event.type === 'inventory.item.created') {
        // When new inventory items are created, they become available in POS.
        // In a full implementation, this could update a search index (Meilisearch)
        // for fast product lookup in the POS interface.
        const { productId, locationId, quantity } = event.payload;
        console.log(
          `[Retail] New inventory item available: product=${productId}, location=${locationId}, qty=${quantity}`,
        );
      }
    });

    // Subscribe to financial payment events -- update payment status
    this.eventBus.subscribe('financial.payment.received', async (event) => {
      if (event.type === 'financial.payment.received') {
        // When a payment is confirmed in the financial module,
        // update the corresponding sale payment status.
        const { paymentId, amountPaise, method, referenceId } = event.payload;
        console.log(
          `[Retail] Payment received: id=${paymentId}, amount=${amountPaise}, method=${method}, ref=${referenceId}`,
        );
      }
    });

    // Subscribe to CRM customer events -- available for POS lookup
    this.eventBus.subscribe('crm.customer.created', async (event) => {
      if (event.type === 'crm.customer.created') {
        // New customers are automatically available for POS selection.
        // Could trigger a search index update for fast lookup.
        const { customerId, firstName, lastName, phone } = event.payload;
        console.log(
          `[Retail] New customer available: id=${customerId}, name=${firstName} ${lastName}, phone=${phone ?? 'N/A'}`,
        );
      }
    });
  }
}
