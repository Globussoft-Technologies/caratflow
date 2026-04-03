// ─── Reporting CRM Service ────────────────────────────────────
// Customer acquisition, retention, LTV, loyalty, lead conversion, campaigns.

import { Injectable } from '@nestjs/common';
import { TenantAwareService } from '../../common/base.service';
import { PrismaService } from '../../common/prisma.service';
import type {
  CustomerAcquisitionRow,
  CustomerRetentionRow,
  CustomerLifetimeValueRow,
  LoyaltyMetricsResponse,
  LeadConversionRow,
  CampaignPerformanceRow,
  CrmReportResponse,
  DateRange,
} from '@caratflow/shared-types';

@Injectable()
export class ReportingCrmService extends TenantAwareService {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  /**
   * Customer acquisition: new customers by source.
   */
  async customerAcquisition(
    tenantId: string,
    dateRange: DateRange,
  ): Promise<CustomerAcquisitionRow[]> {
    const leads = await this.prisma.lead.findMany({
      where: {
        tenantId,
        status: 'WON',
        createdAt: { gte: dateRange.from, lte: dateRange.to },
      },
      select: {
        source: true,
        createdAt: true,
      },
    });

    const acquisitionMap = new Map<string, Map<string, number>>();

    for (const lead of leads) {
      const month = `${lead.createdAt.getFullYear()}-${String(lead.createdAt.getMonth() + 1).padStart(2, '0')}`;
      const sourceMap = acquisitionMap.get(month) ?? new Map<string, number>();
      sourceMap.set(lead.source, (sourceMap.get(lead.source) ?? 0) + 1);
      acquisitionMap.set(month, sourceMap);
    }

    // Also count customers directly created in the period
    const newCustomers = await this.prisma.customer.findMany({
      where: {
        tenantId,
        createdAt: { gte: dateRange.from, lte: dateRange.to },
      },
      select: { createdAt: true },
    });

    const monthlyNewCustomers = new Map<string, number>();
    for (const c of newCustomers) {
      const month = `${c.createdAt.getFullYear()}-${String(c.createdAt.getMonth() + 1).padStart(2, '0')}`;
      monthlyNewCustomers.set(month, (monthlyNewCustomers.get(month) ?? 0) + 1);
    }

    const result: CustomerAcquisitionRow[] = [];
    for (const [period, sourceMap] of acquisitionMap) {
      for (const [source, count] of sourceMap) {
        result.push({
          period,
          newCustomers: monthlyNewCustomers.get(period) ?? 0,
          source,
          count,
        });
      }
    }

    return result.sort((a, b) => a.period.localeCompare(b.period));
  }

  /**
   * Customer retention: repeat purchase rate.
   */
  async customerRetention(
    tenantId: string,
    dateRange: DateRange,
  ): Promise<CustomerRetentionRow[]> {
    const sales = await this.prisma.sale.findMany({
      where: {
        tenantId,
        status: 'COMPLETED',
        createdAt: { gte: dateRange.from, lte: dateRange.to },
        customerId: { not: null },
      },
      select: {
        customerId: true,
        createdAt: true,
      },
    });

    // Group by month, then count unique and repeat customers
    const monthlyCustomers = new Map<string, Set<string>>();
    const customerFirstPurchase = new Map<string, string>();

    for (const sale of sales) {
      if (!sale.customerId) continue;
      const month = `${sale.createdAt.getFullYear()}-${String(sale.createdAt.getMonth() + 1).padStart(2, '0')}`;
      const customerSet = monthlyCustomers.get(month) ?? new Set<string>();
      customerSet.add(sale.customerId);
      monthlyCustomers.set(month, customerSet);

      // Track first purchase month
      const existing = customerFirstPurchase.get(sale.customerId);
      if (!existing || month < existing) {
        customerFirstPurchase.set(sale.customerId, month);
      }
    }

    const result: CustomerRetentionRow[] = [];
    for (const [month, customerSet] of monthlyCustomers) {
      const total = customerSet.size;
      let repeatCount = 0;

      for (const customerId of customerSet) {
        const firstMonth = customerFirstPurchase.get(customerId);
        if (firstMonth && firstMonth < month) {
          repeatCount++;
        }
      }

      result.push({
        period: month,
        totalCustomers: total,
        repeatCustomers: repeatCount,
        retentionRate:
          total > 0
            ? Math.round((repeatCount / total) * 10000) / 100
            : 0,
      });
    }

    return result.sort((a, b) => a.period.localeCompare(b.period));
  }

  /**
   * Customer lifetime value: top customers by total spend.
   */
  async customerLifetimeValue(
    tenantId: string,
    dateRange: DateRange,
    limit: number = 50,
  ): Promise<CustomerLifetimeValueRow[]> {
    const sales = await this.prisma.sale.findMany({
      where: {
        tenantId,
        status: 'COMPLETED',
        createdAt: { gte: dateRange.from, lte: dateRange.to },
        customerId: { not: null },
      },
      select: {
        customerId: true,
        totalPaise: true,
        createdAt: true,
        customer: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    const customerMap = new Map<
      string,
      {
        name: string;
        totalSpend: number;
        transactions: number;
        first: Date;
        last: Date;
      }
    >();

    for (const sale of sales) {
      if (!sale.customerId) continue;
      const existing = customerMap.get(sale.customerId);
      if (existing) {
        existing.totalSpend += Number(sale.totalPaise);
        existing.transactions += 1;
        if (sale.createdAt > existing.last) existing.last = sale.createdAt;
      } else {
        customerMap.set(sale.customerId, {
          name: `${sale.customer?.firstName ?? ''} ${sale.customer?.lastName ?? ''}`.trim(),
          totalSpend: Number(sale.totalPaise),
          transactions: 1,
          first: sale.createdAt,
          last: sale.createdAt,
        });
      }
    }

    return Array.from(customerMap.entries())
      .map(([customerId, data]) => ({
        customerId,
        customerName: data.name,
        totalSpendPaise: data.totalSpend,
        totalTransactions: data.transactions,
        avgTransactionPaise:
          data.transactions > 0
            ? Math.round(data.totalSpend / data.transactions)
            : 0,
        firstPurchaseDate: data.first.toISOString().split('T')[0]!,
        lastPurchaseDate: data.last.toISOString().split('T')[0]!,
      }))
      .sort((a, b) => b.totalSpendPaise - a.totalSpendPaise)
      .slice(0, limit);
  }

  /**
   * Loyalty metrics: points issued/redeemed, active members by tier.
   */
  async loyaltyMetrics(tenantId: string): Promise<LoyaltyMetricsResponse> {
    const [earned, redeemed, expired] = await Promise.all([
      this.prisma.loyaltyTransaction.aggregate({
        where: { tenantId, transactionType: 'EARNED' },
        _sum: { points: true },
      }),
      this.prisma.loyaltyTransaction.aggregate({
        where: { tenantId, transactionType: 'REDEEMED' },
        _sum: { points: true },
      }),
      this.prisma.loyaltyTransaction.aggregate({
        where: { tenantId, transactionType: 'EXPIRED' },
        _sum: { points: true },
      }),
    ]);

    // Active loyalty members: customers with loyaltyPoints > 0
    const activeMembers = await this.prisma.customer.count({
      where: { tenantId, loyaltyPoints: { gt: 0 } },
    });

    // Tier breakdown
    const tiers = await this.prisma.customer.groupBy({
      by: ['loyaltyTier'],
      where: { tenantId, loyaltyPoints: { gt: 0 }, loyaltyTier: { not: null } },
      _count: { id: true },
    });

    return {
      totalPointsIssued: earned._sum.points ?? 0,
      totalPointsRedeemed: redeemed._sum.points ?? 0,
      totalPointsExpired: expired._sum.points ?? 0,
      activeMembers,
      tierBreakdown: tiers.map((t) => ({
        tier: t.loyaltyTier ?? 'Unknown',
        count: t._count.id,
      })),
    };
  }

  /**
   * Lead conversion: funnel from new to won.
   */
  async leadConversion(
    tenantId: string,
    dateRange: DateRange,
  ): Promise<LeadConversionRow[]> {
    const leads = await this.prisma.lead.groupBy({
      by: ['status'],
      where: {
        tenantId,
        createdAt: { gte: dateRange.from, lte: dateRange.to },
      },
      _count: { id: true },
      _sum: { estimatedValuePaise: true },
    });

    const totalLeads = leads.reduce((sum, l) => sum + l._count.id, 0);
    const funnelOrder = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'];

    return funnelOrder
      .map((status) => {
        const data = leads.find((l) => l.status === status);
        const count = data?._count.id ?? 0;
        return {
          status,
          count,
          totalValuePaise: Number(data?._sum.estimatedValuePaise ?? 0),
          conversionRate:
            totalLeads > 0
              ? Math.round((count / totalLeads) * 10000) / 100
              : 0,
        };
      })
      .filter((r) => r.count > 0);
  }

  /**
   * Campaign performance: delivery rates, send counts.
   */
  async campaignPerformance(
    tenantId: string,
    dateRange: DateRange,
  ): Promise<CampaignPerformanceRow[]> {
    const campaigns = await this.prisma.campaign.findMany({
      where: {
        tenantId,
        createdAt: { gte: dateRange.from, lte: dateRange.to },
      },
      select: {
        id: true,
        name: true,
        channel: true,
        totalRecipients: true,
        sentCount: true,
        deliveredCount: true,
        failedCount: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return campaigns.map((c) => ({
      campaignId: c.id,
      campaignName: c.name,
      channel: c.channel,
      totalRecipients: c.totalRecipients,
      sentCount: c.sentCount,
      deliveredCount: c.deliveredCount,
      deliveryRate:
        c.sentCount > 0
          ? Math.round((c.deliveredCount / c.sentCount) * 10000) / 100
          : 0,
    }));
  }

  /**
   * Aggregated CRM overview for a given period.
   */
  async crmOverview(
    tenantId: string,
    dateRange: DateRange,
  ): Promise<CrmReportResponse> {
    const [totalCustomers, newCustomers, salesWithCustomers] = await Promise.all([
      this.prisma.customer.count({ where: { tenantId } }),
      this.prisma.customer.count({
        where: {
          tenantId,
          createdAt: { gte: dateRange.from, lte: dateRange.to },
        },
      }),
      this.prisma.sale.findMany({
        where: {
          tenantId,
          status: 'COMPLETED',
          createdAt: { gte: dateRange.from, lte: dateRange.to },
          customerId: { not: null },
        },
        select: { customerId: true, totalPaise: true },
      }),
    ]);

    // Repeat purchase rate: customers with > 1 purchase
    const customerPurchaseCount = new Map<string, number>();
    let totalSpend = 0;
    for (const sale of salesWithCustomers) {
      if (sale.customerId) {
        customerPurchaseCount.set(
          sale.customerId,
          (customerPurchaseCount.get(sale.customerId) ?? 0) + 1,
        );
        totalSpend += Number(sale.totalPaise);
      }
    }

    const customersWithPurchases = customerPurchaseCount.size;
    const repeatCustomers = Array.from(customerPurchaseCount.values()).filter(
      (c) => c > 1,
    ).length;

    return {
      totalCustomers,
      newCustomersInPeriod: newCustomers,
      repeatPurchaseRate:
        customersWithPurchases > 0
          ? Math.round((repeatCustomers / customersWithPurchases) * 10000) / 100
          : 0,
      avgLifetimeValuePaise:
        customersWithPurchases > 0
          ? Math.round(totalSpend / customersWithPurchases)
          : 0,
    };
  }
}
