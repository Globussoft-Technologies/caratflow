// ─── AML tRPC Router ──────────────────────────────────────────
// Admin procedures for AML compliance management.

import { Injectable } from '@nestjs/common';
import { TrpcService } from '../../trpc/trpc.service';
import { AmlService } from './aml.service';
import { AmlAlertService } from './aml.alert.service';
import { AmlRiskService } from './aml.risk.service';
import { AmlMonitoringService } from './aml.monitoring.service';
import { z } from 'zod';
import {
  AmlRuleInputSchema,
  AmlAlertStatusEnum,
  AmlSeverityEnum,
  AmlSarReportInputSchema,
  AmlFilingStatusEnum,
} from '@caratflow/shared-types';

@Injectable()
export class AmlTrpcRouter {
  constructor(
    private readonly trpc: TrpcService,
    private readonly amlService: AmlService,
    private readonly alertService: AmlAlertService,
    private readonly riskService: AmlRiskService,
    private readonly monitoringService: AmlMonitoringService,
  ) {}

  get router() {
    const authed = this.trpc.authedProcedure;

    return this.trpc.router({
      // ─── Dashboard ──────────────────────────────────────────
      dashboard: authed.query(async ({ ctx }) => {
        const [alertsDashboard, riskDistribution] = await Promise.all([
          this.alertService.getAlertsDashboard(ctx.tenantId),
          this.riskService.getRiskDistribution(ctx.tenantId),
        ]);
        return {
          ...alertsDashboard,
          riskDistribution,
        };
      }),

      // ─── Rules CRUD ────────────────────────────────────────
      ruleCreate: authed
        .input(AmlRuleInputSchema)
        .mutation(async ({ ctx, input }) => {
          return this.amlService.createRule(ctx.tenantId, ctx.userId, input);
        }),

      ruleUpdate: authed
        .input(z.object({ id: z.string().uuid() }).merge(AmlRuleInputSchema.partial()))
        .mutation(async ({ ctx, input }) => {
          const { id, ...data } = input;
          return this.amlService.updateRule(ctx.tenantId, ctx.userId, id, data);
        }),

      ruleGet: authed
        .input(z.object({ id: z.string().uuid() }))
        .query(async ({ ctx, input }) => {
          return this.amlService.getRule(ctx.tenantId, input.id);
        }),

      ruleList: authed.query(async ({ ctx }) => {
        return this.amlService.listRules(ctx.tenantId);
      }),

      ruleDelete: authed
        .input(z.object({ id: z.string().uuid() }))
        .mutation(async ({ ctx, input }) => {
          return this.amlService.deleteRule(ctx.tenantId, input.id);
        }),

      // ─── Alerts ─────────────────────────────────────────────
      alertList: authed
        .input(z.object({
          page: z.number().int().default(1),
          limit: z.number().int().default(20),
          status: AmlAlertStatusEnum.optional(),
          severity: AmlSeverityEnum.optional(),
          customerId: z.string().uuid().optional(),
        }))
        .query(async ({ ctx, input }) => {
          return this.alertService.listAlerts(
            ctx.tenantId, input.page, input.limit,
            input.status, input.severity, input.customerId,
          );
        }),

      alertGet: authed
        .input(z.object({ id: z.string().uuid() }))
        .query(async ({ ctx, input }) => {
          return this.alertService.getAlert(ctx.tenantId, input.id);
        }),

      alertReview: authed
        .input(z.object({
          alertId: z.string().uuid(),
          notes: z.string().max(2000).optional(),
        }))
        .mutation(async ({ ctx, input }) => {
          return this.alertService.reviewAlert(ctx.tenantId, ctx.userId, input.alertId, input.notes);
        }),

      alertEscalate: authed
        .input(z.object({
          alertId: z.string().uuid(),
          notes: z.string().max(2000).optional(),
        }))
        .mutation(async ({ ctx, input }) => {
          return this.alertService.escalateAlert(ctx.tenantId, ctx.userId, input.alertId, input.notes);
        }),

      alertClear: authed
        .input(z.object({
          alertId: z.string().uuid(),
          notes: z.string().min(1).max(2000),
        }))
        .mutation(async ({ ctx, input }) => {
          return this.alertService.clearAlert(ctx.tenantId, ctx.userId, input.alertId, input.notes);
        }),

      alertReportToFiu: authed
        .input(z.object({ alertId: z.string().uuid() }))
        .mutation(async ({ ctx, input }) => {
          return this.alertService.reportToFiu(ctx.tenantId, ctx.userId, input.alertId);
        }),

      // ─── Customer Risk ──────────────────────────────────────
      customerRisk: authed
        .input(z.object({ customerId: z.string().uuid() }))
        .query(async ({ ctx, input }) => {
          return this.riskService.getCustomerRisk(ctx.tenantId, input.customerId);
        }),

      customerRiskRecalculate: authed
        .input(z.object({ customerId: z.string().uuid() }))
        .mutation(async ({ ctx, input }) => {
          return this.riskService.calculateCustomerRisk(ctx.tenantId, input.customerId);
        }),

      highRiskCustomers: authed
        .input(z.object({
          page: z.number().int().default(1),
          limit: z.number().int().default(20),
        }))
        .query(async ({ ctx, input }) => {
          return this.riskService.listHighRiskCustomers(ctx.tenantId, input.page, input.limit);
        }),

      // ─── SAR Reports ────────────────────────────────────────
      sarCreate: authed
        .input(AmlSarReportInputSchema)
        .mutation(async ({ ctx, input }) => {
          return this.alertService.createSarReport(ctx.tenantId, ctx.userId, input);
        }),

      sarFile: authed
        .input(z.object({
          reportId: z.string().uuid(),
          referenceNumber: z.string().min(1).max(100),
        }))
        .mutation(async ({ ctx, input }) => {
          return this.alertService.fileSarReport(ctx.tenantId, ctx.userId, input.reportId, input.referenceNumber);
        }),

      sarAcknowledge: authed
        .input(z.object({ reportId: z.string().uuid() }))
        .mutation(async ({ ctx, input }) => {
          return this.alertService.acknowledgeSarReport(ctx.tenantId, input.reportId);
        }),

      sarList: authed
        .input(z.object({
          page: z.number().int().default(1),
          limit: z.number().int().default(20),
          filingStatus: AmlFilingStatusEnum.optional(),
        }))
        .query(async ({ ctx, input }) => {
          return this.alertService.listSarReports(ctx.tenantId, input.page, input.limit, input.filingStatus);
        }),

      // ─── Manual Evaluation ──────────────────────────────────
      evaluateTransaction: authed
        .input(z.object({
          customerId: z.string().uuid(),
          amountPaise: z.number().int().positive(),
          transactionType: z.string(),
          transactionId: z.string().uuid().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
          return this.amlService.evaluateTransaction(
            ctx.tenantId,
            input.customerId,
            BigInt(input.amountPaise),
            input.transactionType,
            input.transactionId,
          );
        }),

      // ─── Monitoring (Manual Trigger) ────────────────────────
      runMonitoring: authed
        .input(z.object({ windowMinutes: z.number().int().default(60) }).optional())
        .mutation(async ({ ctx, input }) => {
          return this.monitoringService.monitorTransactions(ctx.tenantId, input?.windowMinutes ?? 60);
        }),
    });
  }
}
