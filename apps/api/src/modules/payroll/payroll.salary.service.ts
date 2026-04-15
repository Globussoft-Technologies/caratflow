// ─── Payroll Salary Structure Service ─────────────────────────
// Manage salary structure templates and compute gross/deductions.

import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantAwareService } from '../../common/base.service';
import { PrismaService } from '../../common/prisma.service';
import type { SalaryStructureInput } from '@caratflow/shared-types';

export interface ComputeSalaryInput {
  basicSalaryPaise: bigint;
  hraPaise: bigint;
  daPaise: bigint;
  conveyancePaise: bigint;
  medicalPaise: bigint;
  otherAllowancePaise: bigint;
  workDays: number;
  presentDays: number; // includes half-day contributions
  overtimeHours: number;
}

export interface ComputeSalaryResult {
  basicSalary: bigint;
  hra: bigint;
  grossSalary: bigint;
  pfDeduction: bigint;
  esiDeduction: bigint;
  professionalTax: bigint;
  tdsDeduction: bigint;
  totalDeductions: bigint;
  netSalary: bigint;
  overtimePay: bigint;
}

// ─── Statutory Constants ────────────────────────────────────────
export const PF_EMPLOYEE_PERCENT = 12;
export const ESI_EMPLOYEE_PERCENT = 0.75; // as % of gross
export const ESI_GROSS_THRESHOLD_PAISE = BigInt(21_000 * 100); // Rs 21,000
export const PT_FLAT_PAISE = BigInt(200 * 100); // Rs 200/month
export const PT_GROSS_THRESHOLD_PAISE = BigInt(15_000 * 100); // Rs 15,000
export const TDS_ANNUAL_THRESHOLD_PAISE = BigInt(250_000 * 100); // Rs 2.5L
export const TDS_PERCENT = 10;

@Injectable()
export class PayrollSalaryService extends TenantAwareService {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async list(tenantId: string) {
    return this.prisma.salaryStructure.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getById(tenantId: string, id: string) {
    const s = await this.prisma.salaryStructure.findFirst({ where: { id, tenantId } });
    if (!s) throw new NotFoundException(`Salary structure ${id} not found`);
    return s;
  }

  async create(tenantId: string, input: SalaryStructureInput) {
    return this.prisma.salaryStructure.create({
      data: {
        tenantId,
        employeeId: input.employeeId ?? null,
        designation: input.designation ?? null,
        branchId: input.branchId ?? null,
        name: input.name,
        basicPercent: input.basicPercent,
        hraPercent: input.hraPercent,
        daPercent: input.daPercent,
        conveyancePaise: BigInt(input.conveyancePaise),
        medicalPaise: BigInt(input.medicalPaise),
        otherAllowancePaise: BigInt(input.otherAllowancePaise),
        effectiveFrom: input.effectiveFrom,
        effectiveTo: input.effectiveTo ?? null,
      },
    });
  }

  async update(tenantId: string, id: string, input: Partial<SalaryStructureInput>) {
    await this.getById(tenantId, id);
    const data: Record<string, unknown> = { ...input };
    for (const key of ['conveyancePaise', 'medicalPaise', 'otherAllowancePaise'] as const) {
      if (input[key] != null) data[key] = BigInt(input[key] as number);
    }
    return this.prisma.salaryStructure.update({ where: { id }, data });
  }

  async assign(tenantId: string, id: string, employeeId: string) {
    await this.getById(tenantId, id);
    return this.prisma.salaryStructure.update({
      where: { id },
      data: { employeeId },
    });
  }

  /**
   * Compute gross + statutory deductions for a given month.
   * Pro-rates basic/HRA/etc. by present/work days.
   */
  computeSalary(input: ComputeSalaryInput): ComputeSalaryResult {
    const ratio = input.workDays > 0 ? input.presentDays / input.workDays : 0;
    const prorate = (amt: bigint): bigint => {
      if (ratio >= 1) return amt;
      return BigInt(Math.round(Number(amt) * ratio));
    };

    const basicSalary = prorate(input.basicSalaryPaise);
    const hra = prorate(input.hraPaise);
    const da = prorate(input.daPaise);
    const conveyance = prorate(input.conveyancePaise);
    const medical = prorate(input.medicalPaise);
    const other = prorate(input.otherAllowancePaise);

    // Overtime: 2x hourly of basic (basic / 30 / 8)
    let overtimePay = 0n;
    if (input.overtimeHours > 0 && input.basicSalaryPaise > 0n) {
      const hourly = Number(input.basicSalaryPaise) / (30 * 8);
      overtimePay = BigInt(Math.round(hourly * 2 * input.overtimeHours));
    }

    const grossSalary = basicSalary + hra + da + conveyance + medical + other + overtimePay;

    // PF: 12% of basic (employee side)
    const pfDeduction = BigInt(Math.round(Number(basicSalary) * (PF_EMPLOYEE_PERCENT / 100)));

    // ESI: 0.75% of gross if gross <= 21,000
    let esiDeduction = 0n;
    if (grossSalary <= ESI_GROSS_THRESHOLD_PAISE) {
      esiDeduction = BigInt(Math.round(Number(grossSalary) * (ESI_EMPLOYEE_PERCENT / 100)));
    }

    // Professional Tax: Rs 200/month flat if gross > 15,000 (Maharashtra)
    const professionalTax = grossSalary > PT_GROSS_THRESHOLD_PAISE ? PT_FLAT_PAISE : 0n;

    // TDS: if annualized gross > 2.5L, apply 10% on excess (annualized), then / 12
    let tdsDeduction = 0n;
    const annualGross = grossSalary * 12n;
    if (annualGross > TDS_ANNUAL_THRESHOLD_PAISE) {
      const taxable = annualGross - TDS_ANNUAL_THRESHOLD_PAISE;
      const annualTds = BigInt(Math.round(Number(taxable) * (TDS_PERCENT / 100)));
      tdsDeduction = annualTds / 12n;
    }

    const totalDeductions = pfDeduction + esiDeduction + professionalTax + tdsDeduction;
    const netSalary = grossSalary - totalDeductions;

    return {
      basicSalary,
      hra,
      grossSalary,
      pfDeduction,
      esiDeduction,
      professionalTax,
      tdsDeduction,
      totalDeductions,
      netSalary,
      overtimePay,
    };
  }
}
