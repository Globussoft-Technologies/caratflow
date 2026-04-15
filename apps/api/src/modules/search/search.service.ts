// ─── Search Service ─────────────────────────────────────────────
// Core search: FULLTEXT search with scoring, filters, facets,
// autocomplete, did-you-mean, popular & recent searches.

import { Injectable, Logger } from '@nestjs/common';
import type {
  SearchResponse,
  SearchFacets,
  SearchProduct,
  AutocompleteResponse,
  AutocompleteProduct,
  AutocompleteCategory,
  SearchFilters,
} from '@caratflow/shared-types';
import { PrismaService } from '../../common/prisma.service';
import { TenantAwareService } from '../../common/base.service';
import { SearchSynonymService } from './search.synonym.service';
import { SearchAnalyticsService } from './search.analytics.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class SearchService extends TenantAwareService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    prisma: PrismaService,
    private readonly synonymService: SearchSynonymService,
    private readonly analyticsService: SearchAnalyticsService,
  ) {
    super(prisma);
  }

  /**
   * Full-text search with filters, facets, and scoring.
   */
  async search(
    tenantId: string,
    query: string,
    filters: SearchFilters | undefined,
    page: number,
    limit: number,
    sortBy?: string,
    customerId?: string | null,
  ): Promise<SearchResponse> {
    // Expand query with synonyms
    const expandedQuery = await this.synonymService.expandQuery(tenantId, query);

    // Build FULLTEXT match clause
    const matchTerms = this.buildMatchTerms(expandedQuery);

    // Build WHERE conditions
    const whereConditions: string[] = [`si.tenant_id = ?`];
    const params: unknown[] = [tenantId];

    if (filters?.metalTypes && filters.metalTypes.length > 0) {
      whereConditions.push(`si.metal_type IN (${filters.metalTypes.map(() => '?').join(',')})`);
      params.push(...filters.metalTypes);
    }

    if (filters?.purities && filters.purities.length > 0) {
      whereConditions.push(`si.purity_fineness IN (${filters.purities.map(() => '?').join(',')})`);
      params.push(...filters.purities);
    }

    if (filters?.priceRanges && filters.priceRanges.length > 0) {
      whereConditions.push(`si.price_range_bucket IN (${filters.priceRanges.map(() => '?').join(',')})`);
      params.push(...filters.priceRanges);
    }

    if (filters?.categories && filters.categories.length > 0) {
      whereConditions.push(`si.category_name IN (${filters.categories.map(() => '?').join(',')})`);
      params.push(...filters.categories);
    }

    if (filters?.weightRanges && filters.weightRanges.length > 0) {
      whereConditions.push(`si.weight_bucket IN (${filters.weightRanges.map(() => '?').join(',')})`);
      params.push(...filters.weightRanges);
    }

    if (filters?.inStockOnly) {
      whereConditions.push(`si.is_in_stock = true`);
    }

    const whereClause = whereConditions.join(' AND ');
    const offset = (page - 1) * limit;

    // Execute FULLTEXT search with relevance scoring
    const searchResults = await this.prisma.$queryRawUnsafe<
      Array<{
        product_id: string;
        relevance: number;
        metal_type: string | null;
        purity_fineness: number | null;
        category_name: string | null;
        price_range_bucket: string | null;
        weight_bucket: string | null;
        is_in_stock: boolean;
      }>
    >(
      `SELECT si.product_id,
              MATCH(si.searchable_text) AGAINST(? IN BOOLEAN MODE) AS relevance,
              si.metal_type, si.purity_fineness, si.category_name,
              si.price_range_bucket, si.weight_bucket, si.is_in_stock
       FROM search_index si
       WHERE ${whereClause}
         AND MATCH(si.searchable_text) AGAINST(? IN BOOLEAN MODE)
       ORDER BY relevance DESC
       LIMIT ? OFFSET ?`,
      ...params,
      matchTerms,
      matchTerms,
      limit,
      offset,
    );

    // Get total count
    const countResult = await this.prisma.$queryRawUnsafe<Array<{ cnt: bigint }>>(
      `SELECT COUNT(*) as cnt
       FROM search_index si
       WHERE ${whereClause}
         AND MATCH(si.searchable_text) AGAINST(? IN BOOLEAN MODE)`,
      ...params,
      matchTerms,
    );

    const totalCount = Number(countResult[0]?.cnt ?? 0);
    const productIds = searchResults.map((r) => r.product_id);

    // Fetch full product data
    let products: SearchProduct[] = [];
    if (productIds.length > 0) {
      const productData = await this.prisma.product.findMany({
        where: { id: { in: productIds }, tenantId, isActive: true },
        include: {
          category: { select: { id: true, name: true } },
          stockItems: {
            select: { quantityOnHand: true, quantityReserved: true },
          },
        },
      });

      const relevanceMap = new Map(searchResults.map((r) => [r.product_id, r.relevance]));

      products = productData.map((p) => {
        const stockItems = p.stockItems ?? [];
        const totalOnHand = stockItems.reduce((sum, si) => sum + si.quantityOnHand, 0);
        const totalReserved = stockItems.reduce((sum, si) => sum + si.quantityReserved, 0);
        const available = Math.max(0, totalOnHand - totalReserved);

        let stockStatus: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' = 'OUT_OF_STOCK';
        if (available > 3) stockStatus = 'IN_STOCK';
        else if (available > 0) stockStatus = 'LOW_STOCK';

        const images = p.images as unknown;
        const imageList = Array.isArray(images) ? (images as string[]) : null;

        return {
          id: p.id,
          name: p.name,
          sku: p.sku,
          productType: p.productType,
          categoryName: p.category?.name ?? null,
          metalPurity: p.metalPurity,
          grossWeightMg: p.grossWeightMg ? Number(p.grossWeightMg) : null,
          totalPricePaise: p.sellingPricePaise ? Number(p.sellingPricePaise) : 0,
          currencyCode: p.currencyCode,
          images: imageList,
          stockStatus,
          relevanceScore: relevanceMap.get(p.id) ?? 0,
        };
      });

      // Sort by relevance (maintain search order)
      products.sort((a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0));
    }

    // Build facets from all matching results (without pagination)
    const facets = await this.buildFacets(tenantId, matchTerms, params, whereConditions);

    // Get did-you-mean suggestion
    const didYouMean = totalCount === 0 ? await this.getSuggestion(tenantId, query) : null;

    // Get curated suggestions
    const suggestions = await this.getCuratedSuggestions(tenantId, query);

    // Log search (fire-and-forget)
    this.analyticsService
      .logSearch(tenantId, query, customerId ?? null, totalCount)
      .catch((err) => this.logger.warn(`Failed to log search: ${err.message}`));

    return {
      products,
      totalCount,
      facets,
      suggestions,
      didYouMean,
    };
  }

  /**
   * Fast autocomplete: products, categories, popular searches, suggestions.
   */
  async autocomplete(
    tenantId: string,
    query: string,
    limit: number,
    customerId?: string | null,
  ): Promise<AutocompleteResponse> {
    const queryLower = query.toLowerCase().trim();

    // Run all queries in parallel
    const [products, categories, popularSearches, curatedSuggestions, recentSearches] =
      await Promise.all([
        this.autocompleteProducts(tenantId, queryLower, Math.min(limit, 4)),
        this.autocompleteCategories(tenantId, queryLower, 3),
        this.autocompletePopularSearches(tenantId, queryLower, 4),
        this.autocompleteSuggestions(tenantId, queryLower, 3),
        customerId
          ? this.getRecentSearches(customerId, 5)
          : Promise.resolve([]),
      ]);

    // Merge popular + curated into suggestions, deduplicated
    const allSuggestions = [...new Set([...popularSearches, ...curatedSuggestions])].slice(0, 5);

    return {
      products,
      categories,
      suggestions: allSuggestions,
      recentSearches,
    };
  }

  /**
   * Get "Did you mean?" suggestion using Levenshtein distance.
   */
  async getSuggestion(tenantId: string, query: string): Promise<string | null> {
    // Check against popular searches
    const popular = await this.prisma.popularSearch.findMany({
      where: { tenantId, searchCount: { gte: 3 } },
      orderBy: { searchCount: 'desc' },
      take: 100,
      select: { query: true },
    });

    const queryLower = query.toLowerCase();
    let bestMatch: string | null = null;
    let bestDistance = Infinity;

    for (const p of popular) {
      const dist = this.levenshteinDistance(queryLower, p.query.toLowerCase());
      const maxLen = Math.max(queryLower.length, p.query.length);
      // Only suggest if edit distance is < 40% of the word length and > 0
      if (dist > 0 && dist < maxLen * 0.4 && dist < bestDistance) {
        bestDistance = dist;
        bestMatch = p.query;
      }
    }

    return bestMatch;
  }

  /**
   * Get popular searches for a tenant.
   */
  async getPopularSearches(tenantId: string, limit: number = 10): Promise<string[]> {
    const results = await this.prisma.popularSearch.findMany({
      where: { tenantId, resultCount: { gt: 0 } },
      orderBy: { searchCount: 'desc' },
      take: limit,
      select: { query: true },
    });
    return results.map((r) => r.query);
  }

  /**
   * Get recent searches for a customer.
   */
  async getRecentSearches(customerId: string, limit: number = 10): Promise<string[]> {
    const results = await this.prisma.searchLog.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      take: limit * 3, // Fetch more so we can deduplicate
      select: { query: true },
    });

    // Deduplicate and limit
    const seen = new Set<string>();
    const unique: string[] = [];
    for (const r of results) {
      const q = r.query.toLowerCase().trim();
      if (!seen.has(q)) {
        seen.add(q);
        unique.push(r.query);
        if (unique.length >= limit) break;
      }
    }
    return unique;
  }

  /**
   * Clear all recent searches for a customer.
   */
  async clearRecentSearches(customerId: string): Promise<void> {
    await this.prisma.searchLog.deleteMany({
      where: { customerId },
    });
  }

  // ─── Private Helpers ──────────────────────────────────────────

  private buildMatchTerms(query: string): string {
    // Split query into words and build boolean mode terms
    const words = query
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 1)
      .map((w) => `+${w}*`);
    return words.length > 0 ? words.join(' ') : `+${query.trim()}*`;
  }

  private async autocompleteProducts(
    tenantId: string,
    query: string,
    limit: number,
  ): Promise<AutocompleteProduct[]> {
    const products = await this.prisma.product.findMany({
      where: {
        tenantId,
        isActive: true,
        name: { contains: query },
      },
      include: {
        category: { select: { name: true } },
      },
      take: limit,
    });

    return products.map((p) => {
      const images = p.images as unknown;
      const imageList = Array.isArray(images) ? (images as string[]) : null;
      return {
        id: p.id,
        name: p.name,
        productType: p.productType,
        categoryName: p.category?.name ?? null,
        totalPricePaise: p.sellingPricePaise ? Number(p.sellingPricePaise) : 0,
        currencyCode: p.currencyCode,
        image: imageList?.[0] ?? null,
      };
    });
  }

  private async autocompleteCategories(
    tenantId: string,
    query: string,
    limit: number,
  ): Promise<AutocompleteCategory[]> {
    const categories = await this.prisma.category.findMany({
      where: {
        tenantId,
        name: { contains: query },
      },
      include: {
        _count: { select: { products: true } },
      },
      take: limit,
    });

    return categories.map((c) => ({
      id: c.id,
      name: c.name,
      productCount: c._count.products,
    }));
  }

  private async autocompletePopularSearches(
    tenantId: string,
    query: string,
    limit: number,
  ): Promise<string[]> {
    const results = await this.prisma.popularSearch.findMany({
      where: {
        tenantId,
        query: { contains: query },
        resultCount: { gt: 0 },
      },
      orderBy: { searchCount: 'desc' },
      take: limit,
      select: { query: true },
    });
    return results.map((r) => r.query);
  }

  private async autocompleteSuggestions(
    tenantId: string,
    query: string,
    limit: number,
  ): Promise<string[]> {
    const results = await this.prisma.searchSuggestion.findMany({
      where: {
        tenantId,
        isActive: true,
        suggestion: { contains: query },
      },
      orderBy: { priority: 'desc' },
      take: limit,
      select: { suggestion: true },
    });
    return results.map((r) => r.suggestion);
  }

  private async getCuratedSuggestions(tenantId: string, query: string): Promise<string[]> {
    const results = await this.prisma.searchSuggestion.findMany({
      where: {
        tenantId,
        isActive: true,
        suggestion: { contains: query.toLowerCase() },
      },
      orderBy: { priority: 'desc' },
      take: 5,
      select: { suggestion: true },
    });
    return results.map((r) => r.suggestion);
  }

  private async buildFacets(
    tenantId: string,
    matchTerms: string,
    baseParams: unknown[],
    baseConditions: string[],
  ): Promise<SearchFacets> {
    const whereClause = baseConditions.join(' AND ');

    try {
      // Build facets using GROUP BY queries
      const [metalFacets, purityFacets, priceFacets, categoryFacets, weightFacets] =
        await Promise.all([
          this.prisma.$queryRawUnsafe<Array<{ value: string; cnt: bigint }>>(
            `SELECT si.metal_type as value, COUNT(*) as cnt
             FROM search_index si
             WHERE ${whereClause} AND MATCH(si.searchable_text) AGAINST(? IN BOOLEAN MODE)
               AND si.metal_type IS NOT NULL
             GROUP BY si.metal_type ORDER BY cnt DESC`,
            ...baseParams,
            matchTerms,
          ),
          this.prisma.$queryRawUnsafe<Array<{ value: number; cnt: bigint }>>(
            `SELECT si.purity_fineness as value, COUNT(*) as cnt
             FROM search_index si
             WHERE ${whereClause} AND MATCH(si.searchable_text) AGAINST(? IN BOOLEAN MODE)
               AND si.purity_fineness IS NOT NULL
             GROUP BY si.purity_fineness ORDER BY cnt DESC`,
            ...baseParams,
            matchTerms,
          ),
          this.prisma.$queryRawUnsafe<Array<{ value: string; cnt: bigint }>>(
            `SELECT si.price_range_bucket as value, COUNT(*) as cnt
             FROM search_index si
             WHERE ${whereClause} AND MATCH(si.searchable_text) AGAINST(? IN BOOLEAN MODE)
               AND si.price_range_bucket IS NOT NULL
             GROUP BY si.price_range_bucket ORDER BY cnt DESC`,
            ...baseParams,
            matchTerms,
          ),
          this.prisma.$queryRawUnsafe<Array<{ value: string; cnt: bigint }>>(
            `SELECT si.category_name as value, COUNT(*) as cnt
             FROM search_index si
             WHERE ${whereClause} AND MATCH(si.searchable_text) AGAINST(? IN BOOLEAN MODE)
               AND si.category_name IS NOT NULL
             GROUP BY si.category_name ORDER BY cnt DESC`,
            ...baseParams,
            matchTerms,
          ),
          this.prisma.$queryRawUnsafe<Array<{ value: string; cnt: bigint }>>(
            `SELECT si.weight_bucket as value, COUNT(*) as cnt
             FROM search_index si
             WHERE ${whereClause} AND MATCH(si.searchable_text) AGAINST(? IN BOOLEAN MODE)
               AND si.weight_bucket IS NOT NULL
             GROUP BY si.weight_bucket ORDER BY cnt DESC`,
            ...baseParams,
            matchTerms,
          ),
        ]);

      return {
        metalTypes: metalFacets.map((f) => ({ value: f.value, count: Number(f.cnt) })),
        purities: purityFacets.map((f) => ({ value: f.value, count: Number(f.cnt) })),
        priceRanges: priceFacets.map((f) => ({ value: f.value, count: Number(f.cnt) })),
        categories: categoryFacets.map((f) => ({ value: f.value, count: Number(f.cnt) })),
        weightRanges: weightFacets.map((f) => ({ value: f.value, count: Number(f.cnt) })),
      };
    } catch (err) {
      this.logger.warn(`Failed to build facets: ${(err as Error).message}`);
      return {
        metalTypes: [],
        purities: [],
        priceRanges: [],
        categories: [],
        weightRanges: [],
      };
    }
  }

  /**
   * Levenshtein distance between two strings.
   */
  private levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];
    for (let i = 0; i <= a.length; i++) {
      matrix[i] = [i];
    }
    const row0 = matrix[0]!;
    for (let j = 0; j <= b.length; j++) {
      row0[j] = j;
    }
    for (let i = 1; i <= a.length; i++) {
      const rowI = matrix[i]!;
      const rowIm1 = matrix[i - 1]!;
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        rowI[j] = Math.min(
          (rowIm1[j] ?? 0) + 1,
          (rowI[j - 1] ?? 0) + 1,
          (rowIm1[j - 1] ?? 0) + cost,
        );
      }
    }
    return matrix[a.length]![b.length]!;
  }
}
