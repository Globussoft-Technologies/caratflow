// ─── Recommendations Scoring Service ──────────────────────────
// Ranks, scores, diversifies, and applies business rules to
// candidate product lists. All scoring uses integer math (0-1000).

import { Injectable, Logger } from '@nestjs/common';

interface ProductCandidate {
  product: {
    id: string;
    categoryId: string | null;
    productType: string;
    metalPurity: number | null;
    sellingPricePaise: bigint | null;
    isActive: boolean;
    [key: string]: unknown;
  };
  baseScore: number;
}

interface ScoredProduct {
  product: ProductCandidate['product'];
  score: number;
}

interface CustomerBehaviorProfile {
  preferredMetalType: string | null;
  preferredPurity: number | null;
  priceRangeLowPaise: bigint | null;
  priceRangeHighPaise: bigint | null;
  viewedCategories: Record<string, number> | null;
  purchasedCategories: Record<string, number> | null;
  avgOrderValuePaise: bigint;
}

@Injectable()
export class RecommendationsScoringService {
  private readonly logger = new Logger(RecommendationsScoringService.name);

  /**
   * Score candidate products against a customer behavior profile.
   * Returns scored products sorted by descending score (0-1000).
   *
   * Scoring breakdown (integer math, max 1000):
   * - Metal type match:    up to 250 points
   * - Purity match:        up to 100 points
   * - Price range fit:     up to 200 points
   * - Category affinity:   up to 300 points
   * - Base score retained: up to 150 points (from popularity/recency)
   */
  scoreProducts(
    candidates: ProductCandidate[],
    behavior: CustomerBehaviorProfile,
  ): ScoredProduct[] {
    const scored: ScoredProduct[] = [];

    for (const candidate of candidates) {
      let score = 0;

      // 1. Metal type match (0 or 250)
      if (
        behavior.preferredMetalType &&
        candidate.product.productType === behavior.preferredMetalType
      ) {
        score += 250;
      }

      // 2. Purity match (0 or 100)
      if (
        behavior.preferredPurity !== null &&
        candidate.product.metalPurity !== null &&
        candidate.product.metalPurity === behavior.preferredPurity
      ) {
        score += 100;
      }

      // 3. Price range fit (0-200)
      if (candidate.product.sellingPricePaise !== null) {
        const pricePaise = Number(candidate.product.sellingPricePaise);
        const low = behavior.priceRangeLowPaise !== null
          ? Number(behavior.priceRangeLowPaise)
          : 0;
        const high = behavior.priceRangeHighPaise !== null
          ? Number(behavior.priceRangeHighPaise)
          : 0;

        if (low > 0 && high > 0) {
          if (pricePaise >= low && pricePaise <= high) {
            // Perfect fit
            score += 200;
          } else {
            // Partial credit based on how close
            const range = high - low;
            if (range > 0) {
              const distance = pricePaise < low
                ? low - pricePaise
                : pricePaise - high;
              const closeness = Math.max(0, 200 - Math.floor((distance * 200) / range));
              score += closeness;
            }
          }
        } else if (Number(behavior.avgOrderValuePaise) > 0) {
          // Fall back to avg order value comparison
          const avg = Number(behavior.avgOrderValuePaise);
          const diff = Math.abs(pricePaise - avg);
          if (avg > 0) {
            const closeness = Math.max(0, 200 - Math.floor((diff * 200) / avg));
            score += closeness;
          }
        }
      }

      // 4. Category affinity (0-300)
      if (candidate.product.categoryId) {
        const viewedCats = behavior.viewedCategories ?? {};
        const purchasedCats = behavior.purchasedCategories ?? {};

        const viewCount = viewedCats[candidate.product.categoryId] ?? 0;
        const purchaseCount = purchasedCats[candidate.product.categoryId] ?? 0;

        // Views contribute up to 100 points (capped at 10 views)
        const viewScore = Math.min(viewCount * 10, 100);
        // Purchases contribute up to 200 points (capped at 5 purchases)
        const purchaseScore = Math.min(purchaseCount * 40, 200);

        score += viewScore + purchaseScore;
      }

      // 5. Base score (retained as up to 150 points)
      score += Math.min(Math.floor((candidate.baseScore * 150) / 1000), 150);

      // Clamp to 0-1000
      score = Math.max(0, Math.min(score, 1000));

      scored.push({ product: candidate.product, score });
    }

    // Sort descending by score
    scored.sort((a, b) => b.score - a.score);

    return scored;
  }

  /**
   * Diversify results to avoid monotonous recommendations.
   * Ensures no more than 3 products from the same category appear
   * consecutively, and mixes product types.
   */
  diversifyResults(products: ScoredProduct[], limit: number): ScoredProduct[] {
    if (products.length <= limit) return products;

    const result: ScoredProduct[] = [];
    const categoryCounts = new Map<string, number>();
    const typeCounts = new Map<string, number>();
    const remaining = [...products];

    const maxPerCategory = Math.max(3, Math.ceil(limit / 3));
    const maxPerType = Math.max(4, Math.ceil(limit / 2));

    while (result.length < limit && remaining.length > 0) {
      let added = false;

      for (let i = 0; i < remaining.length; i++) {
        const candidate = remaining[i]!;
        const catId = candidate.product.categoryId ?? 'uncategorized';
        const type = candidate.product.productType;

        const catCount = categoryCounts.get(catId) ?? 0;
        const typeCount = typeCounts.get(type) ?? 0;

        if (catCount < maxPerCategory && typeCount < maxPerType) {
          result.push(candidate);
          categoryCounts.set(catId, catCount + 1);
          typeCounts.set(type, typeCount + 1);
          remaining.splice(i, 1);
          added = true;
          break;
        }
      }

      // If no candidate passes diversification, take the next best
      if (!added && remaining.length > 0) {
        result.push(remaining.shift()!);
      }
    }

    return result;
  }

  /**
   * Apply business rules to the recommendation list:
   * - Filter out inactive/out-of-stock products
   * - Boost featured or high-margin items (via product attributes)
   */
  applyBusinessRules(products: ScoredProduct[], _tenantId: string): ScoredProduct[] {
    const filtered = products.filter((p) => p.product.isActive);

    // Boost products with certain attributes
    const boosted = filtered.map((p) => {
      let bonus = 0;

      const attrs = p.product.attributes as Record<string, unknown> | null;
      if (attrs) {
        // Boost featured products
        if (attrs.featured === true) {
          bonus += 50;
        }
        // Boost high-margin products
        if (typeof attrs.marginPercent === 'number' && attrs.marginPercent > 30) {
          bonus += 30;
        }
      }

      return {
        product: p.product,
        score: Math.min(p.score + bonus, 1000),
      };
    });

    // Re-sort after business rule adjustments
    boosted.sort((a, b) => b.score - a.score);

    return boosted;
  }
}
