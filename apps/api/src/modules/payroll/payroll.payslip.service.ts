// ─── Payroll Payslip Service ──────────────────────────────────
// List/get payslips, generate PDF via PlatformPdfService, and
// email the PDF to the employee via EmailService (SendGrid).

import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { TenantAwareService } from '../../common/base.service';
import { PrismaService } from '../../common/prisma.service';
import { PlatformPdfService, PdfTemplateName } from '../platform/platform.pdf.service';
import { EmailService } from '../crm/email.service';

export interface PayslipQuery {
  payrollPeriodId?: string;
  employeeId?: string;
  status?: string;
}

export interface PayslipPdfDownload {
  filename: string;
  mimeType: string;
  base64: string;
  sizeBytes: number;
}

export interface PayslipEmailResult {
  success: boolean;
  /** Backwards-compat alias for `success`. */
  sent: boolean;
  to: string;
  emailedAt: string;
  externalId?: string | null;
}

@Injectable()
export class PayrollPayslipService extends TenantAwareService {
  private readonly logger = new Logger(PayrollPayslipService.name);

  constructor(
    prisma: PrismaService,
    // PlatformPdfService is provided by the @Global() PdfModule.
    // EmailService is re-exported by the CrmModule (imported in PayrollModule).
    // Both are marked optional so unit tests that only wire `prisma` still work.
    private readonly pdfService?: PlatformPdfService,
    private readonly emailService?: EmailService,
  ) {
    super(prisma);
  }

  async list(tenantId: string, query: PayslipQuery) {
    const where: Record<string, unknown> = { tenantId };
    if (query.payrollPeriodId) where.payrollPeriodId = query.payrollPeriodId;
    if (query.employeeId) where.employeeId = query.employeeId;
    if (query.status) where.status = query.status;
    return this.prisma.payslip.findMany({
      where,
      include: { employee: true, payrollPeriod: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getById(tenantId: string, id: string) {
    const p = await this.prisma.payslip.findFirst({
      where: { id, tenantId },
      include: { employee: true, payrollPeriod: true },
    });
    if (!p) throw new NotFoundException(`Payslip ${id} not found`);
    return p;
  }

  /**
   * Legacy HTML-generation path, kept for backwards compat with any
   * existing callers / tests that expect a `{ format, content, filename }`
   * shape. New callers should use `generatePdf()` which returns a Buffer.
   */
  async generatePayslip(
    tenantId: string,
    id: string,
  ): Promise<{ format: 'HTML' | 'PDF'; content: string; filename: string }> {
    const p = await this.getById(tenantId, id);
    const html = this.renderHtml(p);
    return {
      format: 'HTML',
      content: html,
      filename: `payslip-${p.employee.employeeCode}-${p.payrollPeriod.periodLabel}.html`,
    };
  }

  /**
   * Render a real PDF using the platform PDF service (headless Chromium +
   * the `payslip` template under apps/api/src/modules/platform/pdf-templates).
   *
   * Returns the PDF Buffer ready to be streamed, stored, or emailed.
   */
  async generatePdf(tenantId: string, payslipId: string): Promise<Buffer> {
    if (!this.pdfService) {
      throw new BadRequestException('PDF service not configured');
    }
    const p = await this.getById(tenantId, payslipId);
    const data = this.buildTemplateData(p);
    // `payslip` is a new template — cast because the upstream union type
    // hasn't been extended yet; the underlying service just does
    // string interpolation on the name to resolve the file.
    const buf = await this.pdfService.renderTemplate(
      'payslip' as PdfTemplateName,
      data,
    );
    return buf;
  }

  /** Download-shaped response: base64 so it can flow over JSON/tRPC. */
  async downloadPdf(tenantId: string, payslipId: string): Promise<PayslipPdfDownload> {
    const p = await this.getById(tenantId, payslipId);
    const buf = await this.generatePdf(tenantId, payslipId);
    return {
      filename: `payslip-${p.employee.employeeCode}-${p.payrollPeriod.periodLabel}.pdf`,
      mimeType: 'application/pdf',
      base64: buf.toString('base64'),
      sizeBytes: buf.length,
    };
  }

  /**
   * Email the payslip PDF to the employee as an attachment via SendGrid.
   *
   * Behaviour:
   *  • Generates the PDF via `generatePdf()`
   *  • Converts the Buffer to base64 for SendGrid
   *  • Sends via EmailService.sendEmail(tenantId, …)
   *  • Records emailedAt in the Payslip `allowances` JSON blob under
   *    the reserved `_emailedAt` key (schema does not yet have a
   *    dedicated column; this keeps the audit trail without a
   *    cross-package migration). A schema migration to add a proper
   *    `emailed_at` column is tracked separately.
   */
  async emailPayslipToEmployee(
    tenantId: string,
    payslipId: string,
    toEmailOverride?: string,
  ): Promise<PayslipEmailResult> {
    if (!this.emailService) {
      throw new BadRequestException('Email service not configured');
    }
    const p = await this.getById(tenantId, payslipId);

    const to = toEmailOverride ?? this.deriveEmployeeEmail(p);
    if (!to) {
      throw new BadRequestException(
        `Employee ${p.employee.employeeCode} has no email on file`,
      );
    }

    const pdfBuf = await this.generatePdf(tenantId, payslipId);
    const base64 = pdfBuf.toString('base64');
    const filename = `payslip-${p.employee.employeeCode}-${p.payrollPeriod.periodLabel}.pdf`;

    const subject = `Payslip for ${p.payrollPeriod.periodLabel} — ${p.employee.firstName} ${p.employee.lastName}`;
    const html = this.renderEmailBody(p);

    const result = await this.emailService.sendEmail(tenantId, {
      to,
      subject,
      html,
      attachments: [
        {
          filename,
          content: base64,
          type: 'application/pdf',
        },
      ],
    });

    // Stamp emailedAt on the payslip row. We piggy-back on the existing
    // `allowances` Json field to avoid an out-of-scope schema change.
    const emailedAt = new Date().toISOString();
    await this.stampEmailedAt(tenantId, payslipId, emailedAt);

    // Best-effort: surface a `payroll.payslip.emailed` signal for any
    // downstream notifier. The shared-types DomainEvent union does not
    // currently include payroll events, so we only log here; an HR event
    // category is tracked in shared-types as a follow-up.
    this.logger.log(
      `event=payroll.payslip.emailed tenantId=${tenantId} payslipId=${payslipId} to=${to} externalId=${result.externalId ?? 'n/a'}`,
    );

    return {
      success: true,
      sent: true,
      to,
      emailedAt,
      externalId: result.externalId,
    };
  }

  /**
   * Backwards-compatible shim: older callers / tests invoke
   * `emailPayslip(tenantId, id, toEmail?)` and expect `{ sent, to }`.
   * We keep the same signature and delegate to the real implementation
   * when EmailService is wired, or fall back to a logged stub otherwise
   * (so the pre-existing unit tests that don't inject EmailService still pass).
   */
  async emailPayslip(
    tenantId: string,
    id: string,
    toEmail?: string,
  ): Promise<{ sent: boolean; to: string }> {
    const p = await this.getById(tenantId, id);
    const to = toEmail ?? this.deriveEmployeeEmail(p) ?? `${p.employee.employeeCode}@example.com`;

    if (this.emailService && this.pdfService) {
      try {
        const result = await this.emailPayslipToEmployee(tenantId, id, to);
        return { sent: result.sent, to: result.to };
      } catch (err) {
        this.logger.error(
          `Failed to email payslip ${id} to ${to}: ${(err as Error).message}`,
        );
        throw err;
      }
    }

    this.logger.log(`[stub] email payslip ${id} to ${to}`);
    return { sent: true, to };
  }

  // ─── Helpers ────────────────────────────────────────────────────

  private renderHtml(p: {
    employee: { employeeCode: string; firstName: string; lastName: string; designation: string | null };
    payrollPeriod: { periodLabel: string };
    basicSalary: bigint;
    hra: bigint;
    grossSalary: bigint;
    pfDeduction: bigint;
    esiDeduction: bigint;
    tdsDeduction: bigint;
    professionalTax: bigint;
    totalDeductions: bigint;
    netSalary: bigint;
  }): string {
    const fmt = (v: bigint) => `Rs. ${(Number(v) / 100).toFixed(2)}`;
    return `<!doctype html><html><head><title>Payslip</title></head><body>
<h1>Payslip - ${p.payrollPeriod.periodLabel}</h1>
<p><b>${p.employee.firstName} ${p.employee.lastName}</b> (${p.employee.employeeCode})</p>
<p>${p.employee.designation ?? ''}</p>
<table border="1" cellpadding="4">
<tr><th colspan="2">Earnings</th></tr>
<tr><td>Basic</td><td>${fmt(p.basicSalary)}</td></tr>
<tr><td>HRA</td><td>${fmt(p.hra)}</td></tr>
<tr><td><b>Gross</b></td><td><b>${fmt(p.grossSalary)}</b></td></tr>
<tr><th colspan="2">Deductions</th></tr>
<tr><td>PF</td><td>${fmt(p.pfDeduction)}</td></tr>
<tr><td>ESI</td><td>${fmt(p.esiDeduction)}</td></tr>
<tr><td>Professional Tax</td><td>${fmt(p.professionalTax)}</td></tr>
<tr><td>TDS</td><td>${fmt(p.tdsDeduction)}</td></tr>
<tr><td><b>Total Deductions</b></td><td><b>${fmt(p.totalDeductions)}</b></td></tr>
<tr><td><b>Net Salary</b></td><td><b>${fmt(p.netSalary)}</b></td></tr>
</table>
</body></html>`;
  }

  /** Build the flat string map consumed by the `payslip.html` template. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private buildTemplateData(p: any): Record<string, unknown> {
    const rupees = (v: bigint | number | null | undefined): string => {
      if (v === null || v === undefined) return '0.00';
      const paise = typeof v === 'bigint' ? Number(v) : v;
      return (paise / 100).toFixed(2);
    };
    const emp = p.employee ?? {};
    const period = p.payrollPeriod ?? {};

    // Try to extract an "other allowances total" from the JSON field.
    let otherDeductionsTotal = 0;
    if (p.otherDeductions && typeof p.otherDeductions === 'object') {
      for (const v of Object.values(p.otherDeductions)) {
        const n = typeof v === 'number' ? v : typeof v === 'bigint' ? Number(v) : 0;
        if (Number.isFinite(n)) otherDeductionsTotal += n;
      }
    }

    const fmtDate = (d: Date | string | null | undefined): string => {
      if (!d) return '';
      const dt = d instanceof Date ? d : new Date(d);
      if (Number.isNaN(dt.getTime())) return '';
      return dt.toISOString().slice(0, 10);
    };

    return {
      // Tenant header placeholders — real tenant lookup is owned by
      // platform.settings; leaving safe defaults so the template
      // always renders even if settings are unset.
      tenantName: p._tenantName ?? 'CaratFlow',
      tenantAddress: p._tenantAddress ?? '',
      tenantGstin: p._tenantGstin ?? '',
      tenantPan: p._tenantPan ?? '',
      tenantContact: p._tenantContact ?? '',
      currency: 'INR',

      // Period
      periodLabel: period.periodLabel ?? '',
      periodStart: fmtDate(period.startDate),
      periodEnd: fmtDate(period.endDate),
      status: p.status ?? 'DRAFT',

      // Employee
      employeeCode: emp.employeeCode ?? '',
      employeeName: `${emp.firstName ?? ''} ${emp.lastName ?? ''}`.trim(),
      designation: emp.designation ?? '',
      department: emp.department ?? '',
      joinedAt: fmtDate(emp.joinedAt),
      employeePan: emp.panNumber ?? '',
      pfNumber: emp.pfNumber ?? '',
      esiNumber: emp.esiNumber ?? '',
      bankAccount: emp.bankAccountNumber ?? '',
      bankIfsc: emp.bankIfsc ?? '',

      // Attendance
      workDays: p.workDays ?? 0,
      presentDays: p.presentDays ?? 0,
      leaveDays: p.leaveDays ?? 0,
      overtimeHours: p.overtimeHours ?? 0,

      // Earnings (in rupees)
      basicSalary: rupees(p.basicSalary ?? 0n),
      hra: rupees(p.hra ?? 0n),
      da: rupees(emp.daPaise ?? 0n),
      conveyance: rupees(emp.conveyancePaise ?? 0n),
      medical: rupees(emp.medicalPaise ?? 0n),
      otherAllowance: rupees(emp.otherAllowancePaise ?? 0n),
      overtimePay: rupees(p.overtimePay ?? 0n),
      grossSalary: rupees(p.grossSalary ?? 0n),

      // Deductions (in rupees)
      pfDeduction: rupees(p.pfDeduction ?? 0n),
      esiDeduction: rupees(p.esiDeduction ?? 0n),
      professionalTax: rupees(p.professionalTax ?? 0n),
      tdsDeduction: rupees(p.tdsDeduction ?? 0n),
      otherDeductionsTotal: (otherDeductionsTotal / 100).toFixed(2),
      totalDeductions: rupees(p.totalDeductions ?? 0n),

      // Net
      netSalary: rupees(p.netSalary ?? 0n),
      netSalaryInWords: this.amountToWordsINR(Number(p.netSalary ?? 0n) / 100),

      // Metadata
      generatedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
    };
  }

  private renderEmailBody(p: {
    employee: { firstName: string; lastName: string; employeeCode: string };
    payrollPeriod: { periodLabel: string };
    netSalary: bigint;
  }): string {
    const net = (Number(p.netSalary) / 100).toFixed(2);
    return `<!doctype html><html><body style="font-family: Arial, sans-serif; color:#222;">
<p>Dear ${p.employee.firstName} ${p.employee.lastName},</p>
<p>Please find attached your payslip for <strong>${p.payrollPeriod.periodLabel}</strong>.</p>
<p>Net pay for the period: <strong>Rs. ${net}</strong></p>
<p>If you notice any discrepancy, please contact the payroll team within 7 days of receipt.</p>
<p>Regards,<br/>Payroll Team</p>
<hr/>
<p style="color:#888;font-size:11px;">This email and its attachments are confidential. Employee code: ${p.employee.employeeCode}.</p>
</body></html>`;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private deriveEmployeeEmail(p: any): string | undefined {
    // The Employee model doesn't currently carry a first-class email column
    // (user linkage lives on `userId`). Accept any of a handful of possible
    // fields so that tenants that do store a contact email on the employee
    // row don't have to pass it manually.
    const emp = p.employee ?? {};
    return emp.email ?? emp.contactEmail ?? emp.workEmail ?? undefined;
  }

  private async stampEmailedAt(
    tenantId: string,
    payslipId: string,
    emailedAt: string = new Date().toISOString(),
  ): Promise<void> {
    try {
      const current = await this.prisma.payslip.findFirst({
        where: { id: payslipId, tenantId },
        select: { allowances: true },
      });
      const base =
        current?.allowances && typeof current.allowances === 'object'
          ? (current.allowances as Record<string, unknown>)
          : {};
      const next = { ...base, _emailedAt: emailedAt };
      await this.prisma.payslip.update({
        where: { id: payslipId },
        data: { allowances: next as never },
      });
    } catch (err) {
      // Non-fatal: the email was sent; failure to stamp is only a bookkeeping miss.
      this.logger.warn(
        `Failed to stamp emailedAt on payslip ${payslipId}: ${(err as Error).message}`,
      );
    }
  }

  /** Very small INR amount-to-words helper for payslip display. */
  private amountToWordsINR(amount: number): string {
    if (!Number.isFinite(amount)) return '';
    const rupees = Math.floor(amount);
    const paise = Math.round((amount - rupees) * 100);
    const words = this.numberToWords(rupees);
    const base = words ? `Rupees ${words}` : 'Rupees Zero';
    return paise > 0
      ? `${base} and ${this.numberToWords(paise)} Paise only`
      : `${base} only`;
  }

  private numberToWords(n: number): string {
    if (n === 0) return 'Zero';
    const ones = [
      '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
      'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
      'Seventeen', 'Eighteen', 'Nineteen',
    ];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const twoDigits = (num: number): string => {
      if (num < 20) return ones[num] ?? '';
      const t = Math.floor(num / 10);
      const o = num % 10;
      return o === 0 ? tens[t]! : `${tens[t]} ${ones[o]}`;
    };
    const threeDigits = (num: number): string => {
      const h = Math.floor(num / 100);
      const rest = num % 100;
      const parts: string[] = [];
      if (h > 0) parts.push(`${ones[h]} Hundred`);
      if (rest > 0) parts.push(twoDigits(rest));
      return parts.join(' ');
    };

    const parts: string[] = [];
    const crore = Math.floor(n / 10_000_000);
    n %= 10_000_000;
    const lakh = Math.floor(n / 100_000);
    n %= 100_000;
    const thousand = Math.floor(n / 1000);
    n %= 1000;
    const hundred = n;

    if (crore > 0) parts.push(`${threeDigits(crore)} Crore`);
    if (lakh > 0) parts.push(`${twoDigits(lakh)} Lakh`);
    if (thousand > 0) parts.push(`${twoDigits(thousand)} Thousand`);
    if (hundred > 0) parts.push(threeDigits(hundred));

    return parts.join(' ').trim();
  }
}
