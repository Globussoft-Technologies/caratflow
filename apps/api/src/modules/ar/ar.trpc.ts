// ─── AR tRPC Router ──────────────────────────────────────────
// Admin procedures for AR asset management, 360 config, analytics.

import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { TrpcService } from '../../trpc/trpc.service';
import { ArService } from './ar.service';
import { ArTryOnService } from './ar.tryon.service';
import { Ar360Service } from './ar.360.service';
import {
  ArAssetInputSchema,
  Product360ConfigInputSchema,
  Product360ConfigUpdateSchema,
  ArAnalyticsFilterSchema,
} from '@caratflow/shared-types';
import { PaginationSchema } from '@caratflow/shared-types';

@Injectable()
export class ArTrpcRouter {
  constructor(
    private readonly trpc: TrpcService,
    private readonly arService: ArService,
    private readonly tryOnService: ArTryOnService,
    private readonly ar360Service: Ar360Service,
  ) {}

  get router() {
    return this.trpc.router({
      // ─── AR Assets ──────────────────────────────────────────

      uploadAsset: this.trpc.authedProcedure
        .input(ArAssetInputSchema)
        .mutation(({ ctx, input }) =>
          this.arService.uploadAsset(ctx.tenantId, ctx.userId, input),
        ),

      getAsset: this.trpc.authedProcedure
        .input(z.object({ assetId: z.string().uuid() }))
        .query(({ ctx, input }) =>
          this.arService.getAsset(ctx.tenantId, input.assetId),
        ),

      getAssetsForProduct: this.trpc.authedProcedure
        .input(z.object({
          productId: z.string().uuid(),
          assetType: z.string().optional(),
        }))
        .query(({ ctx, input }) =>
          this.arService.getAssetsForProduct(ctx.tenantId, input.productId, input.assetType),
        ),

      updateAsset: this.trpc.authedProcedure
        .input(z.object({
          assetId: z.string().uuid(),
          data: ArAssetInputSchema.partial().extend({
            isActive: z.boolean().optional(),
            processingStatus: z.string().optional(),
          }),
        }))
        .mutation(({ ctx, input }) =>
          this.arService.updateAsset(ctx.tenantId, ctx.userId, input.assetId, input.data),
        ),

      deleteAsset: this.trpc.authedProcedure
        .input(z.object({ assetId: z.string().uuid() }))
        .mutation(({ ctx, input }) =>
          this.arService.deleteAsset(ctx.tenantId, input.assetId),
        ),

      // ─── Products with AR ───────────────────────────────────

      listArProducts: this.trpc.authedProcedure
        .input(z.object({
          category: z.string().optional(),
          pagination: PaginationSchema.optional(),
        }))
        .query(({ ctx, input }) =>
          this.arService.getProductsWithAr(
            ctx.tenantId,
            input.category,
            input.pagination ?? { page: 1, limit: 20, sortOrder: 'desc' },
          ),
        ),

      // ─── 360 View Config ───────────────────────────────────

      create360Config: this.trpc.authedProcedure
        .input(Product360ConfigInputSchema)
        .mutation(({ ctx, input }) =>
          this.ar360Service.create360Config(ctx.tenantId, ctx.userId, input),
        ),

      get360Config: this.trpc.authedProcedure
        .input(z.object({ productId: z.string().uuid() }))
        .query(({ ctx, input }) =>
          this.ar360Service.get360Config(ctx.tenantId, input.productId),
        ),

      update360Config: this.trpc.authedProcedure
        .input(z.object({
          productId: z.string().uuid(),
          data: Product360ConfigUpdateSchema,
        }))
        .mutation(({ ctx, input }) =>
          this.ar360Service.update360Config(ctx.tenantId, ctx.userId, input.productId, input.data),
        ),

      delete360Config: this.trpc.authedProcedure
        .input(z.object({ productId: z.string().uuid() }))
        .mutation(({ ctx, input }) =>
          this.ar360Service.delete360Config(ctx.tenantId, input.productId),
        ),

      listAll360Configs: this.trpc.authedProcedure
        .query(({ ctx }) =>
          this.ar360Service.listAll360Configs(ctx.tenantId),
        ),

      // ─── Analytics ──────────────────────────────────────────

      getAnalytics: this.trpc.authedProcedure
        .input(ArAnalyticsFilterSchema.optional())
        .query(({ ctx, input }) =>
          this.tryOnService.getAnalytics(ctx.tenantId, input ?? {}),
        ),

      // ─── Try-On Config (Admin preview) ─────────────────────

      getTryOnConfig: this.trpc.authedProcedure
        .input(z.object({ productId: z.string().uuid() }))
        .query(({ ctx, input }) =>
          this.tryOnService.getTryOnConfig(ctx.tenantId, input.productId),
        ),
    });
  }
}
