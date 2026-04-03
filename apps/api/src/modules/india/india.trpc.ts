// ─── India tRPC Router ─────────────────────────────────────────
// Sub-routers: girvi, schemes, rates, kyc, payments.

import { Injectable } from '@nestjs/common';
import { TrpcService } from '../../trpc/trpc.service';
import { IndiaGirviService } from './india.girvi.service';
import { IndiaSchemeService } from './india.scheme.service';
import { IndiaRatesService } from './india.rates.service';
import { IndiaKycService } from './india.kyc.service';
import { IndiaPaymentService } from './india.payment.service';
import { z } from 'zod';
import {
  GirviLoanInputSchema,
  GirviLoanListInputSchema,
  GirviPaymentInputSchema,
  GirviAuctionInputSchema,
  GirviAuctionResultInputSchema,
  KittySchemeInputSchema,
  KittySchemeListInputSchema,
  KittyMemberInputSchema,
  KittyInstallmentInputSchema,
  GoldSavingsSchemeInputSchema,
  GoldSavingsSchemeListInputSchema,
  GoldSavingsMemberInputSchema,
  GoldSavingsInstallmentInputSchema,
  MetalRateInputSchema,
  MetalRateQuerySchema,
  KycVerificationInputSchema,
  KycVerifyInputSchema,
  UpiPaymentInputSchema,
  BankTransferTemplateInputSchema,
  UuidSchema,
} from '@caratflow/shared-types';

@Injectable()
export class IndiaTrpcRouter {
  constructor(
    private readonly trpc: TrpcService,
    private readonly girviService: IndiaGirviService,
    private readonly schemeService: IndiaSchemeService,
    private readonly ratesService: IndiaRatesService,
    private readonly kycService: IndiaKycService,
    private readonly paymentService: IndiaPaymentService,
  ) {}

  get router() {
    return this.trpc.router({
      // ─── Girvi Sub-Router ──────────────────────────────────
      girvi: this.trpc.router({
        dashboard: this.trpc.authedProcedure.query(async ({ ctx }) => {
          return this.girviService.getDashboard(ctx.tenantId);
        }),

        create: this.trpc.authedProcedure
          .input(GirviLoanInputSchema)
          .mutation(async ({ ctx, input }) => {
            return this.girviService.createLoan(ctx.tenantId, ctx.userId, input);
          }),

        getById: this.trpc.authedProcedure
          .input(z.object({ id: UuidSchema }))
          .query(async ({ ctx, input }) => {
            return this.girviService.getLoan(ctx.tenantId, input.id);
          }),

        list: this.trpc.authedProcedure
          .input(GirviLoanListInputSchema)
          .query(async ({ ctx, input }) => {
            return this.girviService.listLoans(ctx.tenantId, input);
          }),

        accrueInterest: this.trpc.authedProcedure
          .input(z.object({ loanId: UuidSchema }))
          .mutation(async ({ ctx, input }) => {
            return this.girviService.accrueInterest(ctx.tenantId, input.loanId);
          }),

        recordPayment: this.trpc.authedProcedure
          .input(GirviPaymentInputSchema)
          .mutation(async ({ ctx, input }) => {
            return this.girviService.recordPayment(ctx.tenantId, ctx.userId, input);
          }),

        closeLoan: this.trpc.authedProcedure
          .input(z.object({ loanId: UuidSchema }))
          .mutation(async ({ ctx, input }) => {
            return this.girviService.closeLoan(ctx.tenantId, ctx.userId, input.loanId);
          }),

        markDefaulted: this.trpc.authedProcedure
          .input(z.object({ loanId: UuidSchema }))
          .mutation(async ({ ctx, input }) => {
            return this.girviService.markDefaulted(ctx.tenantId, ctx.userId, input.loanId);
          }),

        scheduleAuction: this.trpc.authedProcedure
          .input(GirviAuctionInputSchema)
          .mutation(async ({ ctx, input }) => {
            return this.girviService.scheduleAuction(ctx.tenantId, ctx.userId, input);
          }),

        recordAuctionResult: this.trpc.authedProcedure
          .input(GirviAuctionResultInputSchema)
          .mutation(async ({ ctx, input }) => {
            return this.girviService.recordAuctionResult(ctx.tenantId, ctx.userId, input);
          }),

        cancelAuction: this.trpc.authedProcedure
          .input(z.object({ auctionId: UuidSchema }))
          .mutation(async ({ ctx, input }) => {
            return this.girviService.cancelAuction(ctx.tenantId, ctx.userId, input.auctionId);
          }),

        listAuctions: this.trpc.authedProcedure
          .input(z.object({ status: z.string().optional() }).optional())
          .query(async ({ ctx, input }) => {
            return this.girviService.listAuctions(ctx.tenantId, input?.status);
          }),
      }),

      // ─── Schemes Sub-Router ────────────────────────────────
      schemes: this.trpc.router({
        // Kitty schemes
        kitty: this.trpc.router({
          create: this.trpc.authedProcedure
            .input(KittySchemeInputSchema)
            .mutation(async ({ ctx, input }) => {
              return this.schemeService.createKittyScheme(ctx.tenantId, ctx.userId, input);
            }),

          getById: this.trpc.authedProcedure
            .input(z.object({ id: UuidSchema }))
            .query(async ({ ctx, input }) => {
              return this.schemeService.getKittyScheme(ctx.tenantId, input.id);
            }),

          list: this.trpc.authedProcedure
            .input(KittySchemeListInputSchema)
            .query(async ({ ctx, input }) => {
              return this.schemeService.listKittySchemes(ctx.tenantId, input);
            }),

          enrollMember: this.trpc.authedProcedure
            .input(KittyMemberInputSchema)
            .mutation(async ({ ctx, input }) => {
              return this.schemeService.enrollKittyMember(ctx.tenantId, ctx.userId, input);
            }),

          recordInstallment: this.trpc.authedProcedure
            .input(KittyInstallmentInputSchema)
            .mutation(async ({ ctx, input }) => {
              return this.schemeService.recordKittyInstallment(ctx.tenantId, ctx.userId, input);
            }),

          mature: this.trpc.authedProcedure
            .input(z.object({ schemeId: UuidSchema }))
            .mutation(async ({ ctx, input }) => {
              return this.schemeService.matureKittyScheme(ctx.tenantId, ctx.userId, input.schemeId);
            }),
        }),

        // Gold savings schemes
        goldSavings: this.trpc.router({
          create: this.trpc.authedProcedure
            .input(GoldSavingsSchemeInputSchema)
            .mutation(async ({ ctx, input }) => {
              return this.schemeService.createGoldSavingsScheme(ctx.tenantId, ctx.userId, input);
            }),

          getById: this.trpc.authedProcedure
            .input(z.object({ id: UuidSchema }))
            .query(async ({ ctx, input }) => {
              return this.schemeService.getGoldSavingsScheme(ctx.tenantId, input.id);
            }),

          list: this.trpc.authedProcedure
            .input(GoldSavingsSchemeListInputSchema)
            .query(async ({ ctx, input }) => {
              return this.schemeService.listGoldSavingsSchemes(ctx.tenantId, input);
            }),

          enrollMember: this.trpc.authedProcedure
            .input(GoldSavingsMemberInputSchema)
            .mutation(async ({ ctx, input }) => {
              return this.schemeService.enrollGoldSavingsMember(ctx.tenantId, ctx.userId, input);
            }),

          recordInstallment: this.trpc.authedProcedure
            .input(GoldSavingsInstallmentInputSchema)
            .mutation(async ({ ctx, input }) => {
              return this.schemeService.recordGoldSavingsInstallment(ctx.tenantId, ctx.userId, input);
            }),

          calculateMaturity: this.trpc.authedProcedure
            .input(z.object({
              monthlyAmountPaise: z.number().int().positive(),
              durationMonths: z.number().int().min(1),
              bonusMonths: z.number().int().nonnegative(),
              maturityBonusPercent: z.number().int().nonnegative(),
            }))
            .query(({ input }) => {
              return this.schemeService.calculateMaturityValue(
                input.monthlyAmountPaise,
                input.durationMonths,
                input.bonusMonths,
                input.maturityBonusPercent,
              );
            }),

          redeem: this.trpc.authedProcedure
            .input(z.object({ memberId: UuidSchema }))
            .mutation(async ({ ctx, input }) => {
              return this.schemeService.redeemGoldSavings(ctx.tenantId, ctx.userId, input.memberId);
            }),
        }),
      }),

      // ─── Rates Sub-Router ──────────────────────────────────
      rates: this.trpc.router({
        record: this.trpc.authedProcedure
          .input(MetalRateInputSchema)
          .mutation(async ({ input }) => {
            return this.ratesService.recordRate(input);
          }),

        getCurrent: this.trpc.authedProcedure
          .input(z.object({ metalType: z.string(), purity: z.number().int() }))
          .query(async ({ input }) => {
            return this.ratesService.getCurrentRate(input.metalType, input.purity);
          }),

        getAll: this.trpc.authedProcedure.query(async () => {
          return this.ratesService.getAllCurrentRates();
        }),

        getHistory: this.trpc.authedProcedure
          .input(MetalRateQuerySchema)
          .query(async ({ input }) => {
            return this.ratesService.getHistoricalRates(input);
          }),
      }),

      // ─── KYC Sub-Router ────────────────────────────────────
      kyc: this.trpc.router({
        record: this.trpc.authedProcedure
          .input(KycVerificationInputSchema)
          .mutation(async ({ ctx, input }) => {
            return this.kycService.recordDocument(ctx.tenantId, ctx.userId, input);
          }),

        verify: this.trpc.authedProcedure
          .input(KycVerifyInputSchema)
          .mutation(async ({ ctx, input }) => {
            return this.kycService.verifyDocument(ctx.tenantId, ctx.userId, input);
          }),

        getStatus: this.trpc.authedProcedure
          .input(z.object({ customerId: UuidSchema }))
          .query(async ({ ctx, input }) => {
            return this.kycService.getCustomerKycStatus(ctx.tenantId, input.customerId);
          }),

        isComplete: this.trpc.authedProcedure
          .input(z.object({ customerId: UuidSchema }))
          .query(async ({ ctx, input }) => {
            return this.kycService.isKycComplete(ctx.tenantId, input.customerId);
          }),

        getExpiring: this.trpc.authedProcedure
          .input(z.object({ daysAhead: z.number().int().min(1).default(30) }).optional())
          .query(async ({ ctx, input }) => {
            return this.kycService.getExpiringVerifications(ctx.tenantId, input?.daysAhead);
          }),

        getPendingCount: this.trpc.authedProcedure.query(async ({ ctx }) => {
          return this.kycService.getPendingCount(ctx.tenantId);
        }),
      }),

      // ─── Payments Sub-Router ───────────────────────────────
      payments: this.trpc.router({
        generateUpiQr: this.trpc.authedProcedure
          .input(UpiPaymentInputSchema)
          .query(({ input }) => {
            return this.paymentService.generateUpiQrData(input);
          }),

        generateBankTemplate: this.trpc.authedProcedure
          .input(BankTransferTemplateInputSchema)
          .query(({ input }) => {
            return this.paymentService.generateBankTransferTemplate(input);
          }),
      }),
    });
  }
}
