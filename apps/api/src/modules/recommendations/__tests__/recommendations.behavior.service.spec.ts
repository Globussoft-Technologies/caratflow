import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockPrismaService, mockTenantContext, resetMocks } from '../../../__tests__/mocks';
import { RecommendationsBehaviorService } from '../recommendations.behavior.service';

describe('RecommendationsBehaviorService', () => {
  let service: RecommendationsBehaviorService; let prisma: ReturnType<typeof createMockPrismaService>;
  const { tenantId } = mockTenantContext;
  beforeEach(() => {
    prisma = createMockPrismaService();
    resetMocks(prisma);
    ['recentlyViewed','customerBehavior','searchLog','saleLineItem','onlineOrderItem'].forEach(m => { (prisma as any)[m] = { findFirst: vi.fn(), findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), upsert: vi.fn(), count: vi.fn() }; });
    prisma.product.findMany = vi.fn() as any;
    prisma.product.findFirst = vi.fn() as any;
    prisma.product.count = vi.fn() as any;
    prisma.product.findUnique = vi.fn() as any;
    service = new RecommendationsBehaviorService(prisma as never);
  });

  describe('trackProductView', () => {
    it('should skip for anonymous users', async () => {
      await service.trackProductView(tenantId, null, 'sess-1', 'p1');
      expect((prisma as any).recentlyViewed.upsert).not.toHaveBeenCalled();
    });
    it('should upsert recently viewed and update behavior', async () => {
      (prisma as any).recentlyViewed.upsert.mockResolvedValue({});
      prisma.product.findFirst.mockResolvedValue({ categoryId: 'c1', productType: 'GOLD' } as any);
      (prisma as any).customerBehavior.findUnique.mockResolvedValue(null);
      (prisma as any).customerBehavior.upsert.mockResolvedValue({});
      await service.trackProductView(tenantId, 'cust-1', 'sess-1', 'p1');
      expect((prisma as any).recentlyViewed.upsert).toHaveBeenCalled();
      expect((prisma as any).customerBehavior.upsert).toHaveBeenCalled();
    });
  });

  describe('trackSearch', () => {
    it('should log search for anonymous users', async () => {
      (prisma as any).searchLog.create.mockResolvedValue({});
      await service.trackSearch(tenantId, null, 'sess-1', 'gold ring', 5);
      expect((prisma as any).searchLog.create).toHaveBeenCalled();
    });
    it('should update behavior profile for logged-in user', async () => {
      (prisma as any).searchLog.create.mockResolvedValue({});
      (prisma as any).customerBehavior.findUnique.mockResolvedValue({ searchQueries: ['old query'] });
      (prisma as any).customerBehavior.upsert.mockResolvedValue({});
      await service.trackSearch(tenantId, 'c1', 'sess-1', 'diamond', 10);
      expect((prisma as any).customerBehavior.upsert).toHaveBeenCalled();
    });
  });

  describe('trackPurchase', () => {
    it('should skip for empty product list', async () => {
      await service.trackPurchase(tenantId, 'c1', [], 0);
      expect(prisma.product.findMany).not.toHaveBeenCalled();
    });
    it('should update behavior with purchase data', async () => {
      prisma.product.findMany.mockResolvedValue([{ id: 'p1', categoryId: 'c1', productType: 'GOLD', metalPurity: 916, sellingPricePaise: 50000n }] as any);
      (prisma as any).customerBehavior.findUnique.mockResolvedValue(null);
      (prisma as any).customerBehavior.upsert.mockResolvedValue({});
      await service.trackPurchase(tenantId, 'c1', ['p1'], 50000);
      expect((prisma as any).customerBehavior.upsert).toHaveBeenCalled();
    });
  });

  describe('buildBehaviorProfile', () => {
    it('should aggregate all signals', async () => {
      (prisma as any).recentlyViewed.findMany.mockResolvedValue([]);
      (prisma as any).saleLineItem.findMany.mockResolvedValue([]);
      (prisma as any).onlineOrderItem.findMany.mockResolvedValue([]);
      (prisma as any).searchLog.findMany.mockResolvedValue([]);
      (prisma as any).customerBehavior.upsert.mockResolvedValue({});
      prisma.product.findMany.mockResolvedValue([]);
      await service.buildBehaviorProfile(tenantId, 'c1');
      expect((prisma as any).customerBehavior.upsert).toHaveBeenCalled();
    });
  });
});
