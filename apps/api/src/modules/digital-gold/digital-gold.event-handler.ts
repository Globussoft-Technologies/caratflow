// ─── Digital Gold Event Handler ────────────────────────────────
// Subscribes to cross-domain events relevant to digital gold:
// - india.rates.updated: check price alerts, update cached rates
// - financial.payment.received: confirm pending gold transactions

import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { DigitalGoldAlertService } from './digital-gold.alert.service';
import { DigitalGoldSipService } from './digital-gold.sip.service';
import type {
  IndiaMetalRateUpdatedEvent,
  FinancialPaymentReceivedEvent,
} from '@caratflow/shared-types';

@Injectable()
export class DigitalGoldEventHandler implements OnModuleInit {
  private readonly logger = new Logger(DigitalGoldEventHandler.name);

  constructor(
    private readonly alertService: DigitalGoldAlertService,
    private readonly sipService: DigitalGoldSipService,
  ) {}

  onModuleInit() {
    this.logger.log('Digital Gold event handler initialized');
    // When EventBusService is available:
    // this.eventBus.subscribe('india.rates.updated', this.handleRateUpdated.bind(this));
    // this.eventBus.subscribe('financial.payment.received', this.handlePaymentReceived.bind(this));
  }

  /**
   * Handle metal rate update events.
   * When gold rate changes, check if any customer price alerts should be triggered.
   */
  async handleRateUpdated(event: IndiaMetalRateUpdatedEvent): Promise<void> {
    try {
      if (event.payload.metalType !== 'GOLD') {
        return; // Only interested in gold rate updates
      }

      this.logger.log(
        `Gold rate updated: purity=${event.payload.purity}, rate=${event.payload.ratePer10gPaise}`,
      );

      // Check price alerts against the new rate
      const result = await this.alertService.checkAlerts();
      if (result.triggered > 0) {
        this.logger.log(`${result.triggered} price alerts triggered by rate update`);
      }
    } catch (error) {
      this.logger.error('Failed to process rate update event for digital gold', error);
    }
  }

  /**
   * Handle payment received events.
   * Check if any pending digital gold transactions match the payment reference.
   */
  async handlePaymentReceived(event: FinancialPaymentReceivedEvent): Promise<void> {
    try {
      const ref = event.payload.referenceId;

      // Check if reference matches digital gold transaction pattern
      if (!ref.startsWith('DG-')) {
        return; // Not a digital gold payment
      }

      this.logger.log(
        `Digital gold payment received: paymentId=${event.payload.paymentId}, ref=${ref}`,
      );

      // In production, this would:
      // 1. Look up the pending transaction by reference
      // 2. Confirm the payment amount matches
      // 3. Complete the transaction (update status, credit gold to vault)
      // 4. Send confirmation notification to customer
    } catch (error) {
      this.logger.error(
        `Failed to process payment event for digital gold: ${event.payload.paymentId}`,
        error,
      );
    }
  }

  /**
   * Daily cron job handler for digital gold scheduled tasks.
   * Called by BullMQ scheduler.
   */
  async runDailyTasks(): Promise<void> {
    this.logger.log('Running daily digital gold tasks');

    try {
      // 1. Execute due SIPs
      const sipResult = await this.sipService.executeDueSips();
      this.logger.log(
        `SIP execution: ${sipResult.executed} executed, ${sipResult.failed} failed`,
      );

      // 2. Check price alerts
      const alertResult = await this.alertService.checkAlerts();
      this.logger.log(`Price alert check: ${alertResult.triggered} triggered`);
    } catch (error) {
      this.logger.error('Daily digital gold tasks failed', error);
    }
  }
}
