// ─── AML Risk Service ──────────────────────────────────────────
// Customer risk scoring: aggregate KYC status, transaction volume,
// alert history, country risk, and PEP status into a 0-100 score.

import { Injectable, Logger } from '@nestjs/common';
import { TenantAwareService } from '../../common/base.service';
import { PrismaService } from '../../common/prisma.service';

interface RiskFactor {
  factor: string;
  weight: number;
  description: string;
}

type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';

// High-risk countries (FATF grey/black list -- simplified)
const HIGH_RISK_COUNTRIES = new Set([
  'AF', 'MM', 'KP', 'IR', 'SY', 'YE', 'SO', 'SD',
]);

@Injectable()
export class AmlRiskService extends TenantAwareService {
  private readonly logger = new Logger(AmlRiskService.name);

  constructor(prisma: PrismaService) {
    super(prisma);
  }

  /** Calculate and update customer risk score */
  async calculateCustomerRisk(tenantId: string, customerId: string) {
    const customer = await this.prisma.customer.findFirstOrThrow({
      where: { id: customerId, tenantId },
    });

    const factors: RiskFactor[] = [];
    let totalScore = 0;

    // Factor 1: KYC Status (0-25 points)
    const kycScore = this.assessKycRisk(customer, factors);
    totalScore += kycScore;

    // Factor 2: Transaction Volume (0-20 points)
    const volumeScore = await this.assessTransactionVolume(tenantId, customerId, factors);
    totalScore += volumeScore;

    // Factor 3: Alert History (0-25 points)
    const alertScore = await this.assessAlertHistory(tenantId, customerId, factors);
    totalScore += alertScore;

    // Factor 4: Country Risk (0-15 points)
    const countryScore = this.assessCountryRisk(customer.country, factors);
    totalScore += countryScore;

    // Factor 5: Customer Profile (0-15 points)
    const profileScore = this.assessProfileRisk(customer, factors);
    totalScore += profileScore;

    // Clamp to 0-100
    const riskScore = Math.min(100, Math.max(0, totalScore));
    const riskLevel = this.scoreToLevel(riskScore);

    // Calculate next review date based on risk level
    const nextReviewDate = this.getNextReviewDate(riskLevel);

    // Get transaction stats
    const alertCount = await this.prisma.amlAlert.count({
      where: { tenantId, customerId },
    });

    // Upsert customer risk record
    const existingRisk = await this.prisma.amlCustomerRisk.findFirst({
      where: { tenantId, customerId },
    });

    const riskData = {
      riskScore,
      riskLevel,
      factors: factors as unknown as Record<string, unknown>[],
      lastAssessedAt: new Date(),
      nextReviewDate,
      kycStatus: this.getKycStatus(customer),
      flagCount: alertCount,
    };

    if (existingRisk) {
      await this.prisma.amlCustomerRisk.update({
        where: { id: existingRisk.id },
        data: riskData,
      });
    } else {
      await this.prisma.amlCustomerRisk.create({
        data: {
          tenantId,
          customerId,
          ...riskData,
          transactionVolumePaise: BigInt(0),
          transactionCount: 0,
        },
      });
    }

    this.logger.log(`Risk score for customer ${customerId}: ${riskScore} (${riskLevel})`);

    return {
      customerId,
      riskScore,
      riskLevel,
      factors,
    };
  }

  /** Get customer risk profile */
  async getCustomerRisk(tenantId: string, customerId: string) {
    const risk = await this.prisma.amlCustomerRisk.findFirst({
      where: { tenantId, customerId },
    });

    if (!risk) {
      // Calculate if not yet assessed
      return this.calculateCustomerRisk(tenantId, customerId);
    }

    const customer = await this.prisma.customer.findFirstOrThrow({
      where: { id: customerId, tenantId },
      select: { firstName: true, lastName: true },
    });

    return {
      customerId,
      customerName: `${customer.firstName} ${customer.lastName}`,
      riskScore: risk.riskScore,
      riskLevel: risk.riskLevel,
      factors: risk.factors as RiskFactor[],
      lastAssessedAt: risk.lastAssessedAt,
      nextReviewDate: risk.nextReviewDate,
      kycStatus: risk.kycStatus,
      transactionVolumePaise: Number(risk.transactionVolumePaise),
      transactionCount: risk.transactionCount,
      flagCount: risk.flagCount,
    };
  }

  /** List high-risk customers */
  async listHighRiskCustomers(tenantId: string, page = 1, limit = 20) {
    const where = { tenantId, riskLevel: { in: ['HIGH' as const, 'VERY_HIGH' as const] } };

    const [items, total] = await Promise.all([
      this.prisma.amlCustomerRisk.findMany({
        where,
        orderBy: { riskScore: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.amlCustomerRisk.count({ where }),
    ]);

    // Enrich with customer names
    const customerIds = items.map((i) => i.customerId);
    const customers = await this.prisma.customer.findMany({
      where: { id: { in: customerIds }, tenantId },
      select: { id: true, firstName: true, lastName: true },
    });
    const customerMap = new Map(customers.map((c) => [c.id, `${c.firstName} ${c.lastName}`]));

    const enrichedItems = items.map((item) => ({
      ...item,
      customerName: customerMap.get(item.customerId) ?? 'Unknown',
      transactionVolumePaise: Number(item.transactionVolumePaise),
    }));

    const totalPages = Math.ceil(total / limit);
    return { items: enrichedItems, total, page, limit, totalPages, hasNext: page < totalPages, hasPrevious: page > 1 };
  }

  /** Get risk distribution for dashboard */
  async getRiskDistribution(tenantId: string): Promise<Record<string, number>> {
    const levels: RiskLevel[] = ['LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH'];
    const counts: Record<string, number> = {};

    for (const level of levels) {
      counts[level] = await this.prisma.amlCustomerRisk.count({
        where: { tenantId, riskLevel: level },
      });
    }

    return counts;
  }

  // ─── Risk Assessment Factors ────────────────────────────────────

  private assessKycRisk(customer: Record<string, unknown>, factors: RiskFactor[]): number {
    let score = 0;

    const hasPan = !!customer.panNumber;
    const hasAadhaar = !!customer.aadhaarNumber;

    if (!hasPan && !hasAadhaar) {
      score += 25;
      factors.push({
        factor: 'KYC_INCOMPLETE',
        weight: 25,
        description: 'Customer has no KYC documents on file (PAN or Aadhaar)',
      });
    } else if (!hasPan || !hasAadhaar) {
      score += 10;
      factors.push({
        factor: 'KYC_PARTIAL',
        weight: 10,
        description: `Customer has ${hasPan ? 'PAN' : 'Aadhaar'} but missing ${hasPan ? 'Aadhaar' : 'PAN'}`,
      });
    } else {
      factors.push({
        factor: 'KYC_COMPLETE',
        weight: 0,
        description: 'Customer has both PAN and Aadhaar on file',
      });
    }

    return score;
  }

  private async assessTransactionVolume(
    tenantId: string,
    customerId: string,
    factors: RiskFactor[],
  ): Promise<number> {
    // Count alerts in last 90 days as proxy for transaction volume
    const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const recentAlerts = await this.prisma.amlAlert.count({
      where: {
        tenantId,
        customerId,
        createdAt: { gte: since },
      },
    });

    let score = 0;
    if (recentAlerts > 5) {
      score = 20;
      factors.push({
        factor: 'HIGH_TRANSACTION_VOLUME',
        weight: 20,
        description: `${recentAlerts} alerts in last 90 days indicating high activity`,
      });
    } else if (recentAlerts > 2) {
      score = 10;
      factors.push({
        factor: 'MODERATE_TRANSACTION_VOLUME',
        weight: 10,
        description: `${recentAlerts} alerts in last 90 days`,
      });
    }

    return score;
  }

  private async assessAlertHistory(
    tenantId: string,
    customerId: string,
    factors: RiskFactor[],
  ): Promise<number> {
    const [totalAlerts, unresolvedAlerts, escalatedAlerts] = await Promise.all([
      this.prisma.amlAlert.count({ where: { tenantId, customerId } }),
      this.prisma.amlAlert.count({
        where: { tenantId, customerId, status: { in: ['NEW', 'UNDER_REVIEW'] } },
      }),
      this.prisma.amlAlert.count({
        where: { tenantId, customerId, status: 'ESCALATED' },
      }),
    ]);

    let score = 0;

    if (escalatedAlerts > 0) {
      score += 15;
      factors.push({
        factor: 'ESCALATED_ALERTS',
        weight: 15,
        description: `${escalatedAlerts} escalated alert(s) on record`,
      });
    }

    if (unresolvedAlerts > 3) {
      score += 10;
      factors.push({
        factor: 'UNRESOLVED_ALERTS',
        weight: 10,
        description: `${unresolvedAlerts} unresolved alerts pending review`,
      });
    }

    if (totalAlerts > 10) {
      score += 5;
      factors.push({
        factor: 'HISTORICAL_ALERTS',
        weight: 5,
        description: `${totalAlerts} total alerts in history`,
      });
    }

    return Math.min(25, score);
  }

  private assessCountryRisk(
    country: string | null | undefined,
    factors: RiskFactor[],
  ): number {
    if (!country) return 0;

    if (HIGH_RISK_COUNTRIES.has(country)) {
      factors.push({
        factor: 'HIGH_RISK_COUNTRY',
        weight: 15,
        description: `Customer country ${country} is on the high-risk list (FATF)`,
      });
      return 15;
    }

    return 0;
  }

  private assessProfileRisk(
    customer: Record<string, unknown>,
    factors: RiskFactor[],
  ): number {
    let score = 0;

    // No phone or email
    if (!customer.phone && !customer.email) {
      score += 10;
      factors.push({
        factor: 'NO_CONTACT_INFO',
        weight: 10,
        description: 'Customer has no phone or email on record',
      });
    }

    // Corporate customers get slightly higher baseline
    if (customer.customerType === 'CORPORATE') {
      score += 5;
      factors.push({
        factor: 'CORPORATE_CUSTOMER',
        weight: 5,
        description: 'Corporate customers require enhanced due diligence',
      });
    }

    return Math.min(15, score);
  }

  // ─── Helpers ────────────────────────────────────────────────────

  private scoreToLevel(score: number): RiskLevel {
    if (score >= 75) return 'VERY_HIGH';
    if (score >= 50) return 'HIGH';
    if (score >= 25) return 'MEDIUM';
    return 'LOW';
  }

  private getNextReviewDate(level: RiskLevel): Date {
    const now = new Date();
    switch (level) {
      case 'VERY_HIGH': return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 1 week
      case 'HIGH': return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 1 month
      case 'MEDIUM': return new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000); // 3 months
      case 'LOW': return new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year
    }
  }

  private getKycStatus(customer: Record<string, unknown>): string {
    const hasPan = !!customer.panNumber;
    const hasAadhaar = !!customer.aadhaarNumber;
    if (hasPan && hasAadhaar) return 'VERIFIED';
    if (hasPan || hasAadhaar) return 'PARTIAL';
    return 'PENDING';
  }
}
