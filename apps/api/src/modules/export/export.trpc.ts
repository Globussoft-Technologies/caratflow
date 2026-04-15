// ─── Export tRPC Router ───────────────────────────────────────────
// All tRPC procedures for the export & international trade module.

import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { TrpcService } from '../../trpc/trpc.service';
import { ExportService } from './export.service';
import { ExportInvoiceService } from './export.invoice.service';
import { ExportDocumentService } from './export.document.service';
import { ExportDutyService } from './export.duty.service';
import { ExportComplianceService } from './export.compliance.service';
import { ExportExchangeRateService } from './export.exchange-rate.service';
import {
  ExportOrderInputSchema,
  ExportOrderListFilterSchema,
  ExportOrderStatus,
  ExportInvoiceInputSchema,
  ExportInvoiceType,
  ShippingDocumentInputSchema,
  ShippingDocumentType,
  ShippingDocumentStatus,
  CustomsDutyCalculationSchema,
  ExchangeRateInputSchema,
  ExportComplianceCheckSchema,
  DgftLicenseInputSchema,
  DgftLicenseStatus,
  HsCodeSearchSchema,
  PaginationSchema,
} from '@caratflow/shared-types';

@Injectable()
export class ExportTrpcRouter {
  constructor(
    private readonly trpc: TrpcService,
    private readonly exportService: ExportService,
    private readonly invoiceService: ExportInvoiceService,
    private readonly documentService: ExportDocumentService,
    private readonly dutyService: ExportDutyService,
    private readonly complianceService: ExportComplianceService,
    private readonly exchangeRateService: ExportExchangeRateService,
  ) {}

  get router() {
    return this.trpc.router({
      // ─── Dashboard ────────────────────────────────────────────
      getDashboard: this.trpc.authedProcedure
        .query(({ ctx }) =>
          this.exportService.getDashboard(ctx.tenantId),
        ),

      // ─── Export Orders ────────────────────────────────────────
      createOrder: this.trpc.authedProcedure
        .input(ExportOrderInputSchema)
        .mutation(({ ctx, input }) =>
          this.exportService.createExportOrder(ctx.tenantId, ctx.userId, input),
        ),

      getOrder: this.trpc.authedProcedure
        .input(z.object({ orderId: z.string().uuid() }))
        .query(({ ctx, input }) =>
          this.exportService.getExportOrder(ctx.tenantId, input.orderId),
        ),

      listOrders: this.trpc.authedProcedure
        .input(z.object({
          filters: ExportOrderListFilterSchema.optional(),
          pagination: PaginationSchema.optional(),
        }))
        .query(({ ctx, input }) =>
          this.exportService.listExportOrders(
            ctx.tenantId,
            input.filters ?? {},
            input.pagination ?? { page: 1, limit: 20, sortOrder: 'desc' },
          ),
        ),

      confirmOrder: this.trpc.authedProcedure
        .input(z.object({ orderId: z.string().uuid() }))
        .mutation(({ ctx, input }) =>
          this.exportService.confirmOrder(ctx.tenantId, ctx.userId, input.orderId),
        ),

      updateOrderStatus: this.trpc.authedProcedure
        .input(z.object({
          orderId: z.string().uuid(),
          status: z.nativeEnum(ExportOrderStatus),
        }))
        .mutation(({ ctx, input }) =>
          this.exportService.updateOrderStatus(ctx.tenantId, ctx.userId, input.orderId, input.status),
        ),

      cancelOrder: this.trpc.authedProcedure
        .input(z.object({ orderId: z.string().uuid(), reason: z.string().min(1) }))
        .mutation(({ ctx, input }) =>
          this.exportService.cancelOrder(ctx.tenantId, ctx.userId, input.orderId, input.reason),
        ),

      // ─── Export Invoices ──────────────────────────────────────
      createInvoice: this.trpc.authedProcedure
        .input(ExportInvoiceInputSchema)
        .mutation(({ ctx, input }) =>
          this.invoiceService.createInvoice(ctx.tenantId, ctx.userId, input),
        ),

      getInvoice: this.trpc.authedProcedure
        .input(z.object({ invoiceId: z.string().uuid() }))
        .query(({ ctx, input }) =>
          this.invoiceService.getInvoice(ctx.tenantId, input.invoiceId),
        ),

      listInvoices: this.trpc.authedProcedure
        .input(z.object({
          filters: z.object({
            invoiceType: z.nativeEnum(ExportInvoiceType).optional(),
            exportOrderId: z.string().uuid().optional(),
            buyerId: z.string().uuid().optional(),
            search: z.string().optional(),
          }).optional(),
          pagination: PaginationSchema.optional(),
        }))
        .query(({ ctx, input }) =>
          this.invoiceService.listInvoices(
            ctx.tenantId,
            input.filters ?? {},
            input.pagination ?? { page: 1, limit: 20, sortOrder: 'desc' },
          ),
        ),

      // ─── Shipping Documents ───────────────────────────────────
      createDocument: this.trpc.authedProcedure
        .input(ShippingDocumentInputSchema)
        .mutation(({ ctx, input }) =>
          this.documentService.createDocument(ctx.tenantId, ctx.userId, input),
        ),

      getDocument: this.trpc.authedProcedure
        .input(z.object({ documentId: z.string().uuid() }))
        .query(({ ctx, input }) =>
          this.documentService.getDocument(ctx.tenantId, input.documentId),
        ),

      downloadDocumentPdf: this.trpc.authedProcedure
        .input(z.object({ docId: z.string().uuid() }))
        .query(async ({ ctx, input }) => {
          const buf = await this.documentService.renderDocumentPdf(
            ctx.tenantId,
            input.docId,
          );
          return {
            filename: `export-doc-${input.docId}.pdf`,
            mimeType: 'application/pdf',
            base64: buf.toString('base64'),
            size: buf.length,
          };
        }),

      listDocuments: this.trpc.authedProcedure
        .input(z.object({
          filters: z.object({
            exportOrderId: z.string().uuid().optional(),
            documentType: z.nativeEnum(ShippingDocumentType).optional(),
            status: z.nativeEnum(ShippingDocumentStatus).optional(),
          }).optional(),
          pagination: PaginationSchema.optional(),
        }))
        .query(({ ctx, input }) =>
          this.documentService.listDocuments(
            ctx.tenantId,
            input.filters ?? {},
            input.pagination ?? { page: 1, limit: 20, sortOrder: 'desc' },
          ),
        ),

      updateDocumentStatus: this.trpc.authedProcedure
        .input(z.object({
          documentId: z.string().uuid(),
          status: z.nativeEnum(ShippingDocumentStatus),
        }))
        .mutation(({ ctx, input }) =>
          this.documentService.updateDocumentStatus(ctx.tenantId, ctx.userId, input.documentId, input.status),
        ),

      generatePackingList: this.trpc.authedProcedure
        .input(z.object({ exportOrderId: z.string().uuid() }))
        .query(({ ctx, input }) =>
          this.documentService.generatePackingList(ctx.tenantId, input.exportOrderId),
        ),

      generateShippingBillData: this.trpc.authedProcedure
        .input(z.object({ invoiceId: z.string().uuid() }))
        .query(({ ctx, input }) =>
          this.documentService.generateShippingBillData(ctx.tenantId, input.invoiceId),
        ),

      generateCertificateOfOrigin: this.trpc.authedProcedure
        .input(z.object({ exportOrderId: z.string().uuid() }))
        .query(({ ctx, input }) =>
          this.documentService.generateCertificateOfOrigin(ctx.tenantId, input.exportOrderId),
        ),

      // ─── Customs Duty ─────────────────────────────────────────
      calculateDuty: this.trpc.authedProcedure
        .input(CustomsDutyCalculationSchema)
        .mutation(({ ctx, input }) =>
          this.dutyService.calculateDuty(ctx.tenantId, ctx.userId, input),
        ),

      searchHsCodes: this.trpc.authedProcedure
        .input(z.object({
          search: HsCodeSearchSchema.optional(),
          pagination: PaginationSchema.optional(),
        }))
        .query(({ input }) =>
          this.dutyService.searchHsCodes(
            input.search ?? { isActive: true },
            input.pagination ?? { page: 1, limit: 20, sortOrder: 'desc' },
          ),
        ),

      getHsCode: this.trpc.authedProcedure
        .input(z.object({ hsCode: z.string() }))
        .query(({ input }) =>
          this.dutyService.getHsCode(input.hsCode),
        ),

      // ─── DGFT Licenses ───────────────────────────────────────
      createLicense: this.trpc.authedProcedure
        .input(DgftLicenseInputSchema)
        .mutation(({ ctx, input }) =>
          this.dutyService.createLicense(ctx.tenantId, ctx.userId, input),
        ),

      getLicense: this.trpc.authedProcedure
        .input(z.object({ licenseId: z.string().uuid() }))
        .query(({ ctx, input }) =>
          this.dutyService.getLicense(ctx.tenantId, input.licenseId),
        ),

      listLicenses: this.trpc.authedProcedure
        .input(z.object({
          filters: z.object({
            status: z.nativeEnum(DgftLicenseStatus).optional(),
            licenseType: z.string().optional(),
          }).optional(),
          pagination: PaginationSchema.optional(),
        }))
        .query(({ ctx, input }) =>
          this.dutyService.listLicenses(
            ctx.tenantId,
            input.filters ?? {},
            input.pagination ?? { page: 1, limit: 20, sortOrder: 'desc' },
          ),
        ),

      utilizeLicense: this.trpc.authedProcedure
        .input(z.object({
          licenseId: z.string().uuid(),
          amountPaise: z.number().int().positive(),
        }))
        .mutation(({ ctx, input }) =>
          this.dutyService.utilizeLicense(ctx.tenantId, ctx.userId, input.licenseId, input.amountPaise),
        ),

      // ─── Exchange Rates ───────────────────────────────────────
      recordExchangeRate: this.trpc.authedProcedure
        .input(ExchangeRateInputSchema)
        .mutation(({ ctx, input }) =>
          this.exchangeRateService.recordRate(ctx.tenantId, ctx.userId, input),
        ),

      getCurrentRate: this.trpc.authedProcedure
        .input(z.object({
          fromCurrency: z.string().length(3),
          toCurrency: z.string().length(3),
        }))
        .query(({ ctx, input }) =>
          this.exchangeRateService.getCurrentRate(ctx.tenantId, input.fromCurrency, input.toCurrency),
        ),

      lockRateForInvoice: this.trpc.authedProcedure
        .input(z.object({
          fromCurrency: z.string().length(3),
          toCurrency: z.string().length(3),
        }))
        .query(({ ctx, input }) =>
          this.exchangeRateService.lockRateForInvoice(ctx.tenantId, input.fromCurrency, input.toCurrency),
        ),

      getHistoricalRates: this.trpc.authedProcedure
        .input(z.object({
          fromCurrency: z.string().length(3),
          toCurrency: z.string().length(3),
          pagination: PaginationSchema.optional(),
        }))
        .query(({ ctx, input }) =>
          this.exchangeRateService.getHistoricalRates(
            ctx.tenantId,
            input.fromCurrency,
            input.toCurrency,
            input.pagination ?? { page: 1, limit: 20, sortOrder: 'desc' },
          ),
        ),

      listExchangeRates: this.trpc.authedProcedure
        .input(z.object({
          pagination: PaginationSchema.optional(),
        }))
        .query(({ ctx, input }) =>
          this.exchangeRateService.listRates(
            ctx.tenantId,
            input.pagination ?? { page: 1, limit: 20, sortOrder: 'desc' },
          ),
        ),

      // ─── Compliance ───────────────────────────────────────────
      checkCompliance: this.trpc.authedProcedure
        .input(ExportComplianceCheckSchema)
        .query(({ input }) =>
          this.complianceService.checkCompliance(input),
        ),

      listComplianceRules: this.trpc.authedProcedure
        .input(z.object({
          destinationCountry: z.string().length(2).optional(),
        }).optional())
        .query(({ input }) =>
          this.complianceService.listComplianceRules(input ?? {}),
        ),

      checkExportReadiness: this.trpc.authedProcedure
        .input(z.object({ exportOrderId: z.string().uuid() }))
        .query(({ ctx, input }) =>
          this.complianceService.checkExportReadiness(ctx.tenantId, input.exportOrderId),
        ),
    });
  }
}
