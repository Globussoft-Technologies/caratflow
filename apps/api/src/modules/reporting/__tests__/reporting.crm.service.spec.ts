import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReportingCrmService } from '../reporting.crm.service';
import { createMockPrismaService, TEST_TENANT_ID } from '../../../__tests__/setup';

function extendPrisma(base: ReturnType<typeof createMockPrismaService>) {
  return {
    ...base,
    lead: { ...base.lead, groupBy: vi.fn() },
    loyaltyTransaction: { aggregate: vi.fn() },
    campaign: { findMany: vi.fn() },
    customer: { ...base.customer, groupBy: vi.fn() },
  };
}

describe('ReportingCrmService (Unit)', () => {
  let service: ReportingCrmService;
  let mockPrisma: ReturnType<typeof extendPrisma>;
  const dateRange = { from: new Date('2025-01-01'), to: new Date('2025-03-31') };

  beforeEach(() => {
    mockPrisma = extendPrisma(createMockPrismaService());
    service = new ReportingCrmService(mockPrisma as any);
  });

  describe('customerAcquisition', () => {
    it('returns new customers by source and month', async () => {
      mockPrisma.lead.findMany.mockResolvedValue([
        { source: 'WALK_IN', createdAt: new Date('2025-01-15'), status: 'WON' },
        { source: 'REFERRAL', createdAt: new Date('2025-01-20'), status: 'WON' },
      ]);
      mockPrisma.customer.findMany.mockResolvedValue([
        { createdAt: new Date('2025-01-10') },
        { createdAt: new Date('2025-01-25') },
      ]);

      const result = await service.customerAcquisition(TEST_TENANT_ID, dateRange);
      expect(result.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('customerRetention', () => {
    it('calculates repeat purchase rate by month', async () => {
      mockPrisma.sale.findMany.mockResolvedValue([
        { customerId: 'c-1', createdAt: new Date('2025-01-10'), totalPaise: 100000n },
        { customerId: 'c-1', createdAt: new Date('2025-02-15'), totalPaise: 200000n },
        { customerId: 'c-2', createdAt: new Date('2025-02-20'), totalPaise: 150000n },
      ]);

      const result = await service.customerRetention(TEST_TENANT_ID, dateRange);

      const feb = result.find((r) => r.period === '2025-02');
      expect(feb).toBeDefined();
      expect(feb!.repeatCustomers).toBe(1); // c-1 is repeat in Feb
      expect(feb!.retentionRate).toBeGreaterThan(0);
    });
  });

  describe('customerLifetimeValue', () => {
    it('ranks customers by total spend', async () => {
      mockPrisma.sale.findMany.mockResolvedValue([
        { customerId: 'c-1', totalPaise: 500000n, createdAt: new Date('2025-01-10'), customer: { firstName: 'R', lastName: 'S' } },
        { customerId: 'c-1', totalPaise: 300000n, createdAt: new Date('2025-02-10'), customer: { firstName: 'R', lastName: 'S' } },
        { customerId: 'c-2', totalPaise: 200000n, createdAt: new Date('2025-01-15'), customer: { firstName: 'A', lastName: 'B' } },
      ]);

      const result = await service.customerLifetimeValue(TEST_TENANT_ID, dateRange);

      expect(result[0].customerId).toBe('c-1');
      expect(result[0].totalSpendPaise).toBe(800000);
      expect(result[0].totalTransactions).toBe(2);
    });
  });

  describe('loyaltyMetrics', () => {
    it('returns points issued, redeemed, expired, and tier breakdown', async () => {
      mockPrisma.loyaltyTransaction.aggregate
        .mockResolvedValueOnce({ _sum: { points: 5000 } })  // earned
        .mockResolvedValueOnce({ _sum: { points: 2000 } })  // redeemed
        .mockResolvedValueOnce({ _sum: { points: 500 } });  // expired
      mockPrisma.customer.count.mockResolvedValue(50);
      mockPrisma.customer.groupBy.mockResolvedValue([
        { loyaltyTier: 'SILVER', _count: { id: 30 } },
        { loyaltyTier: 'GOLD', _count: { id: 20 } },
      ]);

      const result = await service.loyaltyMetrics(TEST_TENANT_ID);

      expect(result.totalPointsIssued).toBe(5000);
      expect(result.totalPointsRedeemed).toBe(2000);
      expect(result.activeMembers).toBe(50);
      expect(result.tierBreakdown).toHaveLength(2);
    });
  });

  describe('leadConversion', () => {
    it('returns lead funnel with conversion rates', async () => {
      mockPrisma.lead.groupBy.mockResolvedValue([
        { status: 'NEW', _count: { id: 100 }, _sum: { estimatedValuePaise: 50000000n } },
        { status: 'WON', _count: { id: 20 }, _sum: { estimatedValuePaise: 15000000n } },
        { status: 'LOST', _count: { id: 10 }, _sum: { estimatedValuePaise: 5000000n } },
      ]);

      const result = await service.leadConversion(TEST_TENANT_ID, dateRange);

      const won = result.find((r) => r.status === 'WON');
      expect(won).toBeDefined();
      expect(won!.conversionRate).toBeCloseTo(15.38, 0);
    });
  });

  describe('crmOverview', () => {
    it('returns aggregated CRM overview', async () => {
      mockPrisma.customer.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(15); // new in period
      mockPrisma.sale.findMany.mockResolvedValue([
        { customerId: 'c-1', totalPaise: 100000n },
        { customerId: 'c-1', totalPaise: 200000n },
        { customerId: 'c-2', totalPaise: 150000n },
      ]);

      const result = await service.crmOverview(TEST_TENANT_ID, dateRange);

      expect(result.totalCustomers).toBe(100);
      expect(result.newCustomersInPeriod).toBe(15);
      expect(result.repeatPurchaseRate).toBe(50); // 1 out of 2 repeat
    });
  });
});
