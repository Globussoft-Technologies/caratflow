// ─── Reporting Dashboard Service ──────────────────────────────
// Aggregated KPI dashboard, layout management, widget data.

import { Injectable } from '@nestjs/common';
import { TenantAwareService } from '../../common/base.service';
import { PrismaService } from '../../common/prisma.service';
import type {
  AnalyticsDashboardResponse,
  KpiData,
  ChartData,
  AlertItem,
  DashboardLayoutInput,
  DashboardLayoutResponse,
  DashboardWidgetConfig,
  DateRange,
} from '@caratflow/shared-types';
import { ChartTypeEnum } from '@caratflow/shared-types';

@Injectable()
export class ReportingDashboardService extends TenantAwareService {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  /**
   * Get the analytics dashboard with aggregated KPIs from all modules.
   */
  async getAnalyticsDashboard(
    tenantId: string,
    dateRange?: DateRange,
    locationId?: string,
  ): Promise<AnalyticsDashboardResponse> {
    const now = new Date();
    const from = dateRange?.from ?? new Date(now.getFullYear(), now.getMonth(), 1);
    const to = dateRange?.to ?? now;

    // Calculate previous period for comparison
    const periodMs = to.getTime() - from.getTime();
    const prevFrom = new Date(from.getTime() - periodMs);
    const prevTo = new Date(from.getTime() - 1);

    const locationWhere = locationId ? { locationId } : {};

    // Fetch current period data in parallel
    const [
      currentSales,
      previousSales,
      currentReturns,
      activeOrders,
      lowStockCount,
      overdueJobs,
      newCustomers,
      previousNewCustomers,
    ] = await Promise.all([
      // Current period sales
      this.prisma.sale.aggregate({
        where: {
          tenantId,
          status: 'COMPLETED',
          createdAt: { gte: from, lte: to },
          ...locationWhere,
        },
        _count: { id: true },
        _sum: { totalPaise: true },
        _avg: { totalPaise: true },
      }),
      // Previous period sales (for comparison)
      this.prisma.sale.aggregate({
        where: {
          tenantId,
          status: 'COMPLETED',
          createdAt: { gte: prevFrom, lte: prevTo },
          ...locationWhere,
        },
        _count: { id: true },
        _sum: { totalPaise: true },
      }),
      // Returns in current period
      this.prisma.saleReturn.count({
        where: {
          tenantId,
          status: 'COMPLETED',
          createdAt: { gte: from, lte: to },
          ...locationWhere,
        },
      }),
      // Active repair orders
      this.prisma.repairOrder.count({
        where: {
          tenantId,
          status: { in: ['RECEIVED', 'DIAGNOSED', 'IN_PROGRESS'] },
          ...locationWhere,
        },
      }),
      // Low stock items
      this.prisma.$queryRawUnsafe<Array<{ cnt: bigint }>>(
        `SELECT COUNT(*) as cnt FROM stock_items WHERE tenant_id = ? AND quantity_on_hand < reorder_level AND reorder_level > 0`,
        tenantId,
      ),
      // Overdue manufacturing jobs
      this.prisma.jobOrder.count({
        where: {
          tenantId,
          estimatedEndDate: { lt: now },
          status: { notIn: ['COMPLETED', 'CANCELLED'] },
        },
      }),
      // New customers this period
      this.prisma.customer.count({
        where: {
          tenantId,
          createdAt: { gte: from, lte: to },
        },
      }),
      // New customers previous period
      this.prisma.customer.count({
        where: {
          tenantId,
          createdAt: { gte: prevFrom, lte: prevTo },
        },
      }),
    ]);

    const currentRevenue = Number(currentSales._sum.totalPaise ?? 0);
    const previousRevenue = Number(previousSales._sum.totalPaise ?? 0);
    const currentCount = currentSales._count.id;
    const previousCount = previousSales._count.id;

    // Build KPIs
    const kpis: KpiData[] = [
      {
        label: 'Total Revenue',
        value: currentRevenue,
        formattedValue: this.formatMoney(currentRevenue),
        trend: {
          value: this.calcChangePercent(currentRevenue, previousRevenue),
          label: 'vs previous period',
          direction: currentRevenue >= previousRevenue ? 'up' : 'down',
        },
      },
      {
        label: 'Sales Count',
        value: currentCount,
        formattedValue: currentCount.toLocaleString('en-IN'),
        trend: {
          value: this.calcChangePercent(currentCount, previousCount),
          label: 'vs previous period',
          direction: currentCount >= previousCount ? 'up' : 'down',
        },
      },
      {
        label: 'Average Ticket',
        value: Number(currentSales._avg.totalPaise ?? 0),
        formattedValue: this.formatMoney(Number(currentSales._avg.totalPaise ?? 0)),
        unit: 'INR',
      },
      {
        label: 'New Customers',
        value: newCustomers,
        formattedValue: newCustomers.toLocaleString('en-IN'),
        trend: {
          value: this.calcChangePercent(newCustomers, previousNewCustomers),
          label: 'vs previous period',
          direction: newCustomers >= previousNewCustomers ? 'up' : 'down',
        },
      },
    ];

    // Build daily sales chart for the period
    const dailySales = await this.prisma.sale.findMany({
      where: {
        tenantId,
        status: 'COMPLETED',
        createdAt: { gte: from, lte: to },
        ...locationWhere,
      },
      select: { totalPaise: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const dailyMap = new Map<string, number>();
    for (const sale of dailySales) {
      const day = sale.createdAt.toISOString().split('T')[0]!;
      dailyMap.set(day, (dailyMap.get(day) ?? 0) + Number(sale.totalPaise));
    }

    const sortedDays = Array.from(dailyMap.keys()).sort();
    const revenueChart: ChartData = {
      title: 'Daily Revenue',
      chartType: ChartTypeEnum.AREA,
      labels: sortedDays,
      datasets: [
        {
          label: 'Revenue',
          data: sortedDays.map((d) => dailyMap.get(d) ?? 0),
          color: '#10B981',
        },
      ],
    };

    // Build alerts
    const alerts: AlertItem[] = [];
    const lowStockNum = Number(lowStockCount[0]?.cnt ?? 0);

    if (lowStockNum > 0) {
      alerts.push({
        id: 'low-stock',
        severity: 'warning',
        title: `${lowStockNum} items below reorder level`,
        description: 'Review inventory and place reorder requests.',
        timestamp: now.toISOString(),
        actionUrl: '/reports/inventory',
      });
    }

    if (overdueJobs > 0) {
      alerts.push({
        id: 'overdue-jobs',
        severity: 'critical',
        title: `${overdueJobs} overdue manufacturing jobs`,
        description: 'Some jobs have exceeded their estimated completion date.',
        timestamp: now.toISOString(),
        actionUrl: '/reports/manufacturing',
      });
    }

    if (currentReturns > 0) {
      alerts.push({
        id: 'returns',
        severity: 'info',
        title: `${currentReturns} returns processed this period`,
        description: 'Review return trends for potential quality issues.',
        timestamp: now.toISOString(),
        actionUrl: '/reports/sales',
      });
    }

    if (activeOrders > 0) {
      alerts.push({
        id: 'active-repairs',
        severity: 'info',
        title: `${activeOrders} active repair orders`,
        description: 'Repair orders currently in progress.',
        timestamp: now.toISOString(),
      });
    }

    // Build trends
    const trends = [
      {
        metric: 'Revenue',
        current: currentRevenue,
        previous: previousRevenue,
        changePercent: this.calcChangePercent(currentRevenue, previousRevenue),
      },
      {
        metric: 'Sales Count',
        current: currentCount,
        previous: previousCount,
        changePercent: this.calcChangePercent(currentCount, previousCount),
      },
      {
        metric: 'New Customers',
        current: newCustomers,
        previous: previousNewCustomers,
        changePercent: this.calcChangePercent(newCustomers, previousNewCustomers),
      },
    ];

    return {
      kpis,
      charts: [revenueChart],
      alerts,
      trends,
      lastUpdated: now.toISOString(),
    };
  }

  /**
   * Save a dashboard layout for a user.
   */
  async saveDashboardLayout(
    tenantId: string,
    userId: string,
    input: DashboardLayoutInput,
  ): Promise<DashboardLayoutResponse> {
    // If setting as default, unset other defaults for this user
    if (input.isDefault) {
      await this.prisma.dashboardLayout.updateMany({
        where: { tenantId, userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const layout = await this.prisma.dashboardLayout.create({
      data: {
        tenantId,
        userId,
        name: input.name,
        isDefault: input.isDefault,
        layout: input.layout as unknown as Record<string, unknown>[],
        createdBy: userId,
      },
    });

    return {
      id: layout.id,
      tenantId: layout.tenantId,
      userId: layout.userId,
      name: layout.name,
      isDefault: layout.isDefault,
      layout: layout.layout as unknown as DashboardWidgetConfig[],
      createdAt: layout.createdAt,
      updatedAt: layout.updatedAt,
    };
  }

  /**
   * Get the dashboard layout for a user (default or first available).
   */
  async getDashboardLayout(
    tenantId: string,
    userId: string,
  ): Promise<DashboardLayoutResponse | null> {
    const layout = await this.prisma.dashboardLayout.findFirst({
      where: { tenantId, userId },
      orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
    });

    if (!layout) return null;

    return {
      id: layout.id,
      tenantId: layout.tenantId,
      userId: layout.userId,
      name: layout.name,
      isDefault: layout.isDefault,
      layout: layout.layout as unknown as DashboardWidgetConfig[],
      createdAt: layout.createdAt,
      updatedAt: layout.updatedAt,
    };
  }

  /**
   * Get data for a specific widget.
   */
  async getWidgetData(
    tenantId: string,
    widgetType: string,
    config: Record<string, unknown>,
    dateRange?: DateRange,
  ): Promise<unknown> {
    const now = new Date();
    const from = dateRange?.from ?? new Date(now.getFullYear(), now.getMonth(), 1);
    const to = dateRange?.to ?? now;

    switch (widgetType) {
      case 'STAT_CARD':
        return this.getStatCardData(tenantId, config, from, to);
      case 'CHART':
        return this.getChartWidgetData(tenantId, config, from, to);
      case 'TABLE':
        return this.getTableWidgetData(tenantId, config);
      case 'RATE_TICKER':
        return this.getRateTickerData(tenantId);
      case 'ALERT_LIST':
        return this.getAlertListData(tenantId);
      default:
        return null;
    }
  }

  // ─── Private Widget Data Providers ──────────────────────────

  private async getStatCardData(
    tenantId: string,
    config: Record<string, unknown>,
    from: Date,
    to: Date,
  ): Promise<KpiData> {
    const metric = (config.metric as string) ?? 'revenue';

    switch (metric) {
      case 'revenue': {
        const result = await this.prisma.sale.aggregate({
          where: { tenantId, status: 'COMPLETED', createdAt: { gte: from, lte: to } },
          _sum: { totalPaise: true },
        });
        const value = Number(result._sum.totalPaise ?? 0);
        return {
          label: 'Revenue',
          value,
          formattedValue: this.formatMoney(value),
        };
      }
      case 'sales_count': {
        const count = await this.prisma.sale.count({
          where: { tenantId, status: 'COMPLETED', createdAt: { gte: from, lte: to } },
        });
        return {
          label: 'Sales',
          value: count,
          formattedValue: count.toLocaleString('en-IN'),
        };
      }
      case 'stock_value': {
        const items = await this.prisma.stockItem.findMany({
          where: { tenantId },
          select: { quantityOnHand: true, product: { select: { costPricePaise: true } } },
        });
        const value = items.reduce(
          (s, i) => s + Number(i.product.costPricePaise ?? 0) * i.quantityOnHand,
          0,
        );
        return {
          label: 'Stock Value',
          value,
          formattedValue: this.formatMoney(value),
        };
      }
      default:
        return { label: metric, value: 0, formattedValue: '0' };
    }
  }

  private async getChartWidgetData(
    tenantId: string,
    config: Record<string, unknown>,
    from: Date,
    to: Date,
  ): Promise<ChartData> {
    const chartSource = (config.source as string) ?? 'daily_revenue';

    if (chartSource === 'daily_revenue') {
      const sales = await this.prisma.sale.findMany({
        where: {
          tenantId,
          status: 'COMPLETED',
          createdAt: { gte: from, lte: to },
        },
        select: { totalPaise: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      });

      const dailyMap = new Map<string, number>();
      for (const sale of sales) {
        const day = sale.createdAt.toISOString().split('T')[0]!;
        dailyMap.set(day, (dailyMap.get(day) ?? 0) + Number(sale.totalPaise));
      }

      const sortedDays = Array.from(dailyMap.keys()).sort();
      return {
        title: 'Daily Revenue',
        chartType: ChartTypeEnum.LINE,
        labels: sortedDays,
        datasets: [
          {
            label: 'Revenue',
            data: sortedDays.map((d) => dailyMap.get(d) ?? 0),
            color: '#10B981',
          },
        ],
      };
    }

    return {
      title: 'Chart',
      chartType: ChartTypeEnum.BAR,
      labels: [],
      datasets: [],
    };
  }

  private async getTableWidgetData(
    tenantId: string,
    config: Record<string, unknown>,
  ): Promise<{ headers: string[]; rows: unknown[][] }> {
    const source = (config.source as string) ?? 'recent_sales';

    if (source === 'recent_sales') {
      const sales = await this.prisma.sale.findMany({
        where: { tenantId, status: 'COMPLETED' },
        select: {
          saleNumber: true,
          totalPaise: true,
          createdAt: true,
          customer: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });

      return {
        headers: ['Sale #', 'Customer', 'Amount', 'Date'],
        rows: sales.map((s) => [
          s.saleNumber,
          s.customer ? `${s.customer.firstName} ${s.customer.lastName}` : 'Walk-in',
          Number(s.totalPaise),
          s.createdAt.toISOString(),
        ]),
      };
    }

    return { headers: [], rows: [] };
  }

  private async getRateTickerData(
    tenantId: string,
  ): Promise<{ rates: Array<{ metal: string; purity: number; ratePerGramPaise: number }> }> {
    // Placeholder: In production, this would fetch from a rate feed service
    return {
      rates: [
        { metal: 'GOLD', purity: 999, ratePerGramPaise: 720000 },
        { metal: 'GOLD', purity: 916, ratePerGramPaise: 660000 },
        { metal: 'GOLD', purity: 750, ratePerGramPaise: 540000 },
        { metal: 'SILVER', purity: 999, ratePerGramPaise: 9000 },
        { metal: 'PLATINUM', purity: 950, ratePerGramPaise: 310000 },
      ],
    };
  }

  private async getAlertListData(
    tenantId: string,
  ): Promise<AlertItem[]> {
    const alerts: AlertItem[] = [];
    const now = new Date();

    const lowStock = await this.prisma.$queryRawUnsafe<Array<{ cnt: bigint }>>(
      `SELECT COUNT(*) as cnt FROM stock_items WHERE tenant_id = ? AND quantity_on_hand < reorder_level AND reorder_level > 0`,
      tenantId,
    );

    if (Number(lowStock[0]?.cnt ?? 0) > 0) {
      alerts.push({
        id: 'low-stock',
        severity: 'warning',
        title: `${Number(lowStock[0]?.cnt)} low stock items`,
        description: 'Items below reorder level need attention.',
        timestamp: now.toISOString(),
        actionUrl: '/reports/inventory',
      });
    }

    return alerts;
  }

  // ─── Helpers ────────────────────────────────────────────────

  private formatMoney(paise: number): string {
    const rupees = paise / 100;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(rupees);
  }

  private calcChangePercent(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 10000) / 100;
  }
}
