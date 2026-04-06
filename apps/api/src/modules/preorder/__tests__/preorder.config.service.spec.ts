import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { createMockPrismaService, mockTenantContext, resetMocks } from '../../../__tests__/mocks';
vi.mock('uuid', () => ({ v4: vi.fn(() => 'mock-uuid') }));
import { PreOrderConfigService } from '../preorder.config.service';

describe('PreOrderConfigService', () => {
  let service: PreOrderConfigService; let prisma: ReturnType<typeof createMockPrismaService>;
  const { tenantId, userId } = mockTenantContext;
  beforeEach(() => {
    prisma = createMockPrismaService();
    resetMocks(prisma);
    (prisma as any).preOrderConfig = { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), upsert: vi.fn(), update: vi.fn(), delete: vi.fn() };
    prisma.product.findFirst = vi.fn() as any;
    service = new PreOrderConfigService(prisma as never);
  });
  const mk = (o: Record<string,unknown> = {}) => ({ id: 'pc-1', tenantId, productId: 'p1', product: { name: 'Ring' }, isPreOrderEnabled: true, isBackorderEnabled: false, maxPreOrderQty: 10, depositPercentage: 50, estimatedLeadDays: 14, autoConfirm: false, customMessage: null, createdAt: new Date(), updatedAt: new Date(), ...o });

  describe('setPreOrderConfig', () => {
    it('should upsert config', async () => {
      prisma.product.findFirst.mockResolvedValue({ id: 'p1' } as any);
      (prisma as any).preOrderConfig.upsert.mockResolvedValue(mk());
      const r = await service.setPreOrderConfig(tenantId, userId, { productId: 'p1', isPreOrderEnabled: true } as any);
      expect(r.isPreOrderEnabled).toBe(true);
    });
    it('should throw NotFoundException for missing product', async () => {
      prisma.product.findFirst.mockResolvedValue(null);
      await expect(service.setPreOrderConfig(tenantId, userId, { productId: 'bad' } as any)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getConfig', () => {
    it('should return config', async () => {
      (prisma as any).preOrderConfig.findUnique.mockResolvedValue(mk());
      const r = await service.getConfig(tenantId, 'p1');
      expect(r.productId).toBe('p1');
    });
    it('should throw NotFoundException', async () => {
      (prisma as any).preOrderConfig.findUnique.mockResolvedValue(null);
      await expect(service.getConfig(tenantId, 'x')).rejects.toThrow(NotFoundException);
    });
  });

  describe('bulkEnablePreOrder', () => {
    it('should update existing and create new', async () => {
      prisma.product.findFirst.mockResolvedValue({ id: 'p1' } as any);
      (prisma as any).preOrderConfig.findUnique.mockResolvedValueOnce(mk()).mockResolvedValueOnce(null);
      (prisma as any).preOrderConfig.update.mockResolvedValue({});
      (prisma as any).preOrderConfig.create.mockResolvedValue({});
      prisma.product.findFirst.mockResolvedValue({ id: 'p2' } as any);
      const r = await service.bulkEnablePreOrder(tenantId, userId, { productIds: ['p1', 'p2'], config: { isPreOrderEnabled: true } } as any);
      expect(r.updated + r.created).toBe(2);
    });
  });

  describe('deleteConfig', () => {
    it('should delete config', async () => {
      (prisma as any).preOrderConfig.findUnique.mockResolvedValue(mk());
      (prisma as any).preOrderConfig.delete.mockResolvedValue({});
      const r = await service.deleteConfig(tenantId, 'p1');
      expect(r.success).toBe(true);
    });
    it('should throw NotFoundException', async () => {
      (prisma as any).preOrderConfig.findUnique.mockResolvedValue(null);
      await expect(service.deleteConfig(tenantId, 'x')).rejects.toThrow(NotFoundException);
    });
  });

  describe('listConfigs', () => {
    it('should return all configs', async () => {
      (prisma as any).preOrderConfig.findMany.mockResolvedValue([mk()]);
      const r = await service.listConfigs(tenantId);
      expect(r).toHaveLength(1);
    });
  });
});
