import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { createMockPrismaService, mockTenantContext, resetMocks } from '../../../__tests__/mocks';
import { CustomerPortalOrdersService } from '../customer-portal.orders.service';

describe('CustomerPortalOrdersService', () => {
  let service: CustomerPortalOrdersService; let prisma: ReturnType<typeof createMockPrismaService>;
  const { tenantId } = mockTenantContext;
  beforeEach(() => {
    prisma = createMockPrismaService();
    resetMocks(prisma);
    ['onlineOrder','onlineOrderItem','shipment'].forEach(m => { (prisma as any)[m] = { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), count: vi.fn() }; });
    service = new CustomerPortalOrdersService(prisma as never);
  });

  describe('getMyOrders', () => {
    it('should return paginated orders', async () => {
      (prisma as any).onlineOrder.findMany.mockResolvedValue([{ id: 'o-1', orderNumber: 'ON-1', status: 'DELIVERED', totalPaise: 50000n, createdAt: new Date(), items: [], _count: { items: 1 } }]);
      (prisma as any).onlineOrder.count.mockResolvedValue(1);
      const r = await service.getMyOrders(tenantId, 'c1', { page: 1, limit: 10 } as any);
      expect(r.total).toBe(1);
    });
  });
});
