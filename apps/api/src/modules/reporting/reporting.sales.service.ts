// ─── Reporting Sales Service ──────────────────────────────────
// Sales reports: daily summary, by product, salesperson, location, category.

import { Injectable } from '@nestjs/common';
import { TenantAwareService } from '../../common/base.service';
import { PrismaService } from '../../common/prisma.service';
import type {
  SalesReportResponse,
  SalesSummaryRow,
  SalesByProductRow,
  SalesBySalespersonRow,
  SalesByLocationRow,
  SalesByCategoryRow,
  PaymentBreakdownRow,
  SalesComparisonResponse,
  DateRange,
} from '@caratflow/shared-types';

@Injectable()
export class ReportingSalesService extends TenantAwareService {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  /**
   * Daily sales summary: count, revenue, avg ticket, payment breakdown.
   */
  async dailySalesSummary(
    tenantId: string,
    date: Date,
    locationId?: string,
  ): Promise<{
    summary: SalesSummaryRow;
    paymentBreakdown: PaymentBreakdownRow[];
  }> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const where: Record<string, unknown> = {
      tenantId,
      status: 'COMPLETED',
      createdAt: { gte: startOfDay, lte: endOfDay },
      ...(locationId ? { locationId } : {}),
    };

    const [salesAgg, returnAgg, paymentAgg] = await Promise.all([
      this.prisma.sale.aggregate({
        where,
        _count: { id: true },
        _sum: { totalPaise: true },
        _avg: { totalPaise: true },
      }),
      this.prisma.saleReturn.aggregate({
        where: {
          tenantId,
          status: 'COMPLETED',
          createdAt: { gte: startOfDay, lte: endOfDay },
          ...(locationId ? { locationId } : {}),
        },
        _count: { id: true },
        _sum: { refundAmountPaise: true },
      }),
      this.prisma.salePayment.groupBy({
        by: ['method'],
        where: {
          tenantId,
          status: 'COMPLETED',
          sale: {
            ...where,
          },
        },
        _count: { id: true },
        _sum: { amountPaise: true },
      }),
    ]);

    const totalRevenue = Number(salesAgg._sum.totalPaise ?? 0);
    const totalRefunds = Number(returnAgg._sum.refundAmountPaise ?? 0);
    const salesCount = salesAgg._count.id;
    const netRevenue = totalRevenue - totalRefunds;

    const summary: SalesSummaryRow = {
      date: date.toISOString().split('T')[0]!,
      salesCount,
      totalRevenuePaise: totalRevenue,
      avgTicketPaise: salesCount > 0 ? Math.round(totalRevenue / salesCount) : 0,
      returnCount: returnAgg._count.id,
      netRevenuePaise: netRevenue,
    };

    const totalPayments = paymentAgg.reduce(
      (sum, p) => sum + Number(p._sum.amountPaise ?? 0),
      0,
    );

    const paymentBreakdown: PaymentBreakdownRow[] = paymentAgg.map((p) => ({
      method: p.method,
      count: p._count.id,
      totalPaise: Number(p._sum.amountPaise ?? 0),
      percentageOfTotal:
        totalPayments > 0
          ? Math.round((Number(p._sum.amountPaise ?? 0) / totalPayments) * 10000) / 100
          : 0,
    }));

    return { summary, paymentBreakdown };
  }

  /**
   * Sales by period: time series data grouped by day/week/month.
   */
  async salesByPeriod(
    tenantId: string,
    dateRange: DateRange,
    groupBy: 'day' | 'week' | 'month' = 'day',
    locationId?: string,
  ): Promise<SalesReportResponse> {
    const where: Record<string, unknown> = {
      tenantId,
      status: 'COMPLETED',
      createdAt: { gte: dateRange.from, lte: dateRange.to },
      ...(locationId ? { locationId } : {}),
    };

    // Fetch all completed sales in the range
    const sales = await this.prisma.sale.findMany({
      where,
      select: {
        id: true,
        totalPaise: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const returns = await this.prisma.saleReturn.findMany({
      where: {
        tenantId,
        status: 'COMPLETED',
        createdAt: { gte: dateRange.from, lte: dateRange.to },
        ...(locationId ? { locationId } : {}),
      },
      select: {
        refundAmountPaise: true,
        createdAt: true,
      },
    });

    // Group sales by period
    const groupedSales = new Map<string, { count: number; totalPaise: number }>();
    const groupedReturns = new Map<string, { count: number; totalPaise: number }>();

    for (const sale of sales) {
      const key = this.getPeriodKey(sale.createdAt, groupBy);
      const existing = groupedSales.get(key) ?? { count: 0, totalPaise: 0 };
      existing.count += 1;
      existing.totalPaise += Number(sale.totalPaise);
      groupedSales.set(key, existing);
    }

    for (const ret of returns) {
      const key = this.getPeriodKey(ret.createdAt, groupBy);
      const existing = groupedReturns.get(key) ?? { count: 0, totalPaise: 0 };
      existing.count += 1;
      existing.totalPaise += Number(ret.refundAmountPaise);
      groupedReturns.set(key, existing);
    }

    // Build summary rows
    const allKeys = new Set([...groupedSales.keys(), ...groupedReturns.keys()]);
    const summary: SalesSummaryRow[] = Array.from(allKeys)
      .sort()
      .map((key) => {
        const s = groupedSales.get(key) ?? { count: 0, totalPaise: 0 };
        const r = groupedReturns.get(key) ?? { count: 0, totalPaise: 0 };
        return {
          date: key,
          salesCount: s.count,
          totalRevenuePaise: s.totalPaise,
          avgTicketPaise: s.count > 0 ? Math.round(s.totalPaise / s.count) : 0,
          returnCount: r.count,
          netRevenuePaise: s.totalPaise - r.totalPaise,
        };
      });

    const totalSales = summary.reduce((sum, s) => sum + s.salesCount, 0);
    const totalRevenue = summary.reduce((sum, s) => sum + s.totalRevenuePaise, 0);
    const totalReturns = summary.reduce((sum, s) => sum + s.returnCount, 0);
    const netRevenue = summary.reduce((sum, s) => sum + s.netRevenuePaise, 0);

    return {
      summary,
      totals: {
        totalSales,
        totalRevenuePaise: totalRevenue,
        avgTicketPaise: totalSales > 0 ? Math.round(totalRevenue / totalSales) : 0,
        totalReturns,
        netRevenuePaise: netRevenue,
      },
    };
  }

  /**
   * Sales by product: top sellers by revenue/quantity.
   */
  async salesByProduct(
    tenantId: string,
    dateRange: DateRange,
    locationId?: string,
    limit: number = 50,
  ): Promise<SalesByProductRow[]> {
    const lineItems = await this.prisma.saleLineItem.findMany({
      where: {
        tenantId,
        sale: {
          tenantId,
          status: 'COMPLETED',
          createdAt: { gte: dateRange.from, lte: dateRange.to },
          ...(locationId ? { locationId } : {}),
        },
      },
      select: {
        productId: true,
        quantity: true,
        lineTotalPaise: true,
        product: {
          select: { name: true, sku: true, category: { select: { name: true } } },
        },
      },
    });

    // Aggregate by product
    const productMap = new Map<string, SalesByProductRow>();
    for (const item of lineItems) {
      if (!item.productId) continue;
      const existing = productMap.get(item.productId);
      if (existing) {
        existing.quantitySold += item.quantity;
        existing.totalRevenuePaise += Number(item.lineTotalPaise);
      } else {
        productMap.set(item.productId, {
          productId: item.productId,
          productName: item.product?.name ?? 'Unknown',
          sku: item.product?.sku ?? '',
          categoryName: item.product?.category?.name ?? null,
          quantitySold: item.quantity,
          totalRevenuePaise: Number(item.lineTotalPaise),
        });
      }
    }

    return Array.from(productMap.values())
      .sort((a, b) => b.totalRevenuePaise - a.totalRevenuePaise)
      .slice(0, limit);
  }

  /**
   * Sales by salesperson: performance ranking.
   */
  async salesBySalesperson(
    tenantId: string,
    dateRange: DateRange,
    locationId?: string,
  ): Promise<SalesBySalespersonRow[]> {
    const sales = await this.prisma.sale.findMany({
      where: {
        tenantId,
        status: 'COMPLETED',
        createdAt: { gte: dateRange.from, lte: dateRange.to },
        ...(locationId ? { locationId } : {}),
      },
      select: {
        userId: true,
        totalPaise: true,
        user: { select: { firstName: true, lastName: true } },
      },
    });

    const userMap = new Map<string, SalesBySalespersonRow>();
    for (const sale of sales) {
      const existing = userMap.get(sale.userId);
      if (existing) {
        existing.salesCount += 1;
        existing.totalRevenuePaise += Number(sale.totalPaise);
        existing.avgTicketPaise = Math.round(
          existing.totalRevenuePaise / existing.salesCount,
        );
      } else {
        userMap.set(sale.userId, {
          userId: sale.userId,
          salespersonName: `${sale.user.firstName} ${sale.user.lastName}`,
          salesCount: 1,
          totalRevenuePaise: Number(sale.totalPaise),
          avgTicketPaise: Number(sale.totalPaise),
        });
      }
    }

    return Array.from(userMap.values()).sort(
      (a, b) => b.totalRevenuePaise - a.totalRevenuePaise,
    );
  }

  /**
   * Sales by category: category breakdown.
   */
  async salesByCategory(
    tenantId: string,
    dateRange: DateRange,
  ): Promise<SalesByCategoryRow[]> {
    const lineItems = await this.prisma.saleLineItem.findMany({
      where: {
        tenantId,
        sale: {
          tenantId,
          status: 'COMPLETED',
          createdAt: { gte: dateRange.from, lte: dateRange.to },
        },
      },
      select: {
        quantity: true,
        lineTotalPaise: true,
        product: {
          select: { categoryId: true, category: { select: { name: true } } },
        },
      },
    });

    const categoryMap = new Map<string, { name: string; quantity: number; total: number }>();
    let grandTotal = 0;

    for (const item of lineItems) {
      const catId = item.product?.categoryId ?? 'uncategorized';
      const catName = item.product?.category?.name ?? 'Uncategorized';
      const total = Number(item.lineTotalPaise);
      grandTotal += total;

      const existing = categoryMap.get(catId);
      if (existing) {
        existing.quantity += item.quantity;
        existing.total += total;
      } else {
        categoryMap.set(catId, { name: catName, quantity: item.quantity, total });
      }
    }

    return Array.from(categoryMap.entries())
      .map(([catId, data]) => ({
        categoryId: catId === 'uncategorized' ? null : catId,
        categoryName: data.name,
        quantitySold: data.quantity,
        totalRevenuePaise: data.total,
        percentageOfTotal:
          grandTotal > 0
            ? Math.round((data.total / grandTotal) * 10000) / 100
            : 0,
      }))
      .sort((a, b) => b.totalRevenuePaise - a.totalRevenuePaise);
  }

  /**
   * Sales by location: branch comparison.
   */
  async salesByLocation(
    tenantId: string,
    dateRange: DateRange,
  ): Promise<SalesByLocationRow[]> {
    const sales = await this.prisma.sale.findMany({
      where: {
        tenantId,
        status: 'COMPLETED',
        createdAt: { gte: dateRange.from, lte: dateRange.to },
      },
      select: {
        locationId: true,
        totalPaise: true,
        location: { select: { name: true } },
      },
    });

    const locMap = new Map<string, SalesByLocationRow>();
    for (const sale of sales) {
      const existing = locMap.get(sale.locationId);
      if (existing) {
        existing.salesCount += 1;
        existing.totalRevenuePaise += Number(sale.totalPaise);
        existing.avgTicketPaise = Math.round(
          existing.totalRevenuePaise / existing.salesCount,
        );
      } else {
        locMap.set(sale.locationId, {
          locationId: sale.locationId,
          locationName: sale.location.name,
          salesCount: 1,
          totalRevenuePaise: Number(sale.totalPaise),
          avgTicketPaise: Number(sale.totalPaise),
        });
      }
    }

    return Array.from(locMap.values()).sort(
      (a, b) => b.totalRevenuePaise - a.totalRevenuePaise,
    );
  }

  /**
   * Period-over-period comparison.
   */
  async salesComparison(
    tenantId: string,
    period1: DateRange,
    period2: DateRange,
    locationId?: string,
  ): Promise<SalesComparisonResponse> {
    const [p1, p2] = await Promise.all([
      this.salesByPeriod(tenantId, period1, 'day', locationId),
      this.salesByPeriod(tenantId, period2, 'day', locationId),
    ]);

    const calcChange = (current: number, previous: number): number => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 10000) / 100;
    };

    return {
      period1: p1,
      period2: p2,
      changePercent: {
        salesCount: calcChange(p1.totals.totalSales, p2.totals.totalSales),
        revenue: calcChange(p1.totals.totalRevenuePaise, p2.totals.totalRevenuePaise),
        avgTicket: calcChange(p1.totals.avgTicketPaise, p2.totals.avgTicketPaise),
      },
    };
  }

  private getPeriodKey(date: Date, groupBy: 'day' | 'week' | 'month'): string {
    switch (groupBy) {
      case 'day':
        return date.toISOString().split('T')[0]!;
      case 'week': {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        d.setDate(diff);
        return d.toISOString().split('T')[0]!;
      }
      case 'month':
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }
  }
}
