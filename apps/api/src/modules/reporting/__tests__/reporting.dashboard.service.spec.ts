import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReportingDashboardService } from '../reporting.dashboard.service';
import { createMockPrismaService, TEST_TENANT_ID, TEST_USER_ID } from '../../../__tests__/setup';

function extendPrisma(base: ReturnType<typeof createMockPrismaService>) {
  return {
    ...base,
    saleReturn: { ...base.saleReturn, count: vi.fn() },
    dashboardLayout: {
      findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), updateMany: vi.fn(),
    },
    jobOrder: { ...base.jobOrder, count: vi.fn() },
    $queryRawUnsafe: vi.fn(),
  };
}

describe('ReportingDashboardService (Unit)', () => {
  let service: ReportingDashboardService;
  let mockPrisma: ReturnType<typeof extendPrisma>;

  beforeEach(() => {
    mockPrisma = extendPrisma(createMockPrismaService());
    service = new ReportingDashboardService(mockPrisma as any);
  });

  describe('getAnalyticsDashboard', () => {
    it('returns KPIs, charts, alerts, and trends', async () => {
      mockPrisma.sale.aggregate
        .mockResolvedValueOnce({ _count: { id: 50 }, _sum: { totalPaise: 5000000n }, _avg: { totalPaise: 100000n } })
        .mockResolvedValueOnce({ _count: { id: 40 }, _sum: { totalPaise: 4000000n } });
      mockPrisma.saleReturn.count.mockResolvedValue(2);
      mockPrisma.repairOrder.count.mockResolvedValue(3);
      mockPrisma.$queryRawUnsafe.mockResolvedValue([{ cnt: 5n }]);
      mockPrisma.jobOrder.count.mockResolvedValue(1);
      mockPrisma.customer.count
        .mockResolvedValueOnce(20)
        .mockResolvedValueOnce(15);
      mockPrisma.sale.findMany.mockResolvedValue([]);

      const result = await service.getAnalyticsDashboard(TEST_TENANT_ID);

      expect(result.kpis).toHaveLength(4);
      expect(result.charts.length).toBeGreaterThanOrEqual(1);
      expect(result.alerts.length).toBeGreaterThan(0);
      expect(result.trends.length).toBeGreaterThan(0);
    });

    it('includes low stock alert when items below reorder', async () => {
      mockPrisma.sale.aggregate.mockResolvedValue({ _count: { id: 0 }, _sum: { totalPaise: null }, _avg: { totalPaise: null } });
      mockPrisma.saleReturn.count.mockResolvedValue(0);
      mockPrisma.repairOrder.count.mockResolvedValue(0);
      mockPrisma.$queryRawUnsafe.mockResolvedValue([{ cnt: 10n }]);
      mockPrisma.jobOrder.count.mockResolvedValue(0);
      mockPrisma.customer.count.mockResolvedValue(0);
      mockPrisma.sale.findMany.mockResolvedValue([]);

      const result = await service.getAnalyticsDashboard(TEST_TENANT_ID);

      const lowStockAlert = result.alerts.find((a) => a.id === 'low-stock');
      expect(lowStockAlert).toBeDefined();
      expect(lowStockAlert!.title).toContain('10');
    });
  });

  describe('saveDashboardLayout', () => {
    it('saves a new dashboard layout', async () => {
      mockPrisma.dashboardLayout.create.mockResolvedValue({
        id: 'dl-1', tenantId: TEST_TENANT_ID, userId: TEST_USER_ID,
        name: 'My Dashboard', isDefault: false, layout: [],
        createdAt: new Date(), updatedAt: new Date(),
      });

      const result = await service.saveDashboardLayout(TEST_TENANT_ID, TEST_USER_ID, {
        name: 'My Dashboard', isDefault: false, layout: [],
      } as any);

      expect(result.name).toBe('My Dashboard');
    });

    it('unsets other defaults when saving a default layout', async () => {
      mockPrisma.dashboardLayout.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.dashboardLayout.create.mockResolvedValue({
        id: 'dl-1', tenantId: TEST_TENANT_ID, userId: TEST_USER_ID,
        name: 'Default', isDefault: true, layout: [],
        createdAt: new Date(), updatedAt: new Date(),
      });

      await service.saveDashboardLayout(TEST_TENANT_ID, TEST_USER_ID, {
        name: 'Default', isDefault: true, layout: [],
      } as any);

      expect(mockPrisma.dashboardLayout.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ data: { isDefault: false } }),
      );
    });
  });

  describe('getDashboardLayout', () => {
    it('returns layout for user', async () => {
      mockPrisma.dashboardLayout.findFirst.mockResolvedValue({
        id: 'dl-1', tenantId: TEST_TENANT_ID, userId: TEST_USER_ID,
        name: 'Default', isDefault: true, layout: [],
        createdAt: new Date(), updatedAt: new Date(),
      });

      const result = await service.getDashboardLayout(TEST_TENANT_ID, TEST_USER_ID);
      expect(result).not.toBeNull();
      expect(result!.name).toBe('Default');
    });

    it('returns null when no layout exists', async () => {
      mockPrisma.dashboardLayout.findFirst.mockResolvedValue(null);
      const result = await service.getDashboardLayout(TEST_TENANT_ID, TEST_USER_ID);
      expect(result).toBeNull();
    });
  });

  describe('getWidgetData', () => {
    it('returns stat card data for revenue metric', async () => {
      mockPrisma.sale.aggregate.mockResolvedValue({ _sum: { totalPaise: 1000000n } });

      const result = await service.getWidgetData(TEST_TENANT_ID, 'STAT_CARD', { metric: 'revenue' });
      expect((result as any).value).toBe(1000000);
    });

    it('returns null for unknown widget type', async () => {
      const result = await service.getWidgetData(TEST_TENANT_ID, 'UNKNOWN', {});
      expect(result).toBeNull();
    });
  });
});
