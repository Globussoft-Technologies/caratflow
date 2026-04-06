import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { createMockPrismaService, mockTenantContext, resetMocks } from '../../../__tests__/mocks';
vi.mock('uuid', () => ({ v4: vi.fn(() => 'mock-uuid') }));
import { BnplSavedPaymentService } from '../bnpl.saved-payment.service';

describe('BnplSavedPaymentService', () => {
  let service: BnplSavedPaymentService; let prisma: ReturnType<typeof createMockPrismaService>;
  const { tenantId } = mockTenantContext;
  beforeEach(() => {
    prisma = createMockPrismaService();
    resetMocks(prisma);
    (prisma as any).savedPaymentMethod = { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), updateMany: vi.fn(), delete: vi.fn(), count: vi.fn() };
    service = new BnplSavedPaymentService(prisma as never);
  });
  const mk = (o: Record<string,unknown> = {}) => ({ id: 'sp-1', tenantId, customerId: 'c1', methodType: 'CARD', displayName: 'HDFC *1234', last4: '1234', cardBrand: 'VISA', cardType: 'CREDIT', upiId: null, walletProvider: null, tokenReference: 'tok-1', isDefault: false, expiresAt: null, createdAt: new Date(), updatedAt: new Date(), ...o });

  describe('saveMethod', () => {
    it('should auto-default first method', async () => {
      (prisma as any).savedPaymentMethod.count.mockResolvedValue(0);
      (prisma as any).savedPaymentMethod.create.mockResolvedValue(mk({ isDefault: true }));
      const r = await service.saveMethod(tenantId, 'c1', { methodType: 'CARD', displayName: 'HDFC *1234', tokenReference: 'tok-1' } as any);
      expect(r.isDefault).toBe(true);
    });
    it('should unset previous default when isDefault=true', async () => {
      (prisma as any).savedPaymentMethod.count.mockResolvedValue(1);
      (prisma as any).savedPaymentMethod.updateMany.mockResolvedValue({});
      (prisma as any).savedPaymentMethod.create.mockResolvedValue(mk({ isDefault: true }));
      await service.saveMethod(tenantId, 'c1', { methodType: 'CARD', displayName: 'New', tokenReference: 'tok-2', isDefault: true } as any);
      expect((prisma as any).savedPaymentMethod.updateMany).toHaveBeenCalled();
    });
  });

  describe('listMethods', () => {
    it('should filter out expired methods', async () => {
      (prisma as any).savedPaymentMethod.findMany.mockResolvedValue([mk(), mk({ id: 'sp-2', expiresAt: new Date('2020-01-01') })]);
      const r = await service.listMethods(tenantId, 'c1');
      expect(r).toHaveLength(1);
    });
  });

  describe('setDefault', () => {
    it('should set as default', async () => {
      (prisma as any).savedPaymentMethod.findFirst.mockResolvedValue(mk());
      (prisma as any).savedPaymentMethod.updateMany.mockResolvedValue({});
      (prisma as any).savedPaymentMethod.update.mockResolvedValue(mk({ isDefault: true }));
      const r = await service.setDefault(tenantId, 'c1', 'sp-1');
      expect(r.isDefault).toBe(true);
    });
    it('should throw NotFoundException', async () => {
      (prisma as any).savedPaymentMethod.findFirst.mockResolvedValue(null);
      await expect(service.setDefault(tenantId, 'c1', 'x')).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeMethod', () => {
    it('should delete and promote next to default', async () => {
      (prisma as any).savedPaymentMethod.findFirst.mockResolvedValueOnce(mk({ isDefault: true })).mockResolvedValueOnce(mk({ id: 'sp-2' }));
      (prisma as any).savedPaymentMethod.delete.mockResolvedValue({});
      (prisma as any).savedPaymentMethod.update.mockResolvedValue({});
      await service.removeMethod(tenantId, 'c1', 'sp-1');
      expect((prisma as any).savedPaymentMethod.update).toHaveBeenCalledWith(expect.objectContaining({ data: { isDefault: true } }));
    });
    it('should throw NotFoundException', async () => {
      (prisma as any).savedPaymentMethod.findFirst.mockResolvedValue(null);
      await expect(service.removeMethod(tenantId, 'c1', 'x')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getDefaultMethod', () => {
    it('should return null if expired', async () => {
      (prisma as any).savedPaymentMethod.findFirst.mockResolvedValue(mk({ isDefault: true, expiresAt: new Date('2020-01-01') }));
      const r = await service.getDefaultMethod(tenantId, 'c1');
      expect(r).toBeNull();
    });
    it('should return method if valid', async () => {
      (prisma as any).savedPaymentMethod.findFirst.mockResolvedValue(mk({ isDefault: true }));
      const r = await service.getDefaultMethod(tenantId, 'c1');
      expect(r!.id).toBe('sp-1');
    });
  });
});
