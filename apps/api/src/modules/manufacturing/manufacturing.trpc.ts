import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { TrpcService } from '../../trpc/trpc.service';
import { ManufacturingService } from './manufacturing.service';
import { ManufacturingKarigarService } from './manufacturing.karigar.service';
import { ManufacturingQcService } from './manufacturing.qc.service';
import { ManufacturingPlanningService } from './manufacturing.planning.service';
import {
  BomInputSchema,
  BomUpdateSchema,
  BomFilterSchema,
  JobOrderInputSchema,
  JobOrderStatusUpdateSchema,
  JobOrderFilterSchema,
  KarigarInputSchema,
  KarigarAttendanceInputSchema,
  KarigarTransactionInputSchema,
  KarigarFilterSchema,
  QualityCheckpointInputSchema,
  ProductionPlanInputSchema,
  ProductionPlanItemInputSchema,
  PaginationSchema,
  DateRangeSchema,
  UuidSchema,
  JobCostType,
} from '@caratflow/shared-types';

@Injectable()
export class ManufacturingTrpc {
  constructor(
    private readonly trpc: TrpcService,
    private readonly manufacturingService: ManufacturingService,
    private readonly karigarService: ManufacturingKarigarService,
    private readonly qcService: ManufacturingQcService,
    private readonly planningService: ManufacturingPlanningService,
  ) {}

  get router() {
    return this.trpc.router({
      // ─── BOM ────────────────────────────────────────────────
      bom: this.trpc.router({
        create: this.trpc.authedProcedure
          .input(BomInputSchema)
          .mutation(({ ctx, input }) =>
            this.manufacturingService.createBom(ctx.tenantId, ctx.userId, input),
          ),

        update: this.trpc.authedProcedure
          .input(z.object({ id: UuidSchema, data: BomUpdateSchema }))
          .mutation(({ ctx, input }) =>
            this.manufacturingService.updateBom(ctx.tenantId, ctx.userId, input.id, input.data),
          ),

        activate: this.trpc.authedProcedure
          .input(z.object({ id: UuidSchema }))
          .mutation(({ ctx, input }) =>
            this.manufacturingService.activateBom(ctx.tenantId, ctx.userId, input.id),
          ),

        archive: this.trpc.authedProcedure
          .input(z.object({ id: UuidSchema }))
          .mutation(({ ctx, input }) =>
            this.manufacturingService.archiveBom(ctx.tenantId, ctx.userId, input.id),
          ),

        clone: this.trpc.authedProcedure
          .input(z.object({ id: UuidSchema }))
          .mutation(({ ctx, input }) =>
            this.manufacturingService.cloneBom(ctx.tenantId, ctx.userId, input.id),
          ),

        list: this.trpc.authedProcedure
          .input(z.object({ pagination: PaginationSchema, filter: BomFilterSchema.optional() }))
          .query(({ ctx, input }) =>
            this.manufacturingService.findAllBoms(ctx.tenantId, input.pagination, input.filter),
          ),

        getById: this.trpc.authedProcedure
          .input(z.object({ id: UuidSchema }))
          .query(({ ctx, input }) =>
            this.manufacturingService.findBomById(ctx.tenantId, input.id),
          ),

        explode: this.trpc.authedProcedure
          .input(z.object({ id: UuidSchema, quantity: z.number().int().min(1) }))
          .query(({ ctx, input }) =>
            this.manufacturingService.explodeBom(ctx.tenantId, input.id, input.quantity),
          ),
      }),

      // ─── Job Orders ─────────────────────────────────────────
      job: this.trpc.router({
        create: this.trpc.authedProcedure
          .input(JobOrderInputSchema)
          .mutation(({ ctx, input }) =>
            this.manufacturingService.createJobOrder(ctx.tenantId, ctx.userId, input),
          ),

        updateStatus: this.trpc.authedProcedure
          .input(z.object({ id: UuidSchema, data: JobOrderStatusUpdateSchema }))
          .mutation(({ ctx, input }) =>
            this.manufacturingService.updateJobOrderStatus(ctx.tenantId, ctx.userId, input.id, input.data),
          ),

        assignKarigar: this.trpc.authedProcedure
          .input(z.object({ jobId: UuidSchema, karigarId: UuidSchema }))
          .mutation(({ ctx, input }) =>
            this.manufacturingService.assignKarigar(ctx.tenantId, ctx.userId, input.jobId, input.karigarId),
          ),

        cancel: this.trpc.authedProcedure
          .input(z.object({ id: UuidSchema, reason: z.string().optional() }))
          .mutation(({ ctx, input }) =>
            this.manufacturingService.cancelJobOrder(ctx.tenantId, ctx.userId, input.id, input.reason),
          ),

        list: this.trpc.authedProcedure
          .input(z.object({ pagination: PaginationSchema, filter: JobOrderFilterSchema.optional() }))
          .query(({ ctx, input }) =>
            this.manufacturingService.findAllJobOrders(ctx.tenantId, input.pagination, input.filter),
          ),

        getById: this.trpc.authedProcedure
          .input(z.object({ id: UuidSchema }))
          .query(({ ctx, input }) =>
            this.manufacturingService.findJobOrderById(ctx.tenantId, input.id),
          ),

        getCost: this.trpc.authedProcedure
          .input(z.object({ id: UuidSchema }))
          .query(({ ctx, input }) =>
            this.manufacturingService.getJobCost(ctx.tenantId, input.id),
          ),

        addCost: this.trpc.authedProcedure
          .input(z.object({
            jobId: UuidSchema,
            costType: z.nativeEnum(JobCostType),
            description: z.string().min(1),
            amountPaise: z.number().int().nonnegative(),
            weightMg: z.number().int().nonnegative().optional(),
          }))
          .mutation(({ ctx, input }) =>
            this.manufacturingService.addJobCost(
              ctx.tenantId,
              ctx.userId,
              input.jobId,
              input.costType,
              input.description,
              BigInt(input.amountPaise),
              input.weightMg ? BigInt(input.weightMg) : undefined,
            ),
          ),
      }),

      // ─── Karigar ────────────────────────────────────────────
      karigar: this.trpc.router({
        create: this.trpc.authedProcedure
          .input(KarigarInputSchema)
          .mutation(({ ctx, input }) =>
            this.karigarService.createKarigar(ctx.tenantId, ctx.userId, input),
          ),

        update: this.trpc.authedProcedure
          .input(z.object({ id: UuidSchema, data: KarigarInputSchema.partial() }))
          .mutation(({ ctx, input }) =>
            this.karigarService.updateKarigar(ctx.tenantId, ctx.userId, input.id, input.data),
          ),

        getById: this.trpc.authedProcedure
          .input(z.object({ id: UuidSchema }))
          .query(({ ctx, input }) =>
            this.karigarService.findKarigarById(ctx.tenantId, input.id),
          ),

        list: this.trpc.authedProcedure
          .input(z.object({ pagination: PaginationSchema, filter: KarigarFilterSchema.optional() }))
          .query(({ ctx, input }) =>
            this.karigarService.findAllKarigars(ctx.tenantId, input.pagination, input.filter),
          ),

        recordAttendance: this.trpc.authedProcedure
          .input(KarigarAttendanceInputSchema)
          .mutation(({ ctx, input }) =>
            this.karigarService.recordAttendance(ctx.tenantId, ctx.userId, input),
          ),

        getAttendanceReport: this.trpc.authedProcedure
          .input(z.object({ karigarId: UuidSchema, dateRange: DateRangeSchema }))
          .query(({ ctx, input }) =>
            this.karigarService.getAttendanceReport(ctx.tenantId, input.karigarId, input.dateRange.from, input.dateRange.to),
          ),

        issueMetal: this.trpc.authedProcedure
          .input(KarigarTransactionInputSchema)
          .mutation(({ ctx, input }) =>
            this.karigarService.issueMetal(ctx.tenantId, ctx.userId, input),
          ),

        recordReturn: this.trpc.authedProcedure
          .input(KarigarTransactionInputSchema)
          .mutation(({ ctx, input }) =>
            this.karigarService.recordReturn(ctx.tenantId, ctx.userId, input),
          ),

        recordWastage: this.trpc.authedProcedure
          .input(KarigarTransactionInputSchema)
          .mutation(({ ctx, input }) =>
            this.karigarService.recordWastage(ctx.tenantId, ctx.userId, input),
          ),

        getMetalBalance: this.trpc.authedProcedure
          .input(z.object({ karigarId: UuidSchema }))
          .query(({ ctx, input }) =>
            this.karigarService.getMetalBalanceSummary(ctx.tenantId, input.karigarId),
          ),

        getTransactionHistory: this.trpc.authedProcedure
          .input(z.object({
            karigarId: UuidSchema,
            from: z.coerce.date().optional(),
            to: z.coerce.date().optional(),
          }))
          .query(({ ctx, input }) =>
            this.karigarService.getTransactionHistory(ctx.tenantId, input.karigarId, input.from, input.to),
          ),

        calculatePayment: this.trpc.authedProcedure
          .input(z.object({ karigarId: UuidSchema, dateRange: DateRangeSchema }))
          .query(({ ctx, input }) =>
            this.karigarService.calculatePayment(ctx.tenantId, input.karigarId, input.dateRange.from, input.dateRange.to),
          ),

        getPerformance: this.trpc.authedProcedure
          .input(z.object({ karigarId: UuidSchema }))
          .query(({ ctx, input }) =>
            this.karigarService.getPerformanceMetrics(ctx.tenantId, input.karigarId),
          ),
      }),

      // ─── Quality Control ────────────────────────────────────
      qc: this.trpc.router({
        recordCheckpoint: this.trpc.authedProcedure
          .input(QualityCheckpointInputSchema)
          .mutation(({ ctx, input }) =>
            this.qcService.recordCheckpoint(ctx.tenantId, ctx.userId, input),
          ),

        passJob: this.trpc.authedProcedure
          .input(z.object({ jobId: UuidSchema }))
          .mutation(({ ctx, input }) =>
            this.qcService.passJob(ctx.tenantId, ctx.userId, input.jobId),
          ),

        failJob: this.trpc.authedProcedure
          .input(z.object({ jobId: UuidSchema, findings: z.string().optional() }))
          .mutation(({ ctx, input }) =>
            this.qcService.failJob(ctx.tenantId, ctx.userId, input.jobId, input.findings),
          ),

        getHistory: this.trpc.authedProcedure
          .input(z.object({ jobId: UuidSchema }))
          .query(({ ctx, input }) =>
            this.qcService.getQcHistory(ctx.tenantId, input.jobId),
          ),

        getPendingJobs: this.trpc.authedProcedure
          .query(({ ctx }) =>
            this.qcService.getPendingQcJobs(ctx.tenantId),
          ),

        getRecentResults: this.trpc.authedProcedure
          .input(z.object({ limit: z.number().int().min(1).max(100).default(20) }).optional())
          .query(({ ctx, input }) =>
            this.qcService.getRecentQcResults(ctx.tenantId, input?.limit),
          ),
      }),

      // ─── Production Planning ────────────────────────────────
      plan: this.trpc.router({
        create: this.trpc.authedProcedure
          .input(ProductionPlanInputSchema)
          .mutation(({ ctx, input }) =>
            this.planningService.createPlan(ctx.tenantId, ctx.userId, input),
          ),

        update: this.trpc.authedProcedure
          .input(z.object({ id: UuidSchema, data: ProductionPlanInputSchema.partial() }))
          .mutation(({ ctx, input }) =>
            this.planningService.updatePlan(ctx.tenantId, ctx.userId, input.id, input.data),
          ),

        addItem: this.trpc.authedProcedure
          .input(z.object({ planId: UuidSchema, item: ProductionPlanItemInputSchema }))
          .mutation(({ ctx, input }) =>
            this.planningService.addPlanItem(ctx.tenantId, ctx.userId, input.planId, input.item),
          ),

        removeItem: this.trpc.authedProcedure
          .input(z.object({ planId: UuidSchema, itemId: UuidSchema }))
          .mutation(({ ctx, input }) =>
            this.planningService.removePlanItem(ctx.tenantId, ctx.userId, input.planId, input.itemId),
          ),

        generateJobs: this.trpc.authedProcedure
          .input(z.object({ planId: UuidSchema }))
          .mutation(({ ctx, input }) =>
            this.planningService.generateJobOrdersFromPlan(ctx.tenantId, ctx.userId, input.planId),
          ),

        list: this.trpc.authedProcedure
          .input(z.object({ pagination: PaginationSchema }))
          .query(({ ctx, input }) =>
            this.planningService.findAllPlans(ctx.tenantId, input.pagination),
          ),

        getById: this.trpc.authedProcedure
          .input(z.object({ id: UuidSchema }))
          .query(({ ctx, input }) =>
            this.planningService.findPlanById(ctx.tenantId, input.id),
          ),

        capacityAnalysis: this.trpc.authedProcedure
          .input(z.object({ locationId: UuidSchema }))
          .query(({ ctx, input }) =>
            this.planningService.getCapacityAnalysis(ctx.tenantId, input.locationId),
          ),
      }),

      // ─── Dashboard ─────────────────────────────────────────
      dashboard: this.trpc.authedProcedure
        .query(({ ctx }) =>
          this.manufacturingService.getDashboard(ctx.tenantId),
        ),

      // ─── Material Requisition ───────────────────────────────
      requisition: this.trpc.router({
        fromBom: this.trpc.authedProcedure
          .input(z.object({ bomId: UuidSchema, quantity: z.number().int().min(1) }))
          .query(({ ctx, input }) =>
            this.manufacturingService.generateRequisitionFromBom(ctx.tenantId, input.bomId, input.quantity),
          ),

        fromPlan: this.trpc.authedProcedure
          .input(z.object({ planId: UuidSchema }))
          .query(({ ctx, input }) =>
            this.manufacturingService.generateRequisitionFromPlan(ctx.tenantId, input.planId),
          ),
      }),
    });
  }
}
