// ─── AML Service ───────────────────────────────────────────────
// Core AML transaction evaluation engine. Runs all active rules
// against a transaction and creates alerts when triggered.

import { Injectable, Logger } from '@nestjs/common';
import { TenantAwareService } from '../../common/base.service';
import { PrismaService } from '../../common/prisma.service';
import { EventBusService } from '../../event-bus/event-bus.service';
import type { AmlRuleInput, AmlEvaluationResult, AmlRuleParameters } from '@caratflow/shared-types';
import { v4 as uuidv4 } from 'uuid';

interface RuleRecord {
  id: string;
  tenantId: string;
  ruleName: string;
  ruleType: string;
  parameters: unknown;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  isActive: boolean;
}

@Injectable()
export class AmlService extends TenantAwareService {
  private readonly logger = new Logger(AmlService.name);

  constructor(
    prisma: PrismaService,
    private readonly eventBus: EventBusService,
  ) {
    super(prisma);
  }

  // ─── Rule CRUD ──────────────────────────────────────────────────

  async createRule(tenantId: string, userId: string, input: AmlRuleInput) {
    return this.prisma.amlRule.create({
      data: {
        tenantId,
        ruleName: input.ruleName,
        ruleType: input.ruleType,
        parameters: input.parameters as any,
        severity: input.severity,
        isActive: input.isActive,
        createdBy: userId,
        updatedBy: userId,
      },
    });
  }

  async updateRule(tenantId: string, userId: string, ruleId: string, input: Partial<AmlRuleInput>) {
    await this.prisma.amlRule.findFirstOrThrow({
      where: { id: ruleId, tenantId },
    });
    return this.prisma.amlRule.update({
      where: { id: ruleId },
      data: {
        ...input,
        parameters: input.parameters ? (input.parameters as any) : undefined,
        updatedBy: userId,
      },
    });
  }

  async getRule(tenantId: string, ruleId: string) {
    return this.prisma.amlRule.findFirstOrThrow({
      where: { id: ruleId, tenantId },
    });
  }

  async listRules(tenantId: string) {
    return this.prisma.amlRule.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteRule(tenantId: string, ruleId: string) {
    await this.prisma.amlRule.findFirstOrThrow({
      where: { id: ruleId, tenantId },
    });
    return this.prisma.amlRule.update({
      where: { id: ruleId },
      data: { isActive: false },
    });
  }

  // ─── Transaction Evaluation ─────────────────────────────────────

  /**
   * Evaluate a transaction against all active AML rules.
   * Creates alerts for any triggered rules.
   */
  async evaluateTransaction(
    tenantId: string,
    customerId: string,
    amountPaise: bigint,
    transactionType: string,
    transactionId?: string,
  ): Promise<AmlEvaluationResult> {
    const rules = await this.prisma.amlRule.findMany({
      where: { tenantId, isActive: true },
    });

    const alerts: AmlEvaluationResult['alerts'] = [];

    for (const rule of rules) {
      const triggered = await this.evaluateRule(
        rule as RuleRecord,
        tenantId,
        customerId,
        amountPaise,
        transactionType,
      );

      if (triggered) {
        const alert = await this.prisma.amlAlert.create({
          data: {
            tenantId,
            customerId,
            ruleId: rule.id,
            alertType: triggered.alertType as 'SUSPICIOUS_TRANSACTION' | 'HIGH_VALUE' | 'RAPID_TRANSACTIONS' | 'UNUSUAL_PATTERN' | 'STRUCTURING' | 'COUNTRY_RISK',
            severity: rule.severity,
            description: triggered.description,
            transactionIds: (transactionId ? [transactionId] : []) as any,
            amountPaise,
            status: 'NEW',
          },
        });

        alerts.push({
          ruleId: rule.id,
          alertType: triggered.alertType,
          severity: rule.severity,
          description: triggered.description,
        });

        // Emit event for each alert
        await this.eventBus.publish({
          id: uuidv4(),
          tenantId,
          userId: 'SYSTEM',
          timestamp: new Date().toISOString(),
          type: 'compliance.aml.alert_created',
          payload: {
            alertId: alert.id,
            customerId,
            alertType: triggered.alertType,
            severity: rule.severity,
            amountPaise: Number(amountPaise),
          },
        });
      }
    }

    return {
      passed: alerts.length === 0,
      alertsCreated: alerts.length,
      alerts,
    };
  }

  // ─── Rule Evaluation Logic ──────────────────────────────────────

  private async evaluateRule(
    rule: RuleRecord,
    tenantId: string,
    customerId: string,
    amountPaise: bigint,
    _transactionType: string,
  ): Promise<{ alertType: string; description: string } | null> {
    const params = rule.parameters as AmlRuleParameters;

    switch (rule.ruleType) {
      case 'TRANSACTION_AMOUNT_LIMIT':
        return this.checkAmountLimit(params, amountPaise);

      case 'HIGH_VALUE_ALERT':
        return this.checkHighValue(params, amountPaise);

      case 'FREQUENCY_LIMIT':
        return this.checkFrequency(params, tenantId, customerId);

      case 'VELOCITY_CHECK':
        return this.checkVelocity(params, tenantId, customerId, amountPaise);

      case 'STRUCTURING':
        return this.checkStructuring(params, tenantId, customerId, amountPaise);

      case 'COUNTRY_RESTRICTION':
        return this.checkCountryRestriction(params, tenantId, customerId);

      case 'PEP_CHECK':
        // PEP check would typically integrate with external screening service
        return null;

      default:
        return null;
    }
  }

  /** Single transaction above threshold */
  private checkAmountLimit(
    params: AmlRuleParameters,
    amountPaise: bigint,
  ): { alertType: string; description: string } | null {
    const maxAmount = params.maxAmountPaise;
    if (!maxAmount) return null;

    if (amountPaise > BigInt(maxAmount)) {
      return {
        alertType: 'HIGH_VALUE',
        description: `Transaction amount ${Number(amountPaise) / 100} exceeds limit of ${maxAmount / 100}. Single transaction threshold breached.`,
      };
    }
    return null;
  }

  /** High-value transaction alert (same as amount limit but different alert type) */
  private checkHighValue(
    params: AmlRuleParameters,
    amountPaise: bigint,
  ): { alertType: string; description: string } | null {
    const threshold = params.maxAmountPaise;
    if (!threshold) return null;

    if (amountPaise > BigInt(threshold)) {
      return {
        alertType: 'HIGH_VALUE',
        description: `High-value transaction detected: ${Number(amountPaise) / 100}. Requires enhanced due diligence.`,
      };
    }
    return null;
  }

  /** Frequency: more than N transactions in period */
  private async checkFrequency(
    params: AmlRuleParameters,
    tenantId: string,
    customerId: string,
  ): Promise<{ alertType: string; description: string } | null> {
    const maxCount = params.maxCount;
    const period = params.period;
    if (!maxCount || !period) return null;

    const since = this.periodToDate(period);

    // Count recent alerts/transactions for this customer
    const recentAlertCount = await this.prisma.amlAlert.count({
      where: {
        tenantId,
        customerId,
        createdAt: { gte: since },
      },
    });

    // We use alert count as a proxy; in production, query the payment/sale tables
    // This is a simplified check
    if (recentAlertCount >= maxCount) {
      return {
        alertType: 'RAPID_TRANSACTIONS',
        description: `Customer has ${recentAlertCount} transactions in the last ${period}, exceeding limit of ${maxCount}.`,
      };
    }
    return null;
  }

  /** Velocity: spending rate exceeds normal pattern */
  private async checkVelocity(
    params: AmlRuleParameters,
    tenantId: string,
    customerId: string,
    amountPaise: bigint,
  ): Promise<{ alertType: string; description: string } | null> {
    const threshold = params.velocityThresholdPaise;
    if (!threshold) return null;

    // Get customer risk record for baseline comparison
    const risk = await this.prisma.amlCustomerRisk.findFirst({
      where: { tenantId, customerId },
    });

    if (!risk) return null;

    // If this single transaction exceeds the velocity threshold
    // (which represents typical transaction volume per period)
    if (Number(amountPaise) > threshold) {
      return {
        alertType: 'UNUSUAL_PATTERN',
        description: `Transaction amount ${Number(amountPaise) / 100} significantly exceeds customer's typical pattern. Velocity threshold: ${threshold / 100}.`,
      };
    }
    return null;
  }

  /** Structuring: multiple transactions just below reporting threshold */
  private async checkStructuring(
    params: AmlRuleParameters,
    tenantId: string,
    customerId: string,
    amountPaise: bigint,
  ): Promise<{ alertType: string; description: string } | null> {
    const threshold = params.structuringThresholdPaise;
    const windowHours = params.structuringWindowHours ?? 24;
    if (!threshold) return null;

    // Check if this transaction is just below the threshold (within 10%)
    const lowerBound = BigInt(Math.floor(threshold * 0.9));
    const upperBound = BigInt(threshold);

    if (amountPaise < lowerBound || amountPaise > upperBound) return null;

    // Count transactions in window that are also near the threshold
    const since = new Date(Date.now() - windowHours * 60 * 60 * 1000);

    const nearThresholdAlerts = await this.prisma.amlAlert.count({
      where: {
        tenantId,
        customerId,
        alertType: 'STRUCTURING',
        createdAt: { gte: since },
      },
    });

    // If there's already been a structuring alert in the window, this is suspicious
    if (nearThresholdAlerts >= 1) {
      return {
        alertType: 'STRUCTURING',
        description: `Possible structuring detected. Transaction of ${Number(amountPaise) / 100} is near reporting threshold of ${threshold / 100}. Multiple near-threshold transactions in ${windowHours}h window.`,
      };
    }

    // First near-threshold transaction, still flag it for monitoring
    return {
      alertType: 'STRUCTURING',
      description: `Transaction of ${Number(amountPaise) / 100} is near the reporting threshold of ${threshold / 100}. Flagged for structuring monitoring.`,
    };
  }

  /** Country risk check */
  private async checkCountryRestriction(
    params: AmlRuleParameters,
    tenantId: string,
    customerId: string,
  ): Promise<{ alertType: string; description: string } | null> {
    const restricted = params.restrictedCountries;
    if (!restricted || restricted.length === 0) return null;

    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId },
      select: { country: true },
    });

    if (customer?.country && restricted.includes(customer.country)) {
      return {
        alertType: 'COUNTRY_RISK',
        description: `Customer is from a restricted country: ${customer.country}. Enhanced due diligence required.`,
      };
    }
    return null;
  }

  // ─── Helpers ────────────────────────────────────────────────────

  private periodToDate(period: string): Date {
    const now = Date.now();
    const match = period.match(/^(\d+)(h|d|w|m)$/);
    if (!match) return new Date(now - 24 * 60 * 60 * 1000); // default 24h

    const value = parseInt(match[1]!, 10);
    switch (match[2]) {
      case 'h': return new Date(now - value * 60 * 60 * 1000);
      case 'd': return new Date(now - value * 24 * 60 * 60 * 1000);
      case 'w': return new Date(now - value * 7 * 24 * 60 * 60 * 1000);
      case 'm': return new Date(now - value * 30 * 24 * 60 * 60 * 1000);
      default: return new Date(now - 24 * 60 * 60 * 1000);
    }
  }
}
