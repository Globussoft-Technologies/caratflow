import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { createMockPrismaService, mockTenantContext, resetMocks } from '../../../__tests__/mocks';
vi.mock('uuid', () => ({ v4: vi.fn(() => 'mock-uuid') }));
import { WholesaleRateContractService } from '../wholesale.rate-contract.service';

describe('WholesaleRateContractService', () => {
  let service: WholesaleRateContractService; let prisma: ReturnType<typeof createMockPrismaService>;
  const { tenantId, userId } = mockTenantContext;
  beforeEach(() => {
    prisma = createMockPrismaService();
    resetMocks(prisma);
    (prisma as any).rateContract = { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), count: vi.fn() };
    service = new WholesaleRateContractService(prisma as never);
  });
  const mk = (o: Record<string, unknown> = {}) => ({ id: 'rc-1', tenantId, supplierId: 's-1', supplier: { name: 'S' }, productCategoryId: null, metalType: 'GOLD', ratePerGramPaise: 600000n, makingChargesPercent: 10, validFrom: new Date('2026-01-01'), validTo: new Date('2026-12-31'), isActive: true, terms: null, createdAt: new Date(), updatedAt: new Date(), ...o });

  describe('createRateContract', () => {
    it('should create contract', async () => {
      (prisma as any).rateContract.create.mockResolvedValue(mk());
      const r = await service.createRateContract(tenantId, userId, { supplierId: 's-1', metalType: 'GOLD', validFrom: new Date(), validTo: new Date() } as any);
      expect(r.metalType).toBe('GOLD');
    });
  });

  describe('findApplicableRate', () => {
    it('should find active rate in date range', async () => {
      (prisma as any).rateContract.findFirst.mockResolvedValue(mk());
      const r = await service.findApplicableRate(tenantId, 's-1', undefined, 'GOLD');
      expect(r).not.toBeNull();
      expect(r!.metalType).toBe('GOLD');
    });
    it('should return null when no match', async () => {
      (prisma as any).rateContract.findFirst.mockResolvedValue(null);
      const r = await service.findApplicableRate(tenantId, 's-1', undefined, 'PLATINUM');
      expect(r).toBeNull();
    });
  });

  describe('updateRateContract', () => {
    it('should update contract', async () => {
      (prisma as any).rateContract.findFirst.mockResolvedValueOnce(mk()).mockResolvedValueOnce(mk({ isActive: false }));
      (prisma as any).rateContract.update.mockResolvedValue(mk({ isActive: false }));
      const r = await service.updateRateContract(tenantId, userId, 'rc-1', { isActive: false });
      expect(r.isActive).toBe(false);
    });
    it('should throw NotFoundException', async () => {
      (prisma as any).rateContract.findFirst.mockResolvedValue(null);
      await expect(service.updateRateContract(tenantId, userId, 'x', {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('getRateContract', () => {
    it('should return contract', async () => {
      (prisma as any).rateContract.findFirst.mockResolvedValue(mk());
      const r = await service.getRateContract(tenantId, 'rc-1');
      expect(r.id).toBe('rc-1');
    });
    it('should throw NotFoundException', async () => {
      (prisma as any).rateContract.findFirst.mockResolvedValue(null);
      await expect(service.getRateContract(tenantId, 'x')).rejects.toThrow(NotFoundException);
    });
  });

  describe('listRateContracts', () => {
    it('should return paginated list', async () => {
      (prisma as any).rateContract.findMany.mockResolvedValue([mk()]);
      (prisma as any).rateContract.count.mockResolvedValue(1);
      const r = await service.listRateContracts(tenantId, {}, { page: 1, limit: 10 } as any);
      expect(r.total).toBe(1);
    });
  });
});
