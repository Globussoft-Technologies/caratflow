import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { createMockPrismaService, mockTenantContext, resetMocks } from '../../../__tests__/mocks';
vi.mock('uuid', () => ({ v4: vi.fn(() => 'mock-uuid') }));
import { BnplService } from '../bnpl.service';

describe('BnplService', () => {
  let service: BnplService; let prisma: ReturnType<typeof createMockPrismaService>;
  let emiService: any;
  const { tenantId, userId } = mockTenantContext;
  beforeEach(() => {
    prisma = createMockPrismaService();
    resetMocks(prisma);
    ['bnplProvider','bnplTransaction','emiPlan','emiSchedule'].forEach(m => { (prisma as any)[m] = { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), count: vi.fn(), aggregate: vi.fn() }; });
    ['onlineOrder'].forEach(m => { (prisma as any)[m] = { findFirst: vi.fn() }; });
    emiService = { calculateEmi: vi.fn().mockReturnValue({ monthlyEmiPaise: 10000, totalInterestPaise: 2000, totalPayablePaise: 52000 }), generateEmiSchedule: vi.fn().mockReturnValue([{ installmentNumber: 1, dueDate: new Date(), amountPaise: 10000, principalPaise: 9000, interestPaise: 1000 }]) };
    service = new BnplService(prisma as never, emiService);
  });

  describe('checkEligibility', () => {
    it('should return eligible providers and EMI plans', async () => {
      (prisma as any).bnplProvider.findMany.mockResolvedValue([{ id: 'bp-1', providerName: 'SIMPL', displayName: 'Simpl', maxOrderPaise: 5000000n, supportedTenures: [3, 6], processingFeePct: 0 }]);
      (prisma as any).emiPlan.findMany.mockResolvedValue([{ id: 'ep-1', bankName: 'HDFC', tenure: 6, interestRatePct: 0, isNoCostEmi: true, processingFeePaise: 0n }]);
      const r = await service.checkEligibility(tenantId, 'c1', 100000);
      expect(r.eligible).toBe(true);
      expect(r.providers).toHaveLength(1);
      expect(r.emiPlans).toHaveLength(1);
    });
    it('should return not eligible when no providers match', async () => {
      (prisma as any).bnplProvider.findMany.mockResolvedValue([]);
      (prisma as any).emiPlan.findMany.mockResolvedValue([]);
      const r = await service.checkEligibility(tenantId, 'c1', 100000);
      expect(r.eligible).toBe(false);
    });
  });

  describe('initiateBnpl', () => {
    it('should create transaction with EMI schedule', async () => {
      (prisma as any).bnplProvider.findFirst.mockResolvedValue({ id: 'bp-1', minOrderPaise: 1000n, maxOrderPaise: 10000000n, supportedTenures: [3] });
      (prisma as any).onlineOrder.findFirst.mockResolvedValue({ id: 'o-1', totalPaise: 500000n });
      (prisma as any).bnplTransaction.create.mockResolvedValue({ id: 'bt-1', tenantId, orderId: 'o-1', customerId: 'c1', providerName: 'SIMPL', planId: null, orderAmountPaise: 500000n, emiAmountPaise: 10000n, tenure: 3, interestPaise: 2000n, processingFeePaise: 0n, totalPayablePaise: 52000n, status: 'INITIATED', externalTransactionId: null, approvedAt: null, nextDueDate: null, completedAt: null, createdAt: new Date(), updatedAt: new Date() });
      (prisma as any).emiSchedule.create.mockResolvedValue({});
      const r = await service.initiateBnpl(tenantId, userId, 'c1', { orderId: 'o-1', providerName: 'SIMPL' } as any);
      expect(r.status).toBe('INITIATED');
    });
    it('should throw NotFoundException for missing provider', async () => {
      (prisma as any).bnplProvider.findFirst.mockResolvedValue(null);
      await expect(service.initiateBnpl(tenantId, userId, 'c1', { orderId: 'o-1', providerName: 'BAD' } as any)).rejects.toThrow(NotFoundException);
    });
    it('should throw NotFoundException for missing order', async () => {
      (prisma as any).bnplProvider.findFirst.mockResolvedValue({ id: 'bp-1' });
      (prisma as any).onlineOrder.findFirst.mockResolvedValue(null);
      await expect(service.initiateBnpl(tenantId, userId, 'c1', { orderId: 'x', providerName: 'SIMPL' } as any)).rejects.toThrow(NotFoundException);
    });
  });

  describe('handleBnplCallback', () => {
    it('should update transaction status on callback', async () => {
      (prisma as any).bnplTransaction.findFirst.mockResolvedValue({ id: 'bt-1', status: 'INITIATED', externalTransactionId: 'ext-1' });
      (prisma as any).emiSchedule.findFirst.mockResolvedValue({ id: 'es-1', dueDate: new Date() });
      (prisma as any).emiSchedule.update.mockResolvedValue({});
      (prisma as any).bnplTransaction.update.mockResolvedValue({ id: 'bt-1', tenantId, orderId: 'o-1', customerId: 'c1', providerName: 'SIMPL', planId: null, orderAmountPaise: 500000n, emiAmountPaise: 10000n, tenure: 3, interestPaise: 2000n, processingFeePaise: 0n, totalPayablePaise: 52000n, status: 'APPROVED', externalTransactionId: 'ext-1', approvedAt: new Date(), nextDueDate: new Date(), completedAt: null, createdAt: new Date(), updatedAt: new Date() });
      const r = await service.handleBnplCallback(tenantId, 'SIMPL', { transactionId: 'ext-1', status: 'APPROVED' });
      expect(r.status).toBe('APPROVED');
    });
    it('should throw if transaction not found', async () => {
      (prisma as any).bnplTransaction.findFirst.mockResolvedValue(null);
      await expect(service.handleBnplCallback(tenantId, 'SIMPL', { transactionId: 'x', status: 'APPROVED' })).rejects.toThrow(NotFoundException);
    });
    it('should throw if no transactionId', async () => {
      await expect(service.handleBnplCallback(tenantId, 'SIMPL', { status: 'APPROVED' })).rejects.toThrow(BadRequestException);
    });
  });

  describe('getTransaction', () => {
    it('should return transaction with schedule', async () => {
      (prisma as any).bnplTransaction.findFirst.mockResolvedValue({ id: 'bt-1', tenantId, orderId: 'o-1', customerId: 'c1', providerName: 'SIMPL', planId: null, orderAmountPaise: 500000n, emiAmountPaise: 10000n, tenure: 3, interestPaise: 2000n, processingFeePaise: 0n, totalPayablePaise: 52000n, status: 'ACTIVE', externalTransactionId: null, approvedAt: null, nextDueDate: null, completedAt: null, createdAt: new Date(), updatedAt: new Date(), emiSchedule: [{ id: 'es-1', transactionId: 'bt-1', installmentNumber: 1, dueDate: new Date(), amountPaise: 10000n, principalPaise: 9000n, interestPaise: 1000n, status: 'DUE', paidAt: null, paidAmountPaise: null, lateFeePaise: 0n }] });
      const r = await service.getTransaction(tenantId, 'bt-1');
      expect(r.schedule).toHaveLength(1);
    });
    it('should throw NotFoundException', async () => {
      (prisma as any).bnplTransaction.findFirst.mockResolvedValue(null);
      await expect(service.getTransaction(tenantId, 'x')).rejects.toThrow(NotFoundException);
    });
  });
});
