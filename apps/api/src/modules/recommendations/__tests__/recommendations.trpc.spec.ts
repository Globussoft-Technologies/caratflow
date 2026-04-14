import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TrpcService } from '../../../trpc/trpc.service';
import { RecommendationsTrpcRouter } from '../recommendations.trpc';

describe('RecommendationsTrpcRouter', () => {
  const trpc = new TrpcService();

  const recommendationsService = {
    getPersonalizedRecommendations: vi.fn(),
    getSimilarProducts: vi.fn(),
    getBoughtTogether: vi.fn(),
    getTrending: vi.fn(),
    getPopularInCategory: vi.fn(),
    getForYou: vi.fn(),
    logRecommendationClick: vi.fn(),
  };
  const behaviorService = {
    trackProductView: vi.fn(),
  };

  const ctx = {
    tenantId: 'tenant-1',
    userId: 'user-1',
    userRole: 'customer',
    userPermissions: [],
  };

  const routerInstance = new RecommendationsTrpcRouter(
    trpc,
    recommendationsService as never,
    behaviorService as never,
  );
  const caller = routerInstance.router.createCaller(ctx);

  beforeEach(() => vi.clearAllMocks());

  const PRODUCT_ID = '11111111-1111-1111-1111-111111111111';
  const CATEGORY_ID = '22222222-2222-2222-2222-222222222222';
  const REC_LOG_ID = '33333333-3333-3333-3333-333333333333';

  // ─── personalized ─────────────────────────────────────────
  describe('personalized', () => {
    it('uses default limit of 12 when no input given', async () => {
      recommendationsService.getPersonalizedRecommendations.mockResolvedValue([]);
      await caller.personalized();
      expect(recommendationsService.getPersonalizedRecommendations).toHaveBeenCalledWith(
        'tenant-1', 'user-1', 12,
      );
    });

    it('forwards explicit limit', async () => {
      recommendationsService.getPersonalizedRecommendations.mockResolvedValue([]);
      await caller.personalized({ limit: 20 });
      expect(recommendationsService.getPersonalizedRecommendations).toHaveBeenCalledWith(
        'tenant-1', 'user-1', 20,
      );
    });

    it('rejects limit > 100', async () => {
      await expect(caller.personalized({ limit: 1000 })).rejects.toThrow();
    });
  });

  // ─── similar ──────────────────────────────────────────────
  describe('similar', () => {
    it('delegates to recommendationsService.getSimilarProducts', async () => {
      recommendationsService.getSimilarProducts.mockResolvedValue([]);
      await caller.similar({ productId: PRODUCT_ID, limit: 5 });
      expect(recommendationsService.getSimilarProducts).toHaveBeenCalledWith(
        'tenant-1', PRODUCT_ID, 5,
      );
    });

    it('rejects invalid productId', async () => {
      await expect(caller.similar({ productId: 'bogus', limit: 5 })).rejects.toThrow();
    });
  });

  // ─── boughtTogether ───────────────────────────────────────
  describe('boughtTogether', () => {
    it('delegates to recommendationsService.getBoughtTogether', async () => {
      recommendationsService.getBoughtTogether.mockResolvedValue([]);
      await caller.boughtTogether({ productId: PRODUCT_ID, limit: 6 });
      expect(recommendationsService.getBoughtTogether).toHaveBeenCalledWith(
        'tenant-1', PRODUCT_ID, 6,
      );
    });
  });

  // ─── trending ─────────────────────────────────────────────
  describe('trending', () => {
    it('uses defaults when no input', async () => {
      recommendationsService.getTrending.mockResolvedValue([]);
      await caller.trending();
      expect(recommendationsService.getTrending).toHaveBeenCalledWith('tenant-1', 12, 7);
    });

    it('forwards explicit limit and period', async () => {
      recommendationsService.getTrending.mockResolvedValue([]);
      await caller.trending({ limit: 30, period: 14 });
      expect(recommendationsService.getTrending).toHaveBeenCalledWith('tenant-1', 30, 14);
    });
  });

  // ─── popularInCategory ────────────────────────────────────
  describe('popularInCategory', () => {
    it('delegates to recommendationsService.getPopularInCategory', async () => {
      recommendationsService.getPopularInCategory.mockResolvedValue([]);
      await caller.popularInCategory({ categoryId: CATEGORY_ID, limit: 10 });
      expect(recommendationsService.getPopularInCategory).toHaveBeenCalledWith(
        'tenant-1', CATEGORY_ID, 10,
      );
    });
  });

  // ─── forYou ───────────────────────────────────────────────
  describe('forYou', () => {
    it('delegates to recommendationsService.getForYou', async () => {
      recommendationsService.getForYou.mockResolvedValue([]);
      await caller.forYou();
      expect(recommendationsService.getForYou).toHaveBeenCalledWith('tenant-1', 'user-1');
    });
  });

  // ─── trackView ────────────────────────────────────────────
  describe('trackView', () => {
    it('delegates to behaviorService.trackProductView', async () => {
      behaviorService.trackProductView.mockResolvedValue(undefined);
      await caller.trackView({ productId: PRODUCT_ID, sessionId: 'sess-1' });
      expect(behaviorService.trackProductView).toHaveBeenCalledWith(
        'tenant-1', 'user-1', 'sess-1', PRODUCT_ID,
      );
    });

    it('rejects empty sessionId', async () => {
      await expect(
        caller.trackView({ productId: PRODUCT_ID, sessionId: '' }),
      ).rejects.toThrow();
    });
  });

  // ─── trackClick ───────────────────────────────────────────
  describe('trackClick', () => {
    it('delegates to recommendationsService.logRecommendationClick', async () => {
      recommendationsService.logRecommendationClick.mockResolvedValue(undefined);
      await caller.trackClick({
        recommendationLogId: REC_LOG_ID,
        clickedProductId: PRODUCT_ID,
      });
      expect(recommendationsService.logRecommendationClick).toHaveBeenCalledWith(
        'tenant-1', REC_LOG_ID, PRODUCT_ID,
      );
    });

    it('rejects invalid uuids', async () => {
      await expect(
        caller.trackClick({ recommendationLogId: 'x', clickedProductId: 'y' } as never),
      ).rejects.toThrow();
    });
  });

  // ─── Auth ─────────────────────────────────────────────────
  it('rejects unauthenticated calls', async () => {
    const unauth = routerInstance.router.createCaller({});
    await expect(unauth.forYou()).rejects.toThrow();
  });
});
