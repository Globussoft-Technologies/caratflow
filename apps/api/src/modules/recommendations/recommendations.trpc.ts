// ─── Recommendations tRPC Router ───────────────────────────────
// Internal tRPC procedures mirroring the storefront recommendations
// REST API. The authenticated user id (ctx.userId) is used as the
// customer id for personalized procedures.

import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { TrpcService } from '../../trpc/trpc.service';
import { RecommendationsService } from './recommendations.service';
import { RecommendationsBehaviorService } from './recommendations.behavior.service';
import { TrackClickInputSchema } from '@caratflow/shared-types';

@Injectable()
export class RecommendationsTrpcRouter {
  constructor(
    private readonly trpc: TrpcService,
    private readonly recommendationsService: RecommendationsService,
    private readonly behaviorService: RecommendationsBehaviorService,
  ) {}

  get router() {
    const authed = this.trpc.authedProcedure;

    return this.trpc.router({
      personalized: authed
        .input(z.object({ limit: z.number().int().min(1).max(100).default(12) }).optional())
        .query(({ ctx, input }) =>
          this.recommendationsService.getPersonalizedRecommendations(
            ctx.tenantId, ctx.userId, input?.limit ?? 12,
          ),
        ),

      similar: authed
        .input(z.object({
          productId: z.string().uuid(),
          limit: z.number().int().min(1).max(100).default(12),
        }))
        .query(({ ctx, input }) =>
          this.recommendationsService.getSimilarProducts(
            ctx.tenantId, input.productId, input.limit,
          ),
        ),

      boughtTogether: authed
        .input(z.object({
          productId: z.string().uuid(),
          limit: z.number().int().min(1).max(100).default(6),
        }))
        .query(({ ctx, input }) =>
          this.recommendationsService.getBoughtTogether(
            ctx.tenantId, input.productId, input.limit,
          ),
        ),

      trending: authed
        .input(z.object({
          limit: z.number().int().min(1).max(100).default(12),
          period: z.number().int().min(1).max(365).default(7),
        }).optional())
        .query(({ ctx, input }) =>
          this.recommendationsService.getTrending(
            ctx.tenantId, input?.limit ?? 12, input?.period ?? 7,
          ),
        ),

      popularInCategory: authed
        .input(z.object({
          categoryId: z.string().uuid(),
          limit: z.number().int().min(1).max(100).default(12),
        }))
        .query(({ ctx, input }) =>
          this.recommendationsService.getPopularInCategory(
            ctx.tenantId, input.categoryId, input.limit,
          ),
        ),

      forYou: authed.query(({ ctx }) =>
        this.recommendationsService.getForYou(ctx.tenantId, ctx.userId),
      ),

      trackView: authed
        .input(z.object({
          productId: z.string().uuid(),
          sessionId: z.string().min(1),
        }))
        .mutation(({ ctx, input }) =>
          this.behaviorService.trackProductView(
            ctx.tenantId, ctx.userId, input.sessionId, input.productId,
          ),
        ),

      trackClick: authed
        .input(TrackClickInputSchema)
        .mutation(({ ctx, input }) =>
          this.recommendationsService.logRecommendationClick(
            ctx.tenantId, input.recommendationLogId, input.clickedProductId,
          ),
        ),
    });
  }
}
