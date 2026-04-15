// ─── Payroll Payslip Service ──────────────────────────────────
// List/get payslips, generate PDF (HTML fallback), email to employee.
// PDF + email integrations are soft — if a PdfService/EmailService
// is added later we can wire them via forwardRef.

import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { TenantAwareService } from '../../common/base.service';
import { PrismaService } from '../../common/prisma.service';

export interface PayslipQuery {
  payrollPeriodId?: string;
  employeeId?: string;
  status?: string;
}

@Injectable()
export class PayrollPayslipService extends TenantAwareService {
  private readonly logger = new Logger(PayrollPayslipService.name);

  constructor(prisma: PrismaService) {
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
   * Generate a payslip. Returns HTML by default.
   * TODO: when PdfService is available, inject via forwardRef and
   * render via PdfService.render(html).
   */
  async generatePayslip(
    tenantId: string,
    id: string,
  ): Promise<{ format: 'HTML' | 'PDF'; content: string; filename: string }> {
    const p = await this.getById(tenantId, id);
    const html = this.renderHtml(p);
    // TODO: wire PdfService via forwardRef when available (parallel agent)
    return {
      format: 'HTML',
      content: html,
      filename: `payslip-${p.employee.employeeCode}-${p.payrollPeriod.periodLabel}.html`,
    };
  }

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

  /**
   * Email payslip to employee.
   * TODO: wire EmailService via forwardRef when available (parallel agent).
   * For now, log + return a simulated success.
   */
  async emailPayslip(tenantId: string, id: string, toEmail?: string): Promise<{ sent: boolean; to: string }> {
    const p = await this.getById(tenantId, id);
    const to = toEmail ?? `${p.employee.employeeCode}@example.com`;
    this.logger.log(`[stub] email payslip ${id} to ${to}`);
    // TODO: replace with EmailService.send({ to, subject, html })
    return { sent: true, to };
  }
}
