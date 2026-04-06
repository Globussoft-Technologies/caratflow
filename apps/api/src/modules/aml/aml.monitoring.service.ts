// ─── AML Monitoring Service ────────────────────────────────────
// BullMQ cron-based batch monitoring. Periodically checks recent
// transactions against AML rules and updates customer risk scores.

import { Injectable, Logger } from '@nestjs/common';
import { TenantAwareService } from '../../common/base.service';
import { PrismaService } from '../../common/prisma.service';
import { AmlService } from './aml.service';
import { AmlRiskService } from './aml.risk.service';

@Injectable()
export class AmlMonitoringService extends TenantAwareService {
  private readonly logger = new Logger(AmlMonitoringService.name);

  constructor(
    prisma: PrismaService,
    private readonly amlService: AmlService,
    private readonly riskService: AmlRiskService,
  ) {
    super(prisma);
  }

  /**
   * Batch monitor recent transactions. Called by BullMQ cron job.
   * Checks all payments received in the last monitoring window
   * against active AML rules.
   */
  async monitorTransactions(tenantId: string, windowMinutes = 60): Promise<{
    transactionsChecked: number;
    alertsCreated: number;
    risksUpdated: number;
  }> {
    const since = new Date(Date.now() - windowMinutes * 60 * 1000);

    // Get recent payments as transactions to check
    const recentPayments = await this.prisma.payment.findMany({
      where: {
        tenantId,
        createdAt: { gte: since },
      },
      select: {
        id: true,
        customerId: true,
        amountPaise: true,
        paymentMethod: true,
      },
    });

    let alertsCreated = 0;
    const customersToReassess = new Set<string>();

    for (const payment of recentPayments) {
      if (!payment.customerId) continue;

      try {
        const result = await this.amlService.evaluateTransaction(
          tenantId,
          payment.customerId,
          payment.amountPaise,
          `payment.${payment.paymentMethod}`,
          payment.id,
        );

        if (!result.passed) {
          alertsCreated += result.alertsCreated;
          customersToReassess.add(payment.customerId);
        }
      } catch (err) {
        this.logger.error(`Failed to evaluate payment ${payment.id}: ${err}`);
      }
    }

    // Reassess risk for flagged customers
    let risksUpdated = 0;
    for (const customerId of customersToReassess) {
      try {
        await this.riskService.calculateCustomerRisk(tenantId, customerId);
        risksUpdated++;
      } catch (err) {
        this.logger.error(`Failed to reassess risk for customer ${customerId}: ${err}`);
      }
    }

    this.logger.log(
      `AML monitoring complete for tenant ${tenantId}: ` +
      `${recentPayments.length} transactions checked, ` +
      `${alertsCreated} alerts created, ` +
      `${risksUpdated} risk scores updated`,
    );

    return {
      transactionsChecked: recentPayments.length,
      alertsCreated,
      risksUpdated,
    };
  }

  /**
   * Batch recalculate risk scores for customers due for review.
   * Called by BullMQ cron job (e.g., daily).
   */
  async recalculateDueRiskScores(tenantId: string): Promise<number> {
    const now = new Date();

    const dueForReview = await this.prisma.amlCustomerRisk.findMany({
      where: {
        tenantId,
        nextReviewDate: { lte: now },
      },
      select: { customerId: true },
      take: 100, // Process in batches
    });

    let updated = 0;
    for (const record of dueForReview) {
      try {
        await this.riskService.calculateCustomerRisk(tenantId, record.customerId);
        updated++;
      } catch (err) {
        this.logger.error(`Failed to recalculate risk for ${record.customerId}: ${err}`);
      }
    }

    this.logger.log(`Recalculated ${updated} risk scores for tenant ${tenantId}`);
    return updated;
  }

  /**
   * Expire stale NEW alerts that haven't been reviewed within SLA.
   * Automatically escalates them.
   */
  async escalateOverdueAlerts(tenantId: string, slaHours = 48): Promise<number> {
    const cutoff = new Date(Date.now() - slaHours * 60 * 60 * 1000);

    const overdueAlerts = await this.prisma.amlAlert.findMany({
      where: {
        tenantId,
        status: 'NEW',
        createdAt: { lte: cutoff },
      },
    });

    let escalated = 0;
    for (const alert of overdueAlerts) {
      try {
        await this.prisma.amlAlert.update({
          where: { id: alert.id },
          data: {
            status: 'ESCALATED',
            reviewNotes: `Auto-escalated: not reviewed within ${slaHours}h SLA`,
          },
        });
        escalated++;
      } catch (err) {
        this.logger.error(`Failed to auto-escalate alert ${alert.id}: ${err}`);
      }
    }

    if (escalated > 0) {
      this.logger.warn(`Auto-escalated ${escalated} overdue alerts for tenant ${tenantId}`);
    }

    return escalated;
  }
}
