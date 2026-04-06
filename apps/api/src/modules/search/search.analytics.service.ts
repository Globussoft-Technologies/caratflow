// ─── Search Analytics Service ───────────────────────────────────
// Search logging, analytics dashboard: top queries, zero-result
// queries, trending queries, search volume.

import { Injectable, Logger } from '@nestjs/common';
import type { SearchAnalytics, PopularSearchResponse } from '@caratflow/shared-types';
import { PrismaService } from '../../common/prisma.service';
import { TenantAwareService } from '../../common/base.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class SearchAnalyticsService extends TenantAwareService {
  private readonly logger = new Logger(SearchAnalyticsService.name);

  constructor(prisma: PrismaService) {
    super(prisma);
  }

  /**
   * Log a search query and update PopularSearch counts.
   */
  async logSearch(
    tenantId: string,
    query: string,
    customerId: string | null,
    resultCount: number,
  ): Promise<void> {
    const normalizedQuery = query.toLowerCase().trim();

    // Log to SearchLog
    await this.prisma.searchLog.create({
      data: {
        id: uuidv4(),
        tenantId,
        query: normalizedQuery,
        resultCount,
        customerId: customerId ?? undefined,
      },
    });

    // Upsert PopularSearch
    try {
      await this.prisma.popularSearch.upsert({
        where: {
          tenantId_query: {
            tenantId,
            query: normalizedQuery,
          },
        },
        create: {
          id: uuidv4(),
          tenantId,
          query: normalizedQuery,
          searchCount: 1,
          resultCount,
          lastSearchedAt: new Date(),
        },
        update: {
          searchCount: { increment: 1 },
          resultCount,
          lastSearchedAt: new Date(),
        },
      });
    } catch (err) {
      this.logger.warn(`Failed to update popular search: ${(err as Error).message}`);
    }
  }

  /**
   * Get search analytics for admin dashboard.
   */
  async getSearchAnalytics(
    tenantId: string,
    dateRange?: { from: Date; to: Date },
  ): Promise<SearchAnalytics> {
    const dateFilter = dateRange
      ? { createdAt: { gte: dateRange.from, lte: dateRange.to } }
      : {};

    // Total searches in range
    const totalSearches = await this.prisma.searchLog.count({
      where: { tenantId, ...dateFilter },
    });

    // Unique queries
    const uniqueResult = await this.prisma.$queryRawUnsafe<Array<{ cnt: bigint }>>(
      `SELECT COUNT(DISTINCT query) as cnt FROM search_logs WHERE tenant_id = ? ${
        dateRange
          ? `AND created_at >= ? AND created_at <= ?`
          : ''
      }`,
      tenantId,
      ...(dateRange ? [dateRange.from, dateRange.to] : []),
    );
    const uniqueQueries = Number(uniqueResult[0]?.cnt ?? 0);

    // Average result count
    const avgResult = await this.prisma.$queryRawUnsafe<Array<{ avg_cnt: number }>>(
      `SELECT AVG(result_count) as avg_cnt FROM search_logs WHERE tenant_id = ? ${
        dateRange
          ? `AND created_at >= ? AND created_at <= ?`
          : ''
      }`,
      tenantId,
      ...(dateRange ? [dateRange.from, dateRange.to] : []),
    );
    const avgResultCount = avgResult[0]?.avg_cnt ?? 0;

    // Zero-result count
    const zeroResultCount = await this.prisma.searchLog.count({
      where: { tenantId, resultCount: 0, ...dateFilter },
    });

    // Top queries from PopularSearch
    const topQueries = await this.prisma.popularSearch.findMany({
      where: { tenantId },
      orderBy: { searchCount: 'desc' },
      take: 20,
      select: { query: true, searchCount: true, resultCount: true },
    });

    // Zero-result queries
    const zeroResultQueries = await this.prisma.popularSearch.findMany({
      where: { tenantId, resultCount: 0 },
      orderBy: { searchCount: 'desc' },
      take: 20,
      select: { query: true, searchCount: true, lastSearchedAt: true },
    });

    // Trending queries (highest count in recent period vs. prior)
    // Simplified: just use top recent queries
    const trendingQueries = await this.prisma.popularSearch.findMany({
      where: {
        tenantId,
        lastSearchedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        resultCount: { gt: 0 },
      },
      orderBy: { searchCount: 'desc' },
      take: 10,
      select: { query: true, searchCount: true },
    });

    return {
      totalSearches,
      uniqueQueries,
      avgResultCount: Math.round(avgResultCount * 10) / 10,
      zeroResultCount,
      topQueries: topQueries.map((q) => ({
        query: q.query,
        count: q.searchCount,
        resultCount: q.resultCount,
      })),
      zeroResultQueries: zeroResultQueries.map((q) => ({
        query: q.query,
        count: q.searchCount,
        lastSearchedAt: q.lastSearchedAt,
      })),
      trendingQueries: trendingQueries.map((q) => ({
        query: q.query,
        count: q.searchCount,
        growth: 0, // Would need historical data for real growth calc
      })),
    };
  }

  /**
   * Get queries that returned zero results (admin action: add synonyms or products).
   */
  async getZeroResultQueries(
    tenantId: string,
    limit: number = 20,
  ): Promise<PopularSearchResponse[]> {
    const results = await this.prisma.popularSearch.findMany({
      where: { tenantId, resultCount: 0 },
      orderBy: { searchCount: 'desc' },
      take: limit,
    });

    return results.map((r) => ({
      id: r.id,
      query: r.query,
      searchCount: r.searchCount,
      lastSearchedAt: r.lastSearchedAt,
      resultCount: r.resultCount,
      category: r.category,
    }));
  }

  /**
   * Get popular searches for admin management.
   */
  async getPopularSearchesAdmin(
    tenantId: string,
    limit: number = 50,
  ): Promise<PopularSearchResponse[]> {
    const results = await this.prisma.popularSearch.findMany({
      where: { tenantId },
      orderBy: { searchCount: 'desc' },
      take: limit,
    });

    return results.map((r) => ({
      id: r.id,
      query: r.query,
      searchCount: r.searchCount,
      lastSearchedAt: r.lastSearchedAt,
      resultCount: r.resultCount,
      category: r.category,
    }));
  }

  /**
   * Delete a popular search entry.
   */
  async deletePopularSearch(tenantId: string, id: string): Promise<void> {
    await this.prisma.popularSearch.delete({
      where: { id },
    });
  }
}
