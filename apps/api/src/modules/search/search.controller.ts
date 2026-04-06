// ─── Search REST Controller ─────────────────────────────────────
// Public-facing search API at /api/v1/store/search/*
// Used by the storefront for search, autocomplete, popular,
// and recent searches.

import {
  Controller,
  Get,
  Delete,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import type { ApiResponse } from '@caratflow/shared-types';
import type {
  SearchResponse,
  AutocompleteResponse,
} from '@caratflow/shared-types';
import { SearchService } from './search.service';

interface SearchContext {
  tenantId: string;
  customerId: string | null;
}

function extractContext(headers: Record<string, string | undefined>): SearchContext {
  const tenantId = headers['x-tenant-id'];
  if (!tenantId) throw new BadRequestException('Missing x-tenant-id header');
  return {
    tenantId,
    customerId: headers['x-customer-id'] ?? null,
  };
}

function success<T>(data: T): ApiResponse<T> {
  return { success: true, data };
}

@Controller('api/v1/store/search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  /**
   * GET /api/v1/store/search?q=&filters=&page=&limit=&sort=
   * Full-text search with filters, facets, and scoring.
   */
  @Get()
  async search(
    @Headers() headers: Record<string, string | undefined>,
    @Query('q') q?: string,
    @Query('filters') filtersJson?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sort') sort?: string,
  ): Promise<ApiResponse<SearchResponse>> {
    const ctx = extractContext(headers);
    if (!q || !q.trim()) throw new BadRequestException('Search query (q) is required');

    let filters: Record<string, unknown> | undefined;
    if (filtersJson) {
      try {
        filters = JSON.parse(filtersJson);
      } catch {
        throw new BadRequestException('Invalid filters JSON');
      }
    }

    const data = await this.searchService.search(
      ctx.tenantId,
      q.trim(),
      filters as unknown as import('@caratflow/shared-types').SearchFilters | undefined,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      sort,
      ctx.customerId,
    );
    return success(data);
  }

  /**
   * GET /api/v1/store/search/autocomplete?q=
   * Fast autocomplete with products, categories, suggestions.
   */
  @Get('autocomplete')
  async autocomplete(
    @Headers() headers: Record<string, string | undefined>,
    @Query('q') q?: string,
  ): Promise<ApiResponse<AutocompleteResponse>> {
    const ctx = extractContext(headers);
    if (!q || !q.trim()) throw new BadRequestException('Query (q) is required');

    const data = await this.searchService.autocomplete(
      ctx.tenantId,
      q.trim(),
      8,
      ctx.customerId,
    );
    return success(data);
  }

  /**
   * GET /api/v1/store/search/popular
   * Get popular/trending search queries.
   */
  @Get('popular')
  async popularSearches(
    @Headers() headers: Record<string, string | undefined>,
    @Query('limit') limit?: string,
  ): Promise<ApiResponse<string[]>> {
    const ctx = extractContext(headers);
    const data = await this.searchService.getPopularSearches(
      ctx.tenantId,
      limit ? parseInt(limit, 10) : 10,
    );
    return success(data);
  }

  /**
   * GET /api/v1/store/search/recent
   * Get recent searches for the logged-in customer.
   */
  @Get('recent')
  async recentSearches(
    @Headers() headers: Record<string, string | undefined>,
    @Query('limit') limit?: string,
  ): Promise<ApiResponse<string[]>> {
    const ctx = extractContext(headers);
    if (!ctx.customerId) throw new BadRequestException('Customer login required');

    const data = await this.searchService.getRecentSearches(
      ctx.customerId,
      limit ? parseInt(limit, 10) : 10,
    );
    return success(data);
  }

  /**
   * DELETE /api/v1/store/search/recent
   * Clear all recent searches for the logged-in customer.
   */
  @Delete('recent')
  @HttpCode(HttpStatus.NO_CONTENT)
  async clearRecentSearches(
    @Headers() headers: Record<string, string | undefined>,
  ): Promise<void> {
    const ctx = extractContext(headers);
    if (!ctx.customerId) throw new BadRequestException('Customer login required');
    await this.searchService.clearRecentSearches(ctx.customerId);
  }
}
