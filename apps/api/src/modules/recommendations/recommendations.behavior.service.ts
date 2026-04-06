// ─── Recommendations Behavior Service ─────────────────────────
// Tracks customer behavior signals: product views, searches,
// purchases. Aggregates into CustomerBehavior profiles.

import { Injectable, Logger } from '@nestjs/common';
import { TenantAwareService } from '../../common/base.service';
import { PrismaService } from '../../common/prisma.service';

/** Shape of the aggregated category/product count maps stored as JSON. */
type CountMap = Record<string, number>;

@Injectable()
export class RecommendationsBehaviorService extends TenantAwareService {
  private readonly logger = new Logger(RecommendationsBehaviorService.name);

  constructor(prisma: PrismaService) {
    super(prisma);
  }

  /**
   * Track a product view: upsert RecentlyViewed and increment view counts
   * in the CustomerBehavior profile.
   */
  async trackProductView(
    tenantId: string,
    customerId: string | null,
    sessionId: string,
    productId: string,
  ): Promise<void> {
    // Only persist per-customer behavior for logged-in users
    if (!customerId) return;

    // Upsert RecentlyViewed
    await this.prisma.recentlyViewed.upsert({
      where: {
        tenantId_customerId_productId: { tenantId, customerId, productId },
      },
      update: { viewedAt: new Date() },
      create: { tenantId, customerId, productId },
    });

    // Get product to know its category
    const product = await this.prisma.product.findFirst({
      where: this.tenantWhere(tenantId, { id: productId }),
      select: { categoryId: true, productType: true },
    });

    if (!product) return;

    // Upsert CustomerBehavior and increment view counts
    const existing = await this.prisma.customerBehavior.findUnique({
      where: { tenantId_customerId: { tenantId, customerId } },
    });

    const viewedProducts: CountMap = (existing?.viewedProducts as CountMap) ?? {};
    viewedProducts[productId] = (viewedProducts[productId] ?? 0) + 1;

    const viewedCategories: CountMap = (existing?.viewedCategories as CountMap) ?? {};
    if (product.categoryId) {
      viewedCategories[product.categoryId] = (viewedCategories[product.categoryId] ?? 0) + 1;
    }

    await this.prisma.customerBehavior.upsert({
      where: { tenantId_customerId: { tenantId, customerId } },
      update: {
        viewedProducts,
        viewedCategories,
        lastUpdatedAt: new Date(),
      },
      create: {
        tenantId,
        customerId,
        viewedProducts,
        viewedCategories,
        lastUpdatedAt: new Date(),
      },
    });
  }

  /**
   * Track a search query and update behavior profile.
   */
  async trackSearch(
    tenantId: string,
    customerId: string | null,
    sessionId: string,
    query: string,
    resultCount: number,
  ): Promise<void> {
    // Always log search (even for anonymous users)
    await this.prisma.searchLog.create({
      data: { tenantId, query, resultCount, customerId },
    });

    if (!customerId) return;

    // Update search queries in behavior profile (keep last 50)
    const existing = await this.prisma.customerBehavior.findUnique({
      where: { tenantId_customerId: { tenantId, customerId } },
    });

    const searchQueries: string[] = (existing?.searchQueries as string[]) ?? [];
    searchQueries.unshift(query);
    const trimmedQueries = searchQueries.slice(0, 50);

    await this.prisma.customerBehavior.upsert({
      where: { tenantId_customerId: { tenantId, customerId } },
      update: {
        searchQueries: trimmedQueries,
        lastUpdatedAt: new Date(),
      },
      create: {
        tenantId,
        customerId,
        searchQueries: trimmedQueries,
        lastUpdatedAt: new Date(),
      },
    });
  }

  /**
   * Track a purchase event: update purchased categories/products in behavior.
   */
  async trackPurchase(
    tenantId: string,
    customerId: string,
    productIds: string[],
    orderTotalPaise: number,
  ): Promise<void> {
    if (productIds.length === 0) return;

    // Fetch product details for categories
    const products = await this.prisma.product.findMany({
      where: this.tenantWhere(tenantId, { id: { in: productIds } }),
      select: { id: true, categoryId: true, productType: true, metalPurity: true, sellingPricePaise: true },
    });

    const existing = await this.prisma.customerBehavior.findUnique({
      where: { tenantId_customerId: { tenantId, customerId } },
    });

    const purchasedProducts: CountMap = (existing?.purchasedProducts as CountMap) ?? {};
    const purchasedCategories: CountMap = (existing?.purchasedCategories as CountMap) ?? {};

    for (const product of products) {
      purchasedProducts[product.id] = (purchasedProducts[product.id] ?? 0) + 1;
      if (product.categoryId) {
        purchasedCategories[product.categoryId] = (purchasedCategories[product.categoryId] ?? 0) + 1;
      }
    }

    // Derive preferred metal type from purchase frequency
    const metalTypeCounts = new Map<string, number>();
    for (const product of products) {
      const current = metalTypeCounts.get(product.productType) ?? 0;
      metalTypeCounts.set(product.productType, current + 1);
    }

    // Merge with existing purchase history metal counts
    const existingPurchased = (existing?.purchasedProducts as CountMap) ?? {};
    if (Object.keys(existingPurchased).length > 0) {
      const pastProducts = await this.prisma.product.findMany({
        where: this.tenantWhere(tenantId, { id: { in: Object.keys(existingPurchased) } }),
        select: { productType: true },
      });
      for (const pp of pastProducts) {
        const current = metalTypeCounts.get(pp.productType) ?? 0;
        metalTypeCounts.set(pp.productType, current + 1);
      }
    }

    let preferredMetalType: string | null = null;
    let maxCount = 0;
    for (const [metal, count] of metalTypeCounts) {
      if (count > maxCount) {
        maxCount = count;
        preferredMetalType = metal;
      }
    }

    // Compute average order value
    const prevAvg = existing ? Number(existing.avgOrderValuePaise) : 0;
    const totalPurchases = Object.values(purchasedProducts).reduce((sum, c) => sum + c, 0);
    // Weighted running average
    const newAvg = totalPurchases > 1
      ? Math.floor((prevAvg * (totalPurchases - 1) + orderTotalPaise) / totalPurchases)
      : orderTotalPaise;

    // Derive price range from purchased products
    const prices = products
      .map((p) => (p.sellingPricePaise ? Number(p.sellingPricePaise) : null))
      .filter((p): p is number => p !== null);

    const existingLow = existing?.priceRangeLowPaise ? Number(existing.priceRangeLowPaise) : null;
    const existingHigh = existing?.priceRangeHighPaise ? Number(existing.priceRangeHighPaise) : null;

    const allPrices = [...prices];
    if (existingLow !== null) allPrices.push(existingLow);
    if (existingHigh !== null) allPrices.push(existingHigh);

    const priceRangeLow = allPrices.length > 0 ? Math.min(...allPrices) : null;
    const priceRangeHigh = allPrices.length > 0 ? Math.max(...allPrices) : null;

    // Derive preferred purity
    const purities = products
      .map((p) => p.metalPurity)
      .filter((p): p is number => p !== null);
    const preferredPurity = purities.length > 0
      ? purities.sort((a, b) => b - a)[0] // Most common by occurrence would be better, use highest for simplicity
      : existing?.preferredPurity ?? null;

    await this.prisma.customerBehavior.upsert({
      where: { tenantId_customerId: { tenantId, customerId } },
      update: {
        purchasedProducts,
        purchasedCategories,
        avgOrderValuePaise: BigInt(newAvg),
        preferredMetalType,
        preferredPurity,
        priceRangeLowPaise: priceRangeLow !== null ? BigInt(priceRangeLow) : undefined,
        priceRangeHighPaise: priceRangeHigh !== null ? BigInt(priceRangeHigh) : undefined,
        lastUpdatedAt: new Date(),
      },
      create: {
        tenantId,
        customerId,
        purchasedProducts,
        purchasedCategories,
        avgOrderValuePaise: BigInt(newAvg),
        preferredMetalType,
        preferredPurity,
        priceRangeLowPaise: priceRangeLow !== null ? BigInt(priceRangeLow) : undefined,
        priceRangeHighPaise: priceRangeHigh !== null ? BigInt(priceRangeHigh) : undefined,
        lastUpdatedAt: new Date(),
      },
    });

    this.logger.log(
      `[Behavior] Updated purchase behavior for customer=${customerId}, products=${productIds.length}`,
    );
  }

  /**
   * Full rebuild of a customer's behavior profile from all available data.
   * Intended to be run as a BullMQ job (e.g., nightly or on-demand).
   */
  async buildBehaviorProfile(tenantId: string, customerId: string): Promise<void> {
    this.logger.log(`[Behavior] Building full profile for customer=${customerId}`);

    // 1. Aggregate view history
    const views = await this.prisma.recentlyViewed.findMany({
      where: this.tenantWhere(tenantId, { customerId }),
      select: { productId: true },
    });

    const viewedProductIds = views.map((v) => v.productId);
    const viewedProducts: CountMap = {};
    const viewedCategories: CountMap = {};

    if (viewedProductIds.length > 0) {
      const viewedProductDetails = await this.prisma.product.findMany({
        where: this.tenantWhere(tenantId, { id: { in: viewedProductIds } }),
        select: { id: true, categoryId: true },
      });

      for (const vp of viewedProductDetails) {
        viewedProducts[vp.id] = (viewedProducts[vp.id] ?? 0) + 1;
        if (vp.categoryId) {
          viewedCategories[vp.categoryId] = (viewedCategories[vp.categoryId] ?? 0) + 1;
        }
      }
    }

    // 2. Aggregate purchase history from retail sales
    const saleItems = await this.prisma.saleLineItem.findMany({
      where: {
        tenantId,
        sale: { customerId, status: 'COMPLETED' },
        productId: { not: null },
      },
      select: { productId: true, lineTotalPaise: true },
    });

    const purchasedProducts: CountMap = {};
    const purchasedCategories: CountMap = {};
    let totalSpentPaise = BigInt(0);
    let purchaseCount = 0;

    const purchasedProductIds = saleItems
      .map((s) => s.productId)
      .filter((id): id is string => id !== null);

    if (purchasedProductIds.length > 0) {
      const purchasedDetails = await this.prisma.product.findMany({
        where: this.tenantWhere(tenantId, { id: { in: purchasedProductIds } }),
        select: { id: true, categoryId: true, productType: true, metalPurity: true, sellingPricePaise: true },
      });

      const detailMap = new Map(purchasedDetails.map((p) => [p.id, p]));

      for (const si of saleItems) {
        if (!si.productId) continue;
        purchasedProducts[si.productId] = (purchasedProducts[si.productId] ?? 0) + 1;
        totalSpentPaise += si.lineTotalPaise;
        purchaseCount++;

        const detail = detailMap.get(si.productId);
        if (detail?.categoryId) {
          purchasedCategories[detail.categoryId] = (purchasedCategories[detail.categoryId] ?? 0) + 1;
        }
      }
    }

    // 3. Also aggregate from online orders
    const onlineItems = await this.prisma.onlineOrderItem.findMany({
      where: {
        tenantId,
        order: {
          customerId,
          status: { in: ['DELIVERED', 'CONFIRMED', 'PROCESSING', 'SHIPPED'] },
        },
        productId: { not: null },
      },
      select: { productId: true, totalPaise: true },
    });

    const onlineProductIds = onlineItems
      .map((o) => o.productId)
      .filter((id): id is string => id !== null);

    if (onlineProductIds.length > 0) {
      const onlineDetails = await this.prisma.product.findMany({
        where: this.tenantWhere(tenantId, { id: { in: onlineProductIds } }),
        select: { id: true, categoryId: true, productType: true, metalPurity: true, sellingPricePaise: true },
      });

      const detailMap = new Map(onlineDetails.map((p) => [p.id, p]));

      for (const oi of onlineItems) {
        if (!oi.productId) continue;
        purchasedProducts[oi.productId] = (purchasedProducts[oi.productId] ?? 0) + 1;
        totalSpentPaise += oi.totalPaise;
        purchaseCount++;

        const detail = detailMap.get(oi.productId);
        if (detail?.categoryId) {
          purchasedCategories[detail.categoryId] = (purchasedCategories[detail.categoryId] ?? 0) + 1;
        }
      }
    }

    const avgOrderValuePaise = purchaseCount > 0
      ? totalSpentPaise / BigInt(purchaseCount)
      : BigInt(0);

    // 4. Derive preferred metal type
    const allPurchasedIds = Object.keys(purchasedProducts);
    let preferredMetalType: string | null = null;
    let preferredPurity: number | null = null;
    let priceRangeLow: bigint | null = null;
    let priceRangeHigh: bigint | null = null;

    if (allPurchasedIds.length > 0) {
      const allDetails = await this.prisma.product.findMany({
        where: this.tenantWhere(tenantId, { id: { in: allPurchasedIds } }),
        select: { productType: true, metalPurity: true, sellingPricePaise: true },
      });

      const metalCounts = new Map<string, number>();
      const purityCounts = new Map<number, number>();
      const prices: bigint[] = [];

      for (const d of allDetails) {
        const mc = metalCounts.get(d.productType) ?? 0;
        metalCounts.set(d.productType, mc + 1);

        if (d.metalPurity !== null) {
          const pc = purityCounts.get(d.metalPurity) ?? 0;
          purityCounts.set(d.metalPurity, pc + 1);
        }

        if (d.sellingPricePaise !== null) {
          prices.push(d.sellingPricePaise);
        }
      }

      let maxMetal = 0;
      for (const [metal, count] of metalCounts) {
        if (count > maxMetal) {
          maxMetal = count;
          preferredMetalType = metal;
        }
      }

      let maxPurity = 0;
      for (const [purity, count] of purityCounts) {
        if (count > maxPurity) {
          maxPurity = count;
          preferredPurity = purity;
        }
      }

      if (prices.length > 0) {
        priceRangeLow = prices.reduce((a, b) => (a < b ? a : b));
        priceRangeHigh = prices.reduce((a, b) => (a > b ? a : b));
      }
    }

    // 5. Search queries
    const recentSearches = await this.prisma.searchLog.findMany({
      where: this.tenantWhere(tenantId, { customerId }),
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { query: true },
    });
    const searchQueries = recentSearches.map((s) => s.query);

    // 6. Upsert the full profile
    await this.prisma.customerBehavior.upsert({
      where: { tenantId_customerId: { tenantId, customerId } },
      update: {
        viewedProducts,
        viewedCategories,
        purchasedProducts,
        purchasedCategories,
        searchQueries,
        avgOrderValuePaise,
        preferredMetalType,
        preferredPurity,
        priceRangeLowPaise: priceRangeLow,
        priceRangeHighPaise: priceRangeHigh,
        lastUpdatedAt: new Date(),
      },
      create: {
        tenantId,
        customerId,
        viewedProducts,
        viewedCategories,
        purchasedProducts,
        purchasedCategories,
        searchQueries,
        avgOrderValuePaise,
        preferredMetalType,
        preferredPurity,
        priceRangeLowPaise: priceRangeLow,
        priceRangeHighPaise: priceRangeHigh,
        lastUpdatedAt: new Date(),
      },
    });

    this.logger.log(
      `[Behavior] Profile built for customer=${customerId}: ` +
      `views=${viewedProductIds.length}, purchases=${purchaseCount}, searches=${searchQueries.length}`,
    );
  }
}
