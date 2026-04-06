// ─── B2C Features tRPC Router ───────────────────────────────────
// Admin tRPC endpoints for coupon management and abandoned cart stats.

import { Injectable } from '@nestjs/common';
import { TrpcService } from '../../trpc/trpc.service';
import { CouponService } from './coupon.service';
import { AbandonedCartService } from './abandoned-cart.service';
import { WishlistService } from './wishlist.service';
import { z } from 'zod';
import {
  CouponCodeInputSchema,
  CouponCodeUpdateSchema,
  BulkCouponGenerateInputSchema,
  AbandonedCartDateRangeSchema,
} from '@caratflow/shared-types';

@Injectable()
export class B2cFeaturesTrpcRouter {
  constructor(
    private readonly trpc: TrpcService,
    private readonly couponService: CouponService,
    private readonly abandonedCartService: AbandonedCartService,
    private readonly wishlistService: WishlistService,
  ) {}

  get router() {
    const authed = this.trpc.authedProcedure;

    return this.trpc.router({
      // ─── Coupon Management ──────────────────────────────────

      couponCreate: authed
        .input(CouponCodeInputSchema)
        .mutation(async ({ ctx, input }) => {
          return this.couponService.createCoupon(ctx.tenantId, ctx.userId, input);
        }),

      couponUpdate: authed
        .input(z.object({ id: z.string().uuid() }).merge(CouponCodeUpdateSchema))
        .mutation(async ({ ctx, input }) => {
          const { id, ...data } = input;
          return this.couponService.updateCoupon(ctx.tenantId, ctx.userId, id, data);
        }),

      couponDeactivate: authed
        .input(z.object({ id: z.string().uuid() }))
        .mutation(async ({ ctx, input }) => {
          return this.couponService.deactivateCoupon(ctx.tenantId, ctx.userId, input.id);
        }),

      couponGet: authed
        .input(z.object({ id: z.string().uuid() }))
        .query(async ({ ctx, input }) => {
          return this.couponService.getCoupon(ctx.tenantId, input.id);
        }),

      couponList: authed
        .input(z.object({
          page: z.number().int().min(1).default(1),
          limit: z.number().int().min(1).max(100).default(20),
          isActive: z.boolean().optional(),
        }))
        .query(async ({ ctx, input }) => {
          return this.couponService.listCoupons(ctx.tenantId, input.page, input.limit, input.isActive);
        }),

      couponGenerateBulk: authed
        .input(BulkCouponGenerateInputSchema)
        .mutation(async ({ ctx, input }) => {
          return this.couponService.generateBulkCoupons(ctx.tenantId, ctx.userId, input);
        }),

      // ─── Abandoned Cart Stats ──────────────────────────────

      abandonedCartStats: authed
        .input(AbandonedCartDateRangeSchema)
        .query(async ({ ctx, input }) => {
          return this.abandonedCartService.getAbandonedCartStats(ctx.tenantId, input);
        }),

      abandonedCartList: authed
        .input(z.object({
          page: z.number().int().min(1).default(1),
          limit: z.number().int().min(1).max(100).default(20),
          status: z.string().optional(),
        }))
        .query(async ({ ctx, input }) => {
          const where: Record<string, unknown> = { tenantId: ctx.tenantId };
          if (input.status) where.status = input.status;

          const prisma = (this.abandonedCartService as unknown as { prisma: { abandonedCart: { findMany: Function; count: Function } } }).prisma;

          const [items, total] = await Promise.all([
            prisma.abandonedCart.findMany({
              where,
              orderBy: { abandonedAt: 'desc' },
              skip: (input.page - 1) * input.limit,
              take: input.limit,
              include: {
                customer: {
                  select: { firstName: true, lastName: true, email: true, phone: true },
                },
              },
            }),
            prisma.abandonedCart.count({ where }),
          ]);

          const totalPages = Math.ceil(total / input.limit);
          return {
            items,
            total,
            page: input.page,
            limit: input.limit,
            totalPages,
            hasNext: input.page < totalPages,
            hasPrevious: input.page > 1,
          };
        }),

      // ─── Price Alert Admin ─────────────────────────────────

      priceAlertCheck: authed
        .mutation(async ({ ctx }) => {
          const count = await this.wishlistService.checkPriceAlerts(ctx.tenantId);
          return { triggeredCount: count };
        }),
    });
  }
}
