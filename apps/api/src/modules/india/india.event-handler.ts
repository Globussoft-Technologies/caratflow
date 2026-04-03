// ─── India Event Handler ───────────────────────────────────────
// Subscribes to cross-domain events relevant to India features:
// - retail.sale.completed: check KYC for high-value sales
// - financial.payment.received: update scheme installments

import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { IndiaKycService } from './india.kyc.service';
import { IndiaSchemeService } from './india.scheme.service';
import { IndiaGirviService } from './india.girvi.service';
import type {
  RetailSaleCompletedEvent,
  FinancialPaymentReceivedEvent,
} from '@caratflow/shared-types';

/** High-value sale threshold for mandatory KYC check (Rs. 2 lakh = 200,000 * 100 paise) */
const HIGH_VALUE_SALE_THRESHOLD_PAISE = 200_000_00;

@Injectable()
export class IndiaEventHandler implements OnModuleInit {
  private readonly logger = new Logger(IndiaEventHandler.name);

  constructor(
    private readonly kycService: IndiaKycService,
    private readonly schemeService: IndiaSchemeService,
    private readonly girviService: IndiaGirviService,
  ) {}

  onModuleInit() {
    this.logger.log('India event handler initialized');
    // When EventBusService is available:
    // this.eventBus.subscribe('retail.sale.completed', this.handleRetailSale.bind(this));
    // this.eventBus.subscribe('financial.payment.received', this.handlePaymentReceived.bind(this));
  }

  /**
   * Handle retail sale completed event.
   * For high-value sales (>= Rs. 2 lakh), verify that customer has
   * complete KYC documentation as per Indian regulatory requirements.
   */
  async handleRetailSale(event: RetailSaleCompletedEvent): Promise<void> {
    try {
      if (event.payload.totalPaise < HIGH_VALUE_SALE_THRESHOLD_PAISE) {
        return; // No KYC check needed for low-value sales
      }

      this.logger.log(
        `High-value sale detected: ${event.payload.saleId} = ${event.payload.totalPaise} paise`,
      );

      const isKycComplete = await this.kycService.isKycComplete(
        event.tenantId,
        event.payload.customerId,
      );

      if (!isKycComplete) {
        this.logger.warn(
          `KYC incomplete for high-value sale. Customer: ${event.payload.customerId}, ` +
          `Sale: ${event.payload.saleId}, Amount: ${event.payload.totalPaise} paise. ` +
          `Regulatory compliance requires KYC for transactions >= Rs. 2 lakh.`,
        );
        // In production, this would:
        // 1. Flag the sale for review
        // 2. Send notification to compliance team
        // 3. Generate an audit trail entry
      }
    } catch (error) {
      this.logger.error(
        `Failed to process KYC check for sale: ${event.payload.saleId}`,
        error,
      );
    }
  }

  /**
   * Handle financial payment received event.
   * Check if the payment reference matches any pending scheme installments
   * and auto-reconcile them.
   */
  async handlePaymentReceived(event: FinancialPaymentReceivedEvent): Promise<void> {
    try {
      this.logger.log(
        `Payment received: ${event.payload.paymentId} = ${event.payload.amountPaise} paise, ` +
        `ref: ${event.payload.referenceId}`,
      );

      // Auto-reconciliation logic would:
      // 1. Parse the reference to identify scheme type (KITTY/GS/GIRVI)
      // 2. Look up pending installments matching the amount
      // 3. Auto-mark as paid if match found
      // 4. Log the reconciliation

      // This is a placeholder -- actual implementation depends on
      // the reference format convention used by the payment module.
      const ref = event.payload.referenceId;
      if (ref.startsWith('GRV-')) {
        this.logger.log(`Girvi payment reference detected: ${ref}`);
        // Would trigger girvi payment recording
      } else if (ref.startsWith('KIT-') || ref.startsWith('GS-')) {
        this.logger.log(`Scheme payment reference detected: ${ref}`);
        // Would trigger scheme installment recording
      }
    } catch (error) {
      this.logger.error(
        `Failed to process payment event: ${event.payload.paymentId}`,
        error,
      );
    }
  }

  /**
   * Daily cron job handler for India-specific scheduled tasks.
   * Called by BullMQ scheduler.
   */
  async runDailyTasks(tenantId: string): Promise<void> {
    this.logger.log(`Running daily India tasks for tenant ${tenantId}`);

    try {
      // 1. Accrue interest on all active girvi loans
      const accrued = await this.girviService.runDailyInterestAccrual(tenantId);
      this.logger.log(`Daily interest accrual: ${accrued} loans processed`);

      // 2. Check for overdue girvi loans
      const defaulted = await this.girviService.processOverdueLoans(tenantId);
      this.logger.log(`Overdue loan check: ${defaulted} loans defaulted`);

      // 3. Mark overdue scheme installments
      const overdue = await this.schemeService.markOverdueInstallments(tenantId);
      this.logger.log(`Overdue installments: ${overdue} marked`);

      // 4. Process gold savings maturity dates
      const matured = await this.schemeService.processMaturityDates(tenantId);
      this.logger.log(`Gold savings maturity: ${matured} members matured`);

      // 5. Mark expired KYC verifications
      const expired = await this.kycService.markExpiredVerifications(tenantId);
      this.logger.log(`KYC expiry: ${expired} verifications expired`);
    } catch (error) {
      this.logger.error(`Daily India tasks failed for tenant ${tenantId}`, error);
    }
  }
}
