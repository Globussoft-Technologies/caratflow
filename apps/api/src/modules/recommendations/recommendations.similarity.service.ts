// ─── Recommendations Similarity Service ───────────────────────
// Pre-computes product similarity scores. Designed to run as
// scheduled BullMQ jobs (nightly). Stores top-N similar products
// per product for fast retrieval at recommendation time.

import { Injectable, Logger } from '@nestjs/common';
import { TenantAwareService } from '../../common/base.service';
import { PrismaService } from '../../common/prisma.service';
import { Prisma } from '@caratflow/db';

/** Maximum similar products to store per product */
const MAX_SIMILAR_PER_PRODUCT = 20;

/** Batch size for product processing to avoid memory spikes */
const PRODUCT_BATCH_SIZE = 100;

interface SimilarityCandidate {
  similarProductId: string;
  score: number;
  reason: 'SAME_CATEGORY' | 'SAME_METAL' | 'SAME_PRICE_RANGE' | 'BOUGHT_TOGETHER' | 'VIEWED_TOGETHER';
}

@Injectable()
export class RecommendationsSimilarityService extends TenantAwareService {
  private readonly logger = new Logger(RecommendationsSimilarityService.name);

  constructor(prisma: PrismaService) {
    super(prisma);
  }

  /**
   * Main nightly job: compute similarities for all active products in a tenant.
   * Processes in batches to limit memory usage.
   */
  async computeProductSimilarities(tenantId: string): Promise<void> {
    this.logger.log(`[Similarity] Starting computation for tenant=${tenantId}`);

    const totalProducts = await this.prisma.product.count({
      where: this.tenantWhere(tenantId, { isActive: true }),
    });

    this.logger.log(`[Similarity] Processing ${totalProducts} products in batches of ${PRODUCT_BATCH_SIZE}`);

    let processed = 0;
    let offset = 0;

    while (offset < totalProducts) {
      const products = await this.prisma.product.findMany({
        where: this.tenantWhere(tenantId, { isActive: true }),
        select: {
          id: true,
          categoryId: true,
          productType: true,
          metalPurity: true,
          sellingPricePaise: true,
        },
        skip: offset,
        take: PRODUCT_BATCH_SIZE,
        orderBy: { id: 'asc' },
      });

      for (const product of products) {
        await this.computeForSingleProduct(tenantId, product, products);
        processed++;
      }

      offset += PRODUCT_BATCH_SIZE;
      this.logger.log(`[Similarity] Processed ${processed}/${totalProducts}`);
    }

    // Also compute co-purchase and co-view similarities
    await this.computeBoughtTogether(tenantId);
    await this.computeViewedTogether(tenantId);

    this.logger.log(`[Similarity] Computation complete for tenant=${tenantId}`);
  }

  /**
   * Compute attribute-based similarities for a single product.
   */
  private async computeForSingleProduct(
    tenantId: string,
    product: {
      id: string;
      categoryId: string | null;
      productType: string;
      metalPurity: number | null;
      sellingPricePaise: bigint | null;
    },
    batchProducts: Array<{
      id: string;
      categoryId: string | null;
      productType: string;
      metalPurity: number | null;
      sellingPricePaise: bigint | null;
    }>,
  ): Promise<void> {
    // Find candidates from wider pool (same category or same metal type)
    const candidates = await this.prisma.product.findMany({
      where: {
        tenantId,
        isActive: true,
        id: { not: product.id },
        OR: [
          { categoryId: product.categoryId },
          { productType: product.productType as Prisma.EnumProductTypeFilter<'Product'> },
        ],
      },
      select: {
        id: true,
        categoryId: true,
        productType: true,
        metalPurity: true,
        sellingPricePaise: true,
      },
      take: 200,
    });

    const scoredCandidates: SimilarityCandidate[] = [];

    for (const candidate of candidates) {
      let bestScore = 0;
      let bestReason: SimilarityCandidate['reason'] = 'SAME_CATEGORY';

      // Category match: up to 400 points
      if (product.categoryId && candidate.categoryId === product.categoryId) {
        const categoryScore = 400;
        if (categoryScore > bestScore) {
          bestScore = categoryScore;
          bestReason = 'SAME_CATEGORY';
        }
      }

      // Metal type match: up to 300 points
      if (candidate.productType === product.productType) {
        const metalScore = 300;
        // Bonus for same purity
        const purityBonus = (product.metalPurity !== null &&
          candidate.metalPurity !== null &&
          product.metalPurity === candidate.metalPurity)
          ? 100
          : 0;

        const totalMetalScore = metalScore + purityBonus;
        if (totalMetalScore > bestScore) {
          bestScore = totalMetalScore;
          bestReason = 'SAME_METAL';
        }
      }

      // Price range similarity: up to 200 points
      if (product.sellingPricePaise !== null && candidate.sellingPricePaise !== null) {
        const pA = Number(product.sellingPricePaise);
        const pB = Number(candidate.sellingPricePaise);
        const maxPrice = Math.max(pA, pB);
        if (maxPrice > 0) {
          const diff = Math.abs(pA - pB);
          const priceScore = Math.max(0, 200 - Math.floor((diff * 200) / maxPrice));
          if (priceScore > bestScore) {
            bestScore = priceScore;
            bestReason = 'SAME_PRICE_RANGE';
          }
          // Also add as component if high
          bestScore += Math.floor(priceScore / 3); // add fraction as bonus
        }
      }

      // Combine: category + metal + price can total up to 1000
      const combinedScore = Math.min(bestScore, 1000);

      if (combinedScore > 50) {
        scoredCandidates.push({
          similarProductId: candidate.id,
          score: combinedScore,
          reason: bestReason,
        });
      }
    }

    // Keep only top N
    scoredCandidates.sort((a, b) => b.score - a.score);
    const topCandidates = scoredCandidates.slice(0, MAX_SIMILAR_PER_PRODUCT);

    // Delete old similarities for this product (attribute-based reasons only)
    await this.prisma.productSimilarity.deleteMany({
      where: {
        tenantId,
        productId: product.id,
        reason: { in: ['SAME_CATEGORY', 'SAME_METAL', 'SAME_PRICE_RANGE'] },
      },
    });

    // Insert new similarities
    if (topCandidates.length > 0) {
      const now = new Date();
      await this.prisma.productSimilarity.createMany({
        data: topCandidates.map((c) => ({
          tenantId,
          productId: product.id,
          similarProductId: c.similarProductId,
          similarityScore: c.score,
          reason: c.reason,
          computedAt: now,
        })),
        skipDuplicates: true,
      });
    }
  }

  /**
   * Analyze retail order history to find products frequently bought together.
   */
  async computeBoughtTogether(tenantId: string): Promise<void> {
    this.logger.log(`[Similarity] Computing bought-together for tenant=${tenantId}`);

    // Delete old bought-together records
    await this.prisma.productSimilarity.deleteMany({
      where: { tenantId, reason: 'BOUGHT_TOGETHER' },
    });

    // Get completed sales with multiple items
    const multiItemSales = await this.prisma.sale.findMany({
      where: this.tenantWhere(tenantId, { status: 'COMPLETED' }),
      select: { id: true },
    });

    if (multiItemSales.length === 0) return;

    const saleIds = multiItemSales.map((s) => s.id);

    // Get all line items grouped by sale
    const lineItems = await this.prisma.saleLineItem.findMany({
      where: {
        tenantId,
        saleId: { in: saleIds },
        productId: { not: null },
      },
      select: { saleId: true, productId: true },
    });

    // Group products by sale
    const saleBuckets = new Map<string, string[]>();
    for (const li of lineItems) {
      if (!li.productId) continue;
      const bucket = saleBuckets.get(li.saleId) ?? [];
      bucket.push(li.productId);
      saleBuckets.set(li.saleId, bucket);
    }

    // Count co-occurrence pairs
    const pairCounts = new Map<string, number>();

    for (const [, products] of saleBuckets) {
      if (products.length < 2) continue;
      // Generate all pairs
      for (let i = 0; i < products.length; i++) {
        for (let j = i + 1; j < products.length; j++) {
          const pi = products[i]!;
          const pj = products[j]!;
          // Ensure consistent key ordering
          const [a, b] = pi < pj ? [pi, pj] : [pj, pi];
          const key = `${a}:${b}`;
          pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1);
        }
      }
    }

    // Normalize scores and insert (only pairs with count >= 2)
    const maxCount = Math.max(1, ...Array.from(pairCounts.values()));
    const now = new Date();
    const inserts: Array<{
      tenantId: string;
      productId: string;
      similarProductId: string;
      similarityScore: number;
      reason: 'BOUGHT_TOGETHER';
      computedAt: Date;
    }> = [];

    for (const [key, count] of pairCounts) {
      if (count < 2) continue;
      const [productA, productB] = key.split(':') as [string, string];
      const score = Math.floor((count * 1000) / maxCount);

      // Insert both directions
      inserts.push(
        { tenantId, productId: productA, similarProductId: productB, similarityScore: score, reason: 'BOUGHT_TOGETHER', computedAt: now },
        { tenantId, productId: productB, similarProductId: productA, similarityScore: score, reason: 'BOUGHT_TOGETHER', computedAt: now },
      );
    }

    if (inserts.length > 0) {
      // Insert in batches of 500
      for (let i = 0; i < inserts.length; i += 500) {
        await this.prisma.productSimilarity.createMany({
          data: inserts.slice(i, i + 500),
          skipDuplicates: true,
        });
      }
    }

    this.logger.log(
      `[Similarity] Bought-together: ${inserts.length / 2} pairs from ${saleBuckets.size} sales`,
    );
  }

  /**
   * Analyze browsing sessions to find products frequently viewed together.
   * Uses RecentlyViewed data grouped by customer as a proxy for sessions.
   */
  async computeViewedTogether(tenantId: string): Promise<void> {
    this.logger.log(`[Similarity] Computing viewed-together for tenant=${tenantId}`);

    // Delete old viewed-together records
    await this.prisma.productSimilarity.deleteMany({
      where: { tenantId, reason: 'VIEWED_TOGETHER' },
    });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get recent views grouped by customer
    const views = await this.prisma.recentlyViewed.findMany({
      where: {
        tenantId,
        viewedAt: { gte: thirtyDaysAgo },
      },
      select: { customerId: true, productId: true },
    });

    // Group by customer (proxy for session)
    const customerBuckets = new Map<string, Set<string>>();
    for (const v of views) {
      const bucket = customerBuckets.get(v.customerId) ?? new Set();
      bucket.add(v.productId);
      customerBuckets.set(v.customerId, bucket);
    }

    // Count co-view pairs
    const pairCounts = new Map<string, number>();

    for (const [, productSet] of customerBuckets) {
      const products = Array.from(productSet);
      if (products.length < 2) continue;

      for (let i = 0; i < products.length && i < 20; i++) {
        for (let j = i + 1; j < products.length && j < 20; j++) {
          const pi = products[i]!;
          const pj = products[j]!;
          const [a, b] = pi < pj ? [pi, pj] : [pj, pi];
          const key = `${a}:${b}`;
          pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1);
        }
      }
    }

    // Normalize and insert (only pairs with count >= 3)
    const maxCount = Math.max(1, ...Array.from(pairCounts.values()));
    const now = new Date();
    const inserts: Array<{
      tenantId: string;
      productId: string;
      similarProductId: string;
      similarityScore: number;
      reason: 'VIEWED_TOGETHER';
      computedAt: Date;
    }> = [];

    for (const [key, count] of pairCounts) {
      if (count < 3) continue;
      const [productA, productB] = key.split(':') as [string, string];
      const score = Math.floor((count * 1000) / maxCount);

      inserts.push(
        { tenantId, productId: productA, similarProductId: productB, similarityScore: score, reason: 'VIEWED_TOGETHER', computedAt: now },
        { tenantId, productId: productB, similarProductId: productA, similarityScore: score, reason: 'VIEWED_TOGETHER', computedAt: now },
      );
    }

    if (inserts.length > 0) {
      for (let i = 0; i < inserts.length; i += 500) {
        await this.prisma.productSimilarity.createMany({
          data: inserts.slice(i, i + 500),
          skipDuplicates: true,
        });
      }
    }

    this.logger.log(
      `[Similarity] Viewed-together: ${inserts.length / 2} pairs from ${customerBuckets.size} customers`,
    );
  }
}
