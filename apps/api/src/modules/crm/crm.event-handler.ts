// ─── CRM Event Handler ─────────────────────────────────────────
// Subscribes to domain events from other modules and triggers CRM actions.

import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { EventBusService } from '../../event-bus/event-bus.service';
import { CrmLoyaltyService } from './crm.loyalty.service';
import { CrmFeedbackService } from './crm.feedback.service';
import type {
  RetailSaleCompletedEvent,
  FinancialPaymentReceivedEvent,
} from '@caratflow/shared-types';

@Injectable()
export class CrmEventHandler implements OnModuleInit {
  private readonly logger = new Logger(CrmEventHandler.name);

  constructor(
    private readonly eventBus: EventBusService,
    private readonly loyaltyService: CrmLoyaltyService,
    private readonly feedbackService: CrmFeedbackService,
  ) {}

  onModuleInit() {
    // Subscribe to retail.sale.completed -> earn loyalty points + trigger feedback
    this.eventBus.subscribe('retail.sale.completed', async (event) => {
      const e = event as RetailSaleCompletedEvent;
      const { tenantId, userId } = e;
      const { saleId, customerId, totalPaise } = e.payload;

      try {
        // Calculate and award loyalty points
        const points = await this.loyaltyService.calculatePointsForSale(tenantId, totalPaise);
        if (points > 0) {
          await this.loyaltyService.earnPoints(
            tenantId,
            userId,
            customerId,
            points,
            'SALE',
            saleId,
            `Points earned from sale ${saleId}`,
          );
          this.logger.log(`Awarded ${points} loyalty points to customer ${customerId} for sale ${saleId}`);
        }

        // Auto-create feedback request (NEW status, customer can fill rating later)
        // This creates a feedback entry that the store can ask the customer to rate
        await this.feedbackService.createFeedback(tenantId, userId, {
          customerId,
          feedbackType: 'PURCHASE',
          rating: 0, // Pending customer rating -- 0 indicates unfilled
          comment: null as unknown as undefined,
          saleId,
        });
      } catch (err) {
        this.logger.error(`Failed to process sale event for CRM: ${err}`);
      }
    });

    // Subscribe to financial.payment.received -> update scheme payments
    this.eventBus.subscribe('financial.payment.received', async (event) => {
      const e = event as FinancialPaymentReceivedEvent;
      this.logger.log(
        `Payment received: ${e.payload.paymentId}, amount: ${e.payload.amountPaise} paise. ` +
        `Scheme/passbook updates would be processed here.`,
      );
      // In a full implementation, this would update DigitalPassbook entries
      // for gold savings schemes, kitty payments, etc.
    });

    this.logger.log('CRM event handlers registered');
  }
}
