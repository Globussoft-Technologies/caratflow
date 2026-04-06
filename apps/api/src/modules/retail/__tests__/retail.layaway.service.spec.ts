import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { createMockPrismaService, mockTenantContext, resetMocks } from '../../../__tests__/mocks';

vi.mock('uuid', () => ({ v4: vi.fn(() => 'mock-uuid') }));

import { RetailLayawayService } from '../retail.layaway.service';

describe('RetailLayawayService', () => {
  let service: RetailLayawayService;
  let prisma: ReturnType<typeof createMockPrismaService>;
  const { tenantId, userId } = mockTenantContext;

  beforeEach(() => {
    prisma = createMockPrismaService();
    resetMocks(prisma);
    (prisma as any).layaway = { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), count: vi.fn() };
    (prisma as any).layawayPayment = { create: vi.fn() };
    service = new RetailLayawayService(prisma as never);
  });

  const mk = (o: Record<string, unknown> = {}) => ({
    id: 'ly-1', tenantId, layawayNumber: 'LY/2604/0001', saleId: 'sale-1', customerId: 'c1',
    totalPaise: 1000000n, paidPaise: 0n, remainingPaise: 1000000n, status: 'ACTIVE',
    dueDate: null, installmentCount: 10, nextPaymentDate: new Date(),
    payments: [], createdAt: new Date(), updatedAt: new Date(), ...o,
  });

  describe('createLayaway', () => {
    it('should create from sale with ACTIVE status', async () => {
      prisma.sale.findFirst.mockResolvedValue({ id: 'sale-1' } as any);
      (prisma as any).layaway.count.mockResolvedValue(0);
      (prisma as any).layaway.create.mockResolvedValue(mk());
      (prisma as any).layaway.findFirst.mockResolvedValue(mk());
      const r = await service.createLayaway(tenantId, userId, { saleId: 'sale-1', customerId: 'c1', totalPaise: 1000000, installmentCount: 10 } as any);
      expect(r.status).toBe('ACTIVE');
    });
    it('should throw if sale not found', async () => {
      prisma.sale.findFirst.mockResolvedValue(null);
      await expect(service.createLayaway(tenantId, userId, { saleId: 'bad', customerId: 'c1', totalPaise: 1000000, installmentCount: 5 } as any)).rejects.toThrow(NotFoundException);
    });
  });

  describe('recordPayment', () => {
    it('should record payment and reduce remaining', async () => {
      (prisma as any).layaway.findFirst.mockResolvedValueOnce(mk()).mockResolvedValueOnce(mk({ paidPaise: 200000n, remainingPaise: 800000n }));
      const tx = prisma._tx; (tx as any).layawayPayment = { create: vi.fn() }; (tx as any).layaway = { update: vi.fn() };
      const r = await service.recordPayment(tenantId, userId, { layawayId: 'ly-1', amountPaise: 200000, method: 'CASH' } as any);
      expect(r.paidPaise).toBe(200000);
    });
    it('should complete when fully paid', async () => {
      (prisma as any).layaway.findFirst.mockResolvedValueOnce(mk({ paidPaise: 900000n, remainingPaise: 100000n })).mockResolvedValueOnce(mk({ status: 'COMPLETED', remainingPaise: 0n, paidPaise: 1000000n }));
      const tx = prisma._tx; (tx as any).layawayPayment = { create: vi.fn() }; (tx as any).layaway = { update: vi.fn() };
      const r = await service.recordPayment(tenantId, userId, { layawayId: 'ly-1', amountPaise: 100000, method: 'CASH' } as any);
      expect(r.status).toBe('COMPLETED');
    });
    it('should reject overpayment', async () => {
      (prisma as any).layaway.findFirst.mockResolvedValue(mk({ remainingPaise: 50000n }));
      await expect(service.recordPayment(tenantId, userId, { layawayId: 'ly-1', amountPaise: 100000, method: 'CASH' } as any)).rejects.toThrow(BadRequestException);
    });
    it('should reject payment on inactive layaway', async () => {
      (prisma as any).layaway.findFirst.mockResolvedValue(mk({ status: 'COMPLETED' }));
      await expect(service.recordPayment(tenantId, userId, { layawayId: 'ly-1', amountPaise: 10000, method: 'CASH' } as any)).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancelLayaway', () => {
    it('should cancel active layaway', async () => {
      (prisma as any).layaway.findFirst.mockResolvedValueOnce(mk()).mockResolvedValueOnce(mk({ status: 'CANCELLED' }));
      (prisma as any).layaway.update.mockResolvedValue(mk({ status: 'CANCELLED' }));
      const r = await service.cancelLayaway(tenantId, userId, 'ly-1');
      expect(r.status).toBe('CANCELLED');
    });
    it('should reject cancelling non-active', async () => {
      (prisma as any).layaway.findFirst.mockResolvedValue(mk({ status: 'COMPLETED' }));
      await expect(service.cancelLayaway(tenantId, userId, 'ly-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('forfeitLayaway', () => {
    it('should forfeit active layaway', async () => {
      (prisma as any).layaway.findFirst.mockResolvedValueOnce(mk()).mockResolvedValueOnce(mk({ status: 'FORFEITED' }));
      (prisma as any).layaway.update.mockResolvedValue(mk({ status: 'FORFEITED' }));
      const r = await service.forfeitLayaway(tenantId, userId, 'ly-1');
      expect(r.status).toBe('FORFEITED');
    });
    it('should reject forfeiting non-active', async () => {
      (prisma as any).layaway.findFirst.mockResolvedValue(mk({ status: 'CANCELLED' }));
      await expect(service.forfeitLayaway(tenantId, userId, 'ly-1')).rejects.toThrow(BadRequestException);
    });
  });
});
