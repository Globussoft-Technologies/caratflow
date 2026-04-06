import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockPrismaService, mockTenantContext, resetMocks } from '../../../__tests__/mocks';
import { CustomerPortalSchemesService } from '../customer-portal.schemes.service';

describe('CustomerPortalSchemesService', () => {
  let service: CustomerPortalSchemesService; let prisma: ReturnType<typeof createMockPrismaService>;
  const { tenantId } = mockTenantContext;
  beforeEach(() => {
    prisma = createMockPrismaService();
    resetMocks(prisma);
    ['kittyMember','goldSavingsMember','kittyScheme','goldSavingsScheme','kittyInstallment','goldSavingsInstallment'].forEach(m => { (prisma as any)[m] = { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), count: vi.fn() }; });
    service = new CustomerPortalSchemesService(prisma as never);
  });

  describe('getMySchemes', () => {
    it('should return kitty and gold savings memberships', async () => {
      (prisma as any).kittyMember.findMany.mockResolvedValue([]);
      (prisma as any).goldSavingsMember.findMany.mockResolvedValue([]);
      const r = await service.getMySchemes(tenantId, 'c1');
      expect(r).toBeDefined();
    });
  });
});
