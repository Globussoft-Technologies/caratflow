import { describe, it, expect, beforeEach } from 'vitest';
import { RecommendationsScoringService } from '../recommendations.scoring.service';

describe('RecommendationsScoringService', () => {
  let service: RecommendationsScoringService;

  const makeProduct = (overrides: Record<string, unknown> = {}) => ({
    id: 'p-1',
    categoryId: 'cat-1',
    productType: 'GOLD',
    metalPurity: 916,
    sellingPricePaise: BigInt(5000000),
    isActive: true,
    ...overrides,
  });

  const baseBehavior = {
    preferredMetalType: 'GOLD',
    preferredPurity: 916,
    priceRangeLowPaise: BigInt(3000000),
    priceRangeHighPaise: BigInt(8000000),
    viewedCategories: { 'cat-1': 5 } as Record<string, number>,
    purchasedCategories: { 'cat-1': 2 } as Record<string, number>,
    avgOrderValuePaise: BigInt(5000000),
  };

  beforeEach(() => {
    service = new RecommendationsScoringService();
  });

  // ─── scoreProducts ─────────────────────────────────────────

  describe('scoreProducts', () => {
    it('gives 250 points for metal type match', () => {
      const candidates = [
        { product: makeProduct({ productType: 'GOLD' }), baseScore: 0 },
        { product: makeProduct({ id: 'p-2', productType: 'SILVER' }), baseScore: 0 },
      ];

      const results = service.scoreProducts(candidates, {
        ...baseBehavior,
        preferredPurity: null,
        priceRangeLowPaise: null,
        priceRangeHighPaise: null,
        viewedCategories: null,
        purchasedCategories: null,
        avgOrderValuePaise: BigInt(0),
      });

      const goldProduct = results.find((r) => r.product.id === 'p-1')!;
      const silverProduct = results.find((r) => r.product.id === 'p-2')!;
      expect(goldProduct.score).toBeGreaterThan(silverProduct.score);
      expect(goldProduct.score - silverProduct.score).toBe(250);
    });

    it('gives up to 300 points for category affinity', () => {
      const candidates = [
        { product: makeProduct({ categoryId: 'cat-viewed' }), baseScore: 0 },
      ];

      const results = service.scoreProducts(candidates, {
        ...baseBehavior,
        preferredMetalType: null,
        preferredPurity: null,
        priceRangeLowPaise: null,
        priceRangeHighPaise: null,
        viewedCategories: { 'cat-viewed': 10 },
        purchasedCategories: { 'cat-viewed': 5 },
        avgOrderValuePaise: BigInt(0),
      });

      // views: min(10*10, 100) = 100
      // purchases: min(5*40, 200) = 200
      // total category: 300
      expect(results[0].score).toBeGreaterThanOrEqual(300);
    });

    it('gives 200 points for perfect price range match', () => {
      const candidates = [
        { product: makeProduct({ sellingPricePaise: BigInt(5000000) }), baseScore: 0 },
      ];

      const results = service.scoreProducts(candidates, {
        ...baseBehavior,
        preferredMetalType: null,
        preferredPurity: null,
        viewedCategories: null,
        purchasedCategories: null,
        avgOrderValuePaise: BigInt(0),
      });

      // Price 5000000 is within [3000000, 8000000] => 200 points
      expect(results[0].score).toBeGreaterThanOrEqual(200);
    });

    it('scores are sorted descending', () => {
      const candidates = [
        { product: makeProduct({ id: 'p-low', productType: 'SILVER' }), baseScore: 100 },
        { product: makeProduct({ id: 'p-high', productType: 'GOLD' }), baseScore: 500 },
      ];

      const results = service.scoreProducts(candidates, baseBehavior);
      expect(results[0].product.id).toBe('p-high');
      expect(results[0].score).toBeGreaterThanOrEqual(results[1].score);
    });

    it('scores are clamped to 0-1000', () => {
      const candidates = [
        { product: makeProduct(), baseScore: 1000 },
      ];

      const results = service.scoreProducts(candidates, baseBehavior);
      expect(results[0].score).toBeLessThanOrEqual(1000);
      expect(results[0].score).toBeGreaterThanOrEqual(0);
    });
  });

  // ─── diversifyResults ──────────────────────────────────────

  describe('diversifyResults', () => {
    it('caps products per category', () => {
      const products = Array.from({ length: 20 }, (_, i) => ({
        product: makeProduct({ id: `p-${i}`, categoryId: 'cat-same' }),
        score: 1000 - i,
      }));

      const result = service.diversifyResults(products, 10);
      expect(result).toHaveLength(10);
    });

    it('returns all products if under limit', () => {
      const products = [
        { product: makeProduct({ id: 'p-1' }), score: 900 },
        { product: makeProduct({ id: 'p-2' }), score: 800 },
      ];

      const result = service.diversifyResults(products, 10);
      expect(result).toHaveLength(2);
    });
  });

  // ─── applyBusinessRules ────────────────────────────────────

  describe('applyBusinessRules', () => {
    it('filters out inactive products', () => {
      const products = [
        { product: makeProduct({ id: 'p-active', isActive: true }), score: 800 },
        { product: makeProduct({ id: 'p-inactive', isActive: false }), score: 900 },
      ];

      const result = service.applyBusinessRules(products, TEST_TENANT_ID);
      expect(result).toHaveLength(1);
      expect(result[0].product.id).toBe('p-active');
    });

    it('boosts featured products', () => {
      const products = [
        { product: makeProduct({ id: 'p-normal', attributes: {} }), score: 800 },
        { product: makeProduct({ id: 'p-featured', attributes: { featured: true } }), score: 800 },
      ];

      const result = service.applyBusinessRules(products, TEST_TENANT_ID);
      const featured = result.find((r) => r.product.id === 'p-featured')!;
      const normal = result.find((r) => r.product.id === 'p-normal')!;
      expect(featured.score).toBeGreaterThan(normal.score);
    });
  });
});

const TEST_TENANT_ID = 'test-tenant';
