// ─── Recommendations REST Controller ──────────────────────────
// Public-facing B2C API at /api/v1/store/recommendations/*
// Consumed by the storefront for product recommendations.

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import type { ApiResponse } from '@caratflow/shared-types';
import type {
  RecommendationResponse,
  PersonalizedFeedResponse,
  SimilarProductsResponse,
  TrendingProductsResponse,
  RecommendationType,
} from '@caratflow/shared-types';
import { RecommendationsService } from './recommendations.service';
import { RecommendationsBehaviorService } from './recommendations.behavior.service';

interface StorefrontContext {
  tenantId: string;
  customerId: string | null;
  sessionId: string;
}

function extractContext(headers: Record<string, string | undefined>): StorefrontContext {
  const tenantId = headers['x-tenant-id'];
  if (!tenantId) throw new BadRequestException('Missing x-tenant-id header');

  return {
    tenantId,
    customerId: headers['x-customer-id'] ?? null,
    sessionId: headers['x-session-id'] ?? `sess-${Date.now()}`,
  };
}

function success<T>(data: T): ApiResponse<T> {
  return { success: true, data };
}

@Controller('api/v1/store/recommendations')
export class RecommendationsController {
  constructor(
    private readonly recommendationsService: RecommendationsService,
    private readonly behaviorService: RecommendationsBehaviorService,
  ) {}

  // ─── Personalized ──────────────────────────────────────────────

  @Get('personalized')
  async getPersonalized(
    @Headers() headers: Record<string, string | undefined>,
    @Query('limit') limit?: string,
  ): Promise<ApiResponse<RecommendationResponse>> {
    const ctx = extractContext(headers);
    if (!ctx.customerId) throw new BadRequestException('Customer login required');

    const parsedLimit = limit ? parseInt(limit, 10) : 12;
    const data = await this.recommendationsService.getPersonalizedRecommendations(
      ctx.tenantId,
      ctx.customerId,
      parsedLimit,
    );

    // Log what was shown
    if (data.products.length > 0) {
      await this.recommendationsService.logRecommendations(
        ctx.tenantId,
        ctx.customerId,
        ctx.sessionId,
        'PERSONALIZED' as RecommendationType,
        data.products.map((p) => p.id),
      );
    }

    return success(data);
  }

  // ─── Similar Products ──────────────────────────────────────────

  @Get('similar/:productId')
  async getSimilar(
    @Headers() headers: Record<string, string | undefined>,
    @Param('productId') productId: string,
    @Query('limit') limit?: string,
  ): Promise<ApiResponse<SimilarProductsResponse>> {
    const ctx = extractContext(headers);
    const parsedLimit = limit ? parseInt(limit, 10) : 12;
    const data = await this.recommendationsService.getSimilarProducts(
      ctx.tenantId,
      productId,
      parsedLimit,
    );

    if (data.products.length > 0) {
      await this.recommendationsService.logRecommendations(
        ctx.tenantId,
        ctx.customerId,
        ctx.sessionId,
        'SIMILAR' as RecommendationType,
        data.products.map((p) => p.id),
      );
    }

    return success(data);
  }

  // ─── Bought Together ───────────────────────────────────────────

  @Get('bought-together/:productId')
  async getBoughtTogether(
    @Headers() headers: Record<string, string | undefined>,
    @Param('productId') productId: string,
    @Query('limit') limit?: string,
  ): Promise<ApiResponse<RecommendationResponse>> {
    const ctx = extractContext(headers);
    const parsedLimit = limit ? parseInt(limit, 10) : 6;
    const data = await this.recommendationsService.getBoughtTogether(
      ctx.tenantId,
      productId,
      parsedLimit,
    );

    if (data.products.length > 0) {
      await this.recommendationsService.logRecommendations(
        ctx.tenantId,
        ctx.customerId,
        ctx.sessionId,
        'BOUGHT_TOGETHER' as RecommendationType,
        data.products.map((p) => p.id),
      );
    }

    return success(data);
  }

  // ─── Trending ──────────────────────────────────────────────────

  @Get('trending')
  async getTrending(
    @Headers() headers: Record<string, string | undefined>,
    @Query('limit') limit?: string,
    @Query('period') period?: string,
  ): Promise<ApiResponse<TrendingProductsResponse>> {
    const ctx = extractContext(headers);
    const parsedLimit = limit ? parseInt(limit, 10) : 12;
    const parsedPeriod = period ? parseInt(period, 10) : 7;
    const data = await this.recommendationsService.getTrending(
      ctx.tenantId,
      parsedLimit,
      parsedPeriod,
    );

    if (data.products.length > 0) {
      await this.recommendationsService.logRecommendations(
        ctx.tenantId,
        ctx.customerId,
        ctx.sessionId,
        'TRENDING' as RecommendationType,
        data.products.map((p) => p.id),
      );
    }

    return success(data);
  }

  // ─── Popular in Category ───────────────────────────────────────

  @Get('category/:categoryId')
  async getPopularInCategory(
    @Headers() headers: Record<string, string | undefined>,
    @Param('categoryId') categoryId: string,
    @Query('limit') limit?: string,
  ): Promise<ApiResponse<RecommendationResponse>> {
    const ctx = extractContext(headers);
    const parsedLimit = limit ? parseInt(limit, 10) : 12;
    const data = await this.recommendationsService.getPopularInCategory(
      ctx.tenantId,
      categoryId,
      parsedLimit,
    );

    if (data.products.length > 0) {
      await this.recommendationsService.logRecommendations(
        ctx.tenantId,
        ctx.customerId,
        ctx.sessionId,
        'POPULAR_IN_CATEGORY' as RecommendationType,
        data.products.map((p) => p.id),
      );
    }

    return success(data);
  }

  // ─── For You (Homepage Feed) ───────────────────────────────────

  @Get('for-you')
  async getForYou(
    @Headers() headers: Record<string, string | undefined>,
  ): Promise<ApiResponse<PersonalizedFeedResponse>> {
    const ctx = extractContext(headers);
    if (!ctx.customerId) throw new BadRequestException('Customer login required');

    const data = await this.recommendationsService.getForYou(
      ctx.tenantId,
      ctx.customerId,
    );

    return success(data);
  }

  // ─── Track Product View ────────────────────────────────────────

  @Post('track/view')
  @HttpCode(HttpStatus.NO_CONTENT)
  async trackView(
    @Headers() headers: Record<string, string | undefined>,
    @Body() body: { productId: string },
  ): Promise<void> {
    const ctx = extractContext(headers);
    if (!body.productId) throw new BadRequestException('productId is required');

    await this.behaviorService.trackProductView(
      ctx.tenantId,
      ctx.customerId,
      ctx.sessionId,
      body.productId,
    );
  }

  // ─── Track Recommendation Click ────────────────────────────────

  @Post('track/click')
  @HttpCode(HttpStatus.NO_CONTENT)
  async trackClick(
    @Headers() headers: Record<string, string | undefined>,
    @Body() body: { recommendationLogId: string; clickedProductId: string },
  ): Promise<void> {
    const ctx = extractContext(headers);
    if (!body.recommendationLogId || !body.clickedProductId) {
      throw new BadRequestException('recommendationLogId and clickedProductId are required');
    }

    await this.recommendationsService.logRecommendationClick(
      ctx.tenantId,
      body.recommendationLogId,
      body.clickedProductId,
    );
  }
}
