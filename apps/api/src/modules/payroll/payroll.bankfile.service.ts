// ─── Payroll Bank File Service ────────────────────────────────
// Generates a simple NEFT CSV for a payroll period.

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { TenantAwareService } from '../../common/base.service';
import { PrismaService } from '../../common/prisma.service';
import type { BankFileRow } from '@caratflow/shared-types';

@Injectable()
export class PayrollBankFileService extends TenantAwareService {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async generate(
    tenantId: string,
    periodId: string,
  ): Promise<{ rows: BankFileRow[]; csv: string; totalPaise: string; filename: string }> {
    const period = await this.prisma.payrollPeriod.findFirst({
      where: { id: periodId, tenantId },
    });
    if (!period) throw new NotFoundException(`Payroll period ${periodId} not found`);
    if (period.status === 'DRAFT') {
      throw new BadRequestException('Period must be processed before bank file generation');
    }

    const payslips = await this.prisma.payslip.findMany({
      where: { tenantId, payrollPeriodId: periodId },
      include: { employee: true },
    });

    const rows: BankFileRow[] = [];
    let total = 0n;
    for (const p of payslips) {
      if (!p.employee.bankAccountNumber || !p.employee.bankIfsc) continue;
      rows.push({
        accountNumber: p.employee.bankAccountNumber,
        ifsc: p.employee.bankIfsc,
        name: `${p.employee.firstName} ${p.employee.lastName}`,
        amountPaise: p.netSalary.toString(),
        narration: `Salary ${period.periodLabel}`,
      });
      total += p.netSalary;
    }

    const header = 'account_number,ifsc,name,amount_inr,narration';
    const body = rows
      .map((r) => {
        const amt = (Number(r.amountPaise) / 100).toFixed(2);
        return [r.accountNumber, r.ifsc, `"${r.name}"`, amt, `"${r.narration}"`].join(',');
      })
      .join('\n');
    const csv = [header, body].filter(Boolean).join('\n') + '\n';

    return {
      rows,
      csv,
      totalPaise: total.toString(),
      filename: `neft-${period.periodLabel}.csv`,
    };
  }
}
