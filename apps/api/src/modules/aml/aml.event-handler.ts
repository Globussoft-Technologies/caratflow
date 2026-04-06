// ─── AML Event Handler ─────────────────────────────────────────
// Subscribes to financial/retail/storefront events and evaluates
// each transaction against AML rules.

import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { EventBusService } from '../../event-bus/event-bus.service';
import { AmlService } from './aml.service';
import { AmlRiskService } from './aml.risk.service';
import type {
  FinancialPaymentReceivedEvent,
  RetailSaleCompletedEvent,
  StorefrontOrderCompletedEvent,
} from '@caratflow/shared-types';

@Injectable()
export class AmlEventHandler implements OnModuleInit {
  private readonly logger = new Logger(AmlEventHandler.name);

  constructor(
    private readonly eventBus: EventBusService,
    private readonly amlService: AmlService,
    private readonly riskService: AmlRiskService,
  ) {}

  onModuleInit() {
    // ─── Financial Payment Received ─────────────────────────────
    this.eventBus.subscribe('financial.payment.received', async (event) => {
      const e = event as FinancialPaymentReceivedEvent;
      try {
        const result = await this.amlService.evaluateTransaction(
          e.tenantId,
          e.payload.referenceId, // customerId from payment context
          BigInt(e.payload.amountPaise),
          `financial.payment.${e.payload.method}`,
          e.payload.paymentId,
        );

        if (!result.passed) {
          this.logger.warn(
            `AML alert(s) triggered for payment ${e.payload.paymentId}: ` +
            `${result.alertsCreated} alert(s)`,
          );
          // Recalculate customer risk
          await this.riskService.calculateCustomerRisk(e.tenantId, e.payload.referenceId);
        }
      } catch (err) {
        this.logger.error(`AML evaluation failed for payment ${e.payload.paymentId}: ${err}`);
      }
    });

    // ─── Retail Sale Completed ──────────────────────────────────
    this.eventBus.subscribe('retail.sale.completed', async (event) => {
      const e = event as RetailSaleCompletedEvent;
      try {
        const result = await this.amlService.evaluateTransaction(
          e.tenantId,
          e.payload.customerId,
          BigInt(e.payload.totalPaise),
          'retail.sale',
          e.payload.saleId,
        );

        if (!result.passed) {
          this.logger.warn(
            `AML alert(s) triggered for sale ${e.payload.saleId}: ` +
            `${result.alertsCreated} alert(s)`,
          );
          await this.riskService.calculateCustomerRisk(e.tenantId, e.payload.customerId);
        }
      } catch (err) {
        this.logger.error(`AML evaluation failed for sale ${e.payload.saleId}: ${err}`);
      }
    });

    // ─── Storefront Order Completed ─────────────────────────────
    this.eventBus.subscribe('storefront.order.completed', async (event) => {
      const e = event as StorefrontOrderCompletedEvent;
      try {
        const result = await this.amlService.evaluateTransaction(
          e.tenantId,
          e.payload.customerId,
          BigInt(e.payload.totalPaise),
          'storefront.order',
          e.payload.orderId,
        );

        if (!result.passed) {
          this.logger.warn(
            `AML alert(s) triggered for storefront order ${e.payload.orderId}: ` +
            `${result.alertsCreated} alert(s)`,
          );
          await this.riskService.calculateCustomerRisk(e.tenantId, e.payload.customerId);
        }
      } catch (err) {
        this.logger.error(`AML evaluation failed for storefront order ${e.payload.orderId}: ${err}`);
      }
    });

    this.logger.log('AML event handlers registered');
  }
}
