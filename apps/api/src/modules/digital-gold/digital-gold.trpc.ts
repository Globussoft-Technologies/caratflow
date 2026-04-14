// ─── Digital Gold tRPC Router ──────────────────────────────────
// Internal tRPC procedures mirroring the REST controller. The
// authenticated user id (ctx.userId) is treated as the customer id
// for B2C operations.

import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { TrpcService } from '../../trpc/trpc.service';
import { DigitalGoldService } from './digital-gold.service';
import { DigitalGoldSipService } from './digital-gold.sip.service';
import { DigitalGoldRedemptionService } from './digital-gold.redemption.service';
import { DigitalGoldAlertService } from './digital-gold.alert.service';
import { IndiaRatesService } from '../india/india.rates.service';
import {
  BuyGoldInputSchema,
  SellGoldInputSchema,
  CreateSipInputSchema,
  RedeemGoldInputSchema,
  GoldPriceAlertInputSchema,
  GoldTransactionListInputSchema,
} from '@caratflow/shared-types';

@Injectable()
export class DigitalGoldTrpcRouter {
  constructor(
    private readonly trpc: TrpcService,
    private readonly digitalGoldService: DigitalGoldService,
    private readonly sipService: DigitalGoldSipService,
    private readonly redemptionService: DigitalGoldRedemptionService,
    private readonly alertService: DigitalGoldAlertService,
    private readonly ratesService: IndiaRatesService,
  ) {}

  get router() {
    const authed = this.trpc.authedProcedure;

    return this.trpc.router({
      // ─── Buy / Sell ──────────────────────────────────────
      buy: authed
        .input(BuyGoldInputSchema)
        .mutation(({ ctx, input }) =>
          this.digitalGoldService.buyGold(ctx.tenantId, ctx.userId, input),
        ),

      sell: authed
        .input(SellGoldInputSchema)
        .mutation(({ ctx, input }) =>
          this.digitalGoldService.sellGold(ctx.tenantId, ctx.userId, input),
        ),

      // ─── Vault / Portfolio ───────────────────────────────
      getVault: authed.query(({ ctx }) =>
        this.digitalGoldService.getVault(ctx.tenantId, ctx.userId),
      ),

      getPortfolio: authed.query(({ ctx }) =>
        this.digitalGoldService.getPortfolio(ctx.tenantId, ctx.userId),
      ),

      // ─── Transactions ────────────────────────────────────
      listTransactions: authed
        .input(GoldTransactionListInputSchema)
        .query(({ ctx, input }) =>
          this.digitalGoldService.getTransactionHistory(
            ctx.tenantId,
            ctx.userId,
            {
              page: input.page ?? 1,
              limit: input.limit ?? 20,
              sortOrder: input.sortOrder ?? 'desc',
              transactionType: input.transactionType,
              status: input.status,
              dateRange: input.dateRange,
            },
          ),
        ),

      // ─── SIP ─────────────────────────────────────────────
      sip: this.trpc.router({
        create: authed
          .input(CreateSipInputSchema)
          .mutation(({ ctx, input }) =>
            this.sipService.createSip(ctx.tenantId, ctx.userId, input),
          ),

        list: authed.query(({ ctx }) =>
          this.sipService.getCustomerSips(ctx.tenantId, ctx.userId),
        ),

        get: authed
          .input(z.object({ sipId: z.string().uuid() }))
          .query(({ ctx, input }) =>
            this.sipService.getSip(ctx.tenantId, input.sipId),
          ),

        pause: authed
          .input(z.object({ sipId: z.string().uuid() }))
          .mutation(({ ctx, input }) =>
            this.sipService.pauseSip(ctx.tenantId, input.sipId),
          ),

        resume: authed
          .input(z.object({ sipId: z.string().uuid() }))
          .mutation(({ ctx, input }) =>
            this.sipService.resumeSip(ctx.tenantId, input.sipId),
          ),

        cancel: authed
          .input(z.object({ sipId: z.string().uuid() }))
          .mutation(({ ctx, input }) =>
            this.sipService.cancelSip(ctx.tenantId, input.sipId),
          ),

        history: authed
          .input(z.object({ sipId: z.string().uuid() }))
          .query(({ ctx, input }) =>
            this.sipService.getSipHistory(ctx.tenantId, input.sipId),
          ),
      }),

      // ─── Redemption ──────────────────────────────────────
      redeem: authed
        .input(RedeemGoldInputSchema)
        .mutation(async ({ ctx, input }) => {
          switch (input.redemptionType) {
            case 'PHYSICAL_GOLD':
              return this.redemptionService.redeemForPhysical(
                ctx.tenantId,
                ctx.userId,
                input.weightMg!,
                input.addressId,
              );
            case 'JEWELRY':
              return this.redemptionService.redeemForJewelry(
                ctx.tenantId,
                ctx.userId,
                input.productId!,
                input.addressId,
              );
            case 'SELL_BACK':
              return this.redemptionService.sellBack(
                ctx.tenantId,
                ctx.userId,
                input.weightMg!,
                input.addressId,
              );
            default:
              throw new Error('Invalid redemption type');
          }
        }),

      listRedemptions: authed.query(({ ctx }) =>
        this.redemptionService.getRedemptions(ctx.tenantId, ctx.userId),
      ),

      // ─── Price Alerts ────────────────────────────────────
      alerts: this.trpc.router({
        create: authed
          .input(GoldPriceAlertInputSchema)
          .mutation(({ ctx, input }) =>
            this.alertService.createAlert(ctx.tenantId, ctx.userId, input),
          ),

        list: authed.query(({ ctx }) =>
          this.alertService.getCustomerAlerts(ctx.tenantId, ctx.userId),
        ),

        cancel: authed
          .input(z.object({ alertId: z.string().uuid() }))
          .mutation(({ ctx, input }) =>
            this.alertService.cancelAlert(ctx.tenantId, ctx.userId, input.alertId),
          ),
      }),

      // ─── Rates ───────────────────────────────────────────
      rates: this.trpc.router({
        current: authed.query(() => this.digitalGoldService.getCurrentRates()),

        history: authed
          .input(
            z.object({
              from: z.coerce.date().optional(),
              to: z.coerce.date().optional(),
            }),
          )
          .query(({ input }) =>
            this.ratesService.getHistoricalRates({
              metalType: 'GOLD',
              purity: 999,
              dateRange:
                input.from && input.to
                  ? { from: input.from, to: input.to }
                  : undefined,
            }),
          ),
      }),

      // ─── Dashboard ───────────────────────────────────────
      dashboard: authed.query(({ ctx }) =>
        this.digitalGoldService.getDashboard(ctx.tenantId),
      ),
    });
  }
}
