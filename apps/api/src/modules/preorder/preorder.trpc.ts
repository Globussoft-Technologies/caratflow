// ─── Pre-Order tRPC Router ────────────────────────────────────
// Admin procedures for pre-order management, configuration,
// modification review, and reorder templates.

import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { TrpcService } from '../../trpc/trpc.service';
import { PreOrderService } from './preorder.service';
import { PreOrderConfigService } from './preorder.config.service';
import { OrderModificationService } from './order-modification.service';
import { ReorderService } from './reorder.service';
import {
  CreatePreOrderInputSchema,
  PreOrderListFilterSchema,
  PreOrderConfigInputSchema,
  BulkPreOrderConfigInputSchema,
  ModificationListFilterSchema,
  ReviewModificationInputSchema,
  PaginationSchema,
} from '@caratflow/shared-types';

@Injectable()
export class PreOrderTrpcRouter {
  constructor(
    private readonly trpc: TrpcService,
    private readonly preOrderService: PreOrderService,
    private readonly configService: PreOrderConfigService,
    private readonly modificationService: OrderModificationService,
    private readonly reorderService: ReorderService,
  ) {}

  get router() {
    return this.trpc.router({
      // ─── Pre-Order Dashboard ──────────────────────────────────
      getStats: this.trpc.authedProcedure
        .query(({ ctx }) =>
          this.preOrderService.getStats(ctx.tenantId),
        ),

      // ─── Pre-Orders ──────────────────────────────────────────
      createPreOrder: this.trpc.authedProcedure
        .input(CreatePreOrderInputSchema)
        .mutation(({ ctx, input }) =>
          this.preOrderService.createPreOrder(ctx.tenantId, ctx.userId, input),
        ),

      getPreOrder: this.trpc.authedProcedure
        .input(z.object({ preOrderId: z.string().uuid() }))
        .query(({ ctx, input }) =>
          this.preOrderService.getPreOrder(ctx.tenantId, input.preOrderId),
        ),

      listPreOrders: this.trpc.authedProcedure
        .input(z.object({
          filters: PreOrderListFilterSchema.optional(),
          pagination: PaginationSchema.optional(),
        }))
        .query(({ ctx, input }) =>
          this.preOrderService.getPreOrders(
            ctx.tenantId,
            input.filters ?? {},
            input.pagination ?? { page: 1, limit: 20, sortOrder: 'desc' },
          ),
        ),

      confirmPreOrder: this.trpc.authedProcedure
        .input(z.object({ preOrderId: z.string().uuid() }))
        .mutation(({ ctx, input }) =>
          this.preOrderService.confirmPreOrder(ctx.tenantId, ctx.userId, input.preOrderId),
        ),

      markAvailable: this.trpc.authedProcedure
        .input(z.object({ preOrderId: z.string().uuid() }))
        .mutation(({ ctx, input }) =>
          this.preOrderService.markAvailable(ctx.tenantId, ctx.userId, input.preOrderId),
        ),

      fulfillPreOrder: this.trpc.authedProcedure
        .input(z.object({
          preOrderId: z.string().uuid(),
          fulfilledOrderId: z.string().uuid(),
        }))
        .mutation(({ ctx, input }) =>
          this.preOrderService.fulfillPreOrder(
            ctx.tenantId,
            ctx.userId,
            input.preOrderId,
            input.fulfilledOrderId,
          ),
        ),

      cancelPreOrder: this.trpc.authedProcedure
        .input(z.object({
          preOrderId: z.string().uuid(),
          reason: z.string().min(1),
        }))
        .mutation(({ ctx, input }) =>
          this.preOrderService.cancelPreOrder(
            ctx.tenantId,
            ctx.userId,
            input.preOrderId,
            input.reason,
          ),
        ),

      checkProductPreOrderStatus: this.trpc.authedProcedure
        .input(z.object({ productId: z.string().uuid() }))
        .query(({ ctx, input }) =>
          this.preOrderService.checkProductPreOrderStatus(ctx.tenantId, input.productId),
        ),

      notifyPreOrderCustomers: this.trpc.authedProcedure
        .input(z.object({ productId: z.string().uuid() }))
        .mutation(({ ctx, input }) =>
          this.preOrderService.notifyPreOrderCustomers(
            ctx.tenantId,
            ctx.userId,
            input.productId,
          ),
        ),

      // ─── Pre-Order Config ────────────────────────────────────
      setConfig: this.trpc.authedProcedure
        .input(PreOrderConfigInputSchema)
        .mutation(({ ctx, input }) =>
          this.configService.setPreOrderConfig(ctx.tenantId, ctx.userId, input),
        ),

      getConfig: this.trpc.authedProcedure
        .input(z.object({ productId: z.string().uuid() }))
        .query(({ ctx, input }) =>
          this.configService.getConfig(ctx.tenantId, input.productId),
        ),

      listConfigs: this.trpc.authedProcedure
        .query(({ ctx }) =>
          this.configService.listConfigs(ctx.tenantId),
        ),

      bulkEnablePreOrder: this.trpc.authedProcedure
        .input(BulkPreOrderConfigInputSchema)
        .mutation(({ ctx, input }) =>
          this.configService.bulkEnablePreOrder(ctx.tenantId, ctx.userId, input),
        ),

      deleteConfig: this.trpc.authedProcedure
        .input(z.object({ productId: z.string().uuid() }))
        .mutation(({ ctx, input }) =>
          this.configService.deleteConfig(ctx.tenantId, input.productId),
        ),

      // ─── Order Modifications ─────────────────────────────────
      listModifications: this.trpc.authedProcedure
        .input(z.object({
          filters: ModificationListFilterSchema.optional(),
          pagination: PaginationSchema.optional(),
        }))
        .query(({ ctx, input }) =>
          this.modificationService.getModificationRequests(
            ctx.tenantId,
            input.filters ?? {},
            input.pagination ?? { page: 1, limit: 20, sortOrder: 'desc' },
          ),
        ),

      getModification: this.trpc.authedProcedure
        .input(z.object({ requestId: z.string().uuid() }))
        .query(({ ctx, input }) =>
          this.modificationService.getModification(ctx.tenantId, input.requestId),
        ),

      reviewModification: this.trpc.authedProcedure
        .input(ReviewModificationInputSchema)
        .mutation(({ ctx, input }) =>
          this.modificationService.reviewModification(ctx.tenantId, ctx.userId, input),
        ),

      // ─── Reorder Templates ───────────────────────────────────
      createReorderTemplate: this.trpc.authedProcedure
        .input(z.object({
          customerId: z.string().uuid(),
          orderId: z.string().uuid(),
          name: z.string().optional(),
        }))
        .mutation(({ ctx, input }) =>
          this.reorderService.createReorderTemplate(
            ctx.tenantId,
            ctx.userId,
            input.customerId,
            input.orderId,
            input.name,
          ),
        ),

      getReorderTemplates: this.trpc.authedProcedure
        .input(z.object({ customerId: z.string().uuid() }))
        .query(({ ctx, input }) =>
          this.reorderService.getTemplates(ctx.tenantId, input.customerId),
        ),

      deleteReorderTemplate: this.trpc.authedProcedure
        .input(z.object({
          customerId: z.string().uuid(),
          templateId: z.string().uuid(),
        }))
        .mutation(({ ctx, input }) =>
          this.reorderService.deleteTemplate(
            ctx.tenantId,
            input.customerId,
            input.templateId,
          ),
        ),
    });
  }
}
