import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { createMockPrismaService, mockTenantContext, resetMocks } from '../../../__tests__/mocks';
import { CustomerPortalLoyaltyService } from '../customer-portal.loyalty.service';

describe('CustomerPortalLoyaltyService', () => {
  let service: CustomerPortalLoyaltyService; let prisma: ReturnType<typeof createMockPrismaService>;
  const { tenantId } = mockTenantContext;
  beforeEach(() => {
    prisma = createMockPrismaService();
    resetMocks(prisma);
    ['loyaltyProgram','loyaltyTransaction'].forEach(m => { (prisma as any)[m] = { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), count: vi.fn(), aggregate: vi.fn() }; });
    prisma.customer.findFirst = vi.fn() as any;
    service = new CustomerPortalLoyaltyService(prisma as never);
  });

  describe('getLoyaltyDashboard', () => {
    it('should return dashboard data', async () => {
      prisma.customer.findFirst.mockResolvedValue({ id: 'c1', loyaltyPoints: 500, loyaltyTier: 'GOLD' } as any);
      (prisma as any).loyaltyProgram.findFirst.mockResolvedValue({ tiers: [{ name: 'SILVER', minPoints: 0 }, { name: 'GOLD', minPoints: 100 }], isActive: true });
      (prisma as any).loyaltyTransaction.findMany.mockResolvedValue([]);
      (prisma as any).loyaltyTransaction.aggregate.mockResolvedValue({ _sum: { points: 500 } });
      const r = await service.getLoyaltyDashboard(tenantId, 'c1');
      expect(r).toBeDefined();
    });
    it('should throw NotFoundException for missing customer', async () => {
      prisma.customer.findFirst.mockResolvedValue(null);
      await expect(service.getLoyaltyDashboard(tenantId, 'x')).rejects.toThrow(NotFoundException);
    });
  });
});
