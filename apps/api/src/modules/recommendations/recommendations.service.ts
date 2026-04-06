// ─── Recommendations Service ──────────────────────────────────
// Main recommendation engine: personalized, similar, trending,
// bought-together, category popular, recently viewed, new arrivals,
// and the unified "for you" homepage feed.

import { Injectable, Logger } from '@nestjs/common';
import { TenantAwareService } from '../../common/base.service';
import { PrismaService } from '../../common/prisma.service';
import { RecommendationsScoringService } from './recommendations.scoring.service';
import type {
  RecommendedProduct,
  RecommendationResponse,
  PersonalizedFeedResponse,
  SimilarProductsResponse,
  TrendingProductsResponse,
  RecommendationType,
} from '@caratflow/shared-types';

/** Minimal product row from DB queries */
interface ProductRow {
  id: string;
  sku: string;
  name: string;
  productType: string;
  categoryId: string | null;
  metalPurity: number | null;
  sellingPricePaise: bigint | null;
  currencyCode: string;
  images: unknown;
  isActive: boolean;
  category?: { name: string } | null;
}

function toRecommendedProduct(p: ProductRow, score: number): RecommendedProduct {
  return {
    id: p.id,
    sku: p.sku,
    name: p.name,
    productType: p.productType,
    categoryId: p.categoryId,
    categoryName: p.category?.name ?? null,
    metalPurity: p.metalPurity,
    sellingPricePaise: p.sellingPricePaise !== null ? Number(p.sellingPricePaise) : null,
    currencyCode: p.currencyCode,
    images: p.images,
    score,
  };
}

@Injectable()
export class RecommendationsService extends TenantAwareService {
  private readonly logger = new Logger(RecommendationsService.name);

  constructor(
    prisma: PrismaService,
    private readonly scoringService: RecommendationsScoringService,
  ) {
    super(prisma);
  }

  /**
   * Get personalized recommendations based on customer behavior profile.
   * Falls back to trending if no behavior data exists.
   */
  async getPersonalizedRecommendations(
    tenantId: string,
    customerId: string,
    limit: number = 12,
  ): Promise<RecommendationResponse> {
    const behavior = await this.prisma.customerBehavior.findUnique({
      where: { tenantId_customerId: { tenantId, customerId } },
    });

    if (!behavior) {
      // No behavior profile yet -- fall back to trending
      const trending = await this.getTrending(tenantId, limit, 30);
      return {
        products: trending.products,
        source: 'PERSONALIZED' as RecommendationType,
        algorithm: 'fallback-trending',
      };
    }

    // Build candidate pool from preferred categories and product types
    const preferredCategories = behavior.viewedCategories as Record<string, number> | null;
    const categoryIds = preferredCategories
      ? Object.entries(preferredCategories)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([id]) => id)
      : [];

    const whereClause: Record<string, unknown> = {
      tenantId,
      isActive: true,
    };

    if (categoryIds.length > 0) {
      whereClause.categoryId = { in: categoryIds };
    }

    if (behavior.preferredMetalType) {
      whereClause.productType = behavior.preferredMetalType;
    }

    const candidates = await this.prisma.product.findMany({
      where: whereClause,
      include: { category: { select: { name: true } } },
      take: limit * 3, // over-fetch for scoring + diversification
      orderBy: { createdAt: 'desc' },
    });

    // Score and rank
    const scored = this.scoringService.scoreProducts(candidates.map((p) => ({
      product: p,
      baseScore: 500,
    })), behavior);

    const diversified = this.scoringService.diversifyResults(scored, limit);
    const filtered = this.scoringService.applyBusinessRules(diversified, tenantId);

    return {
      products: filtered.map((item) => toRecommendedProduct(item.product as ProductRow, item.score)),
      source: 'PERSONALIZED' as RecommendationType,
      algorithm: 'behavior-profile-scoring',
    };
  }

  /**
   * Get products similar to a given product using pre-computed similarities
   * and fallback to attribute matching.
   */
  async getSimilarProducts(
    tenantId: string,
    productId: string,
    limit: number = 12,
  ): Promise<SimilarProductsResponse> {
    // First, try pre-computed similarities
    const similarities = await this.prisma.productSimilarity.findMany({
      where: this.tenantWhere(tenantId, { productId }),
      orderBy: { similarityScore: 'desc' },
      take: limit,
    });

    if (similarities.length >= limit) {
      const similarProductIds = similarities.map((s) => s.similarProductId);
      const products = await this.prisma.product.findMany({
        where: this.tenantWhere(tenantId, {
          id: { in: similarProductIds },
          isActive: true,
        }),
        include: { category: { select: { name: true } } },
      });

      // Preserve similarity score ordering
      const productMap = new Map(products.map((p) => [p.id, p]));
      const ordered: RecommendedProduct[] = [];
      for (const sim of similarities) {
        const p = productMap.get(sim.similarProductId);
        if (p) {
          ordered.push(toRecommendedProduct(p as ProductRow, sim.similarityScore));
        }
      }

      return {
        productId,
        products: ordered.slice(0, limit),
        algorithm: 'pre-computed-similarity',
      };
    }

    // Fallback: find similar by attributes
    const sourceProduct = await this.prisma.product.findFirst({
      where: this.tenantWhere(tenantId, { id: productId }),
    });

    if (!sourceProduct) {
      return { productId, products: [], algorithm: 'attribute-fallback' };
    }

    const candidates = await this.prisma.product.findMany({
      where: {
        tenantId,
        isActive: true,
        id: { not: productId },
        OR: [
          { categoryId: sourceProduct.categoryId },
          { productType: sourceProduct.productType },
        ],
      },
      include: { category: { select: { name: true } } },
      take: limit * 2,
    });

    // Score by attribute similarity
    const scored = candidates.map((candidate) => {
      let score = 0;
      if (candidate.categoryId === sourceProduct.categoryId) score += 400;
      if (candidate.productType === sourceProduct.productType) score += 300;
      if (candidate.metalPurity === sourceProduct.metalPurity) score += 150;

      // Price range similarity (closer = higher score)
      if (sourceProduct.sellingPricePaise && candidate.sellingPricePaise) {
        const sourcePaise = Number(sourceProduct.sellingPricePaise);
        const candidatePaise = Number(candidate.sellingPricePaise);
        const priceDiff = Math.abs(sourcePaise - candidatePaise);
        const maxPrice = Math.max(sourcePaise, candidatePaise);
        if (maxPrice > 0) {
          const priceCloseness = Math.max(0, 150 - Math.floor((priceDiff * 150) / maxPrice));
          score += priceCloseness;
        }
      }

      return { product: candidate, score: Math.min(score, 1000) };
    });

    scored.sort((a, b) => b.score - a.score);

    return {
      productId,
      products: scored
        .slice(0, limit)
        .map((item) => toRecommendedProduct(item.product as ProductRow, item.score)),
      algorithm: 'attribute-fallback',
    };
  }

  /**
   * Customers who bought product X also bought Y.
   * Uses pre-computed BOUGHT_TOGETHER similarities, falls back to order co-occurrence.
   */
  async getBoughtTogether(
    tenantId: string,
    productId: string,
    limit: number = 6,
  ): Promise<RecommendationResponse> {
    // Try pre-computed
    const similarities = await this.prisma.productSimilarity.findMany({
      where: this.tenantWhere(tenantId, {
        productId,
        reason: 'BOUGHT_TOGETHER',
      }),
      orderBy: { similarityScore: 'desc' },
      take: limit,
    });

    if (similarities.length > 0) {
      const productIds = similarities.map((s) => s.similarProductId);
      const products = await this.prisma.product.findMany({
        where: this.tenantWhere(tenantId, {
          id: { in: productIds },
          isActive: true,
        }),
        include: { category: { select: { name: true } } },
      });

      const productMap = new Map(products.map((p) => [p.id, p]));
      const ordered: RecommendedProduct[] = [];
      for (const sim of similarities) {
        const p = productMap.get(sim.similarProductId);
        if (p) {
          ordered.push(toRecommendedProduct(p as ProductRow, sim.similarityScore));
        }
      }

      return {
        products: ordered,
        source: 'BOUGHT_TOGETHER' as RecommendationType,
        algorithm: 'pre-computed-co-purchase',
      };
    }

    // Fallback: query order co-occurrence from retail sales
    const coOccurrences = await this.findCoPurchasedProducts(tenantId, productId, limit);

    return {
      products: coOccurrences,
      source: 'BOUGHT_TOGETHER' as RecommendationType,
      algorithm: 'live-co-purchase-query',
    };
  }

  /**
   * Trending products: most viewed/purchased in last N days.
   */
  async getTrending(
    tenantId: string,
    limit: number = 12,
    periodDays: number = 7,
  ): Promise<TrendingProductsResponse> {
    const since = new Date();
    since.setDate(since.getDate() - periodDays);

    // Aggregate recently viewed products by count
    const viewCounts = await this.prisma.recentlyViewed.groupBy({
      by: ['productId'],
      where: {
        tenantId,
        viewedAt: { gte: since },
      },
      _count: { productId: true },
      orderBy: { _count: { productId: 'desc' } },
      take: limit * 2,
    });

    // Also get recently sold products from retail sales
    const saleCounts = await this.prisma.saleLineItem.groupBy({
      by: ['productId'],
      where: {
        tenantId,
        createdAt: { gte: since },
        productId: { not: null },
      },
      _count: { productId: true },
      orderBy: { _count: { productId: 'desc' } },
      take: limit * 2,
    });

    // Merge scores: views = 1 point, purchases = 3 points
    const scoreMap = new Map<string, number>();
    for (const vc of viewCounts) {
      const current = scoreMap.get(vc.productId) ?? 0;
      scoreMap.set(vc.productId, current + vc._count.productId);
    }
    for (const sc of saleCounts) {
      if (!sc.productId) continue;
      const current = scoreMap.get(sc.productId) ?? 0;
      scoreMap.set(sc.productId, current + sc._count.productId * 3);
    }

    // Sort by combined score
    const rankedIds = Array.from(scoreMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);

    if (rankedIds.length === 0) {
      // No trending data -- return newest active products
      const newest = await this.prisma.product.findMany({
        where: this.tenantWhere(tenantId, { isActive: true }),
        include: { category: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      return {
        products: newest.map((p, i) =>
          toRecommendedProduct(p as ProductRow, Math.max(1000 - i * 50, 100)),
        ),
        period: `${periodDays}d`,
        algorithm: 'fallback-newest',
      };
    }

    const productIds = rankedIds.map(([id]) => id);
    const products = await this.prisma.product.findMany({
      where: this.tenantWhere(tenantId, {
        id: { in: productIds },
        isActive: true,
      }),
      include: { category: { select: { name: true } } },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));
    const maxRawScore = rankedIds[0]?.[1] ?? 1;

    const results: RecommendedProduct[] = [];
    for (const [id, rawScore] of rankedIds) {
      const p = productMap.get(id);
      if (p) {
        // Normalize to 0-1000 range
        const normalizedScore = Math.floor((rawScore * 1000) / maxRawScore);
        results.push(toRecommendedProduct(p as ProductRow, normalizedScore));
      }
    }

    return {
      products: results.slice(0, limit),
      period: `${periodDays}d`,
      algorithm: 'view-purchase-weighted',
    };
  }

  /**
   * Best-selling/most-viewed products in a specific category.
   */
  async getPopularInCategory(
    tenantId: string,
    categoryId: string,
    limit: number = 12,
  ): Promise<RecommendationResponse> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get sale counts per product in category
    const saleCounts = await this.prisma.saleLineItem.groupBy({
      by: ['productId'],
      where: {
        tenantId,
        createdAt: { gte: thirtyDaysAgo },
        product: { categoryId },
        productId: { not: null },
      },
      _count: { productId: true },
      orderBy: { _count: { productId: 'desc' } },
      take: limit * 2,
    });

    const productIds = saleCounts.map((s) => s.productId).filter((id): id is string => id !== null);

    if (productIds.length === 0) {
      // Fall back to latest products in category
      const latest = await this.prisma.product.findMany({
        where: this.tenantWhere(tenantId, { categoryId, isActive: true }),
        include: { category: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      return {
        products: latest.map((p, i) =>
          toRecommendedProduct(p as ProductRow, Math.max(1000 - i * 50, 100)),
        ),
        source: 'POPULAR_IN_CATEGORY' as RecommendationType,
        algorithm: 'fallback-latest-in-category',
      };
    }

    const products = await this.prisma.product.findMany({
      where: this.tenantWhere(tenantId, {
        id: { in: productIds },
        isActive: true,
      }),
      include: { category: { select: { name: true } } },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));
    const maxCount = saleCounts[0]?._count.productId ?? 1;

    const results: RecommendedProduct[] = [];
    for (const sc of saleCounts) {
      if (!sc.productId) continue;
      const p = productMap.get(sc.productId);
      if (p) {
        const score = Math.floor((sc._count.productId * 1000) / maxCount);
        results.push(toRecommendedProduct(p as ProductRow, score));
      }
    }

    return {
      products: results.slice(0, limit),
      source: 'POPULAR_IN_CATEGORY' as RecommendationType,
      algorithm: 'category-sales-rank',
    };
  }

  /**
   * Recently viewed products for a logged-in customer.
   */
  async getRecentlyViewed(
    tenantId: string,
    customerId: string,
    limit: number = 12,
  ): Promise<RecommendationResponse> {
    const views = await this.prisma.recentlyViewed.findMany({
      where: this.tenantWhere(tenantId, { customerId }),
      orderBy: { viewedAt: 'desc' },
      take: limit,
    });

    if (views.length === 0) {
      return {
        products: [],
        source: 'RECENTLY_VIEWED' as RecommendationType,
        algorithm: 'recently-viewed-list',
      };
    }

    const productIds = views.map((v) => v.productId);
    const products = await this.prisma.product.findMany({
      where: this.tenantWhere(tenantId, {
        id: { in: productIds },
        isActive: true,
      }),
      include: { category: { select: { name: true } } },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));
    const results: RecommendedProduct[] = [];
    for (let i = 0; i < views.length; i++) {
      const p = productMap.get(views[i].productId);
      if (p) {
        // More recent = higher score
        const score = Math.max(1000 - i * 60, 100);
        results.push(toRecommendedProduct(p as ProductRow, score));
      }
    }

    return {
      products: results,
      source: 'RECENTLY_VIEWED' as RecommendationType,
      algorithm: 'recently-viewed-list',
    };
  }

  /**
   * Newly added products.
   */
  async getNewArrivals(
    tenantId: string,
    limit: number = 12,
  ): Promise<RecommendationResponse> {
    const products = await this.prisma.product.findMany({
      where: this.tenantWhere(tenantId, { isActive: true }),
      include: { category: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return {
      products: products.map((p, i) =>
        toRecommendedProduct(p as ProductRow, Math.max(1000 - i * 30, 100)),
      ),
      source: 'NEW_ARRIVALS' as RecommendationType,
      algorithm: 'newest-products',
    };
  }

  /**
   * Unified "For You" homepage feed combining multiple recommendation algorithms.
   */
  async getForYou(
    tenantId: string,
    customerId: string,
  ): Promise<PersonalizedFeedResponse> {
    const sections: PersonalizedFeedResponse['sections'] = [];

    // 1. Recently Viewed (if user has history)
    const recentlyViewed = await this.getRecentlyViewed(tenantId, customerId, 8);
    if (recentlyViewed.products.length > 0) {
      sections.push({
        type: 'RECENTLY_VIEWED' as RecommendationType,
        title: 'Recently Viewed',
        products: recentlyViewed.products,
      });
    }

    // 2. Personalized Recommendations
    const personalized = await this.getPersonalizedRecommendations(tenantId, customerId, 8);
    if (personalized.products.length > 0) {
      sections.push({
        type: 'PERSONALIZED' as RecommendationType,
        title: 'Recommended For You',
        products: personalized.products,
      });
    }

    // 3. Trending
    const trending = await this.getTrending(tenantId, 8, 7);
    if (trending.products.length > 0) {
      sections.push({
        type: 'TRENDING' as RecommendationType,
        title: 'Trending Now',
        products: trending.products,
      });
    }

    // 4. New Arrivals
    const newArrivals = await this.getNewArrivals(tenantId, 8);
    if (newArrivals.products.length > 0) {
      sections.push({
        type: 'NEW_ARRIVALS' as RecommendationType,
        title: 'New Arrivals',
        products: newArrivals.products,
      });
    }

    return { sections };
  }

  /**
   * Log which recommendations were shown to a user.
   */
  async logRecommendations(
    tenantId: string,
    customerId: string | null,
    sessionId: string,
    recommendationType: RecommendationType,
    productIds: string[],
  ): Promise<string> {
    const log = await this.prisma.recommendationLog.create({
      data: {
        tenantId,
        customerId,
        sessionId,
        recommendationType,
        productIds,
        shownAt: new Date(),
      },
    });
    return log.id;
  }

  /**
   * Record a click on a recommended product.
   */
  async logRecommendationClick(
    tenantId: string,
    logId: string,
    clickedProductId: string,
  ): Promise<void> {
    await this.prisma.recommendationLog.update({
      where: { id: logId, tenantId },
      data: {
        clickedProductId,
        clickedAt: new Date(),
      },
    });
  }

  // ─── Private Helpers ────────────────────────────────────────────

  /**
   * Find products frequently purchased together with the given product
   * by querying actual order line items.
   */
  private async findCoPurchasedProducts(
    tenantId: string,
    productId: string,
    limit: number,
  ): Promise<RecommendedProduct[]> {
    // Find sales that contain this product
    const saleItems = await this.prisma.saleLineItem.findMany({
      where: this.tenantWhere(tenantId, { productId }),
      select: { saleId: true },
      take: 200,
    });

    const saleIds = saleItems.map((s) => s.saleId);
    if (saleIds.length === 0) return [];

    // Find other products in those same sales
    const coItems = await this.prisma.saleLineItem.groupBy({
      by: ['productId'],
      where: {
        tenantId,
        saleId: { in: saleIds },
        productId: { not: productId },
      },
      _count: { productId: true },
      orderBy: { _count: { productId: 'desc' } },
      take: limit,
    });

    const coProductIds = coItems
      .map((c) => c.productId)
      .filter((id): id is string => id !== null);

    if (coProductIds.length === 0) return [];

    const products = await this.prisma.product.findMany({
      where: this.tenantWhere(tenantId, {
        id: { in: coProductIds },
        isActive: true,
      }),
      include: { category: { select: { name: true } } },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));
    const maxCount = coItems[0]?._count.productId ?? 1;

    const results: RecommendedProduct[] = [];
    for (const ci of coItems) {
      if (!ci.productId) continue;
      const p = productMap.get(ci.productId);
      if (p) {
        const score = Math.floor((ci._count.productId * 1000) / maxCount);
        results.push(toRecommendedProduct(p as ProductRow, score));
      }
    }

    return results;
  }
}
