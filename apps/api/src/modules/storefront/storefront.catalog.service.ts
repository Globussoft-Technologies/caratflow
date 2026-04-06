// ─── Storefront Catalog Service ────────────────────────────────
// Product catalog for B2C: search, filter, detail, featured,
// new arrivals, compare, category tree.

import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import type {
  CatalogProductResponse,
  ProductListInput,
  ProductCompareResponse,
  ReviewSummary,
} from '@caratflow/shared-types';
import type { PaginatedResult } from '@caratflow/shared-types';
import { PrismaService } from '../../common/prisma.service';
import { TenantAwareService } from '../../common/base.service';
import { StorefrontPricingService } from './storefront.pricing.service';
import { v4 as uuidv4 } from 'uuid';

/** Low stock threshold */
const LOW_STOCK_THRESHOLD = 3;

@Injectable()
export class StorefrontCatalogService extends TenantAwareService {
  private readonly logger = new Logger(StorefrontCatalogService.name);

  constructor(
    prisma: PrismaService,
    private readonly pricingService: StorefrontPricingService,
  ) {
    super(prisma);
  }

  /**
   * Get paginated product listing with filters and live pricing.
   */
  async getProducts(
    tenantId: string,
    filters: ProductListInput,
  ): Promise<PaginatedResult<CatalogProductResponse>> {
    const where: Record<string, unknown> = { tenantId, isActive: true };

    if (filters.categoryId) {
      where.OR = [
        { categoryId: filters.categoryId },
        { subCategoryId: filters.categoryId },
      ];
    }
    if (filters.productType) where.productType = filters.productType;
    if (filters.metalPurity) where.metalPurity = filters.metalPurity;

    if (filters.weightMinMg || filters.weightMaxMg) {
      where.grossWeightMg = {};
      if (filters.weightMinMg) (where.grossWeightMg as Record<string, unknown>).gte = BigInt(filters.weightMinMg);
      if (filters.weightMaxMg) (where.grossWeightMg as Record<string, unknown>).lte = BigInt(filters.weightMaxMg);
    }

    if (filters.search) {
      where.AND = [
        {
          OR: [
            { name: { contains: filters.search } },
            { sku: { contains: filters.search } },
            { description: { contains: filters.search } },
          ],
        },
      ];
    }

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: {
          category: { select: { id: true, name: true } },
          subCategory: { select: { id: true, name: true } },
          stockItems: {
            select: { quantityOnHand: true, quantityReserved: true },
          },
          productReviews: {
            where: { isPublished: true },
            select: { rating: true },
          },
        },
        orderBy: { [filters.sortBy ?? 'createdAt']: filters.sortOrder ?? 'desc' },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    const items: CatalogProductResponse[] = [];
    for (const product of products) {
      items.push(await this.mapProductToCatalogResponse(tenantId, product));
    }

    // Post-filter by price range if specified (must be done after live pricing)
    let filteredItems = items;
    if (filters.priceMinPaise || filters.priceMaxPaise) {
      filteredItems = items.filter((item) => {
        if (filters.priceMinPaise && item.totalPricePaise < filters.priceMinPaise) return false;
        if (filters.priceMaxPaise && item.totalPricePaise > filters.priceMaxPaise) return false;
        return true;
      });
    }

    const totalPages = Math.ceil(total / filters.limit);

    return {
      items: filteredItems,
      total,
      page: filters.page,
      limit: filters.limit,
      totalPages,
      hasNext: filters.page < totalPages,
      hasPrevious: filters.page > 1,
    };
  }

  /**
   * Get a single product with full detail, reviews, and related products.
   */
  async getProductById(tenantId: string, productId: string): Promise<CatalogProductResponse> {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId, isActive: true },
      include: {
        category: { select: { id: true, name: true } },
        subCategory: { select: { id: true, name: true } },
        stockItems: {
          select: { quantityOnHand: true, quantityReserved: true },
        },
        productReviews: {
          where: { isPublished: true },
          select: { rating: true },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return this.mapProductToCatalogResponse(tenantId, product);
  }

  /**
   * Get category tree for the storefront navigation.
   */
  async getCategories(tenantId: string): Promise<Array<{
    id: string;
    name: string;
    parentId: string | null;
    description: string | null;
    sortOrder: number;
    children: Array<{
      id: string;
      name: string;
      parentId: string | null;
      description: string | null;
      sortOrder: number;
    }>;
  }>> {
    const categories = await this.prisma.category.findMany({
      where: { tenantId, parentId: null },
      include: {
        children: {
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    return categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      parentId: cat.parentId,
      description: cat.description,
      sortOrder: cat.sortOrder,
      children: cat.children.map((child) => ({
        id: child.id,
        name: child.name,
        parentId: child.parentId,
        description: child.description,
        sortOrder: child.sortOrder,
      })),
    }));
  }

  /**
   * Get new arrivals (most recently created active products).
   */
  async getNewArrivals(tenantId: string, limit: number = 12): Promise<CatalogProductResponse[]> {
    const products = await this.prisma.product.findMany({
      where: { tenantId, isActive: true },
      include: {
        category: { select: { id: true, name: true } },
        subCategory: { select: { id: true, name: true } },
        stockItems: {
          select: { quantityOnHand: true, quantityReserved: true },
        },
        productReviews: {
          where: { isPublished: true },
          select: { rating: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const items: CatalogProductResponse[] = [];
    for (const product of products) {
      items.push(await this.mapProductToCatalogResponse(tenantId, product));
    }
    return items;
  }

  /**
   * Get featured products. Uses the `attributes.featured` JSON flag.
   */
  async getFeatured(tenantId: string, limit: number = 12): Promise<CatalogProductResponse[]> {
    // Products with attributes JSON containing featured = true
    // MySQL JSON path query
    const products = await this.prisma.product.findMany({
      where: {
        tenantId,
        isActive: true,
        attributes: { path: ['featured'], equals: true },
      },
      include: {
        category: { select: { id: true, name: true } },
        subCategory: { select: { id: true, name: true } },
        stockItems: {
          select: { quantityOnHand: true, quantityReserved: true },
        },
        productReviews: {
          where: { isPublished: true },
          select: { rating: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const items: CatalogProductResponse[] = [];
    for (const product of products) {
      items.push(await this.mapProductToCatalogResponse(tenantId, product));
    }
    return items;
  }

  /**
   * Compare multiple products side by side.
   */
  async compareProducts(
    tenantId: string,
    productIds: string[],
  ): Promise<ProductCompareResponse> {
    const products: CatalogProductResponse[] = [];
    for (const pid of productIds) {
      const p = await this.getProductById(tenantId, pid);
      products.push(p);
    }
    return { products };
  }

  /**
   * Full-text search, logs query for analytics.
   */
  async searchProducts(
    tenantId: string,
    query: string,
    customerId: string | null,
    limit: number = 20,
  ): Promise<CatalogProductResponse[]> {
    const products = await this.prisma.product.findMany({
      where: {
        tenantId,
        isActive: true,
        OR: [
          { name: { contains: query } },
          { sku: { contains: query } },
          { description: { contains: query } },
        ],
      },
      include: {
        category: { select: { id: true, name: true } },
        subCategory: { select: { id: true, name: true } },
        stockItems: {
          select: { quantityOnHand: true, quantityReserved: true },
        },
        productReviews: {
          where: { isPublished: true },
          select: { rating: true },
        },
      },
      take: limit,
    });

    const items: CatalogProductResponse[] = [];
    for (const product of products) {
      items.push(await this.mapProductToCatalogResponse(tenantId, product));
    }

    // Log the search query for analytics (fire-and-forget)
    this.prisma.searchLog
      .create({
        data: {
          id: uuidv4(),
          tenantId,
          query,
          resultCount: items.length,
          customerId: customerId ?? undefined,
        },
      })
      .catch((err) => this.logger.warn(`Failed to log search: ${err.message}`));

    return items;
  }

  // ─── Private Helpers ──────────────────────────────────────────

  private async mapProductToCatalogResponse(
    tenantId: string,
    product: Record<string, unknown>,
  ): Promise<CatalogProductResponse> {
    const p = product as Record<string, unknown>;
    const category = p.category as { id: string; name: string } | null;
    const subCategory = p.subCategory as { id: string; name: string } | null;
    const stockItems = (p.stockItems ?? []) as Array<{ quantityOnHand: number; quantityReserved: number }>;
    const reviews = (p.productReviews ?? []) as Array<{ rating: number }>;

    // Aggregate stock across all locations
    const totalOnHand = stockItems.reduce((sum, si) => sum + si.quantityOnHand, 0);
    const totalReserved = stockItems.reduce((sum, si) => sum + si.quantityReserved, 0);
    const availableQty = Math.max(0, totalOnHand - totalReserved);

    let stockStatus: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' = 'OUT_OF_STOCK';
    if (availableQty > LOW_STOCK_THRESHOLD) stockStatus = 'IN_STOCK';
    else if (availableQty > 0) stockStatus = 'LOW_STOCK';

    // Calculate review summary
    const reviewSummary = this.buildReviewSummary(reviews);

    // Calculate live price
    const pricing = await this.pricingService.calculateLiveProductPrice(tenantId, {
      productType: p.productType as string,
      metalPurity: p.metalPurity as number | null,
      metalWeightMg: p.metalWeightMg as bigint | null,
      makingCharges: p.makingCharges as bigint | null,
      wastagePercent: p.wastagePercent as number | null,
      sellingPricePaise: p.sellingPricePaise as bigint | null,
    });

    const images = p.images as unknown;
    let imageList: string[] | null = null;
    if (Array.isArray(images)) {
      imageList = images as string[];
    }

    return {
      id: p.id as string,
      sku: p.sku as string,
      name: p.name as string,
      description: (p.description as string) ?? null,
      categoryId: category?.id ?? null,
      categoryName: category?.name ?? null,
      subCategoryId: subCategory?.id ?? null,
      subCategoryName: subCategory?.name ?? null,
      productType: p.productType as string,
      metalPurity: p.metalPurity as number | null,
      metalWeightMg: p.metalWeightMg ? Number(p.metalWeightMg) : null,
      grossWeightMg: p.grossWeightMg ? Number(p.grossWeightMg) : null,
      netWeightMg: p.netWeightMg ? Number(p.netWeightMg) : null,
      stoneWeightCt: p.stoneWeightCt as number | null,
      makingChargesPaise: p.makingCharges ? Number(p.makingCharges) : null,
      wastagePercent: p.wastagePercent as number | null,
      metalValuePaise: pricing.metalValuePaise,
      makingValuePaise: pricing.makingValuePaise,
      wastageValuePaise: pricing.wastageValuePaise,
      subtotalPaise: pricing.subtotalPaise,
      gstPaise: pricing.gstPaise,
      totalPricePaise: pricing.totalPricePaise,
      currencyCode: (p.currencyCode as string) ?? 'INR',
      images: imageList,
      attributes: (p.attributes as Record<string, unknown>) ?? null,
      huidNumber: (p.huidNumber as string) ?? null,
      hallmarkNumber: (p.hallmarkNumber as string) ?? null,
      reviewSummary,
      stockStatus,
      availableQuantity: availableQty,
      isActive: p.isActive as boolean,
    };
  }

  private buildReviewSummary(reviews: Array<{ rating: number }>): ReviewSummary {
    const totalReviews = reviews.length;
    if (totalReviews === 0) {
      return {
        averageRating: 0,
        totalReviews: 0,
        ratingBreakdown: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
      };
    }

    const breakdown: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
    let sum = 0;
    for (const r of reviews) {
      sum += r.rating;
      breakdown[String(r.rating)] = (breakdown[String(r.rating)] ?? 0) + 1;
    }

    return {
      averageRating: Math.round((sum / totalReviews) * 10) / 10,
      totalReviews,
      ratingBreakdown: breakdown,
    };
  }
}
