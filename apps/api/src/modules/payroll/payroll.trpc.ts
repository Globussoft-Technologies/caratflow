// ─── Payroll tRPC Router ──────────────────────────────────────

import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { TrpcService } from '../../trpc/trpc.service';
import { PayrollEmployeeService } from './payroll.employee.service';
import { PayrollAttendanceService } from './payroll.attendance.service';
import { PayrollSalaryService } from './payroll.salary.service';
import { PayrollProcessingService } from './payroll.processing.service';
import { PayrollPayslipService } from './payroll.payslip.service';
import { PayrollBankFileService } from './payroll.bankfile.service';
import {
  EmployeeInputSchema,
  EmployeeUpdateSchema,
  AttendanceInputSchema,
  BulkAttendanceInputSchema,
  PayrollPeriodInputSchema,
  SalaryStructureInputSchema,
  UuidSchema,
  EmployeeStatus,
} from '@caratflow/shared-types';

@Injectable()
export class PayrollTrpcRouter {
  constructor(
    private readonly trpc: TrpcService,
    private readonly employeeService: PayrollEmployeeService,
    private readonly attendanceService: PayrollAttendanceService,
    private readonly salaryService: PayrollSalaryService,
    private readonly processingService: PayrollProcessingService,
    private readonly payslipService: PayrollPayslipService,
    private readonly bankFileService: PayrollBankFileService,
  ) {}

  get router() {
    const t = this.trpc;
    return t.router({
      // ─── Employees ─────────────────────────────────────────
      employees: t.router({
        list: t.authedProcedure
          .input(
            z
              .object({
                page: z.number().int().min(1).default(1),
                limit: z.number().int().min(1).max(100).default(20),
                status: z.nativeEnum(EmployeeStatus).optional(),
                search: z.string().optional(),
                branchId: UuidSchema.optional(),
              })
              .optional(),
          )
          .query(({ ctx, input }) =>
            this.employeeService.list(ctx.tenantId, input ?? {}),
          ),

        get: t.authedProcedure
          .input(z.object({ id: UuidSchema }))
          .query(({ ctx, input }) => this.employeeService.getById(ctx.tenantId, input.id)),

        create: t.authedProcedure
          .input(EmployeeInputSchema)
          .mutation(({ ctx, input }) => this.employeeService.create(ctx.tenantId, input)),

        update: t.authedProcedure
          .input(z.object({ id: UuidSchema, data: EmployeeUpdateSchema }))
          .mutation(({ ctx, input }) =>
            this.employeeService.update(ctx.tenantId, input.id, input.data),
          ),

        deactivate: t.authedProcedure
          .input(z.object({ id: UuidSchema }))
          .mutation(({ ctx, input }) =>
            this.employeeService.deactivate(ctx.tenantId, input.id),
          ),

        bulkImport: t.authedProcedure
          .input(z.object({ csv: z.string().min(1) }))
          .mutation(({ ctx, input }) =>
            this.employeeService.bulkImport(ctx.tenantId, input.csv),
          ),
      }),

      // ─── Attendance ────────────────────────────────────────
      attendance: t.router({
        list: t.authedProcedure
          .input(
            z
              .object({
                employeeId: UuidSchema.optional(),
                startDate: z.coerce.date().optional(),
                endDate: z.coerce.date().optional(),
              })
              .optional(),
          )
          .query(({ ctx, input }) =>
            this.attendanceService.list(ctx.tenantId, input ?? {}),
          ),

        markDay: t.authedProcedure
          .input(AttendanceInputSchema)
          .mutation(({ ctx, input }) => this.attendanceService.markDay(ctx.tenantId, input)),

        markBulk: t.authedProcedure
          .input(BulkAttendanceInputSchema)
          .mutation(({ ctx, input }) => this.attendanceService.markBulk(ctx.tenantId, input)),

        monthlySummary: t.authedProcedure
          .input(z.object({ employeeId: UuidSchema, yearMonth: z.string() }))
          .query(({ ctx, input }) =>
            this.attendanceService.monthlySummary(ctx.tenantId, input.employeeId, input.yearMonth),
          ),
      }),

      // ─── Salary Structures ─────────────────────────────────
      salaryStructures: t.router({
        list: t.authedProcedure.query(({ ctx }) => this.salaryService.list(ctx.tenantId)),

        get: t.authedProcedure
          .input(z.object({ id: UuidSchema }))
          .query(({ ctx, input }) => this.salaryService.getById(ctx.tenantId, input.id)),

        create: t.authedProcedure
          .input(SalaryStructureInputSchema)
          .mutation(({ ctx, input }) => this.salaryService.create(ctx.tenantId, input)),

        update: t.authedProcedure
          .input(z.object({ id: UuidSchema, data: SalaryStructureInputSchema.partial() }))
          .mutation(({ ctx, input }) =>
            this.salaryService.update(ctx.tenantId, input.id, input.data),
          ),

        assign: t.authedProcedure
          .input(z.object({ id: UuidSchema, employeeId: UuidSchema }))
          .mutation(({ ctx, input }) =>
            this.salaryService.assign(ctx.tenantId, input.id, input.employeeId),
          ),
      }),

      // ─── Payroll Periods ───────────────────────────────────
      payrollPeriods: t.router({
        list: t.authedProcedure.query(({ ctx }) => this.processingService.listPeriods(ctx.tenantId)),

        get: t.authedProcedure
          .input(z.object({ id: UuidSchema }))
          .query(({ ctx, input }) => this.processingService.getPeriod(ctx.tenantId, input.id)),

        create: t.authedProcedure
          .input(PayrollPeriodInputSchema)
          .mutation(({ ctx, input }) => this.processingService.createPeriod(ctx.tenantId, input)),

        process: t.authedProcedure
          .input(z.object({ id: UuidSchema }))
          .mutation(({ ctx, input }) =>
            this.processingService.processPayroll(ctx.tenantId, input.id, ctx.userId),
          ),

        approve: t.authedProcedure
          .input(z.object({ id: UuidSchema }))
          .mutation(({ ctx, input }) =>
            this.processingService.approvePeriod(ctx.tenantId, input.id),
          ),

        close: t.authedProcedure
          .input(z.object({ id: UuidSchema }))
          .mutation(({ ctx, input }) =>
            this.processingService.closePeriod(ctx.tenantId, input.id),
          ),

        cancel: t.authedProcedure
          .input(z.object({ id: UuidSchema }))
          .mutation(({ ctx, input }) =>
            this.processingService.cancelPeriod(ctx.tenantId, input.id),
          ),
      }),

      // ─── Payslips ──────────────────────────────────────────
      payslips: t.router({
        list: t.authedProcedure
          .input(
            z
              .object({
                payrollPeriodId: UuidSchema.optional(),
                employeeId: UuidSchema.optional(),
                status: z.string().optional(),
              })
              .optional(),
          )
          .query(({ ctx, input }) => this.payslipService.list(ctx.tenantId, input ?? {})),

        get: t.authedProcedure
          .input(z.object({ id: UuidSchema }))
          .query(({ ctx, input }) => this.payslipService.getById(ctx.tenantId, input.id)),

        // Legacy HTML-rendered "downloadPdf" endpoint preserved for
        // backwards compatibility with older clients. Prefer
        // `downloadPdfBinary` (below) or the REST endpoint
        // `GET /api/v1/payroll/payslips/:id/pdf` for real PDFs.
        downloadPdf: t.authedProcedure
          .input(z.object({ id: UuidSchema }))
          .query(({ ctx, input }) => this.payslipService.generatePayslip(ctx.tenantId, input.id)),

        // Real PDF — returns `{ filename, mimeType, base64 }` so the
        // client can build a Blob and trigger a download in the browser.
        downloadPdfBinary: t.authedProcedure
          .input(z.object({ payslipId: UuidSchema }))
          .query(({ ctx, input }) =>
            this.payslipService.downloadPdf(ctx.tenantId, input.payslipId),
          ),

        emailToEmployee: t.authedProcedure
          .input(z.object({ id: UuidSchema, toEmail: z.string().email().optional() }))
          .mutation(({ ctx, input }) =>
            this.payslipService.emailPayslip(ctx.tenantId, input.id, input.toEmail),
          ),

        // Real email delivery with PDF attachment via SendGrid.
        email: t.authedProcedure
          .input(
            z.object({
              payslipId: UuidSchema,
              toEmail: z.string().email().optional(),
            }),
          )
          .mutation(({ ctx, input }) =>
            this.payslipService.emailPayslipToEmployee(
              ctx.tenantId,
              input.payslipId,
              input.toEmail,
            ),
          ),
      }),

      // ─── Bank File ─────────────────────────────────────────
      bankFile: t.router({
        generate: t.authedProcedure
          .input(z.object({ periodId: UuidSchema }))
          .mutation(({ ctx, input }) =>
            this.bankFileService.generate(ctx.tenantId, input.periodId),
          ),

        download: t.authedProcedure
          .input(z.object({ periodId: UuidSchema }))
          .query(({ ctx, input }) =>
            this.bankFileService.generate(ctx.tenantId, input.periodId),
          ),
      }),
    });
  }
}
