// ─── Reporting Event Handler ──────────────────────────────────
// Subscribes to domain events to maintain denormalized metrics
// and counters for fast dashboard rendering.

import { Injectable, OnModuleInit } from '@nestjs/common';
import { EventBusService } from '../../event-bus/event-bus.service';

@Injectable()
export class ReportingEventHandler implements OnModuleInit {
  constructor(private readonly eventBus: EventBusService) {}

  onModuleInit() {
    // ─── Retail Events ────────────────────────────────────────

    this.eventBus.subscribe('retail.sale.completed', async (event) => {
      if (event.type === 'retail.sale.completed') {
        const { saleId, customerId, totalPaise, items } = event.payload;
        // Track sale metrics for real-time dashboard updates.
        // In production, this would update a denormalized metrics table
        // or push to a WebSocket for live dashboard widgets.
        console.log(
          `[Reporting] Sale completed: id=${saleId}, customer=${customerId}, total=${totalPaise}, items=${items.length}`,
        );
      }
    });

    this.eventBus.subscribe('retail.return.processed', async (event) => {
      if (event.type === 'retail.return.processed') {
        const { returnId, originalSaleId, refundPaise } = event.payload;
        console.log(
          `[Reporting] Return processed: id=${returnId}, sale=${originalSaleId}, refund=${refundPaise}`,
        );
      }
    });

    // ─── Inventory Events ─────────────────────────────────────

    this.eventBus.subscribe('inventory.stock.adjusted', async (event) => {
      if (event.type === 'inventory.stock.adjusted') {
        const { productId, locationId, quantityChange, reason } = event.payload;
        // Track stock changes for inventory dashboard widgets.
        // Could trigger low-stock alerts in the dashboard.
        console.log(
          `[Reporting] Stock adjusted: product=${productId}, location=${locationId}, change=${quantityChange}, reason=${reason}`,
        );
      }
    });

    this.eventBus.subscribe('inventory.transfer.completed', async (event) => {
      if (event.type === 'inventory.transfer.completed') {
        const { transferId, fromLocationId, toLocationId, items } = event.payload;
        console.log(
          `[Reporting] Transfer completed: id=${transferId}, from=${fromLocationId}, to=${toLocationId}, items=${items.length}`,
        );
      }
    });

    // ─── Manufacturing Events ─────────────────────────────────

    this.eventBus.subscribe('manufacturing.job.completed', async (event) => {
      if (event.type === 'manufacturing.job.completed') {
        const { jobOrderId, outputProductId, actualWeightMg } = event.payload;
        // Track manufacturing completion for production dashboard.
        console.log(
          `[Reporting] Job completed: id=${jobOrderId}, product=${outputProductId}, weight=${actualWeightMg}mg`,
        );
      }
    });

    this.eventBus.subscribe('manufacturing.job.costed', async (event) => {
      if (event.type === 'manufacturing.job.costed') {
        const { jobOrderId, totalCostPaise } = event.payload;
        console.log(
          `[Reporting] Job costed: id=${jobOrderId}, totalCost=${totalCostPaise}`,
        );
      }
    });

    // ─── Financial Events ─────────────────────────────────────

    this.eventBus.subscribe('financial.payment.received', async (event) => {
      if (event.type === 'financial.payment.received') {
        const { paymentId, amountPaise, method } = event.payload;
        // Track payment metrics for financial dashboard.
        console.log(
          `[Reporting] Payment received: id=${paymentId}, amount=${amountPaise}, method=${method}`,
        );
      }
    });

    this.eventBus.subscribe('financial.invoice.created', async (event) => {
      if (event.type === 'financial.invoice.created') {
        const { invoiceId, invoiceNumber, totalPaise } = event.payload;
        console.log(
          `[Reporting] Invoice created: id=${invoiceId}, number=${invoiceNumber}, total=${totalPaise}`,
        );
      }
    });

    // ─── CRM Events ──────────────────────────────────────────

    this.eventBus.subscribe('crm.customer.created', async (event) => {
      if (event.type === 'crm.customer.created') {
        const { customerId, firstName, lastName } = event.payload;
        // Track new customer acquisition for CRM dashboard.
        console.log(
          `[Reporting] New customer: id=${customerId}, name=${firstName} ${lastName}`,
        );
      }
    });

    this.eventBus.subscribe('crm.loyalty.points_earned', async (event) => {
      if (event.type === 'crm.loyalty.points_earned') {
        const { customerId, points, source } = event.payload;
        console.log(
          `[Reporting] Loyalty points earned: customer=${customerId}, points=${points}, source=${source}`,
        );
      }
    });
  }
}
