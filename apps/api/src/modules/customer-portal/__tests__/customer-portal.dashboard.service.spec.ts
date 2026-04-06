import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { createMockPrismaService, mockTenantContext, resetMocks } from '../../../__tests__/mocks';
import { CustomerPortalDashboardService } from '../customer-portal.dashboard.service';

describe('CustomerPortalDashboardService', () => {
  let service: CustomerPortalDashboardService; let prisma: ReturnType<typeof createMockPrismaService>;
  const { tenantId } = mockTenantContext;
  beforeEach(() => {
    prisma = createMockPrismaService();
    resetMocks(prisma);
    ['onlineOrder','wishlist','kittyMember','goldSavingsMember','kittyInstallment','goldSavingsInstallment'].forEach(m => { (prisma as any)[m] = { findFirst: vi.fn(), findMany: vi.fn(), count: vi.fn() }; });
    prisma.customer.findFirst = vi.fn() as any;
    service = new CustomerPortalDashboardService(prisma as never);
  });

  describe('getDashboard', () => {
    it('should return aggregated dashboard data', async () => {
      prisma.customer.findFirst.mockResolvedValue({ id: 'c1', firstName: 'A', lastName: 'B', loyaltyPoints: 100, loyaltyTier: 'SILVER' } as any);
      (prisma as any).onlineOrder.findMany.mockResolvedValue([]);
      (prisma as any).onlineOrder.count.mockResolvedValue(0);
      ['wishlist','kittyMember','goldSavingsMember'].forEach(m => { (prisma as any)[m].count.mockResolvedValue(0); });
      ['kittyInstallment','goldSavingsInstallment'].forEach(m => { (prisma as any)[m].findMany.mockResolvedValue([]); });
      (prisma as any).loyaltyTransaction = { findMany: vi.fn().mockResolvedValue([]), aggregate: vi.fn().mockResolvedValue({ _sum: { points: 0 } }) };
      const r = await service.getDashboard(tenantId, 'c1');
      expect(r).toBeDefined();
    });
    it('should throw NotFoundException for missing customer', async () => {
      prisma.customer.findFirst.mockResolvedValue(null);
      await expect(service.getDashboard(tenantId, 'x')).rejects.toThrow(NotFoundException);
    });
  });
});
