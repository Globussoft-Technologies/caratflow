// ─── Compliance tRPC Router ───────────────────────────────────
// All compliance API endpoints exposed via tRPC.

import { Injectable } from '@nestjs/common';
import { TrpcService } from '../../trpc/trpc.service';
import { ComplianceHuidService } from './compliance.huid.service';
import { ComplianceHallmarkService } from './compliance.hallmark.service';
import { ComplianceCertificateService } from './compliance.certificate.service';
import { ComplianceTraceabilityService } from './compliance.traceability.service';
import { ComplianceDocumentService } from './compliance.document.service';
import { ComplianceInsuranceService } from './compliance.insurance.service';
import { ComplianceAuditService } from './compliance.audit.service';
import { z } from 'zod';
import {
  HuidRecordInputSchema,
  HuidVerificationInputSchema,
  HuidListInputSchema,
  BulkHuidRegisterSchema,
  HallmarkCenterInputSchema,
  HallmarkSubmissionInputSchema,
  HallmarkSubmissionListInputSchema,
  RecordHallmarkResultsSchema,
  GemstoneCertificateInputSchema,
  GemstoneCertificateListInputSchema,
  ChainOfCustodyInputSchema,
  ComplianceDocumentInputSchema,
  ComplianceDocumentListInputSchema,
  InsurancePolicyInputSchema,
  InsurancePolicyListInputSchema,
  ComplianceAuditInputSchema,
  ComplianceAuditListInputSchema,
  AuditResolveInputSchema,
} from '@caratflow/shared-types';

@Injectable()
export class ComplianceTrpcRouter {
  constructor(
    private readonly trpc: TrpcService,
    private readonly huidService: ComplianceHuidService,
    private readonly hallmarkService: ComplianceHallmarkService,
    private readonly certificateService: ComplianceCertificateService,
    private readonly traceabilityService: ComplianceTraceabilityService,
    private readonly documentService: ComplianceDocumentService,
    private readonly insuranceService: ComplianceInsuranceService,
    private readonly auditService: ComplianceAuditService,
  ) {}

  get router() {
    return this.trpc.router({
      // ─── HUID ─────────────────────────────────────────────
      huid: this.trpc.router({
        list: this.trpc.authedProcedure
          .input(HuidListInputSchema)
          .query(({ ctx, input }) =>
            this.huidService.list(ctx.tenantId, input),
          ),

        getById: this.trpc.authedProcedure
          .input(z.object({ id: z.string().uuid() }))
          .query(({ ctx, input }) =>
            this.huidService.findById(ctx.tenantId, input.id),
          ),

        getByProduct: this.trpc.authedProcedure
          .input(z.object({ productId: z.string().uuid() }))
          .query(({ ctx, input }) =>
            this.huidService.findByProduct(ctx.tenantId, input.productId),
          ),

        register: this.trpc.authedProcedure
          .input(HuidRecordInputSchema)
          .mutation(({ ctx, input }) =>
            this.huidService.register(ctx.tenantId, ctx.userId, input),
          ),

        bulkRegister: this.trpc.authedProcedure
          .input(BulkHuidRegisterSchema)
          .mutation(({ ctx, input }) =>
            this.huidService.bulkRegister(ctx.tenantId, ctx.userId, input),
          ),

        verify: this.trpc.authedProcedure
          .input(HuidVerificationInputSchema)
          .query(({ ctx, input }) =>
            this.huidService.verify(ctx.tenantId, input.huidNumber),
          ),

        checkSaleEligibility: this.trpc.authedProcedure
          .input(z.object({ productId: z.string().uuid() }))
          .query(({ ctx, input }) =>
            this.huidService.enforceHuidOnSale(ctx.tenantId, input.productId),
          ),

        coverageReport: this.trpc.authedProcedure
          .query(({ ctx }) =>
            this.huidService.getCoverageReport(ctx.tenantId),
          ),
      }),

      // ─── Hallmark ─────────────────────────────────────────
      hallmark: this.trpc.router({
        centers: this.trpc.router({
          list: this.trpc.authedProcedure
            .input(z.object({ activeOnly: z.boolean().optional() }).optional())
            .query(({ input }) =>
              this.hallmarkService.listCenters(input?.activeOnly ?? true),
            ),

          getById: this.trpc.authedProcedure
            .input(z.object({ id: z.string().uuid() }))
            .query(({ input }) =>
              this.hallmarkService.getCenterById(input.id),
            ),

          create: this.trpc.authedProcedure
            .input(HallmarkCenterInputSchema)
            .mutation(({ input }) =>
              this.hallmarkService.createCenter(input),
            ),

          update: this.trpc.authedProcedure
            .input(z.object({ id: z.string().uuid(), data: HallmarkCenterInputSchema.partial() }))
            .mutation(({ input }) =>
              this.hallmarkService.updateCenter(input.id, input.data),
            ),
        }),

        submissions: this.trpc.router({
          list: this.trpc.authedProcedure
            .input(HallmarkSubmissionListInputSchema)
            .query(({ ctx, input }) =>
              this.hallmarkService.list(ctx.tenantId, input),
            ),

          getById: this.trpc.authedProcedure
            .input(z.object({ id: z.string().uuid() }))
            .query(({ ctx, input }) =>
              this.hallmarkService.findById(ctx.tenantId, input.id),
            ),

          create: this.trpc.authedProcedure
            .input(HallmarkSubmissionInputSchema)
            .mutation(({ ctx, input }) =>
              this.hallmarkService.createSubmission(ctx.tenantId, ctx.userId, input),
            ),

          recordResults: this.trpc.authedProcedure
            .input(RecordHallmarkResultsSchema)
            .mutation(({ ctx, input }) =>
              this.hallmarkService.recordResults(ctx.tenantId, ctx.userId, input),
            ),
        }),
      }),

      // ─── Certificates ─────────────────────────────────────
      certificates: this.trpc.router({
        list: this.trpc.authedProcedure
          .input(GemstoneCertificateListInputSchema)
          .query(({ ctx, input }) =>
            this.certificateService.list(ctx.tenantId, input),
          ),

        getById: this.trpc.authedProcedure
          .input(z.object({ id: z.string().uuid() }))
          .query(({ ctx, input }) =>
            this.certificateService.findById(ctx.tenantId, input.id),
          ),

        findByCertNumber: this.trpc.authedProcedure
          .input(z.object({ certificateNumber: z.string() }))
          .query(({ ctx, input }) =>
            this.certificateService.findByCertificateNumber(ctx.tenantId, input.certificateNumber),
          ),

        create: this.trpc.authedProcedure
          .input(GemstoneCertificateInputSchema)
          .mutation(({ ctx, input }) =>
            this.certificateService.create(ctx.tenantId, ctx.userId, input),
          ),

        update: this.trpc.authedProcedure
          .input(z.object({ id: z.string().uuid(), data: GemstoneCertificateInputSchema.partial() }))
          .mutation(({ ctx, input }) =>
            this.certificateService.update(ctx.tenantId, ctx.userId, input.id, input.data),
          ),

        verify: this.trpc.authedProcedure
          .input(z.object({ id: z.string().uuid() }))
          .mutation(({ ctx, input }) =>
            this.certificateService.verifyCertificate(ctx.tenantId, ctx.userId, input.id),
          ),
      }),

      // ─── Traceability ─────────────────────────────────────
      traceability: this.trpc.router({
        recordEvent: this.trpc.authedProcedure
          .input(ChainOfCustodyInputSchema)
          .mutation(({ ctx, input }) =>
            this.traceabilityService.recordEvent(ctx.tenantId, ctx.userId, input),
          ),

        getChain: this.trpc.authedProcedure
          .input(z.object({ productId: z.string().uuid() }))
          .query(({ ctx, input }) =>
            this.traceabilityService.getChainForProduct(ctx.tenantId, input.productId),
          ),

        search: this.trpc.authedProcedure
          .input(z.object({ search: z.string().min(1) }))
          .query(({ ctx, input }) =>
            this.traceabilityService.searchByProduct(ctx.tenantId, input.search),
          ),
      }),

      // ─── Documents ─────────────────────────────────────────
      documents: this.trpc.router({
        list: this.trpc.authedProcedure
          .input(ComplianceDocumentListInputSchema)
          .query(({ ctx, input }) =>
            this.documentService.list(ctx.tenantId, input),
          ),

        getById: this.trpc.authedProcedure
          .input(z.object({ id: z.string().uuid() }))
          .query(({ ctx, input }) =>
            this.documentService.findById(ctx.tenantId, input.id),
          ),

        create: this.trpc.authedProcedure
          .input(ComplianceDocumentInputSchema)
          .mutation(({ ctx, input }) =>
            this.documentService.create(ctx.tenantId, ctx.userId, input),
          ),

        update: this.trpc.authedProcedure
          .input(z.object({ id: z.string().uuid(), data: ComplianceDocumentInputSchema.partial() }))
          .mutation(({ ctx, input }) =>
            this.documentService.update(ctx.tenantId, ctx.userId, input.id, input.data),
          ),

        revoke: this.trpc.authedProcedure
          .input(z.object({ id: z.string().uuid() }))
          .mutation(({ ctx, input }) =>
            this.documentService.revoke(ctx.tenantId, ctx.userId, input.id),
          ),
      }),

      // ─── Insurance ─────────────────────────────────────────
      insurance: this.trpc.router({
        list: this.trpc.authedProcedure
          .input(InsurancePolicyListInputSchema)
          .query(({ ctx, input }) =>
            this.insuranceService.list(ctx.tenantId, input),
          ),

        getById: this.trpc.authedProcedure
          .input(z.object({ id: z.string().uuid() }))
          .query(({ ctx, input }) =>
            this.insuranceService.findById(ctx.tenantId, input.id),
          ),

        create: this.trpc.authedProcedure
          .input(InsurancePolicyInputSchema)
          .mutation(({ ctx, input }) =>
            this.insuranceService.create(ctx.tenantId, ctx.userId, input),
          ),

        update: this.trpc.authedProcedure
          .input(z.object({ id: z.string().uuid(), data: InsurancePolicyInputSchema.partial() }))
          .mutation(({ ctx, input }) =>
            this.insuranceService.update(ctx.tenantId, ctx.userId, input.id, input.data),
          ),

        coverageSummary: this.trpc.authedProcedure
          .query(({ ctx }) =>
            this.insuranceService.getCoverageSummary(ctx.tenantId),
          ),
      }),

      // ─── Audits ────────────────────────────────────────────
      audits: this.trpc.router({
        list: this.trpc.authedProcedure
          .input(ComplianceAuditListInputSchema)
          .query(({ ctx, input }) =>
            this.auditService.list(ctx.tenantId, input),
          ),

        getById: this.trpc.authedProcedure
          .input(z.object({ id: z.string().uuid() }))
          .query(({ ctx, input }) =>
            this.auditService.findById(ctx.tenantId, input.id),
          ),

        create: this.trpc.authedProcedure
          .input(ComplianceAuditInputSchema)
          .mutation(({ ctx, input }) =>
            this.auditService.create(ctx.tenantId, ctx.userId, input),
          ),

        update: this.trpc.authedProcedure
          .input(z.object({ id: z.string().uuid(), data: ComplianceAuditInputSchema.partial() }))
          .mutation(({ ctx, input }) =>
            this.auditService.update(ctx.tenantId, ctx.userId, input.id, input.data),
          ),

        start: this.trpc.authedProcedure
          .input(z.object({ id: z.string().uuid() }))
          .mutation(({ ctx, input }) =>
            this.auditService.startAudit(ctx.tenantId, ctx.userId, input.id),
          ),

        recordFindings: this.trpc.authedProcedure
          .input(z.object({
            id: z.string().uuid(),
            findings: z.string(),
            recommendations: z.string().optional(),
          }))
          .mutation(({ ctx, input }) =>
            this.auditService.recordFindings(
              ctx.tenantId, ctx.userId, input.id, input.findings, input.recommendations,
            ),
          ),

        resolve: this.trpc.authedProcedure
          .input(AuditResolveInputSchema)
          .mutation(({ ctx, input }) =>
            this.auditService.resolve(ctx.tenantId, ctx.userId, input),
          ),

        complete: this.trpc.authedProcedure
          .input(z.object({ id: z.string().uuid() }))
          .mutation(({ ctx, input }) =>
            this.auditService.completeAudit(ctx.tenantId, ctx.userId, input.id),
          ),
      }),

      // ─── Dashboard ─────────────────────────────────────────
      dashboard: this.trpc.router({
        get: this.trpc.authedProcedure.query(async ({ ctx }) => {
          const [
            coverageReport,
            pendingHallmarks,
            expiringDocs,
            certifiedStonesPercent,
            insuranceSummary,
            upcomingAudits,
            recentHuids,
          ] = await Promise.all([
            this.huidService.getCoverageReport(ctx.tenantId),
            this.hallmarkService.getPendingCount(ctx.tenantId),
            this.documentService.getExpiringCount(ctx.tenantId, 30),
            this.certificateService.getCertifiedStonesPercent(ctx.tenantId),
            this.insuranceService.getCoverageSummary(ctx.tenantId),
            this.auditService.getUpcomingAudits(ctx.tenantId),
            this.huidService.list(ctx.tenantId, {
              page: 1, limit: 5, sortBy: 'registeredAt', sortOrder: 'desc',
            }),
          ]);

          return {
            huidCoveragePercent: coverageReport.coveragePercent,
            pendingHallmarks,
            expiringDocs,
            certifiedStonesPercent,
            insuranceCoverage: insuranceSummary.totalCoveredPaise,
            upcomingAudits,
            recentHuids: recentHuids.items,
          };
        }),
      }),
    });
  }
}
