import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { createMockPrismaService, mockTenantContext, resetMocks } from '../../../__tests__/mocks';
vi.mock('uuid', () => ({ v4: vi.fn(() => 'mock-uuid') }));
import { ReorderService } from '../reorder.service';

describe('ReorderService', () => {
  let service: ReorderService; let prisma: ReturnType<typeof createMockPrismaService>;
  const { tenantId, userId } = mockTenantContext;
  beforeEach(() => {
    prisma = createMockPrismaService();
    resetMocks(prisma);
    ['onlineOrder','reorderTemplate'].forEach(m => { (prisma as any)[m] = { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), count: vi.fn() }; });
    prisma.stockItem.aggregate = vi.fn() as any;
    prisma.product.count = vi.fn() as any;
    prisma.product.findFirst = vi.fn() as any;
    service = new ReorderService(prisma as never);
  });

  describe('createReorderTemplate', () => {
    it('should create template from order', async () => {
      (prisma as any).onlineOrder.findFirst.mockResolvedValue({ id: 'o-1', items: [{ productId: 'p1', quantity: 2 }] });
      (prisma as any).reorderTemplate.create.mockResolvedValue({});
      (prisma as any).reorderTemplate.findFirst.mockResolvedValue({ id: 't-1', tenantId, customerId: 'c1', name: 'Prev Order', sourceOrderId: 'o-1', items: [{ productId: 'p1', quantity: 2 }], lastUsedAt: null, createdAt: new Date(), updatedAt: new Date() });
      const r = await service.createReorderTemplate(tenantId, userId, 'c1', 'o-1');
      expect(r.items).toHaveLength(1);
    });
    it('should throw NotFoundException for missing order', async () => {
      (prisma as any).onlineOrder.findFirst.mockResolvedValue(null);
      await expect(service.createReorderTemplate(tenantId, userId, 'c1', 'x')).rejects.toThrow(NotFoundException);
    });
  });

  describe('reorder', () => {
    it('should check stock and return available/unavailable', async () => {
      (prisma as any).onlineOrder.findFirst.mockResolvedValue({ id: 'o-1', items: [{ productId: 'p1', quantity: 2 }] });
      prisma.product.findFirst.mockResolvedValue({ id: 'p1', name: 'Ring', isActive: true, sellingPricePaise: 50000n } as any);
      (prisma.stockItem.aggregate as any).mockResolvedValue({ _sum: { quantityOnHand: 5, quantityReserved: 1 } });
      const r = await service.reorder(tenantId, 'c1', 'o-1');
      expect(r.availableItems).toHaveLength(1);
      expect(r.unavailableItems).toHaveLength(0);
    });
    it('should mark unavailable when out of stock', async () => {
      (prisma as any).onlineOrder.findFirst.mockResolvedValue({ id: 'o-1', items: [{ productId: 'p1', quantity: 2 }] });
      prisma.product.findFirst.mockResolvedValue({ id: 'p1', name: 'Ring', isActive: true, sellingPricePaise: 50000n } as any);
      (prisma.stockItem.aggregate as any).mockResolvedValue({ _sum: { quantityOnHand: 0, quantityReserved: 0 } });
      const r = await service.reorder(tenantId, 'c1', 'o-1');
      expect(r.unavailableItems).toHaveLength(1);
      expect(r.unavailableItems[0].reason).toContain('Out of stock');
    });
  });

  describe('getReorderableOrders', () => {
    it('should return reorderable orders', async () => {
      (prisma as any).onlineOrder.findMany.mockResolvedValue([{ id: 'o-1', orderNumber: 'ON-1', placedAt: new Date(), totalPaise: 50000n, items: [{ productId: 'p1', quantity: 1 }] }]);
      (prisma as any).onlineOrder.count.mockResolvedValue(1);
      prisma.product.count.mockResolvedValue(1);
      const r = await service.getReorderableOrders(tenantId, 'c1', { page: 1, limit: 10 } as any);
      expect(r.items[0].allItemsAvailable).toBe(true);
    });
  });

  describe('getTemplate', () => {
    it('should return template', async () => {
      (prisma as any).reorderTemplate.findFirst.mockResolvedValue({ id: 't-1', tenantId, customerId: 'c1', name: 'T', sourceOrderId: 'o-1', items: [], lastUsedAt: null, createdAt: new Date(), updatedAt: new Date() });
      const r = await service.getTemplate(tenantId, 't-1');
      expect(r.id).toBe('t-1');
    });
    it('should throw NotFoundException', async () => {
      (prisma as any).reorderTemplate.findFirst.mockResolvedValue(null);
      await expect(service.getTemplate(tenantId, 'x')).rejects.toThrow(NotFoundException);
    });
  });
});
