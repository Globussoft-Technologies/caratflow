// ─── BNPL tRPC Router ─────────────────────────────────────────
// Admin-facing tRPC procedures for BNPL provider config,
// EMI plan CRUD, transaction management, and analytics.

import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { TrpcService } from '../../trpc/trpc.service';
import { BnplService } from './bnpl.service';
import { BnplEmiService } from './bnpl.emi.service';
import { BnplSavedPaymentService } from './bnpl.saved-payment.service';
import {
  BnplProviderInputSchema,
  EmiPlanInputSchema,
  BnplTransactionListFilterSchema,
  EmiPlanListFilterSchema,
  EmiCalculatorInputSchema,
  BnplProviderName,
  BnplTransactionStatus,
  EmiCardType,
} from '@caratflow/shared-types';
import { PaginationSchema } from '@caratflow/shared-types';

@Injectable()
export class BnplTrpcRouter {
  constructor(
    private readonly trpc: TrpcService,
    private readonly bnplService: BnplService,
    private readonly emiService: BnplEmiService,
    private readonly savedPaymentService: BnplSavedPaymentService,
  ) {}

  get router() {
    return this.trpc.router({
      // ─── Dashboard & Analytics ──────────────────────────────
      getDashboard: this.trpc.authedProcedure
        .query(({ ctx }) =>
          this.bnplService.getDashboardStats(ctx.tenantId),
        ),

      // ─── BNPL Providers ─────────────────────────────────────
      createProvider: this.trpc.authedProcedure
        .input(BnplProviderInputSchema)
        .mutation(({ ctx, input }) =>
          this.bnplService.createProvider(ctx.tenantId, ctx.userId, input),
        ),

      getProvider: this.trpc.authedProcedure
        .input(z.object({ providerId: z.string().uuid() }))
        .query(({ ctx, input }) =>
          this.bnplService.getProvider(ctx.tenantId, input.providerId),
        ),

      listProviders: this.trpc.authedProcedure
        .query(({ ctx }) =>
          this.bnplService.listProviders(ctx.tenantId),
        ),

      updateProvider: this.trpc.authedProcedure
        .input(z.object({
          providerId: z.string().uuid(),
          data: BnplProviderInputSchema.partial(),
        }))
        .mutation(({ ctx, input }) =>
          this.bnplService.updateProvider(ctx.tenantId, ctx.userId, input.providerId, input.data),
        ),

      toggleProvider: this.trpc.authedProcedure
        .input(z.object({
          providerId: z.string().uuid(),
          isActive: z.boolean(),
        }))
        .mutation(({ ctx, input }) =>
          this.bnplService.toggleProvider(ctx.tenantId, ctx.userId, input.providerId, input.isActive),
        ),

      // ─── EMI Plans ──────────────────────────────────────────
      createEmiPlan: this.trpc.authedProcedure
        .input(EmiPlanInputSchema)
        .mutation(({ ctx, input }) =>
          this.emiService.createEmiPlan(ctx.tenantId, ctx.userId, input),
        ),

      updateEmiPlan: this.trpc.authedProcedure
        .input(z.object({
          planId: z.string().uuid(),
          data: EmiPlanInputSchema.partial(),
        }))
        .mutation(({ ctx, input }) =>
          this.emiService.updateEmiPlan(ctx.tenantId, ctx.userId, input.planId, input.data),
        ),

      listEmiPlans: this.trpc.authedProcedure
        .input(z.object({
          filters: EmiPlanListFilterSchema.optional(),
          pagination: PaginationSchema.optional(),
        }))
        .query(({ ctx, input }) =>
          this.emiService.getEmiPlans(
            ctx.tenantId,
            input.filters ?? {},
            input.pagination ?? { page: 1, limit: 20, sortOrder: 'desc' },
          ),
        ),

      deleteEmiPlan: this.trpc.authedProcedure
        .input(z.object({ planId: z.string().uuid() }))
        .mutation(({ ctx, input }) =>
          this.emiService.deletePlan(ctx.tenantId, input.planId),
        ),

      toggleNoCostEmi: this.trpc.authedProcedure
        .input(z.object({
          planId: z.string().uuid(),
          enabled: z.boolean(),
          subventionPct: z.number().int().nonnegative().default(0),
        }))
        .mutation(({ ctx, input }) =>
          this.emiService.toggleNoCostEmi(ctx.tenantId, ctx.userId, input.planId, input.enabled, input.subventionPct),
        ),

      getAvailablePlans: this.trpc.authedProcedure
        .input(z.object({ amountPaise: z.number().int().positive() }))
        .query(({ ctx, input }) =>
          this.emiService.getAvailablePlans(ctx.tenantId, input.amountPaise),
        ),

      calculateEmi: this.trpc.authedProcedure
        .input(EmiCalculatorInputSchema)
        .query(({ input }) =>
          this.emiService.calculateEmiWithSchedule(input.amountPaise, input.tenure, input.interestRatePct),
        ),

      // ─── Transactions ───────────────────────────────────────
      getTransaction: this.trpc.authedProcedure
        .input(z.object({ transactionId: z.string().uuid() }))
        .query(({ ctx, input }) =>
          this.bnplService.getTransaction(ctx.tenantId, input.transactionId),
        ),

      listTransactions: this.trpc.authedProcedure
        .input(z.object({
          filters: BnplTransactionListFilterSchema.optional(),
          pagination: PaginationSchema.optional(),
        }))
        .query(({ ctx, input }) =>
          this.bnplService.listTransactions(
            ctx.tenantId,
            input.filters ?? {},
            input.pagination ?? { page: 1, limit: 20, sortOrder: 'desc' },
          ),
        ),

      // ─── Eligibility ────────────────────────────────────────
      checkEligibility: this.trpc.authedProcedure
        .input(z.object({
          customerId: z.string().uuid(),
          amountPaise: z.number().int().positive(),
        }))
        .query(({ ctx, input }) =>
          this.bnplService.checkEligibility(ctx.tenantId, input.customerId, input.amountPaise),
        ),

      // ─── Saved Payment Methods (Admin view) ─────────────────
      listCustomerMethods: this.trpc.authedProcedure
        .input(z.object({ customerId: z.string().uuid() }))
        .query(({ ctx, input }) =>
          this.savedPaymentService.listMethods(ctx.tenantId, input.customerId),
        ),
    });
  }
}
