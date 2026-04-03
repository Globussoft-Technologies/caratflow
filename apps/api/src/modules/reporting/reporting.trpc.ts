// ─── Reporting tRPC Router ────────────────────────────────────
// All tRPC procedures for the reporting & analytics module.

import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { TrpcService } from '../../trpc/trpc.service';
import { ReportingSalesService } from './reporting.sales.service';
import { ReportingInventoryService } from './reporting.inventory.service';
import { ReportingManufacturingService } from './reporting.manufacturing.service';
import { ReportingCrmService } from './reporting.crm.service';
import { ReportingForecastService } from './reporting.forecast.service';
import { ReportingCustomService } from './reporting.custom.service';
import { ReportingDashboardService } from './reporting.dashboard.service';
import {
  DateRangeSchema,
  PaginationSchema,
  SavedReportInputSchema,
  ScheduledReportInputSchema,
  DashboardLayoutInputSchema,
  CustomReportRequestSchema,
  ForecastInputSchema,
  DashboardInputSchema,
  WidgetDataInputSchema,
  SalesReportInputSchema,
  InventoryReportInputSchema,
  ManufacturingReportInputSchema,
} from '@caratflow/shared-types';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class ReportingTrpcRouter {
  constructor(
    private readonly trpc: TrpcService,
    private readonly salesService: ReportingSalesService,
    private readonly inventoryService: ReportingInventoryService,
    private readonly manufacturingService: ReportingManufacturingService,
    private readonly crmService: ReportingCrmService,
    private readonly forecastService: ReportingForecastService,
    private readonly customService: ReportingCustomService,
    private readonly dashboardService: ReportingDashboardService,
    private readonly prisma: PrismaService,
  ) {}

  get router() {
    return this.trpc.router({
      // ─── Sales Reports ──────────────────────────────────────
      dailySalesSummary: this.trpc.authedProcedure
        .input(z.object({
          date: z.coerce.date(),
          locationId: z.string().uuid().optional(),
        }))
        .query(({ ctx, input }) =>
          this.salesService.dailySalesSummary(
            ctx.tenantId,
            input.date,
            input.locationId,
          ),
        ),

      salesByPeriod: this.trpc.authedProcedure
        .input(SalesReportInputSchema)
        .query(({ ctx, input }) =>
          this.salesService.salesByPeriod(
            ctx.tenantId,
            input.dateRange,
            input.groupBy,
            input.locationId,
          ),
        ),

      salesByProduct: this.trpc.authedProcedure
        .input(SalesReportInputSchema)
        .query(({ ctx, input }) =>
          this.salesService.salesByProduct(
            ctx.tenantId,
            input.dateRange,
            input.locationId,
            input.limit,
          ),
        ),

      salesBySalesperson: this.trpc.authedProcedure
        .input(z.object({
          dateRange: DateRangeSchema,
          locationId: z.string().uuid().optional(),
        }))
        .query(({ ctx, input }) =>
          this.salesService.salesBySalesperson(
            ctx.tenantId,
            input.dateRange,
            input.locationId,
          ),
        ),

      salesByCategory: this.trpc.authedProcedure
        .input(z.object({ dateRange: DateRangeSchema }))
        .query(({ ctx, input }) =>
          this.salesService.salesByCategory(ctx.tenantId, input.dateRange),
        ),

      salesByLocation: this.trpc.authedProcedure
        .input(z.object({ dateRange: DateRangeSchema }))
        .query(({ ctx, input }) =>
          this.salesService.salesByLocation(ctx.tenantId, input.dateRange),
        ),

      salesComparison: this.trpc.authedProcedure
        .input(z.object({
          period1: DateRangeSchema,
          period2: DateRangeSchema,
          locationId: z.string().uuid().optional(),
        }))
        .query(({ ctx, input }) =>
          this.salesService.salesComparison(
            ctx.tenantId,
            input.period1,
            input.period2,
            input.locationId,
          ),
        ),

      // ─── Inventory Reports ──────────────────────────────────
      stockSummary: this.trpc.authedProcedure
        .input(z.object({ locationId: z.string().uuid().optional() }))
        .query(({ ctx, input }) =>
          this.inventoryService.stockSummary(ctx.tenantId, input.locationId),
        ),

      stockByLocation: this.trpc.authedProcedure
        .query(({ ctx }) =>
          this.inventoryService.stockByLocation(ctx.tenantId),
        ),

      lowStockAlert: this.trpc.authedProcedure
        .query(({ ctx }) =>
          this.inventoryService.lowStockAlert(ctx.tenantId),
        ),

      deadStockReport: this.trpc.authedProcedure
        .input(z.object({
          daysSinceLastMovement: z.number().int().min(1).default(90),
        }))
        .query(({ ctx, input }) =>
          this.inventoryService.deadStockReport(
            ctx.tenantId,
            input.daysSinceLastMovement,
          ),
        ),

      fastSlowMovers: this.trpc.authedProcedure
        .input(z.object({
          dateRange: DateRangeSchema,
          limit: z.number().int().min(1).max(100).default(20),
        }))
        .query(({ ctx, input }) =>
          this.inventoryService.fastSlowMovers(
            ctx.tenantId,
            input.dateRange,
            input.limit,
          ),
        ),

      stockAgingReport: this.trpc.authedProcedure
        .input(z.object({ locationId: z.string().uuid().optional() }))
        .query(({ ctx, input }) =>
          this.inventoryService.stockAgingReport(ctx.tenantId, input.locationId),
        ),

      stockValuationReport: this.trpc.authedProcedure
        .input(z.object({
          method: z.enum(['cost', 'market']).default('cost'),
          locationId: z.string().uuid().optional(),
        }))
        .query(({ ctx, input }) =>
          this.inventoryService.stockValuationReport(
            ctx.tenantId,
            input.method,
            input.locationId,
          ),
        ),

      metalStockSummary: this.trpc.authedProcedure
        .query(({ ctx }) =>
          this.inventoryService.metalStockSummary(ctx.tenantId),
        ),

      // ─── Manufacturing Reports ──────────────────────────────
      jobSummary: this.trpc.authedProcedure
        .input(ManufacturingReportInputSchema)
        .query(({ ctx, input }) =>
          this.manufacturingService.jobSummary(
            ctx.tenantId,
            input.dateRange,
            input.locationId,
          ),
        ),

      karigarPerformance: this.trpc.authedProcedure
        .input(z.object({ dateRange: DateRangeSchema }))
        .query(({ ctx, input }) =>
          this.manufacturingService.karigarPerformance(
            ctx.tenantId,
            input.dateRange,
          ),
        ),

      materialUsageReport: this.trpc.authedProcedure
        .input(z.object({ dateRange: DateRangeSchema }))
        .query(({ ctx, input }) =>
          this.manufacturingService.materialUsageReport(
            ctx.tenantId,
            input.dateRange,
          ),
        ),

      wastageReport: this.trpc.authedProcedure
        .input(z.object({ dateRange: DateRangeSchema }))
        .query(({ ctx, input }) =>
          this.manufacturingService.wastageReport(
            ctx.tenantId,
            input.dateRange,
          ),
        ),

      productionTimeline: this.trpc.authedProcedure
        .input(z.object({ dateRange: DateRangeSchema }))
        .query(({ ctx, input }) =>
          this.manufacturingService.productionTimeline(
            ctx.tenantId,
            input.dateRange,
          ),
        ),

      costAnalysis: this.trpc.authedProcedure
        .input(z.object({ dateRange: DateRangeSchema }))
        .query(({ ctx, input }) =>
          this.manufacturingService.costAnalysis(
            ctx.tenantId,
            input.dateRange,
          ),
        ),

      // ─── CRM Reports ───────────────────────────────────────
      customerAcquisition: this.trpc.authedProcedure
        .input(z.object({ dateRange: DateRangeSchema }))
        .query(({ ctx, input }) =>
          this.crmService.customerAcquisition(ctx.tenantId, input.dateRange),
        ),

      customerRetention: this.trpc.authedProcedure
        .input(z.object({ dateRange: DateRangeSchema }))
        .query(({ ctx, input }) =>
          this.crmService.customerRetention(ctx.tenantId, input.dateRange),
        ),

      customerLifetimeValue: this.trpc.authedProcedure
        .input(z.object({
          dateRange: DateRangeSchema,
          limit: z.number().int().min(1).max(500).default(50),
        }))
        .query(({ ctx, input }) =>
          this.crmService.customerLifetimeValue(
            ctx.tenantId,
            input.dateRange,
            input.limit,
          ),
        ),

      loyaltyMetrics: this.trpc.authedProcedure
        .query(({ ctx }) =>
          this.crmService.loyaltyMetrics(ctx.tenantId),
        ),

      leadConversion: this.trpc.authedProcedure
        .input(z.object({ dateRange: DateRangeSchema }))
        .query(({ ctx, input }) =>
          this.crmService.leadConversion(ctx.tenantId, input.dateRange),
        ),

      campaignPerformance: this.trpc.authedProcedure
        .input(z.object({ dateRange: DateRangeSchema }))
        .query(({ ctx, input }) =>
          this.crmService.campaignPerformance(ctx.tenantId, input.dateRange),
        ),

      crmOverview: this.trpc.authedProcedure
        .input(z.object({ dateRange: DateRangeSchema }))
        .query(({ ctx, input }) =>
          this.crmService.crmOverview(ctx.tenantId, input.dateRange),
        ),

      // ─── Forecasting ───────────────────────────────────────
      demandForecast: this.trpc.authedProcedure
        .input(ForecastInputSchema)
        .query(({ ctx, input }) =>
          this.forecastService.demandForecast(ctx.tenantId, input),
        ),

      reorderPointCalculation: this.trpc.authedProcedure
        .input(z.object({
          productId: z.string().uuid(),
          leadTimeDays: z.number().int().min(1).max(365),
          serviceLevel: z.number().min(0.5).max(0.999).default(0.95),
        }))
        .query(({ ctx, input }) =>
          this.forecastService.reorderPointCalculation(
            ctx.tenantId,
            input.productId,
            input.leadTimeDays,
            input.serviceLevel,
          ),
        ),

      seasonalityAnalysis: this.trpc.authedProcedure
        .input(z.object({
          categoryId: z.string().uuid().optional(),
          years: z.number().int().min(1).max(5).default(2),
        }))
        .query(({ ctx, input }) =>
          this.forecastService.seasonalityAnalysis(
            ctx.tenantId,
            input.categoryId,
            input.years,
          ),
        ),

      // ─── Custom Reports ─────────────────────────────────────
      executeCustomReport: this.trpc.authedProcedure
        .input(CustomReportRequestSchema)
        .query(({ ctx, input }) =>
          this.customService.executeCustomReport(ctx.tenantId, input),
        ),

      validateReportConfig: this.trpc.authedProcedure
        .input(CustomReportRequestSchema)
        .query(({ input }) =>
          this.customService.validateReportConfig(input),
        ),

      getSupportedEntities: this.trpc.authedProcedure
        .query(() =>
          this.customService.getSupportedEntities(),
        ),

      // ─── Saved Reports ──────────────────────────────────────
      createSavedReport: this.trpc.authedProcedure
        .input(SavedReportInputSchema)
        .mutation(async ({ ctx, input }) => {
          return this.prisma.savedReport.create({
            data: {
              tenantId: ctx.tenantId,
              name: input.name,
              description: input.description,
              reportType: input.reportType,
              filters: input.filters ?? undefined,
              columns: input.columns ?? undefined,
              groupBy: input.groupBy ?? undefined,
              sortBy: input.sortBy ?? undefined,
              chartType: input.chartType,
              isDefault: input.isDefault,
              createdBy: ctx.userId,
            },
          });
        }),

      listSavedReports: this.trpc.authedProcedure
        .input(z.object({
          reportType: z.string().optional(),
        }).default({}))
        .query(({ ctx, input }) =>
          this.prisma.savedReport.findMany({
            where: {
              tenantId: ctx.tenantId,
              ...(input.reportType ? { reportType: input.reportType as 'SALES' | 'INVENTORY' | 'FINANCIAL' | 'MANUFACTURING' | 'CRM' | 'CUSTOM' } : {}),
            },
            orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
          }),
        ),

      getSavedReport: this.trpc.authedProcedure
        .input(z.object({ id: z.string().uuid() }))
        .query(({ ctx, input }) =>
          this.prisma.savedReport.findFirst({
            where: { id: input.id, tenantId: ctx.tenantId },
          }),
        ),

      deleteSavedReport: this.trpc.authedProcedure
        .input(z.object({ id: z.string().uuid() }))
        .mutation(async ({ ctx, input }) => {
          await this.prisma.savedReport.deleteMany({
            where: { id: input.id, tenantId: ctx.tenantId },
          });
          return { success: true };
        }),

      // ─── Scheduled Reports ──────────────────────────────────
      createScheduledReport: this.trpc.authedProcedure
        .input(ScheduledReportInputSchema)
        .mutation(async ({ ctx, input }) => {
          return this.prisma.scheduledReport.create({
            data: {
              tenantId: ctx.tenantId,
              savedReportId: input.savedReportId,
              frequency: input.frequency,
              dayOfWeek: input.dayOfWeek,
              dayOfMonth: input.dayOfMonth,
              timeOfDay: input.timeOfDay,
              format: input.format,
              recipients: input.recipients,
              isActive: input.isActive,
              createdBy: ctx.userId,
            },
          });
        }),

      listScheduledReports: this.trpc.authedProcedure
        .query(({ ctx }) =>
          this.prisma.scheduledReport.findMany({
            where: { tenantId: ctx.tenantId },
            include: { savedReport: true },
            orderBy: { createdAt: 'desc' },
          }),
        ),

      toggleScheduledReport: this.trpc.authedProcedure
        .input(z.object({
          id: z.string().uuid(),
          isActive: z.boolean(),
        }))
        .mutation(async ({ ctx, input }) => {
          return this.prisma.scheduledReport.updateMany({
            where: { id: input.id, tenantId: ctx.tenantId },
            data: { isActive: input.isActive, updatedBy: ctx.userId },
          });
        }),

      listExecutions: this.trpc.authedProcedure
        .input(z.object({
          scheduledReportId: z.string().uuid().optional(),
          limit: z.number().int().min(1).max(100).default(20),
        }).default({}))
        .query(({ ctx, input }) =>
          this.prisma.reportExecution.findMany({
            where: {
              tenantId: ctx.tenantId,
              ...(input.scheduledReportId
                ? { scheduledReportId: input.scheduledReportId }
                : {}),
            },
            orderBy: { createdAt: 'desc' },
            take: input.limit,
          }),
        ),

      // ─── Dashboard ─────────────────────────────────────────
      getAnalyticsDashboard: this.trpc.authedProcedure
        .input(DashboardInputSchema.default({}))
        .query(({ ctx, input }) =>
          this.dashboardService.getAnalyticsDashboard(
            ctx.tenantId,
            input.dateRange,
            input.locationId,
          ),
        ),

      saveDashboardLayout: this.trpc.authedProcedure
        .input(DashboardLayoutInputSchema)
        .mutation(({ ctx, input }) =>
          this.dashboardService.saveDashboardLayout(
            ctx.tenantId,
            ctx.userId,
            input,
          ),
        ),

      getDashboardLayout: this.trpc.authedProcedure
        .query(({ ctx }) =>
          this.dashboardService.getDashboardLayout(ctx.tenantId, ctx.userId),
        ),

      getWidgetData: this.trpc.authedProcedure
        .input(WidgetDataInputSchema)
        .query(({ ctx, input }) =>
          this.dashboardService.getWidgetData(
            ctx.tenantId,
            input.widgetType,
            input.config,
            input.dateRange,
          ),
        ),
    });
  }
}
