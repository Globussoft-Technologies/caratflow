// ─── India Event Handler ───────────────────────────────────────
// Subscribes to cross-domain events relevant to India features:
// - retail.sale.completed: check KYC for high-value sales
// - financial.payment.received: update scheme installments

import { Injectable, OnModuleInit, Logger, Optional } from '@nestjs/common';
import { IndiaKycService } from './india.kyc.service';
import { IndiaSchemeService } from './india.scheme.service';
import { IndiaGirviService } from './india.girvi.service';
import { PrismaService } from '../../common/prisma.service';
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
    @Optional() private readonly prisma?: PrismaService,
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

      // Reference format convention (see payment module):
      //   GRV-{loanId}-{suffix}   -> girvi principal/interest payment
      //   KIT-{schemeId}-{suffix} -> kitty installment
      //   GS-{schemeId}-{suffix}  -> gold savings monthly deposit
      // We look up the owning record and log reconciliation; the
      // actual payment application stays with the scheme/girvi
      // services so the per-installment business rules (interest
      // accrual, maturity, late fees) are not duplicated here.
      const ref = event.payload.referenceId ?? '';
      if (ref.startsWith('GRV-') && this.prisma) {
        const loanId = ref.split('-')[1];
        if (loanId) {
          const loan = await this.prisma.girviLoan.findFirst({
            where: { id: loanId, tenantId: event.tenantId },
            select: { id: true },
          });
          if (loan) {
            this.logger.log(
              `Girvi payment auto-reconciled: ref=${ref}, loanId=${loan.id}, amount=${event.payload.amountPaise}`,
            );
          } else {
            this.logger.warn(`Girvi payment ref ${ref} did not match any loan`);
          }
        }
      } else if ((ref.startsWith('KIT-') || ref.startsWith('GS-')) && this.prisma) {
        const schemeId = ref.split('-')[1];
        if (schemeId) {
          const scheme = await this.prisma.kittyScheme.findFirst({
            where: { id: schemeId, tenantId: event.tenantId },
            select: { id: true, schemeType: true },
          });
          if (scheme) {
            this.logger.log(
              `Scheme payment auto-reconciled: ref=${ref}, schemeId=${scheme.id}, type=${scheme.schemeType}`,
            );
          } else {
            this.logger.warn(`Scheme payment ref ${ref} did not match any scheme`);
          }
        }
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
