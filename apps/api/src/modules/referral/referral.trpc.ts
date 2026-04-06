// ─── Referral tRPC Router ──────────────────────────────────────
// Admin procedures for referral program management.

import { Injectable } from '@nestjs/common';
import { TrpcService } from '../../trpc/trpc.service';
import { ReferralService } from './referral.service';
import { z } from 'zod';
import {
  ReferralProgramInputSchema,
  ReferralStatusEnum,
  ReferralPayoutStatusEnum,
} from '@caratflow/shared-types';

@Injectable()
export class ReferralTrpcRouter {
  constructor(
    private readonly trpc: TrpcService,
    private readonly referralService: ReferralService,
  ) {}

  get router() {
    const authed = this.trpc.authedProcedure;

    return this.trpc.router({
      // ─── Program CRUD ──────────────────────────────────────
      programCreate: authed
        .input(ReferralProgramInputSchema)
        .mutation(async ({ ctx, input }) => {
          return this.referralService.createProgram(ctx.tenantId, ctx.userId, input);
        }),

      programUpdate: authed
        .input(z.object({ id: z.string().uuid() }).merge(ReferralProgramInputSchema.partial()))
        .mutation(async ({ ctx, input }) => {
          const { id, ...data } = input;
          return this.referralService.updateProgram(ctx.tenantId, ctx.userId, id, data);
        }),

      programGet: authed
        .input(z.object({ id: z.string().uuid() }))
        .query(async ({ ctx, input }) => {
          return this.referralService.getProgram(ctx.tenantId, input.id);
        }),

      programList: authed.query(async ({ ctx }) => {
        return this.referralService.listPrograms(ctx.tenantId);
      }),

      programActive: authed.query(async ({ ctx }) => {
        return this.referralService.getActiveProgram(ctx.tenantId);
      }),

      // ─── Referral Management ────────────────────────────────
      referralList: authed
        .input(z.object({
          page: z.number().int().default(1),
          limit: z.number().int().default(20),
          status: ReferralStatusEnum.optional(),
        }))
        .query(async ({ ctx, input }) => {
          return this.referralService.listReferrals(ctx.tenantId, input.page, input.limit, input.status);
        }),

      referralStats: authed
        .input(z.object({ customerId: z.string().uuid() }))
        .query(async ({ ctx, input }) => {
          return this.referralService.getReferralStats(ctx.tenantId, input.customerId);
        }),

      leaderboard: authed
        .input(z.object({ limit: z.number().int().default(20) }).optional())
        .query(async ({ ctx, input }) => {
          return this.referralService.getLeaderboard(ctx.tenantId, input?.limit ?? 20);
        }),

      conversionFunnel: authed.query(async ({ ctx }) => {
        return this.referralService.getConversionFunnel(ctx.tenantId);
      }),

      // ─── Payout Management ──────────────────────────────────
      payoutList: authed
        .input(z.object({
          page: z.number().int().default(1),
          limit: z.number().int().default(20),
          status: ReferralPayoutStatusEnum.optional(),
        }))
        .query(async ({ ctx, input }) => {
          return this.referralService.listPayouts(ctx.tenantId, input.page, input.limit, input.status);
        }),

      payoutCredit: authed
        .input(z.object({ payoutId: z.string().uuid() }))
        .mutation(async ({ ctx, input }) => {
          return this.referralService.creditPayout(ctx.tenantId, ctx.userId, input.payoutId);
        }),

      // ─── Code Generation (Admin) ────────────────────────────
      generateCode: authed
        .input(z.object({ customerId: z.string().uuid() }))
        .mutation(async ({ ctx, input }) => {
          return this.referralService.generateReferralCode(ctx.tenantId, input.customerId);
        }),
    });
  }
}
