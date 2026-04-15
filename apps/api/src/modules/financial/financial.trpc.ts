// ─── Financial tRPC Router ─────────────────────────────────────
// All financial module procedures: journal entries, invoices,
// payments, tax, reports, bank reconciliation.

import { Injectable } from '@nestjs/common';
import { TrpcService } from '../../trpc/trpc.service';
import { FinancialService } from './financial.service';
import { FinancialTaxService } from './financial.tax.service';
import { FinancialReportingService } from './financial.reporting.service';
import { FinancialBankService } from './financial.bank.service';
import { EInvoiceService } from './einvoice.service';
import { z } from 'zod';
import {
  JournalEntryInputSchema,
  JournalEntryListInputSchema,
  InvoiceInputSchema,
  InvoiceListInputSchema,
  PaymentInputSchema,
  PaymentListInputSchema,
  GstComputationInputSchema,
  TaxReportInputSchema,
  BankAccountInputSchema,
  ImportStatementInputSchema,
  BankReconciliationInputSchema,
  FinancialYearInputSchema,
  CostCenterInputSchema,
  BudgetInputSchema,
} from '@caratflow/shared-types';
import { DateRangeSchema, UuidSchema } from '@caratflow/shared-types';

@Injectable()
export class FinancialTrpcRouter {
  constructor(
    private readonly trpc: TrpcService,
    private readonly financialService: FinancialService,
    private readonly taxService: FinancialTaxService,
    private readonly reportingService: FinancialReportingService,
    private readonly bankService: FinancialBankService,
    private readonly einvoiceService: EInvoiceService,
  ) {}

  get router() {
    return this.trpc.router({
      // ─── Dashboard ──────────────────────────────────────────
      dashboard: this.trpc.authedProcedure.query(async ({ ctx }) => {
        return this.reportingService.getDashboard(ctx.tenantId);
      }),

      // ─── Journal Entries ────────────────────────────────────
      journal: this.trpc.router({
        create: this.trpc.authedProcedure
          .input(JournalEntryInputSchema)
          .mutation(async ({ ctx, input }) => {
            return this.financialService.createJournalEntry(ctx.tenantId, ctx.userId, input);
          }),

        post: this.trpc.authedProcedure
          .input(z.object({ id: UuidSchema }))
          .mutation(async ({ ctx, input }) => {
            return this.financialService.postJournalEntry(ctx.tenantId, ctx.userId, input.id);
          }),

        void: this.trpc.authedProcedure
          .input(z.object({ id: UuidSchema, reason: z.string().min(1) }))
          .mutation(async ({ ctx, input }) => {
            return this.financialService.voidJournalEntry(ctx.tenantId, ctx.userId, input.id, input.reason);
          }),

        getById: this.trpc.authedProcedure
          .input(z.object({ id: UuidSchema }))
          .query(async ({ ctx, input }) => {
            return this.financialService.getJournalEntry(ctx.tenantId, input.id);
          }),

        list: this.trpc.authedProcedure
          .input(JournalEntryListInputSchema)
          .query(async ({ ctx, input }) => {
            return this.financialService.listJournalEntries(ctx.tenantId, input);
          }),
      }),

      // ─── Invoices ───────────────────────────────────────────
      invoices: this.trpc.router({
        create: this.trpc.authedProcedure
          .input(InvoiceInputSchema)
          .mutation(async ({ ctx, input }) => {
            return this.financialService.createInvoice(ctx.tenantId, ctx.userId, input);
          }),

        updateStatus: this.trpc.authedProcedure
          .input(z.object({
            id: UuidSchema,
            status: z.enum(['SENT', 'CANCELLED', 'VOIDED']),
          }))
          .mutation(async ({ ctx, input }) => {
            return this.financialService.updateInvoiceStatus(ctx.tenantId, ctx.userId, input.id, input.status);
          }),

        getById: this.trpc.authedProcedure
          .input(z.object({ id: UuidSchema }))
          .query(async ({ ctx, input }) => {
            return this.financialService.getInvoice(ctx.tenantId, input.id);
          }),

        list: this.trpc.authedProcedure
          .input(InvoiceListInputSchema)
          .query(async ({ ctx, input }) => {
            return this.financialService.listInvoices(ctx.tenantId, input);
          }),

        downloadPdf: this.trpc.authedProcedure
          .input(z.object({ invoiceId: UuidSchema }))
          .query(async ({ ctx, input }) => {
            const buf = await this.financialService.generateInvoicePdf(
              ctx.tenantId,
              input.invoiceId,
            );
            return {
              filename: `invoice-${input.invoiceId}.pdf`,
              mimeType: 'application/pdf',
              base64: buf.toString('base64'),
              size: buf.length,
            };
          }),
      }),

      // ─── Payments ───────────────────────────────────────────
      payments: this.trpc.router({
        record: this.trpc.authedProcedure
          .input(PaymentInputSchema)
          .mutation(async ({ ctx, input }) => {
            return this.financialService.recordPayment(ctx.tenantId, ctx.userId, input);
          }),

        getById: this.trpc.authedProcedure
          .input(z.object({ id: UuidSchema }))
          .query(async ({ ctx, input }) => {
            return this.financialService.getPayment(ctx.tenantId, input.id);
          }),

        list: this.trpc.authedProcedure
          .input(PaymentListInputSchema)
          .query(async ({ ctx, input }) => {
            return this.financialService.listPayments(ctx.tenantId, input);
          }),
      }),

      // ─── Tax ────────────────────────────────────────────────
      tax: this.trpc.router({
        computeGst: this.trpc.authedProcedure
          .input(GstComputationInputSchema)
          .query(({ input }) => {
            return this.taxService.computeGst(input);
          }),

        gstr1: this.trpc.authedProcedure
          .input(TaxReportInputSchema)
          .query(async ({ ctx, input }) => {
            return this.taxService.generateGstr1Data(ctx.tenantId, input);
          }),

        gstr3b: this.trpc.authedProcedure
          .input(TaxReportInputSchema)
          .query(async ({ ctx, input }) => {
            return this.taxService.generateGstr3bData(ctx.tenantId, input);
          }),

        liability: this.trpc.authedProcedure
          .input(TaxReportInputSchema)
          .query(async ({ ctx, input }) => {
            return this.taxService.getTaxLiability(ctx.tenantId, input.period);
          }),
      }),

      // ─── Reports ────────────────────────────────────────────
      reports: this.trpc.router({
        profitAndLoss: this.trpc.authedProcedure
          .input(z.object({
            dateRange: DateRangeSchema,
            costCenterId: UuidSchema.optional(),
          }))
          .query(async ({ ctx, input }) => {
            return this.reportingService.profitAndLoss(ctx.tenantId, input.dateRange, input.costCenterId);
          }),

        balanceSheet: this.trpc.authedProcedure
          .input(z.object({ asOfDate: z.coerce.date() }))
          .query(async ({ ctx, input }) => {
            return this.reportingService.balanceSheet(ctx.tenantId, input.asOfDate);
          }),

        trialBalance: this.trpc.authedProcedure
          .input(z.object({ dateRange: DateRangeSchema }))
          .query(async ({ ctx, input }) => {
            return this.reportingService.trialBalance(ctx.tenantId, input.dateRange);
          }),

        cashFlow: this.trpc.authedProcedure
          .input(z.object({ dateRange: DateRangeSchema }))
          .query(async ({ ctx, input }) => {
            return this.reportingService.cashFlow(ctx.tenantId, input.dateRange);
          }),

        aging: this.trpc.authedProcedure
          .input(z.object({ type: z.enum(['AR', 'AP']) }))
          .query(async ({ ctx, input }) => {
            return this.reportingService.agingReport(ctx.tenantId, input.type);
          }),

        dayBook: this.trpc.authedProcedure
          .input(z.object({ date: z.coerce.date() }))
          .query(async ({ ctx, input }) => {
            return this.reportingService.dayBook(ctx.tenantId, input.date);
          }),
      }),

      // ─── Bank ───────────────────────────────────────────────
      bank: this.trpc.router({
        createAccount: this.trpc.authedProcedure
          .input(BankAccountInputSchema)
          .mutation(async ({ ctx, input }) => {
            return this.bankService.createBankAccount(ctx.tenantId, ctx.userId, input);
          }),

        listAccounts: this.trpc.authedProcedure.query(async ({ ctx }) => {
          return this.bankService.listBankAccounts(ctx.tenantId);
        }),

        getAccount: this.trpc.authedProcedure
          .input(z.object({ id: UuidSchema }))
          .query(async ({ ctx, input }) => {
            return this.bankService.getBankAccount(ctx.tenantId, input.id);
          }),

        importStatement: this.trpc.authedProcedure
          .input(ImportStatementInputSchema)
          .mutation(async ({ ctx, input }) => {
            return this.bankService.importStatement(ctx.tenantId, input);
          }),

        autoReconcile: this.trpc.authedProcedure
          .input(z.object({ bankAccountId: UuidSchema }))
          .mutation(async ({ ctx, input }) => {
            return this.bankService.autoReconcile(ctx.tenantId, input.bankAccountId);
          }),

        manualReconcile: this.trpc.authedProcedure
          .input(BankReconciliationInputSchema)
          .mutation(async ({ ctx, input }) => {
            return this.bankService.manualReconcile(ctx.tenantId, input);
          }),

        listTransactions: this.trpc.authedProcedure
          .input(z.object({
            bankAccountId: UuidSchema,
            page: z.number().int().min(1).default(1),
            limit: z.number().int().min(1).max(100).default(20),
            isReconciled: z.boolean().optional(),
          }))
          .query(async ({ ctx, input }) => {
            return this.bankService.listBankTransactions(ctx.tenantId, input.bankAccountId, input);
          }),
      }),

      // ─── E-Invoice (NIC IRP) ────────────────────────────────
      einvoice: this.trpc.router({
        submit: this.trpc.authedProcedure
          .input(z.object({ invoiceId: UuidSchema }))
          .mutation(async ({ ctx, input }) => {
            return this.einvoiceService.submitToIrp(ctx.tenantId, input.invoiceId);
          }),

        cancel: this.trpc.authedProcedure
          .input(z.object({
            invoiceId: UuidSchema,
            reason: z.string().min(1).max(10),
            remarks: z.string().min(1).max(255),
          }))
          .mutation(async ({ ctx, input }) => {
            return this.einvoiceService.cancelEInvoice(
              ctx.tenantId,
              input.invoiceId,
              input.reason,
              input.remarks,
            );
          }),

        status: this.trpc.authedProcedure
          .input(z.object({ invoiceId: UuidSchema }))
          .query(async ({ ctx, input }) => {
            return this.einvoiceService.getEInvoiceStatus(ctx.tenantId, input.invoiceId);
          }),

        previewPayload: this.trpc.authedProcedure
          .input(z.object({ invoiceId: UuidSchema }))
          .query(async ({ ctx, input }) => {
            return this.einvoiceService.prepareInvoicePayload(ctx.tenantId, input.invoiceId);
          }),
      }),

      // ─── Ledger ─────────────────────────────────────────────
      ledger: this.trpc.authedProcedure
        .input(z.object({
          accountId: UuidSchema,
          dateRange: DateRangeSchema,
        }))
        .query(async ({ ctx, input }) => {
          return this.financialService.getLedger(ctx.tenantId, input.accountId, input.dateRange);
        }),

      accountBalance: this.trpc.authedProcedure
        .input(z.object({
          accountId: UuidSchema,
          dateRange: DateRangeSchema.optional(),
        }))
        .query(async ({ ctx, input }) => {
          return this.financialService.getAccountBalance(ctx.tenantId, input.accountId, input.dateRange);
        }),
    });
  }
}
