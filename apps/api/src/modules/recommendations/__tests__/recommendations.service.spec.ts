import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockPrismaService, mockTenantContext, resetMocks } from '../../../__tests__/mocks';
import { RecommendationsService } from '../recommendations.service';

describe('RecommendationsService', () => {
  let service: RecommendationsService; let prisma: ReturnType<typeof createMockPrismaService>;
  let scoringService: any;
  const { tenantId } = mockTenantContext;
  beforeEach(() => {
    prisma = createMockPrismaService();
    resetMocks(prisma);
    ['customerBehavior','productSimilarity','recentlyViewed','saleLineItem','recommendationLog'].forEach(m => { (prisma as any)[m] = { findFirst: vi.fn(), findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), count: vi.fn(), groupBy: vi.fn() }; });
    scoringService = { scoreProducts: vi.fn((items: any) => items), diversifyResults: vi.fn((items: any, limit: any) => items.slice(0, limit)), applyBusinessRules: vi.fn((items: any) => items) };
    prisma.product.findMany = vi.fn() as any;
    prisma.product.findFirst = vi.fn() as any;
    prisma.product.count = vi.fn() as any;
    prisma.product.findUnique = vi.fn() as any;
    service = new RecommendationsService(prisma as never, scoringService);
  });

  describe('getPersonalizedRecommendations', () => {
    it('should fall back to trending when no behavior', async () => {
      (prisma as any).customerBehavior.findUnique.mockResolvedValue(null);
      (prisma as any).recentlyViewed.groupBy.mockResolvedValue([]);
      (prisma as any).saleLineItem.groupBy.mockResolvedValue([]);
      prisma.product.findMany.mockResolvedValue([{ id: 'p1', sku: 'S', name: 'Ring', productType: 'GOLD', categoryId: 'c1', metalPurity: 916, sellingPricePaise: 50000n, currencyCode: 'INR', images: [], isActive: true, category: { name: 'Rings' } }] as any);
      const r = await service.getPersonalizedRecommendations(tenantId, 'c1');
      expect(r.algorithm).toBe('fallback-trending');
    });
    it('should use behavior profile when available', async () => {
      (prisma as any).customerBehavior.findUnique.mockResolvedValue({ viewedCategories: { cat1: 5 }, preferredMetalType: 'GOLD' });
      prisma.product.findMany.mockResolvedValue([{ id: 'p1', sku: 'S', name: 'Ring', productType: 'GOLD', categoryId: 'c1', metalPurity: 916, sellingPricePaise: 50000n, currencyCode: 'INR', images: [], isActive: true, category: { name: 'Rings' } }] as any);
      const r = await service.getPersonalizedRecommendations(tenantId, 'c1');
      expect(r.algorithm).toBe('behavior-profile-scoring');
    });
  });

  describe('getSimilarProducts', () => {
    it('should use pre-computed similarities when enough', async () => {
      const sims = Array.from({ length: 12 }, (_, i) => ({ similarProductId: 'p' + i, similarityScore: 900 - i * 10 }));
      (prisma as any).productSimilarity.findMany.mockResolvedValue(sims);
      prisma.product.findMany.mockResolvedValue(sims.map(s => ({ id: s.similarProductId, sku: 'S', name: 'Prod', productType: 'GOLD', categoryId: 'c1', metalPurity: 916, sellingPricePaise: 50000n, currencyCode: 'INR', images: [], isActive: true, category: { name: 'Cat' } })) as any);
      const r = await service.getSimilarProducts(tenantId, 'p-source');
      expect(r.algorithm).toBe('pre-computed-similarity');
      expect(r.products.length).toBeLessThanOrEqual(12);
    });
    it('should fall back to attribute matching', async () => {
      (prisma as any).productSimilarity.findMany.mockResolvedValue([]);
      prisma.product.findFirst.mockResolvedValue({ id: 'p-source', categoryId: 'c1', productType: 'GOLD', metalPurity: 916, sellingPricePaise: 50000n } as any);
      prisma.product.findMany.mockResolvedValue([{ id: 'p2', sku: 'S', name: 'P', productType: 'GOLD', categoryId: 'c1', metalPurity: 916, sellingPricePaise: 55000n, currencyCode: 'INR', images: [], isActive: true, category: { name: 'C' } }] as any);
      const r = await service.getSimilarProducts(tenantId, 'p-source');
      expect(r.algorithm).toBe('attribute-fallback');
    });
  });

  describe('getBoughtTogether', () => {
    it('should use pre-computed when available', async () => {
      (prisma as any).productSimilarity.findMany.mockResolvedValue([{ similarProductId: 'p2', similarityScore: 800 }]);
      prisma.product.findMany.mockResolvedValue([{ id: 'p2', sku: 'S', name: 'P', productType: 'GOLD', categoryId: 'c1', metalPurity: 916, sellingPricePaise: 50000n, currencyCode: 'INR', images: [], isActive: true, category: { name: 'C' } }] as any);
      const r = await service.getBoughtTogether(tenantId, 'p1');
      expect(r.algorithm).toBe('pre-computed-co-purchase');
    });
  });

  describe('getTrending', () => {
    it('should merge views and purchases with weighted scores', async () => {
      (prisma as any).recentlyViewed.groupBy.mockResolvedValue([{ productId: 'p1', _count: { productId: 10 } }]);
      (prisma as any).saleLineItem.groupBy.mockResolvedValue([{ productId: 'p1', _count: { productId: 5 } }]);
      prisma.product.findMany.mockResolvedValue([{ id: 'p1', sku: 'S', name: 'P', productType: 'GOLD', categoryId: 'c1', metalPurity: 916, sellingPricePaise: 50000n, currencyCode: 'INR', images: [], isActive: true, category: { name: 'C' } }] as any);
      const r = await service.getTrending(tenantId, 12, 7);
      expect(r.products.length).toBeGreaterThan(0);
      expect(r.algorithm).toBe('view-purchase-weighted');
    });
    it('should fall back to newest when no trending data', async () => {
      (prisma as any).recentlyViewed.groupBy.mockResolvedValue([]);
      (prisma as any).saleLineItem.groupBy.mockResolvedValue([]);
      prisma.product.findMany.mockResolvedValue([{ id: 'p1', sku: 'S', name: 'P', productType: 'GOLD', categoryId: 'c1', metalPurity: 916, sellingPricePaise: 50000n, currencyCode: 'INR', images: [], isActive: true, category: { name: 'C' } }] as any);
      const r = await service.getTrending(tenantId, 12, 7);
      expect(r.algorithm).toBe('fallback-newest');
    });
  });

  describe('getPopularInCategory', () => {
    it('should rank by sales in category', async () => {
      (prisma as any).saleLineItem.groupBy.mockResolvedValue([{ productId: 'p1', _count: { productId: 5 } }]);
      prisma.product.findMany.mockResolvedValue([{ id: 'p1', sku: 'S', name: 'P', productType: 'GOLD', categoryId: 'c1', metalPurity: 916, sellingPricePaise: 50000n, currencyCode: 'INR', images: [], isActive: true, category: { name: 'C' } }] as any);
      const r = await service.getPopularInCategory(tenantId, 'c1');
      expect(r.source).toBe('POPULAR_IN_CATEGORY');
    });
  });

  describe('getForYou', () => {
    it('should return multiple sections', async () => {
      // Mock all sub-methods to return some products
      (prisma as any).recentlyViewed.findMany.mockResolvedValue([]);
      (prisma as any).customerBehavior.findUnique.mockResolvedValue(null);
      (prisma as any).recentlyViewed.groupBy.mockResolvedValue([]);
      (prisma as any).saleLineItem.groupBy.mockResolvedValue([]);
      prisma.product.findMany.mockResolvedValue([{ id: 'p1', sku: 'S', name: 'P', productType: 'GOLD', categoryId: 'c1', metalPurity: 916, sellingPricePaise: 50000n, currencyCode: 'INR', images: [], isActive: true, category: { name: 'C' } }] as any);
      const r = await service.getForYou(tenantId, 'c1');
      expect(r.sections).toBeDefined();
    });
  });

  describe('getNewArrivals', () => {
    it('should return newest products', async () => {
      prisma.product.findMany.mockResolvedValue([{ id: 'p1', sku: 'S', name: 'P', productType: 'GOLD', categoryId: 'c1', metalPurity: 916, sellingPricePaise: 50000n, currencyCode: 'INR', images: [], isActive: true, category: { name: 'C' } }] as any);
      const r = await service.getNewArrivals(tenantId);
      expect(r.source).toBe('NEW_ARRIVALS');
    });
  });

  describe('logRecommendations', () => {
    it('should create log entry', async () => {
      (prisma as any).recommendationLog.create.mockResolvedValue({ id: 'rl-1' });
      const r = await service.logRecommendations(tenantId, 'c1', 'sess-1', 'PERSONALIZED' as any, ['p1']);
      expect(r).toBe('rl-1');
    });
  });
});
