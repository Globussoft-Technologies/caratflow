// ─── Payroll Processing Service ───────────────────────────────
// Iterate employees, compute payslip per salary structure + attendance,
// persist Payslip rows, transition period status.

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { TenantAwareService } from '../../common/base.service';
import { PrismaService } from '../../common/prisma.service';
import { PayrollSalaryService } from './payroll.salary.service';
import { PayrollAttendanceService } from './payroll.attendance.service';
import type { PayrollPeriodInput, PayrollProcessingResult } from '@caratflow/shared-types';

@Injectable()
export class PayrollProcessingService extends TenantAwareService {
  constructor(
    prisma: PrismaService,
    private readonly salaryService: PayrollSalaryService,
    private readonly attendanceService: PayrollAttendanceService,
  ) {
    super(prisma);
  }

  async listPeriods(tenantId: string) {
    return this.prisma.payrollPeriod.findMany({
      where: { tenantId },
      orderBy: { startDate: 'desc' },
    });
  }

  async getPeriod(tenantId: string, id: string) {
    const p = await this.prisma.payrollPeriod.findFirst({
      where: { id, tenantId },
      include: { payslips: true },
    });
    if (!p) throw new NotFoundException(`Payroll period ${id} not found`);
    return p;
  }

  async createPeriod(tenantId: string, input: PayrollPeriodInput) {
    const existing = await this.prisma.payrollPeriod.findFirst({
      where: { tenantId, periodLabel: input.periodLabel },
    });
    if (existing) throw new BadRequestException(`Period ${input.periodLabel} already exists`);
    return this.prisma.payrollPeriod.create({
      data: {
        tenantId,
        periodLabel: input.periodLabel,
        startDate: input.startDate,
        endDate: input.endDate,
        status: 'DRAFT',
      },
    });
  }

  async processPayroll(
    tenantId: string,
    periodId: string,
    processedBy: string,
  ): Promise<PayrollProcessingResult> {
    const period = await this.prisma.payrollPeriod.findFirst({
      where: { id: periodId, tenantId },
    });
    if (!period) throw new NotFoundException(`Payroll period ${periodId} not found`);
    if (period.status !== 'DRAFT' && period.status !== 'PROCESSING') {
      throw new BadRequestException(`Period ${period.periodLabel} is ${period.status}; cannot process`);
    }

    await this.prisma.payrollPeriod.update({
      where: { id: periodId },
      data: { status: 'PROCESSING' },
    });

    const employees = await this.prisma.employee.findMany({
      where: { tenantId, status: 'ACTIVE' },
    });

    let totalGross = 0n;
    let totalNet = 0n;
    let totalPf = 0n;
    let totalEsi = 0n;
    let totalTds = 0n;
    let totalPt = 0n;
    let count = 0;

    for (const emp of employees) {
      const summary = await this.attendanceService.monthlySummary(
        tenantId,
        emp.id,
        period.periodLabel,
      );

      const workDays = summary.workDays || 30;
      const presentDays = summary.presentDays + summary.leaveDays + summary.holidays + summary.weeklyOffs;

      const comp = this.salaryService.computeSalary({
        basicSalaryPaise: emp.basicSalaryPaise,
        hraPaise: emp.hraPaise,
        daPaise: emp.daPaise,
        conveyancePaise: emp.conveyancePaise,
        medicalPaise: emp.medicalPaise,
        otherAllowancePaise: emp.otherAllowancePaise,
        workDays,
        presentDays: presentDays > 0 ? presentDays : workDays,
        overtimeHours: summary.totalOvertimeHours,
      });

      // Upsert payslip
      const existing = await this.prisma.payslip.findFirst({
        where: { tenantId, employeeId: emp.id, payrollPeriodId: periodId },
      });
      const data = {
        tenantId,
        employeeId: emp.id,
        payrollPeriodId: periodId,
        basicSalary: comp.basicSalary,
        hra: comp.hra,
        allowances: {
          da: Number(emp.daPaise),
          conveyance: Number(emp.conveyancePaise),
          medical: Number(emp.medicalPaise),
          other: Number(emp.otherAllowancePaise),
        },
        grossSalary: comp.grossSalary,
        pfDeduction: comp.pfDeduction,
        esiDeduction: comp.esiDeduction,
        tdsDeduction: comp.tdsDeduction,
        professionalTax: comp.professionalTax,
        otherDeductions: {},
        totalDeductions: comp.totalDeductions,
        netSalary: comp.netSalary,
        workDays,
        presentDays: Math.floor(presentDays),
        leaveDays: summary.leaveDays,
        overtimeHours: summary.totalOvertimeHours,
        overtimePay: comp.overtimePay,
        status: 'DRAFT' as const,
      };
      if (existing) {
        await this.prisma.payslip.update({ where: { id: existing.id }, data });
      } else {
        await this.prisma.payslip.create({ data });
      }

      totalGross += comp.grossSalary;
      totalNet += comp.netSalary;
      totalPf += comp.pfDeduction;
      totalEsi += comp.esiDeduction;
      totalTds += comp.tdsDeduction;
      totalPt += comp.professionalTax;
      count++;
    }

    await this.prisma.payrollPeriod.update({
      where: { id: periodId },
      data: { status: 'PROCESSED', processedAt: new Date(), processedBy },
    });

    return {
      periodId,
      employeesProcessed: count,
      totalGrossPaise: totalGross.toString(),
      totalNetPaise: totalNet.toString(),
      totalPfPaise: totalPf.toString(),
      totalEsiPaise: totalEsi.toString(),
      totalTdsPaise: totalTds.toString(),
      totalPtPaise: totalPt.toString(),
    };
  }

  async approvePeriod(tenantId: string, periodId: string) {
    const p = await this.getPeriod(tenantId, periodId);
    if (p.status !== 'PROCESSED') {
      throw new BadRequestException(`Cannot approve period in status ${p.status}`);
    }
    await this.prisma.payslip.updateMany({
      where: { tenantId, payrollPeriodId: periodId, status: 'DRAFT' },
      data: { status: 'APPROVED' },
    });
    return this.prisma.payrollPeriod.update({
      where: { id: periodId },
      data: { status: 'PAID' },
    });
  }

  async closePeriod(tenantId: string, periodId: string) {
    await this.getPeriod(tenantId, periodId);
    return this.prisma.payrollPeriod.update({
      where: { id: periodId },
      data: { status: 'CLOSED' },
    });
  }

  async cancelPeriod(tenantId: string, periodId: string) {
    const p = await this.getPeriod(tenantId, periodId);
    if (p.status === 'PAID' || p.status === 'CLOSED') {
      throw new BadRequestException(`Cannot cancel period in status ${p.status}`);
    }
    await this.prisma.payslip.deleteMany({ where: { tenantId, payrollPeriodId: periodId } });
    return this.prisma.payrollPeriod.update({
      where: { id: periodId },
      data: { status: 'DRAFT', processedAt: null, processedBy: null },
    });
  }
}
