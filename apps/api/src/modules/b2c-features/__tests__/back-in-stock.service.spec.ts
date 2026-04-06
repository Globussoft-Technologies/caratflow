import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { createMockPrismaService, createMockEventBusService, mockTenantContext, resetMocks } from '../../../__tests__/mocks';
vi.mock('uuid', () => ({ v4: vi.fn(() => 'mock-uuid') }));
import { BackInStockService } from '../back-in-stock.service';

describe('BackInStockService', () => {
  let service: BackInStockService; let prisma: ReturnType<typeof createMockPrismaService>;
  let eventBus: ReturnType<typeof createMockEventBusService>;
  let notifService: any;
  const { tenantId } = mockTenantContext;
  beforeEach(() => {
    prisma = createMockPrismaService();
    resetMocks(prisma);
    eventBus = createMockEventBusService();
    notifService = { sendNotification: vi.fn().mockResolvedValue({}) };
    (prisma as any).backInStockAlert = { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn() };
    prisma.product.findFirst = vi.fn() as any;
    service = new BackInStockService(prisma as never, eventBus as never, notifService);
  });

  describe('subscribe', () => {
    it('should create subscription', async () => {
      prisma.product.findFirst.mockResolvedValue({ id: 'p1', name: 'Ring' } as any);
      (prisma as any).backInStockAlert.findFirst.mockResolvedValue(null);
      (prisma as any).backInStockAlert.create.mockResolvedValue({ id: 'bs-1', status: 'ACTIVE' });
      const r = await service.subscribe(tenantId, 'p1', 'test@test.com', 'c1');
      expect(r.status).toBe('ACTIVE');
    });
    it('should be idempotent', async () => {
      prisma.product.findFirst.mockResolvedValue({ id: 'p1', name: 'Ring' } as any);
      (prisma as any).backInStockAlert.findFirst.mockResolvedValue({ id: 'bs-1', status: 'ACTIVE' });
      const r = await service.subscribe(tenantId, 'p1', 'test@test.com', 'c1');
      expect(r.id).toBe('bs-1');
    });
    it('should throw NotFoundException for missing product', async () => {
      prisma.product.findFirst.mockResolvedValue(null);
      await expect(service.subscribe(tenantId, 'bad', 'test@test.com')).rejects.toThrow(NotFoundException);
    });
  });

  describe('notifySubscribers', () => {
    it('should notify active subscribers and return count', async () => {
      prisma.product.findFirst.mockResolvedValue({ id: 'p1', name: 'Ring', sku: 'R-1', sellingPricePaise: 50000n } as any);
      (prisma as any).backInStockAlert.findMany.mockResolvedValue([{ id: 'bs-1', customerId: 'c1', customer: { id: 'c1', firstName: 'A' } }]);
      (prisma as any).backInStockAlert.update.mockResolvedValue({});
      const count = await service.notifySubscribers(tenantId, 'p1');
      expect(count).toBe(1);
      expect(eventBus.publish).toHaveBeenCalled();
    });
    it('should return 0 when no subscribers', async () => {
      prisma.product.findFirst.mockResolvedValue({ id: 'p1', name: 'Ring', sku: 'R-1', sellingPricePaise: 50000n } as any);
      (prisma as any).backInStockAlert.findMany.mockResolvedValue([]);
      const count = await service.notifySubscribers(tenantId, 'p1');
      expect(count).toBe(0);
    });
  });

  describe('unsubscribe', () => {
    it('should cancel subscription', async () => {
      (prisma as any).backInStockAlert.findFirst.mockResolvedValue({ id: 'bs-1', status: 'ACTIVE' });
      (prisma as any).backInStockAlert.update.mockResolvedValue({ id: 'bs-1', status: 'CANCELLED' });
      const r = await service.unsubscribe(tenantId, 'bs-1');
      expect(r.status).toBe('CANCELLED');
    });
    it('should throw NotFoundException', async () => {
      (prisma as any).backInStockAlert.findFirst.mockResolvedValue(null);
      await expect(service.unsubscribe(tenantId, 'x')).rejects.toThrow(NotFoundException);
    });
  });
});
