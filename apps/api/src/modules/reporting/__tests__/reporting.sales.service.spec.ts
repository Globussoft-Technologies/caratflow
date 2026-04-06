import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReportingSalesService } from '../reporting.sales.service';
import { createMockPrismaService, TEST_TENANT_ID } from '../../../__tests__/setup';

function extendPrisma(base: ReturnType<typeof createMockPrismaService>) {
  return {
    ...base,
    saleReturn: { ...base.saleReturn, aggregate: vi.fn(), findMany: vi.fn() },
    salePayment: { ...base.salePayment, groupBy: vi.fn() },
    saleLineItem: { findMany: vi.fn() },
  };
}

describe('ReportingSalesService (Unit)', () => {
  let service: ReportingSalesService;
  let mockPrisma: ReturnType<typeof extendPrisma>;

  beforeEach(() => {
    mockPrisma = extendPrisma(createMockPrismaService());
    service = new ReportingSalesService(mockPrisma as any);
  });

  describe('dailySalesSummary', () => {
    it('returns daily summary with sales count, revenue, and payment breakdown', async () => {
      mockPrisma.sale.aggregate.mockResolvedValue({
        _count: { id: 10 }, _sum: { totalPaise: 5000000n }, _avg: { totalPaise: 500000n },
      });
      mockPrisma.saleReturn.aggregate.mockResolvedValue({
        _count: { id: 2 }, _sum: { refundAmountPaise: 200000n },
      });
      mockPrisma.salePayment.groupBy.mockResolvedValue([
        { method: 'CASH', _count: { id: 6 }, _sum: { amountPaise: 3000000n } },
        { method: 'UPI', _count: { id: 4 }, _sum: { amountPaise: 2000000n } },
      ]);

      const result = await service.dailySalesSummary(TEST_TENANT_ID, new Date());

      expect(result.summary.salesCount).toBe(10);
      expect(result.summary.totalRevenuePaise).toBe(5000000);
      expect(result.summary.netRevenuePaise).toBe(4800000);
      expect(result.paymentBreakdown).toHaveLength(2);
    });

    it('calculates average ticket correctly', async () => {
      mockPrisma.sale.aggregate.mockResolvedValue({
        _count: { id: 4 }, _sum: { totalPaise: 2000000n }, _avg: { totalPaise: 500000n },
      });
      mockPrisma.saleReturn.aggregate.mockResolvedValue({ _count: { id: 0 }, _sum: { refundAmountPaise: 0n } });
      mockPrisma.salePayment.groupBy.mockResolvedValue([]);

      const result = await service.dailySalesSummary(TEST_TENANT_ID, new Date());
      expect(result.summary.avgTicketPaise).toBe(500000);
    });

    it('handles zero sales gracefully', async () => {
      mockPrisma.sale.aggregate.mockResolvedValue({
        _count: { id: 0 }, _sum: { totalPaise: null }, _avg: { totalPaise: null },
      });
      mockPrisma.saleReturn.aggregate.mockResolvedValue({ _count: { id: 0 }, _sum: { refundAmountPaise: null } });
      mockPrisma.salePayment.groupBy.mockResolvedValue([]);

      const result = await service.dailySalesSummary(TEST_TENANT_ID, new Date());
      expect(result.summary.salesCount).toBe(0);
      expect(result.summary.avgTicketPaise).toBe(0);
    });
  });

  describe('salesByPeriod', () => {
    it('groups sales by day', async () => {
      mockPrisma.sale.findMany.mockResolvedValue([
        { id: 's-1', totalPaise: 100000n, createdAt: new Date('2025-03-01T10:00:00Z') },
        { id: 's-2', totalPaise: 200000n, createdAt: new Date('2025-03-01T14:00:00Z') },
        { id: 's-3', totalPaise: 150000n, createdAt: new Date('2025-03-02T10:00:00Z') },
      ]);
      mockPrisma.saleReturn.findMany.mockResolvedValue([]);

      const result = await service.salesByPeriod(TEST_TENANT_ID, {
        from: new Date('2025-03-01'), to: new Date('2025-03-02'),
      }, 'day');

      expect(result.summary).toHaveLength(2);
      expect(result.totals.totalSales).toBe(3);
      expect(result.totals.totalRevenuePaise).toBe(450000);
    });

    it('groups by month', async () => {
      mockPrisma.sale.findMany.mockResolvedValue([
        { id: 's-1', totalPaise: 100000n, createdAt: new Date('2025-01-15') },
        { id: 's-2', totalPaise: 200000n, createdAt: new Date('2025-02-10') },
      ]);
      mockPrisma.saleReturn.findMany.mockResolvedValue([]);

      const result = await service.salesByPeriod(TEST_TENANT_ID, {
        from: new Date('2025-01-01'), to: new Date('2025-03-01'),
      }, 'month');

      expect(result.summary).toHaveLength(2);
    });
  });

  describe('salesByProduct', () => {
    it('aggregates sales by product and sorts by revenue', async () => {
      mockPrisma.saleLineItem.findMany.mockResolvedValue([
        { productId: 'p-1', quantity: 2, lineTotalPaise: 200000n, product: { name: 'Ring', sku: 'R-1', category: { name: 'Rings' } } },
        { productId: 'p-1', quantity: 1, lineTotalPaise: 100000n, product: { name: 'Ring', sku: 'R-1', category: { name: 'Rings' } } },
        { productId: 'p-2', quantity: 5, lineTotalPaise: 500000n, product: { name: 'Chain', sku: 'C-1', category: { name: 'Chains' } } },
      ]);

      const result = await service.salesByProduct(TEST_TENANT_ID, { from: new Date(), to: new Date() });

      expect(result).toHaveLength(2);
      expect(result[0].productId).toBe('p-2'); // highest revenue first
      expect(result[1].quantitySold).toBe(3);
    });
  });

  describe('salesBySalesperson', () => {
    it('ranks salespersons by revenue', async () => {
      mockPrisma.sale.findMany.mockResolvedValue([
        { userId: 'u-1', totalPaise: 300000n, user: { firstName: 'John', lastName: 'Doe' } },
        { userId: 'u-1', totalPaise: 200000n, user: { firstName: 'John', lastName: 'Doe' } },
        { userId: 'u-2', totalPaise: 400000n, user: { firstName: 'Jane', lastName: 'Smith' } },
      ]);

      const result = await service.salesBySalesperson(TEST_TENANT_ID, { from: new Date(), to: new Date() });

      expect(result).toHaveLength(2);
      expect(result[0].salesCount).toBe(2); // u-1 has more revenue (500k)
    });
  });

  describe('salesByCategory', () => {
    it('calculates percentage of total by category', async () => {
      mockPrisma.saleLineItem.findMany.mockResolvedValue([
        { quantity: 1, lineTotalPaise: 400000n, product: { categoryId: 'c-1', category: { name: 'Rings' } } },
        { quantity: 1, lineTotalPaise: 600000n, product: { categoryId: 'c-2', category: { name: 'Chains' } } },
      ]);

      const result = await service.salesByCategory(TEST_TENANT_ID, { from: new Date(), to: new Date() });

      expect(result).toHaveLength(2);
      expect(result[0].percentageOfTotal).toBe(60); // Chains
    });
  });

  describe('salesByLocation', () => {
    it('compares sales across locations', async () => {
      mockPrisma.sale.findMany.mockResolvedValue([
        { locationId: 'l-1', totalPaise: 500000n, location: { name: 'Main' } },
        { locationId: 'l-2', totalPaise: 300000n, location: { name: 'Branch' } },
      ]);

      const result = await service.salesByLocation(TEST_TENANT_ID, { from: new Date(), to: new Date() });

      expect(result).toHaveLength(2);
      expect(result[0].locationName).toBe('Main');
    });
  });

  describe('salesComparison', () => {
    it('calculates change percent between two periods', async () => {
      // Period 1
      mockPrisma.sale.findMany
        .mockResolvedValueOnce([{ id: 's1', totalPaise: 500000n, createdAt: new Date('2025-02-01') }])
        .mockResolvedValueOnce([{ id: 's2', totalPaise: 400000n, createdAt: new Date('2025-01-01') }]);
      mockPrisma.saleReturn.findMany.mockResolvedValue([]);

      const result = await service.salesComparison(
        TEST_TENANT_ID,
        { from: new Date('2025-02-01'), to: new Date('2025-02-28') },
        { from: new Date('2025-01-01'), to: new Date('2025-01-31') },
      );

      expect(result.changePercent.revenue).toBeDefined();
      expect(result.period1).toBeDefined();
      expect(result.period2).toBeDefined();
    });
  });
});
