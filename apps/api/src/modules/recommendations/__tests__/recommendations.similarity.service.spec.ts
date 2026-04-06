import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockPrismaService, mockTenantContext, resetMocks } from '../../../__tests__/mocks';
import { RecommendationsSimilarityService } from '../recommendations.similarity.service';

describe('RecommendationsSimilarityService', () => {
  let service: RecommendationsSimilarityService; let prisma: ReturnType<typeof createMockPrismaService>;
  const { tenantId } = mockTenantContext;
  beforeEach(() => {
    prisma = createMockPrismaService();
    resetMocks(prisma);
    ['productSimilarity','recentlyViewed','saleLineItem'].forEach(m => { (prisma as any)[m] = { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), createMany: vi.fn(), deleteMany: vi.fn(), count: vi.fn(), groupBy: vi.fn() }; });
    prisma.sale = { ...prisma.sale, findMany: vi.fn() } as any;
    prisma.product.findMany = vi.fn() as any;
    prisma.product.findFirst = vi.fn() as any;
    prisma.product.count = vi.fn() as any;
    prisma.product.findUnique = vi.fn() as any;
    service = new RecommendationsSimilarityService(prisma as never);
  });

  describe('computeProductSimilarities', () => {
    it('should process products in batches', async () => {
      prisma.product.count.mockResolvedValue(1);
      prisma.product.findMany.mockResolvedValue([{ id: 'p1', categoryId: 'c1', productType: 'GOLD', metalPurity: 916, sellingPricePaise: 50000n }] as any);
      (prisma as any).productSimilarity.deleteMany.mockResolvedValue({});
      (prisma as any).productSimilarity.createMany.mockResolvedValue({});
      (prisma as any).sale = { findMany: vi.fn().mockResolvedValue([]) };
      (prisma as any).saleLineItem.findMany.mockResolvedValue([]);
      (prisma as any).recentlyViewed.findMany.mockResolvedValue([]);
      await service.computeProductSimilarities(tenantId);
      expect(prisma.product.count).toHaveBeenCalled();
    });
  });

  describe('computeBoughtTogether', () => {
    it('should analyze co-purchase patterns', async () => {
      (prisma as any).productSimilarity.deleteMany.mockResolvedValue({});
      (prisma as any).sale = { findMany: vi.fn().mockResolvedValue([{ id: 's1' }]) };
      (prisma as any).saleLineItem.findMany.mockResolvedValue([
        { saleId: 's1', productId: 'p1' }, { saleId: 's1', productId: 'p2' },
        { saleId: 's1', productId: 'p1' }, { saleId: 's1', productId: 'p2' },
      ]);
      (prisma as any).productSimilarity.createMany.mockResolvedValue({});
      await service.computeBoughtTogether(tenantId);
      expect((prisma as any).productSimilarity.deleteMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ reason: 'BOUGHT_TOGETHER' }) }));
    });
  });

  describe('computeViewedTogether', () => {
    it('should analyze co-view patterns', async () => {
      (prisma as any).productSimilarity.deleteMany.mockResolvedValue({});
      (prisma as any).recentlyViewed.findMany.mockResolvedValue([
        { customerId: 'c1', productId: 'p1' }, { customerId: 'c1', productId: 'p2' },
        { customerId: 'c2', productId: 'p1' }, { customerId: 'c2', productId: 'p2' },
        { customerId: 'c3', productId: 'p1' }, { customerId: 'c3', productId: 'p2' },
      ]);
      (prisma as any).productSimilarity.createMany.mockResolvedValue({});
      await service.computeViewedTogether(tenantId);
      expect((prisma as any).productSimilarity.deleteMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ reason: 'VIEWED_TOGETHER' }) }));
    });
  });
});
