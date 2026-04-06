import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { createMockPrismaService, mockTenantContext, resetMocks } from '../../../__tests__/mocks';
vi.mock('uuid', () => ({ v4: vi.fn(() => 'mock-uuid') }));

import { RetailOldGoldService } from '../retail.old-gold.service';
describe('RetailOldGoldService', () => {
  let service: RetailOldGoldService; let prisma: ReturnType<typeof createMockPrismaService>;
  const { tenantId, userId } = mockTenantContext;
  beforeEach(() => {
    prisma = createMockPrismaService();
    resetMocks(prisma);
    service = new RetailOldGoldService(prisma as never);
  });
  const mk = (o: Record<string, unknown> = {}) => ({
    id: 'og-1', tenantId, purchaseNumber: 'OG/2604/0001', customerId: 'c1', locationId: 'l1',
    metalType: 'GOLD', grossWeightMg: 10000n, netWeightMg: 9500n, purityFineness: 916,
    ratePaisePer10g: 6000000n, totalValuePaise: 5224000n, deductions: null,
    finalAmountPaise: 5224000n, paymentMethod: 'CASH', status: 'DRAFT',
    usedAgainstSaleId: null, createdAt: new Date(), updatedAt: new Date(), ...o,
  });

  describe('createPurchase', () => {
    it('should create with DRAFT status', async () => {
      prisma.oldGoldPurchase.count.mockResolvedValue(0);
      prisma.oldGoldPurchase.create.mockResolvedValue(mk() as any);
      prisma.oldGoldPurchase.findFirst.mockResolvedValue(mk() as any);
      const r = await service.createPurchase(tenantId, userId, { customerId: 'c1', locationId: 'l1', metalType: 'GOLD', grossWeightMg: 10000, netWeightMg: 9500, purityFineness: 916, ratePaisePer10g: 6000000 } as any);
      expect(r.status).toBe('DRAFT');
    });
    it('should calculate value using formula: (netWeight/10000)*rate*(purity/999)', async () => {
      prisma.oldGoldPurchase.count.mockResolvedValue(0);
      prisma.oldGoldPurchase.create.mockImplementation(async ({ data }: any) => ({ ...mk(), totalValuePaise: data.totalValuePaise, finalAmountPaise: data.finalAmountPaise }));
      prisma.oldGoldPurchase.findFirst.mockImplementation(async () => mk());
      await service.createPurchase(tenantId, userId, { customerId: 'c1', locationId: 'l1', metalType: 'GOLD', grossWeightMg: 10000, netWeightMg: 10000, purityFineness: 999, ratePaisePer10g: 6000000 } as any);
      // netWeight 10000mg = 1 * 10g unit, purity 999/999=1, so value = 6000000
      expect(prisma.oldGoldPurchase.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ totalValuePaise: 6000000n }) }));
    });
    it('should subtract deductions from final amount', async () => {
      prisma.oldGoldPurchase.count.mockResolvedValue(0);
      prisma.oldGoldPurchase.create.mockImplementation(async ({ data }: any) => ({ ...mk(), finalAmountPaise: data.finalAmountPaise }));
      prisma.oldGoldPurchase.findFirst.mockResolvedValue(mk() as any);
      await service.createPurchase(tenantId, userId, { customerId: 'c1', locationId: 'l1', metalType: 'GOLD', grossWeightMg: 10000, netWeightMg: 10000, purityFineness: 999, ratePaisePer10g: 6000000, deductions: [{ amountPaise: 100000 }] } as any);
      expect(prisma.oldGoldPurchase.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ finalAmountPaise: 5900000n }) }));
    });
  });

  describe('updateStatus', () => {
    it('should allow DRAFT -> TESTED', async () => {
      prisma.oldGoldPurchase.findFirst.mockResolvedValueOnce(mk({ status: 'DRAFT' }) as any).mockResolvedValueOnce(mk({ status: 'TESTED' }) as any);
      prisma.oldGoldPurchase.update.mockResolvedValue(mk({ status: 'TESTED' }) as any);
      const r = await service.updateStatus(tenantId, userId, 'og-1', 'TESTED' as any);
      expect(r.status).toBe('TESTED');
    });
    it('should reject DRAFT -> PURCHASED', async () => {
      prisma.oldGoldPurchase.findFirst.mockResolvedValue(mk({ status: 'DRAFT' }) as any);
      await expect(service.updateStatus(tenantId, userId, 'og-1', 'PURCHASED' as any)).rejects.toThrow(BadRequestException);
    });
    it('should throw NotFoundException', async () => {
      prisma.oldGoldPurchase.findFirst.mockResolvedValue(null);
      await expect(service.updateStatus(tenantId, userId, 'og-1', 'TESTED' as any)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateTestResults', () => {
    it('should update purity and recalculate value', async () => {
      prisma.oldGoldPurchase.findFirst.mockResolvedValueOnce(mk({ ratePaisePer10g: 6000000n }) as any).mockResolvedValueOnce(mk({ status: 'TESTED' }) as any);
      prisma.oldGoldPurchase.update.mockResolvedValue(mk({ status: 'TESTED' }) as any);
      const r = await service.updateTestResults(tenantId, userId, 'og-1', 750, 8000);
      expect(r.status).toBe('TESTED');
    });
    it('should throw NotFoundException', async () => {
      prisma.oldGoldPurchase.findFirst.mockResolvedValue(null);
      await expect(service.updateTestResults(tenantId, userId, 'og-1', 750, 8000)).rejects.toThrow(NotFoundException);
    });
  });

  describe('linkToSale', () => {
    it('should link and set EXCHANGED status', async () => {
      prisma.oldGoldPurchase.findFirst.mockResolvedValueOnce(mk() as any).mockResolvedValueOnce(mk({ status: 'EXCHANGED', usedAgainstSaleId: 'sale-1' }) as any);
      prisma.oldGoldPurchase.update.mockResolvedValue(mk({ status: 'EXCHANGED' }) as any);
      const r = await service.linkToSale(tenantId, userId, 'og-1', 'sale-1');
      expect(r.status).toBe('EXCHANGED');
    });
    it('should throw NotFoundException', async () => {
      prisma.oldGoldPurchase.findFirst.mockResolvedValue(null);
      await expect(service.linkToSale(tenantId, userId, 'og-1', 'sale-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getPurchase', () => {
    it('should return purchase', async () => {
      prisma.oldGoldPurchase.findFirst.mockResolvedValue(mk() as any);
      const r = await service.getPurchase(tenantId, 'og-1');
      expect(r.id).toBe('og-1');
    });
    it('should throw NotFoundException', async () => {
      prisma.oldGoldPurchase.findFirst.mockResolvedValue(null);
      await expect(service.getPurchase(tenantId, 'x')).rejects.toThrow(NotFoundException);
    });
  });
});
