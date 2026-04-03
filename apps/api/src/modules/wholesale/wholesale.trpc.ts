// ─── Wholesale tRPC Router ─────────────────────────────────────
// All tRPC procedures for the wholesale module.

import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { TrpcService } from '../../trpc/trpc.service';
import { WholesaleService } from './wholesale.service';
import { WholesaleConsignmentService } from './wholesale.consignment.service';
import { WholesaleAgentService } from './wholesale.agent.service';
import { WholesaleCreditService } from './wholesale.credit.service';
import { WholesaleRateContractService } from './wholesale.rate-contract.service';
import {
  PurchaseOrderInputSchema,
  PurchaseOrderListFilterSchema,
  GoodsReceiptInputSchema,
  ConsignmentOutInputSchema,
  ConsignmentInInputSchema,
  RateContractInputSchema,
  AgentBrokerInputSchema,
  CommissionInputSchema,
  CreditLimitInputSchema,
  WholesaleCreditEntityType,
  PaginationSchema,
} from '@caratflow/shared-types';

@Injectable()
export class WholesaleTrpcRouter {
  constructor(
    private readonly trpc: TrpcService,
    private readonly wholesaleService: WholesaleService,
    private readonly consignmentService: WholesaleConsignmentService,
    private readonly agentService: WholesaleAgentService,
    private readonly creditService: WholesaleCreditService,
    private readonly rateContractService: WholesaleRateContractService,
  ) {}

  get router() {
    return this.trpc.router({
      // ─── Dashboard ────────────────────────────────────────────
      getDashboard: this.trpc.authedProcedure
        .query(({ ctx }) =>
          this.wholesaleService.getDashboard(ctx.tenantId),
        ),

      // ─── Purchase Orders ──────────────────────────────────────
      createPurchaseOrder: this.trpc.authedProcedure
        .input(PurchaseOrderInputSchema)
        .mutation(({ ctx, input }) =>
          this.wholesaleService.createPurchaseOrder(ctx.tenantId, ctx.userId, input),
        ),

      getPurchaseOrder: this.trpc.authedProcedure
        .input(z.object({ poId: z.string().uuid() }))
        .query(({ ctx, input }) =>
          this.wholesaleService.getPurchaseOrder(ctx.tenantId, input.poId),
        ),

      listPurchaseOrders: this.trpc.authedProcedure
        .input(z.object({
          filters: PurchaseOrderListFilterSchema.optional(),
          pagination: PaginationSchema.optional(),
        }))
        .query(({ ctx, input }) =>
          this.wholesaleService.listPurchaseOrders(
            ctx.tenantId,
            input.filters ?? {},
            input.pagination ?? { page: 1, limit: 20, sortOrder: 'desc' },
          ),
        ),

      sendPurchaseOrder: this.trpc.authedProcedure
        .input(z.object({ poId: z.string().uuid() }))
        .mutation(({ ctx, input }) =>
          this.wholesaleService.sendPurchaseOrder(ctx.tenantId, ctx.userId, input.poId),
        ),

      cancelPurchaseOrder: this.trpc.authedProcedure
        .input(z.object({ poId: z.string().uuid(), reason: z.string().min(1) }))
        .mutation(({ ctx, input }) =>
          this.wholesaleService.cancelPurchaseOrder(ctx.tenantId, ctx.userId, input.poId, input.reason),
        ),

      // ─── Goods Receipts ───────────────────────────────────────
      createGoodsReceipt: this.trpc.authedProcedure
        .input(GoodsReceiptInputSchema)
        .mutation(({ ctx, input }) =>
          this.wholesaleService.createGoodsReceipt(ctx.tenantId, ctx.userId, input),
        ),

      getGoodsReceipt: this.trpc.authedProcedure
        .input(z.object({ receiptId: z.string().uuid() }))
        .query(({ ctx, input }) =>
          this.wholesaleService.getGoodsReceipt(ctx.tenantId, input.receiptId),
        ),

      listGoodsReceipts: this.trpc.authedProcedure
        .input(z.object({
          poId: z.string().uuid().optional(),
          pagination: PaginationSchema.optional(),
        }))
        .query(({ ctx, input }) =>
          this.wholesaleService.listGoodsReceipts(
            ctx.tenantId,
            input.poId,
            input.pagination ?? { page: 1, limit: 20, sortOrder: 'desc' },
          ),
        ),

      inspectGoodsReceipt: this.trpc.authedProcedure
        .input(z.object({ receiptId: z.string().uuid() }))
        .mutation(({ ctx, input }) =>
          this.wholesaleService.inspectGoodsReceipt(ctx.tenantId, ctx.userId, input.receiptId),
        ),

      acceptGoodsReceipt: this.trpc.authedProcedure
        .input(z.object({ receiptId: z.string().uuid() }))
        .mutation(({ ctx, input }) =>
          this.wholesaleService.acceptGoodsReceipt(ctx.tenantId, ctx.userId, input.receiptId),
        ),

      rejectGoodsReceipt: this.trpc.authedProcedure
        .input(z.object({ receiptId: z.string().uuid(), reason: z.string().min(1) }))
        .mutation(({ ctx, input }) =>
          this.wholesaleService.rejectGoodsReceipt(ctx.tenantId, ctx.userId, input.receiptId, input.reason),
        ),

      // ─── Consignment Out ──────────────────────────────────────
      createConsignmentOut: this.trpc.authedProcedure
        .input(ConsignmentOutInputSchema)
        .mutation(({ ctx, input }) =>
          this.consignmentService.createConsignmentOut(ctx.tenantId, ctx.userId, input),
        ),

      getConsignmentOut: this.trpc.authedProcedure
        .input(z.object({ id: z.string().uuid() }))
        .query(({ ctx, input }) =>
          this.consignmentService.getConsignmentOut(ctx.tenantId, input.id),
        ),

      listConsignmentsOut: this.trpc.authedProcedure
        .input(z.object({
          filters: z.object({
            status: z.string().optional(),
            customerId: z.string().uuid().optional(),
          }).optional(),
          pagination: PaginationSchema.optional(),
        }))
        .query(({ ctx, input }) =>
          this.consignmentService.listConsignmentsOut(
            ctx.tenantId,
            input.filters ?? {},
            input.pagination ?? { page: 1, limit: 20, sortOrder: 'desc' },
          ),
        ),

      issueConsignmentOut: this.trpc.authedProcedure
        .input(z.object({ id: z.string().uuid() }))
        .mutation(({ ctx, input }) =>
          this.consignmentService.issueConsignmentOut(ctx.tenantId, ctx.userId, input.id),
        ),

      returnConsignmentOutItems: this.trpc.authedProcedure
        .input(z.object({
          consignmentId: z.string().uuid(),
          items: z.array(z.object({
            itemId: z.string().uuid(),
            returnedQuantity: z.number().int().positive(),
          })).min(1),
        }))
        .mutation(({ ctx, input }) =>
          this.consignmentService.returnConsignmentOutItems(
            ctx.tenantId, ctx.userId, input.consignmentId, input.items,
          ),
        ),

      convertConsignmentOutToSale: this.trpc.authedProcedure
        .input(z.object({
          consignmentId: z.string().uuid(),
          items: z.array(z.object({
            itemId: z.string().uuid(),
            soldQuantity: z.number().int().positive(),
          })).min(1),
        }))
        .mutation(({ ctx, input }) =>
          this.consignmentService.convertConsignmentOutToSale(
            ctx.tenantId, ctx.userId, input.consignmentId, input.items,
          ),
        ),

      expireConsignmentOut: this.trpc.authedProcedure
        .input(z.object({ id: z.string().uuid() }))
        .mutation(({ ctx, input }) =>
          this.consignmentService.expireConsignmentOut(ctx.tenantId, ctx.userId, input.id),
        ),

      // ─── Consignment In ───────────────────────────────────────
      createConsignmentIn: this.trpc.authedProcedure
        .input(ConsignmentInInputSchema)
        .mutation(({ ctx, input }) =>
          this.consignmentService.createConsignmentIn(ctx.tenantId, ctx.userId, input),
        ),

      getConsignmentIn: this.trpc.authedProcedure
        .input(z.object({ id: z.string().uuid() }))
        .query(({ ctx, input }) =>
          this.consignmentService.getConsignmentIn(ctx.tenantId, input.id),
        ),

      listConsignmentsIn: this.trpc.authedProcedure
        .input(z.object({
          filters: z.object({
            status: z.string().optional(),
            supplierId: z.string().uuid().optional(),
          }).optional(),
          pagination: PaginationSchema.optional(),
        }))
        .query(({ ctx, input }) =>
          this.consignmentService.listConsignmentsIn(
            ctx.tenantId,
            input.filters ?? {},
            input.pagination ?? { page: 1, limit: 20, sortOrder: 'desc' },
          ),
        ),

      returnConsignmentInItems: this.trpc.authedProcedure
        .input(z.object({
          consignmentId: z.string().uuid(),
          items: z.array(z.object({
            itemId: z.string().uuid(),
            returnedQuantity: z.number().int().positive(),
          })).min(1),
        }))
        .mutation(({ ctx, input }) =>
          this.consignmentService.returnConsignmentInItems(
            ctx.tenantId, ctx.userId, input.consignmentId, input.items,
          ),
        ),

      purchaseConsignmentInItems: this.trpc.authedProcedure
        .input(z.object({
          consignmentId: z.string().uuid(),
          items: z.array(z.object({
            itemId: z.string().uuid(),
            purchasedQuantity: z.number().int().positive(),
          })).min(1),
        }))
        .mutation(({ ctx, input }) =>
          this.consignmentService.purchaseConsignmentInItems(
            ctx.tenantId, ctx.userId, input.consignmentId, input.items,
          ),
        ),

      expireConsignmentIn: this.trpc.authedProcedure
        .input(z.object({ id: z.string().uuid() }))
        .mutation(({ ctx, input }) =>
          this.consignmentService.expireConsignmentIn(ctx.tenantId, ctx.userId, input.id),
        ),

      getExpiredConsignments: this.trpc.authedProcedure
        .query(({ ctx }) =>
          this.consignmentService.getExpiredConsignments(ctx.tenantId),
        ),

      // ─── Rate Contracts ───────────────────────────────────────
      createRateContract: this.trpc.authedProcedure
        .input(RateContractInputSchema)
        .mutation(({ ctx, input }) =>
          this.rateContractService.createRateContract(ctx.tenantId, ctx.userId, input),
        ),

      getRateContract: this.trpc.authedProcedure
        .input(z.object({ id: z.string().uuid() }))
        .query(({ ctx, input }) =>
          this.rateContractService.getRateContract(ctx.tenantId, input.id),
        ),

      listRateContracts: this.trpc.authedProcedure
        .input(z.object({
          filters: z.object({
            supplierId: z.string().uuid().optional(),
            isActive: z.boolean().optional(),
          }).optional(),
          pagination: PaginationSchema.optional(),
        }))
        .query(({ ctx, input }) =>
          this.rateContractService.listRateContracts(
            ctx.tenantId,
            input.filters ?? {},
            input.pagination ?? { page: 1, limit: 20, sortOrder: 'desc' },
          ),
        ),

      updateRateContract: this.trpc.authedProcedure
        .input(z.object({ id: z.string().uuid(), data: RateContractInputSchema.partial() }))
        .mutation(({ ctx, input }) =>
          this.rateContractService.updateRateContract(ctx.tenantId, ctx.userId, input.id, input.data),
        ),

      findApplicableRate: this.trpc.authedProcedure
        .input(z.object({
          supplierId: z.string().uuid(),
          categoryId: z.string().uuid().optional(),
          metalType: z.string().optional(),
        }))
        .query(({ ctx, input }) =>
          this.rateContractService.findApplicableRate(
            ctx.tenantId, input.supplierId, input.categoryId, input.metalType,
          ),
        ),

      // ─── Agents / Brokers ─────────────────────────────────────
      createAgent: this.trpc.authedProcedure
        .input(AgentBrokerInputSchema)
        .mutation(({ ctx, input }) =>
          this.agentService.createAgent(ctx.tenantId, ctx.userId, input),
        ),

      getAgent: this.trpc.authedProcedure
        .input(z.object({ agentId: z.string().uuid() }))
        .query(({ ctx, input }) =>
          this.agentService.getAgent(ctx.tenantId, input.agentId),
        ),

      listAgents: this.trpc.authedProcedure
        .input(z.object({
          filters: z.object({ isActive: z.boolean().optional() }).optional(),
          pagination: PaginationSchema.optional(),
        }))
        .query(({ ctx, input }) =>
          this.agentService.listAgents(
            ctx.tenantId,
            input.filters ?? {},
            input.pagination ?? { page: 1, limit: 20, sortOrder: 'desc' },
          ),
        ),

      updateAgent: this.trpc.authedProcedure
        .input(z.object({ agentId: z.string().uuid(), data: AgentBrokerInputSchema.partial() }))
        .mutation(({ ctx, input }) =>
          this.agentService.updateAgent(ctx.tenantId, ctx.userId, input.agentId, input.data),
        ),

      calculateCommission: this.trpc.authedProcedure
        .input(CommissionInputSchema)
        .mutation(({ ctx, input }) =>
          this.agentService.calculateCommission(ctx.tenantId, ctx.userId, input),
        ),

      approveCommission: this.trpc.authedProcedure
        .input(z.object({ commissionId: z.string().uuid() }))
        .mutation(({ ctx, input }) =>
          this.agentService.approveCommission(ctx.tenantId, ctx.userId, input.commissionId),
        ),

      markCommissionPaid: this.trpc.authedProcedure
        .input(z.object({ commissionId: z.string().uuid(), paymentReference: z.string().optional() }))
        .mutation(({ ctx, input }) =>
          this.agentService.markCommissionPaid(ctx.tenantId, ctx.userId, input.commissionId, input.paymentReference),
        ),

      listCommissions: this.trpc.authedProcedure
        .input(z.object({
          filters: z.object({
            agentBrokerId: z.string().uuid().optional(),
            status: z.string().optional(),
          }).optional(),
          pagination: PaginationSchema.optional(),
        }))
        .query(({ ctx, input }) =>
          this.agentService.listCommissions(
            ctx.tenantId,
            input.filters ?? {},
            input.pagination ?? { page: 1, limit: 20, sortOrder: 'desc' },
          ),
        ),

      // ─── Credit Limits ────────────────────────────────────────
      setCreditLimit: this.trpc.authedProcedure
        .input(CreditLimitInputSchema)
        .mutation(({ ctx, input }) =>
          this.creditService.setCreditLimit(ctx.tenantId, ctx.userId, input),
        ),

      getCreditLimit: this.trpc.authedProcedure
        .input(z.object({
          entityType: z.nativeEnum(WholesaleCreditEntityType),
          entityId: z.string().uuid(),
        }))
        .query(({ ctx, input }) =>
          this.creditService.getCreditLimit(ctx.tenantId, input.entityType, input.entityId),
        ),

      listCreditLimits: this.trpc.authedProcedure
        .input(z.object({
          filters: z.object({ entityType: z.nativeEnum(WholesaleCreditEntityType).optional() }).optional(),
          pagination: PaginationSchema.optional(),
        }))
        .query(({ ctx, input }) =>
          this.creditService.listCreditLimits(
            ctx.tenantId,
            input.filters ?? {},
            input.pagination ?? { page: 1, limit: 20, sortOrder: 'desc' },
          ),
        ),

      checkCredit: this.trpc.authedProcedure
        .input(z.object({
          entityType: z.nativeEnum(WholesaleCreditEntityType),
          entityId: z.string().uuid(),
          requiredAmountPaise: z.number().int().nonnegative(),
        }))
        .query(({ ctx, input }) =>
          this.creditService.checkCredit(
            ctx.tenantId, input.entityType, input.entityId, input.requiredAmountPaise,
          ),
        ),

      // ─── Outstanding Balances ─────────────────────────────────
      listOutstandingBalances: this.trpc.authedProcedure
        .input(z.object({
          filters: z.object({
            entityType: z.nativeEnum(WholesaleCreditEntityType).optional(),
            entityId: z.string().uuid().optional(),
            status: z.string().optional(),
          }).optional(),
          pagination: PaginationSchema.optional(),
        }))
        .query(({ ctx, input }) =>
          this.creditService.listOutstandingBalances(
            ctx.tenantId,
            input.filters ?? {},
            input.pagination ?? { page: 1, limit: 20, sortOrder: 'desc' },
          ),
        ),

      recordOutstandingPayment: this.trpc.authedProcedure
        .input(z.object({
          outstandingId: z.string().uuid(),
          paymentPaise: z.number().int().positive(),
        }))
        .mutation(({ ctx, input }) =>
          this.creditService.recordPaymentOnOutstanding(
            ctx.tenantId, ctx.userId, input.outstandingId, input.paymentPaise,
          ),
        ),

      updateAgingStatuses: this.trpc.authedProcedure
        .mutation(({ ctx }) =>
          this.creditService.updateAgingStatuses(ctx.tenantId),
        ),

      getAgingSummary: this.trpc.authedProcedure
        .input(z.object({
          entityType: z.nativeEnum(WholesaleCreditEntityType).optional(),
        }).optional())
        .query(({ ctx, input }) =>
          this.creditService.getAgingSummary(ctx.tenantId, input?.entityType),
        ),
    });
  }
}
