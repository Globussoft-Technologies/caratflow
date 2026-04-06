import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { createMockPrismaService, mockTenantContext, resetMocks } from '../../../__tests__/mocks';
import { CompareService } from '../compare.service';

describe('CompareService', () => {
  let service: CompareService; let prisma: ReturnType<typeof createMockPrismaService>;
  const { tenantId } = mockTenantContext;
  beforeEach(() => {
    prisma = createMockPrismaService();
    resetMocks(prisma);
    (prisma as any).compareList = { findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() };
    prisma.product.findMany = vi.fn() as any;
    prisma.product.findFirst = vi.fn() as any;
    service = new CompareService(prisma as never);
  });

  describe('addToCompare', () => {
    it('should create new compare list', async () => {
      prisma.product.findFirst.mockResolvedValue({ id: 'p1', productType: 'GOLD' } as any);
      (prisma as any).compareList.findFirst.mockResolvedValue(null);
      (prisma as any).compareList.create.mockResolvedValue({ id: 'cl-1', productIds: ['p1'] });
      const r = await service.addToCompare(tenantId, 'p1', 'c1');
      expect(r.productIds).toEqual(['p1']);
    });
    it('should enforce max 4 items', async () => {
      prisma.product.findFirst.mockResolvedValue({ id: 'p5', productType: 'GOLD' } as any);
      (prisma as any).compareList.findFirst.mockResolvedValue({ id: 'cl-1', productIds: ['p1','p2','p3','p4'] });
      prisma.product.findMany.mockResolvedValue([{ productType: 'GOLD' }] as any);
      await expect(service.addToCompare(tenantId, 'p5', 'c1')).rejects.toThrow(BadRequestException);
    });
    it('should enforce same product type', async () => {
      prisma.product.findFirst.mockResolvedValue({ id: 'p2', productType: 'SILVER' } as any);
      (prisma as any).compareList.findFirst.mockResolvedValue({ id: 'cl-1', productIds: ['p1'] });
      prisma.product.findMany.mockResolvedValue([{ productType: 'GOLD' }] as any);
      await expect(service.addToCompare(tenantId, 'p2', 'c1')).rejects.toThrow(BadRequestException);
    });
    it('should require customerId or sessionId', async () => {
      await expect(service.addToCompare(tenantId, 'p1')).rejects.toThrow(BadRequestException);
    });
    it('should be idempotent for existing product', async () => {
      prisma.product.findFirst.mockResolvedValue({ id: 'p1', productType: 'GOLD' } as any);
      (prisma as any).compareList.findFirst.mockResolvedValue({ id: 'cl-1', productIds: ['p1'] });
      const r = await service.addToCompare(tenantId, 'p1', 'c1');
      expect(r.productIds).toEqual(['p1']);
    });
    it('should throw NotFoundException for missing product', async () => {
      prisma.product.findFirst.mockResolvedValue(null);
      await expect(service.addToCompare(tenantId, 'bad', 'c1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeFromCompare', () => {
    it('should remove product from list', async () => {
      (prisma as any).compareList.findFirst.mockResolvedValue({ id: 'cl-1', productIds: ['p1', 'p2'] });
      (prisma as any).compareList.update.mockResolvedValue({ id: 'cl-1', productIds: ['p2'] });
      const r = await service.removeFromCompare(tenantId, 'p1', 'c1');
      expect(r!.productIds).toEqual(['p2']);
    });
    it('should delete list when last item removed', async () => {
      (prisma as any).compareList.findFirst.mockResolvedValue({ id: 'cl-1', productIds: ['p1'] });
      (prisma as any).compareList.delete.mockResolvedValue({});
      const r = await service.removeFromCompare(tenantId, 'p1', 'c1');
      expect(r).toBeNull();
    });
  });

  describe('clearCompare', () => {
    it('should delete compare list', async () => {
      (prisma as any).compareList.findFirst.mockResolvedValue({ id: 'cl-1' });
      (prisma as any).compareList.delete.mockResolvedValue({});
      await service.clearCompare(tenantId, 'c1');
      expect((prisma as any).compareList.delete).toHaveBeenCalled();
    });
  });
});
