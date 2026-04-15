// ─── Retail tRPC Router ────────────────────────────────────────
// All tRPC procedures for the retail / POS module.

import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { TrpcService } from '../../trpc/trpc.service';
import { RetailService } from './retail.service';
import { RetailReturnService } from './retail.return.service';
import { RetailRepairService } from './retail.repair.service';
import { RetailCustomOrderService } from './retail.custom-order.service';
import { RetailLayawayService } from './retail.layaway.service';
import { RetailOldGoldService } from './retail.old-gold.service';
import { RetailAppraisalService } from './retail.appraisal.service';
import { RetailDiscountService } from './retail.discount.service';
import { RetailPricingService } from './retail.pricing.service';
import {
  SaleInputSchema,
  SaleListFilterSchema,
  SaleReturnInputSchema,
  RepairOrderInputSchema,
  RepairStatusUpdateSchema,
  RepairListFilterSchema,
  CustomOrderInputSchema,
  LayawayInputSchema,
  LayawayPaymentInputSchema,
  OldGoldInputSchema,
  AppraisalInputSchema,
  DiscountInputSchema,
  GiftCardInputSchema,
  PaginationSchema,
  StaffDashboardInputSchema,
} from '@caratflow/shared-types';

@Injectable()
export class RetailTrpcRouter {
  constructor(
    private readonly trpc: TrpcService,
    private readonly retailService: RetailService,
    private readonly returnService: RetailReturnService,
    private readonly repairService: RetailRepairService,
    private readonly customOrderService: RetailCustomOrderService,
    private readonly layawayService: RetailLayawayService,
    private readonly oldGoldService: RetailOldGoldService,
    private readonly appraisalService: RetailAppraisalService,
    private readonly discountService: RetailDiscountService,
    private readonly pricingService: RetailPricingService,
  ) {}

  get router() {
    return this.trpc.router({
      // ─── Sales ────────────────────────────────────────────────
      createSale: this.trpc.authedProcedure
        .input(SaleInputSchema)
        .mutation(({ ctx, input }) =>
          this.retailService.createSale(ctx.tenantId, ctx.userId, input),
        ),

      getSale: this.trpc.authedProcedure
        .input(z.object({ saleId: z.string().uuid() }))
        .query(({ ctx, input }) =>
          this.retailService.getSale(ctx.tenantId, input.saleId),
        ),

      downloadReceipt: this.trpc.authedProcedure
        .input(z.object({ saleId: z.string().uuid() }))
        .query(async ({ ctx, input }) => {
          const buf = await this.retailService.generateSaleReceipt(
            ctx.tenantId,
            input.saleId,
          );
          return {
            filename: `receipt-${input.saleId}.pdf`,
            mimeType: 'application/pdf',
            base64: buf.toString('base64'),
            size: buf.length,
          };
        }),

      listSales: this.trpc.authedProcedure
        .input(z.object({ filters: SaleListFilterSchema.optional(), pagination: PaginationSchema.optional() }))
        .query(({ ctx, input }) =>
          this.retailService.listSales(
            ctx.tenantId,
            input.filters ?? {},
            input.pagination ?? { page: 1, limit: 20, sortOrder: 'desc' },
          ),
        ),

      voidSale: this.trpc.authedProcedure
        .input(z.object({ saleId: z.string().uuid(), reason: z.string().min(1) }))
        .mutation(({ ctx, input }) =>
          this.retailService.voidSale(ctx.tenantId, ctx.userId, input.saleId, input.reason),
        ),

      // ─── POS Session / Dashboard ─────────────────────────────
      getPosSession: this.trpc.authedProcedure
        .input(z.object({ locationId: z.string().uuid() }))
        .query(({ ctx, input }) =>
          this.retailService.getPosSession(ctx.tenantId, input.locationId),
        ),

      getDashboard: this.trpc.authedProcedure
        .input(z.object({ locationId: z.string().uuid().optional() }).optional())
        .query(({ ctx, input }) =>
          this.retailService.getDashboard(ctx.tenantId, input?.locationId),
        ),

      // Per-user dashboard for the mobile Sales app.
      staffDashboard: this.trpc.authedProcedure
        .input(StaffDashboardInputSchema)
        .query(({ ctx, input }) =>
          this.retailService.getStaffDashboard(ctx.tenantId, ctx.userId, input?.date),
        ),

      // ─── Pricing ──────────────────────────────────────────────
      calculateLineItemPrice: this.trpc.authedProcedure
        .input(z.object({
          metalRatePaisePerGram: z.number().int().nonnegative(),
          metalWeightMg: z.number().int().nonnegative(),
          makingChargesPaise: z.number().int().nonnegative(),
          wastageChargesPaise: z.number().int().nonnegative(),
          quantity: z.number().int().positive(),
        }))
        .query(({ input }) =>
          this.pricingService.calculateLineItemPrice(
            input.metalRatePaisePerGram,
            input.metalWeightMg,
            input.makingChargesPaise,
            input.wastageChargesPaise,
            input.quantity,
          ),
        ),

      validateDiscount: this.trpc.authedProcedure
        .input(z.object({
          discountId: z.string().uuid(),
          subtotalPaise: z.number().int().nonnegative(),
          productIds: z.array(z.string().uuid()),
        }))
        .query(({ ctx, input }) =>
          this.pricingService.applyDiscount(
            ctx.tenantId,
            input.discountId,
            input.subtotalPaise,
            input.productIds,
          ),
        ),

      // ─── Returns ──────────────────────────────────────────────
      createReturn: this.trpc.authedProcedure
        .input(SaleReturnInputSchema)
        .mutation(({ ctx, input }) =>
          this.returnService.createReturn(ctx.tenantId, ctx.userId, input),
        ),

      getReturn: this.trpc.authedProcedure
        .input(z.object({ returnId: z.string().uuid() }))
        .query(({ ctx, input }) =>
          this.returnService.getReturn(ctx.tenantId, input.returnId),
        ),

      listReturns: this.trpc.authedProcedure
        .input(z.object({
          filters: z.object({ status: z.string().optional(), originalSaleId: z.string().uuid().optional() }).optional(),
          pagination: PaginationSchema.optional(),
        }))
        .query(({ ctx, input }) =>
          this.returnService.listReturns(
            ctx.tenantId,
            input.filters ?? {},
            input.pagination ?? { page: 1, limit: 20, sortOrder: 'desc' },
          ),
        ),

      approveReturn: this.trpc.authedProcedure
        .input(z.object({ returnId: z.string().uuid() }))
        .mutation(({ ctx, input }) =>
          this.returnService.approveReturn(ctx.tenantId, ctx.userId, input.returnId),
        ),

      completeReturn: this.trpc.authedProcedure
        .input(z.object({ returnId: z.string().uuid() }))
        .mutation(({ ctx, input }) =>
          this.returnService.completeReturn(ctx.tenantId, ctx.userId, input.returnId),
        ),

      rejectReturn: this.trpc.authedProcedure
        .input(z.object({ returnId: z.string().uuid(), reason: z.string().min(1) }))
        .mutation(({ ctx, input }) =>
          this.returnService.rejectReturn(ctx.tenantId, ctx.userId, input.returnId, input.reason),
        ),

      // ─── Repairs ──────────────────────────────────────────────
      createRepairOrder: this.trpc.authedProcedure
        .input(RepairOrderInputSchema)
        .mutation(({ ctx, input }) =>
          this.repairService.createRepairOrder(ctx.tenantId, ctx.userId, input),
        ),

      getRepairOrder: this.trpc.authedProcedure
        .input(z.object({ repairId: z.string().uuid() }))
        .query(({ ctx, input }) =>
          this.repairService.getRepairOrder(ctx.tenantId, input.repairId),
        ),

      listRepairOrders: this.trpc.authedProcedure
        .input(z.object({
          filters: RepairListFilterSchema.optional(),
          pagination: PaginationSchema.optional(),
        }))
        .query(({ ctx, input }) =>
          this.repairService.listRepairOrders(
            ctx.tenantId,
            input.filters ?? {},
            input.pagination ?? { page: 1, limit: 20, sortOrder: 'desc' },
          ),
        ),

      updateRepairStatus: this.trpc.authedProcedure
        .input(z.object({ repairId: z.string().uuid(), update: RepairStatusUpdateSchema }))
        .mutation(({ ctx, input }) =>
          this.repairService.updateRepairStatus(ctx.tenantId, ctx.userId, input.repairId, input.update),
        ),

      getRepairQueue: this.trpc.authedProcedure
        .input(z.object({ locationId: z.string().uuid() }))
        .query(({ ctx, input }) =>
          this.repairService.getRepairQueue(ctx.tenantId, input.locationId),
        ),

      // ─── Custom Orders ────────────────────────────────────────
      createCustomOrder: this.trpc.authedProcedure
        .input(CustomOrderInputSchema)
        .mutation(({ ctx, input }) =>
          this.customOrderService.createCustomOrder(ctx.tenantId, ctx.userId, input),
        ),

      getCustomOrder: this.trpc.authedProcedure
        .input(z.object({ orderId: z.string().uuid() }))
        .query(({ ctx, input }) =>
          this.customOrderService.getCustomOrder(ctx.tenantId, input.orderId),
        ),

      listCustomOrders: this.trpc.authedProcedure
        .input(z.object({
          filters: z.object({ status: z.string().optional(), customerId: z.string().uuid().optional() }).optional(),
          pagination: PaginationSchema.optional(),
        }))
        .query(({ ctx, input }) =>
          this.customOrderService.listCustomOrders(
            ctx.tenantId,
            input.filters ?? {},
            input.pagination ?? { page: 1, limit: 20, sortOrder: 'desc' },
          ),
        ),

      updateCustomOrderStatus: this.trpc.authedProcedure
        .input(z.object({ orderId: z.string().uuid(), status: z.string() }))
        .mutation(({ ctx, input }) =>
          this.customOrderService.updateStatus(ctx.tenantId, ctx.userId, input.orderId, input.status as never),
        ),

      recordCustomOrderDeposit: this.trpc.authedProcedure
        .input(z.object({ orderId: z.string().uuid(), depositPaise: z.number().int().positive() }))
        .mutation(({ ctx, input }) =>
          this.customOrderService.recordDeposit(ctx.tenantId, ctx.userId, input.orderId, input.depositPaise),
        ),

      // ─── Layaway ──────────────────────────────────────────────
      createLayaway: this.trpc.authedProcedure
        .input(LayawayInputSchema)
        .mutation(({ ctx, input }) =>
          this.layawayService.createLayaway(ctx.tenantId, ctx.userId, input),
        ),

      getLayaway: this.trpc.authedProcedure
        .input(z.object({ layawayId: z.string().uuid() }))
        .query(({ ctx, input }) =>
          this.layawayService.getLayaway(ctx.tenantId, input.layawayId),
        ),

      listLayaways: this.trpc.authedProcedure
        .input(z.object({
          filters: z.object({ status: z.string().optional(), customerId: z.string().uuid().optional() }).optional(),
          pagination: PaginationSchema.optional(),
        }))
        .query(({ ctx, input }) =>
          this.layawayService.listLayaways(
            ctx.tenantId,
            input.filters ?? {},
            input.pagination ?? { page: 1, limit: 20, sortOrder: 'desc' },
          ),
        ),

      recordLayawayPayment: this.trpc.authedProcedure
        .input(LayawayPaymentInputSchema)
        .mutation(({ ctx, input }) =>
          this.layawayService.recordPayment(ctx.tenantId, ctx.userId, input),
        ),

      cancelLayaway: this.trpc.authedProcedure
        .input(z.object({ layawayId: z.string().uuid() }))
        .mutation(({ ctx, input }) =>
          this.layawayService.cancelLayaway(ctx.tenantId, ctx.userId, input.layawayId),
        ),

      // ─── Old Gold ─────────────────────────────────────────────
      createOldGoldPurchase: this.trpc.authedProcedure
        .input(OldGoldInputSchema)
        .mutation(({ ctx, input }) =>
          this.oldGoldService.createPurchase(ctx.tenantId, ctx.userId, input),
        ),

      getOldGoldPurchase: this.trpc.authedProcedure
        .input(z.object({ purchaseId: z.string().uuid() }))
        .query(({ ctx, input }) =>
          this.oldGoldService.getPurchase(ctx.tenantId, input.purchaseId),
        ),

      listOldGoldPurchases: this.trpc.authedProcedure
        .input(z.object({
          filters: z.object({ status: z.string().optional(), customerId: z.string().uuid().optional() }).optional(),
          pagination: PaginationSchema.optional(),
        }))
        .query(({ ctx, input }) =>
          this.oldGoldService.listPurchases(
            ctx.tenantId,
            input.filters ?? {},
            input.pagination ?? { page: 1, limit: 20, sortOrder: 'desc' },
          ),
        ),

      updateOldGoldStatus: this.trpc.authedProcedure
        .input(z.object({ purchaseId: z.string().uuid(), status: z.string() }))
        .mutation(({ ctx, input }) =>
          this.oldGoldService.updateStatus(ctx.tenantId, ctx.userId, input.purchaseId, input.status as never),
        ),

      updateOldGoldTestResults: this.trpc.authedProcedure
        .input(z.object({
          purchaseId: z.string().uuid(),
          purityFineness: z.number().int().min(1).max(999),
          netWeightMg: z.number().int().positive(),
        }))
        .mutation(({ ctx, input }) =>
          this.oldGoldService.updateTestResults(
            ctx.tenantId, ctx.userId, input.purchaseId, input.purityFineness, input.netWeightMg,
          ),
        ),

      linkOldGoldToSale: this.trpc.authedProcedure
        .input(z.object({ purchaseId: z.string().uuid(), saleId: z.string().uuid() }))
        .mutation(({ ctx, input }) =>
          this.oldGoldService.linkToSale(ctx.tenantId, ctx.userId, input.purchaseId, input.saleId),
        ),

      // ─── Appraisals ──────────────────────────────────────────
      createAppraisal: this.trpc.authedProcedure
        .input(AppraisalInputSchema)
        .mutation(({ ctx, input }) =>
          this.appraisalService.createAppraisal(ctx.tenantId, ctx.userId, input),
        ),

      getAppraisal: this.trpc.authedProcedure
        .input(z.object({ appraisalId: z.string().uuid() }))
        .query(({ ctx, input }) =>
          this.appraisalService.getAppraisal(ctx.tenantId, input.appraisalId),
        ),

      listAppraisals: this.trpc.authedProcedure
        .input(z.object({
          filters: z.object({ customerId: z.string().uuid().optional() }).optional(),
          pagination: PaginationSchema.optional(),
        }))
        .query(({ ctx, input }) =>
          this.appraisalService.listAppraisals(
            ctx.tenantId,
            input.filters ?? {},
            input.pagination ?? { page: 1, limit: 20, sortOrder: 'desc' },
          ),
        ),

      // ─── Discounts ────────────────────────────────────────────
      createDiscount: this.trpc.authedProcedure
        .input(DiscountInputSchema)
        .mutation(({ ctx, input }) =>
          this.discountService.createDiscount(ctx.tenantId, ctx.userId, input),
        ),

      getDiscount: this.trpc.authedProcedure
        .input(z.object({ discountId: z.string().uuid() }))
        .query(({ ctx, input }) =>
          this.discountService.getDiscount(ctx.tenantId, input.discountId),
        ),

      listDiscounts: this.trpc.authedProcedure
        .input(z.object({
          filters: z.object({ isActive: z.boolean().optional() }).optional(),
          pagination: PaginationSchema.optional(),
        }))
        .query(({ ctx, input }) =>
          this.discountService.listDiscounts(
            ctx.tenantId,
            input.filters ?? {},
            input.pagination ?? { page: 1, limit: 20, sortOrder: 'desc' },
          ),
        ),

      updateDiscount: this.trpc.authedProcedure
        .input(z.object({ discountId: z.string().uuid(), data: DiscountInputSchema.partial() }))
        .mutation(({ ctx, input }) =>
          this.discountService.updateDiscount(ctx.tenantId, ctx.userId, input.discountId, input.data),
        ),

      getActiveDiscounts: this.trpc.authedProcedure
        .query(({ ctx }) =>
          this.discountService.getActiveDiscounts(ctx.tenantId),
        ),
    });
  }
}
