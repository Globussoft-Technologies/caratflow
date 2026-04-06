import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { createMockPrismaService, mockTenantContext, resetMocks } from '../../../__tests__/mocks';
vi.mock('uuid', () => ({ v4: vi.fn(() => 'mock-uuid') }));

import { RetailDiscountService } from '../retail.discount.service';
describe('RetailDiscountService', () => {
  let service: RetailDiscountService; let prisma: ReturnType<typeof createMockPrismaService>;
  const { tenantId, userId } = mockTenantContext;
  beforeEach(() => {
    prisma = createMockPrismaService();
    resetMocks(prisma);
    (prisma as any).discount = { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), count: vi.fn() };
    service = new RetailDiscountService(prisma as never);
  });
  const mk = (o: Record<string, unknown> = {}) => ({
    id: 'd-1', tenantId, name: 'Summer Sale', discountType: 'PERCENTAGE', value: 10,
    minPurchasePaise: null, maxDiscountPaise: null, applicableCategories: null,
    applicableProducts: null, startDate: new Date('2026-01-01'), endDate: new Date('2026-12-31'),
    isActive: true, usageLimit: null, usedCount: 0, createdAt: new Date(), updatedAt: new Date(), ...o,
  });

  describe('createDiscount', () => {
    it('should create discount', async () => {
      (prisma as any).discount.create.mockResolvedValue(mk());
      const r = await service.createDiscount(tenantId, userId, { name: 'Summer Sale', discountType: 'PERCENTAGE', value: 10, startDate: new Date(), endDate: new Date() } as any);
      expect(r.name).toBe('Summer Sale');
      expect(r.discountType).toBe('PERCENTAGE');
    });
  });

  describe('updateDiscount', () => {
    it('should update discount fields', async () => {
      (prisma as any).discount.findFirst.mockResolvedValue(mk());
      (prisma as any).discount.update.mockResolvedValue(mk({ value: 15 }));
      const r = await service.updateDiscount(tenantId, userId, 'd-1', { value: 15 });
      expect(r.value).toBe(15);
    });
    it('should throw NotFoundException', async () => {
      (prisma as any).discount.findFirst.mockResolvedValue(null);
      await expect(service.updateDiscount(tenantId, userId, 'x', { value: 5 })).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteDiscount', () => {
    it('should soft-delete by setting isActive=false', async () => {
      (prisma as any).discount.findFirst.mockResolvedValue(mk());
      (prisma as any).discount.update.mockResolvedValue(mk({ isActive: false }));
      await service.deleteDiscount(tenantId, 'd-1');
      expect((prisma as any).discount.update).toHaveBeenCalledWith(expect.objectContaining({ data: { isActive: false } }));
    });
    it('should throw NotFoundException', async () => {
      (prisma as any).discount.findFirst.mockResolvedValue(null);
      await expect(service.deleteDiscount(tenantId, 'x')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getActiveDiscounts', () => {
    it('should filter by active, start/end date', async () => {
      (prisma as any).discount.findMany.mockResolvedValue([mk()]);
      const r = await service.getActiveDiscounts(tenantId);
      expect(r).toHaveLength(1);
    });
  });

  describe('incrementUsage', () => {
    it('should increment usedCount', async () => {
      (prisma as any).discount.update.mockResolvedValue(mk({ usedCount: 1 }));
      await service.incrementUsage(tenantId, 'd-1');
      expect((prisma as any).discount.update).toHaveBeenCalledWith(expect.objectContaining({ data: { usedCount: { increment: 1 } } }));
    });
  });

  describe('getDiscount', () => {
    it('should return discount', async () => {
      (prisma as any).discount.findFirst.mockResolvedValue(mk());
      const r = await service.getDiscount(tenantId, 'd-1');
      expect(r.id).toBe('d-1');
    });
    it('should throw NotFoundException', async () => {
      (prisma as any).discount.findFirst.mockResolvedValue(null);
      await expect(service.getDiscount(tenantId, 'x')).rejects.toThrow(NotFoundException);
    });
  });

  describe('listDiscounts', () => {
    it('should return paginated list', async () => {
      (prisma as any).discount.findMany.mockResolvedValue([mk()]);
      (prisma as any).discount.count.mockResolvedValue(1);
      const r = await service.listDiscounts(tenantId, {}, { page: 1, limit: 10 } as any);
      expect(r.total).toBe(1);
    });
  });
});
