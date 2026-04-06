import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RetailCustomOrderService } from '../retail.custom-order.service';
import { createMockPrismaService, createMockEventBusService, mockTenantContext, resetMocks } from '../../../__tests__/mocks';

vi.mock('uuid', () => ({ v4: vi.fn(() => 'mock-uuid') }));

describe('RetailCustomOrderService', () => {
  let service: RetailCustomOrderService;
  let prisma: ReturnType<typeof createMockPrismaService>;
  let eventBus: ReturnType<typeof createMockEventBusService>;
  const { tenantId, userId } = mockTenantContext;

  beforeEach(() => {
    prisma = createMockPrismaService();
    resetMocks(prisma);
    eventBus = createMockEventBusService();
    (prisma as any).customOrder = { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), count: vi.fn() };
    service = new RetailCustomOrderService(prisma as never, eventBus as never);
  });

  const mk = (o: Record<string, unknown> = {}) => ({
    id: 'co-1', tenantId, orderNumber: 'CO/MUM/2604/0001', customerId: 'c1', locationId: 'l1',
    status: 'INQUIRY', description: 'Custom ring', designNotes: null, designImages: null,
    estimatePaise: 500000n, finalPricePaise: null, depositPaise: 0n, balancePaise: 0n,
    expectedDate: null, createdAt: new Date(), updatedAt: new Date(), ...o,
  });

  describe('createCustomOrder', () => {
    it('should create with INQUIRY status', async () => {
      prisma.location.findFirst.mockResolvedValue({ city: 'Mumbai' } as any);
      (prisma as any).customOrder.count.mockResolvedValue(0);
      (prisma as any).customOrder.create.mockResolvedValue(mk());
      const r = await service.createCustomOrder(tenantId, userId, { customerId: 'c1', locationId: 'l1', description: 'Custom ring' } as any);
      expect(r.status).toBe('INQUIRY');
    });
    it('should publish event', async () => {
      prisma.location.findFirst.mockResolvedValue({ city: 'Mumbai' } as any);
      (prisma as any).customOrder.count.mockResolvedValue(0);
      (prisma as any).customOrder.create.mockResolvedValue(mk());
      await service.createCustomOrder(tenantId, userId, { customerId: 'c1', locationId: 'l1', description: 'test' } as any);
      expect(eventBus.publish).toHaveBeenCalledWith(expect.objectContaining({ type: 'retail.custom_order.created' }));
    });
  });

  describe('updateStatus', () => {
    it('should allow INQUIRY -> DESIGNED', async () => {
      (prisma as any).customOrder.findFirst.mockResolvedValue(mk({ status: 'INQUIRY' }));
      (prisma as any).customOrder.update.mockResolvedValue(mk({ status: 'DESIGNED' }));
      const r = await service.updateStatus(tenantId, userId, 'co-1', 'DESIGNED' as any);
      expect(r.status).toBe('DESIGNED');
    });
    it('should reject invalid transition', async () => {
      (prisma as any).customOrder.findFirst.mockResolvedValue(mk({ status: 'INQUIRY' }));
      await expect(service.updateStatus(tenantId, userId, 'co-1', 'DELIVERED' as any)).rejects.toThrow(BadRequestException);
    });
    it('should throw NotFoundException', async () => {
      (prisma as any).customOrder.findFirst.mockResolvedValue(null);
      await expect(service.updateStatus(tenantId, userId, 'x', 'DESIGNED' as any)).rejects.toThrow(NotFoundException);
    });
  });

  describe('recordDeposit', () => {
    it('should add deposit and update balance', async () => {
      (prisma as any).customOrder.findFirst.mockResolvedValue(mk({ status: 'CONFIRMED', depositPaise: 0n, finalPricePaise: 500000n }));
      (prisma as any).customOrder.update.mockResolvedValue(mk({ depositPaise: 200000n, balancePaise: 300000n, status: 'DEPOSIT_PAID' }));
      const r = await service.recordDeposit(tenantId, userId, 'co-1', 200000);
      expect(r.depositPaise).toBe(200000);
    });
    it('should auto-transition CONFIRMED -> DEPOSIT_PAID', async () => {
      (prisma as any).customOrder.findFirst.mockResolvedValue(mk({ status: 'CONFIRMED', depositPaise: 0n, finalPricePaise: 500000n }));
      (prisma as any).customOrder.update.mockResolvedValue(mk({ status: 'DEPOSIT_PAID' }));
      await service.recordDeposit(tenantId, userId, 'co-1', 200000);
      expect((prisma as any).customOrder.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'DEPOSIT_PAID' }) }));
    });
    it('should throw NotFoundException', async () => {
      (prisma as any).customOrder.findFirst.mockResolvedValue(null);
      await expect(service.recordDeposit(tenantId, userId, 'x', 100000)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateOrder', () => {
    it('should update fields', async () => {
      (prisma as any).customOrder.findFirst.mockResolvedValue(mk());
      (prisma as any).customOrder.update.mockResolvedValue(mk({ description: 'Updated' }));
      const r = await service.updateOrder(tenantId, userId, 'co-1', { description: 'Updated' });
      expect(r.description).toBe('Updated');
    });
    it('should recalculate balance on finalPrice change', async () => {
      (prisma as any).customOrder.findFirst.mockResolvedValue(mk({ depositPaise: 200000n }));
      (prisma as any).customOrder.update.mockResolvedValue(mk({ finalPricePaise: 600000n }));
      await service.updateOrder(tenantId, userId, 'co-1', { finalPricePaise: 600000 });
      expect((prisma as any).customOrder.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ balancePaise: 400000n }) }));
    });
  });

  describe('getCustomOrder', () => {
    it('should return order', async () => {
      (prisma as any).customOrder.findFirst.mockResolvedValue(mk());
      const r = await service.getCustomOrder(tenantId, 'co-1');
      expect(r.id).toBe('co-1');
    });
    it('should throw NotFoundException', async () => {
      (prisma as any).customOrder.findFirst.mockResolvedValue(null);
      await expect(service.getCustomOrder(tenantId, 'x')).rejects.toThrow(NotFoundException);
    });
  });
});
