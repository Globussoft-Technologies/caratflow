// ─── Financial Event Handler ───────────────────────────────────
// Subscribes to cross-domain events and creates financial records.

import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { FinancialService } from './financial.service';
import type {
  RetailSaleCompletedEvent,
  WholesalePurchaseCompletedEvent,
} from '@caratflow/shared-types';

/**
 * Listens for domain events from other modules and creates
 * corresponding financial records (invoices, journal entries).
 *
 * When an EventBus service is available (BullMQ), this will subscribe
 * to events. For now it exposes handler methods that can be called
 * directly or wired to the event bus.
 */
@Injectable()
export class FinancialEventHandler implements OnModuleInit {
  private readonly logger = new Logger(FinancialEventHandler.name);

  constructor(private readonly financialService: FinancialService) {}

  onModuleInit() {
    this.logger.log('Financial event handler initialized');
    // When EventBusService is available:
    // this.eventBus.subscribe('retail.sale.completed', this.handleRetailSale.bind(this));
    // this.eventBus.subscribe('wholesale.purchase.completed', this.handleWholesalePurchase.bind(this));
  }

  /**
   * Handle retail sale completed event.
   * Creates a sales invoice and auto-posts the journal entry.
   */
  async handleRetailSale(event: RetailSaleCompletedEvent): Promise<void> {
    try {
      this.logger.log(`Processing retail sale: ${event.payload.saleId}`);

      const lineItems = event.payload.items.map((item) => ({
        productId: item.productId,
        description: `Retail sale - Product ${item.productId}`,
        quantity: 1,
        unitPricePaise: item.pricePaise,
        discountPaise: 0,
        hsnCode: '7113',
        gstRate: 300, // 3% for jewelry
      }));

      await this.financialService.createInvoice(event.tenantId, event.userId, {
        invoiceType: 'SALES',
        customerId: event.payload.customerId,
        locationId: '', // Would need to be passed in event
        sourceState: 'MH', // Would come from tenant settings
        destState: 'MH', // Would come from customer
        currencyCode: 'INR',
        lineItems,
      });

      this.logger.log(`Sales invoice created for sale: ${event.payload.saleId}`);
    } catch (error) {
      this.logger.error(`Failed to process retail sale: ${event.payload.saleId}`, error);
    }
  }

  /**
   * Handle wholesale purchase completed event.
   * Creates a purchase invoice.
   */
  async handleWholesalePurchase(event: WholesalePurchaseCompletedEvent): Promise<void> {
    try {
      this.logger.log(`Processing wholesale purchase: ${event.payload.purchaseOrderId}`);

      await this.financialService.createInvoice(event.tenantId, event.userId, {
        invoiceType: 'PURCHASE',
        supplierId: event.payload.supplierId,
        locationId: '', // Would need to be passed in event
        sourceState: 'MH', // Would come from supplier
        destState: 'MH', // Would come from tenant settings
        currencyCode: 'INR',
        lineItems: [{
          description: `Purchase order ${event.payload.purchaseOrderId}`,
          quantity: 1,
          unitPricePaise: event.payload.totalPaise,
          discountPaise: 0,
          hsnCode: '7113',
          gstRate: 300,
        }],
      });

      this.logger.log(`Purchase invoice created for PO: ${event.payload.purchaseOrderId}`);
    } catch (error) {
      this.logger.error(`Failed to process wholesale purchase: ${event.payload.purchaseOrderId}`, error);
    }
  }
}
