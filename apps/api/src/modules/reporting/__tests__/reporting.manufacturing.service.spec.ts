import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReportingManufacturingService } from '../reporting.manufacturing.service';
import { createMockPrismaService, TEST_TENANT_ID } from '../../../__tests__/setup';

function extendPrisma(base: ReturnType<typeof createMockPrismaService>) {
  return {
    ...base,
    jobOrder: { ...base.jobOrder, groupBy: vi.fn() },
    karigarTransaction: { findMany: vi.fn() },
  };
}

describe('ReportingManufacturingService (Unit)', () => {
  let service: ReportingManufacturingService;
  let mockPrisma: ReturnType<typeof extendPrisma>;
  const dateRange = { from: new Date('2025-01-01'), to: new Date('2025-03-31') };

  beforeEach(() => {
    mockPrisma = extendPrisma(createMockPrismaService());
    service = new ReportingManufacturingService(mockPrisma as any);
  });

  describe('jobSummary', () => {
    it('returns job counts by status with overdue count', async () => {
      mockPrisma.jobOrder.groupBy.mockResolvedValue([
        { status: 'COMPLETED', _count: { id: 5 } },
        { status: 'IN_PROGRESS', _count: { id: 3 } },
      ]);
      mockPrisma.jobOrder.findMany.mockResolvedValue([
        { status: 'COMPLETED', bom: { estimatedCostPaise: 100000n } },
        { status: 'COMPLETED', bom: { estimatedCostPaise: 200000n } },
        { status: 'COMPLETED', bom: null },
        { status: 'IN_PROGRESS', bom: { estimatedCostPaise: 150000n } },
      ]);
      mockPrisma.jobOrder.count.mockResolvedValue(1);

      const result = await service.jobSummary(TEST_TENANT_ID, dateRange);

      expect(result.totalJobs).toBe(8);
      expect(result.completedJobs).toBe(5);
      expect(result.overdueJobs).toBe(1);
    });
  });

  describe('karigarPerformance', () => {
    it('calculates wastage percent and on-time delivery', async () => {
      mockPrisma.karigar.findMany.mockResolvedValue([{
        id: 'k-1', firstName: 'Ramesh', lastName: 'Kumar', isActive: true,
        jobOrders: [
          {
            status: 'COMPLETED',
            estimatedEndDate: new Date('2025-02-15'),
            actualEndDate: new Date('2025-02-14'),
            items: [{ issuedWeightMg: 10000n, returnedWeightMg: 9500n, wastedWeightMg: 200n }],
          },
          {
            status: 'COMPLETED',
            estimatedEndDate: new Date('2025-03-01'),
            actualEndDate: new Date('2025-03-05'),
            items: [{ issuedWeightMg: 5000n, returnedWeightMg: 4700n, wastedWeightMg: 100n }],
          },
        ],
      }]);

      const result = await service.karigarPerformance(TEST_TENANT_ID, dateRange);

      expect(result).toHaveLength(1);
      expect(result[0].jobsCompleted).toBe(2);
      expect(result[0].wastagePercent).toBeGreaterThan(0);
      expect(result[0].onTimePercent).toBe(50); // 1 out of 2
    });
  });

  describe('materialUsageReport', () => {
    it('aggregates issued/returned/wasted by metal type', async () => {
      mockPrisma.karigarTransaction.findMany.mockResolvedValue([
        { transactionType: 'ISSUE', metalType: 'GOLD', purityFineness: 916, weightMg: 10000n },
        { transactionType: 'RETURN', metalType: 'GOLD', purityFineness: 916, weightMg: 9000n },
        { transactionType: 'WASTAGE', metalType: 'GOLD', purityFineness: 916, weightMg: 500n },
      ]);

      const result = await service.materialUsageReport(TEST_TENANT_ID, dateRange);

      expect(result).toHaveLength(1);
      expect(result[0].issuedWeightMg).toBe(10000);
      expect(result[0].returnedWeightMg).toBe(9000);
      expect(result[0].wastedWeightMg).toBe(500);
      expect(result[0].utilizationPercent).toBeGreaterThan(0);
    });
  });

  describe('wastageReport', () => {
    it('reports wastage by karigar and metal', async () => {
      mockPrisma.karigarTransaction.findMany.mockResolvedValue([
        { karigarId: 'k-1', transactionType: 'ISSUE', metalType: 'GOLD', weightMg: 10000n, karigar: { firstName: 'R', lastName: 'K' } },
        { karigarId: 'k-1', transactionType: 'WASTAGE', metalType: 'GOLD', weightMg: 300n, karigar: { firstName: 'R', lastName: 'K' } },
      ]);

      const result = await service.wastageReport(TEST_TENANT_ID, dateRange);
      expect(result).toHaveLength(1);
      expect(result[0].wastagePercent).toBe(3);
    });
  });

  describe('costAnalysis', () => {
    it('calculates variance between estimated and actual cost', async () => {
      mockPrisma.jobOrder.findMany.mockResolvedValue([{
        id: 'j-1', jobNumber: 'JO-001',
        product: { name: 'Ring' },
        bom: { estimatedCostPaise: 100000n },
        costs: [{ amountPaise: 120000n }],
      }]);

      const result = await service.costAnalysis(TEST_TENANT_ID, dateRange);

      expect(result).toHaveLength(1);
      expect(result[0].variancePaise).toBe(20000);
      expect(result[0].variancePercent).toBe(20);
    });
  });

  describe('productionTimeline', () => {
    it('returns planned vs actual dates with variance', async () => {
      mockPrisma.jobOrder.findMany.mockResolvedValue([{
        id: 'j-1', jobNumber: 'JO-001',
        estimatedStartDate: new Date('2025-02-01'),
        estimatedEndDate: new Date('2025-02-15'),
        actualStartDate: new Date('2025-02-01'),
        actualEndDate: new Date('2025-02-20'),
        product: { name: 'Ring' },
        assignedKarigar: { firstName: 'R', lastName: 'K' },
      }]);

      const result = await service.productionTimeline(TEST_TENANT_ID, dateRange);

      expect(result).toHaveLength(1);
      expect(result[0].daysVariance).toBe(5);
    });
  });
});
