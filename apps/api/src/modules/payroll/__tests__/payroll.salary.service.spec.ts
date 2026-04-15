import { describe, it, expect, beforeEach } from 'vitest';
import {
  PayrollSalaryService,
  PF_EMPLOYEE_PERCENT,
  ESI_GROSS_THRESHOLD_PAISE,
} from '../payroll.salary.service';
import { createMockPrismaService, TEST_TENANT_ID } from '../../../__tests__/setup';

describe('PayrollSalaryService', () => {
  let svc: PayrollSalaryService;
  let prisma: ReturnType<typeof createMockPrismaService> & {
    salaryStructure: Record<string, any>;
  };

  beforeEach(() => {
    prisma = {
      ...createMockPrismaService(),
      salaryStructure: {
        findFirst: (globalThis as any).vi?.fn?.() ?? (() => null),
      },
    } as any;
    svc = new PayrollSalaryService(prisma as any);
  });

  describe('computeSalary', () => {
    it('computes full-month gross with no deductions for low salary', () => {
      const r = svc.computeSalary({
        basicSalaryPaise: BigInt(10_000 * 100),
        hraPaise: BigInt(2_000 * 100),
        daPaise: 0n,
        conveyancePaise: 0n,
        medicalPaise: 0n,
        otherAllowancePaise: 0n,
        workDays: 30,
        presentDays: 30,
        overtimeHours: 0,
      });
      // gross = 12,000 (basic + hra)
      expect(r.grossSalary).toBe(BigInt(12_000 * 100));
      // PF = 12% of basic = 1200
      expect(r.pfDeduction).toBe(BigInt(1_200 * 100));
      // Gross 12000 <= 21000 => ESI 0.75% of 12000 = 90
      expect(r.esiDeduction).toBe(BigInt(90 * 100));
      // PT: gross 12000 not > 15000 => 0
      expect(r.professionalTax).toBe(0n);
      // TDS: annual gross = 144000, below 2.5L => 0
      expect(r.tdsDeduction).toBe(0n);
      expect(r.netSalary).toBe(r.grossSalary - r.pfDeduction - r.esiDeduction);
    });

    it('applies Professional Tax when gross > 15,000', () => {
      const r = svc.computeSalary({
        basicSalaryPaise: BigInt(15_000 * 100),
        hraPaise: BigInt(3_000 * 100),
        daPaise: 0n,
        conveyancePaise: 0n,
        medicalPaise: 0n,
        otherAllowancePaise: 0n,
        workDays: 30,
        presentDays: 30,
        overtimeHours: 0,
      });
      expect(r.grossSalary).toBe(BigInt(18_000 * 100));
      expect(r.professionalTax).toBe(BigInt(200 * 100));
    });

    it('skips ESI when gross exceeds threshold', () => {
      const r = svc.computeSalary({
        basicSalaryPaise: BigInt(25_000 * 100),
        hraPaise: 0n,
        daPaise: 0n,
        conveyancePaise: 0n,
        medicalPaise: 0n,
        otherAllowancePaise: 0n,
        workDays: 30,
        presentDays: 30,
        overtimeHours: 0,
      });
      expect(r.grossSalary).toBeGreaterThan(ESI_GROSS_THRESHOLD_PAISE);
      expect(r.esiDeduction).toBe(0n);
    });

    it('applies TDS when annualized gross exceeds 2.5L', () => {
      const r = svc.computeSalary({
        basicSalaryPaise: BigInt(30_000 * 100),
        hraPaise: BigInt(10_000 * 100),
        daPaise: 0n,
        conveyancePaise: 0n,
        medicalPaise: 0n,
        otherAllowancePaise: 0n,
        workDays: 30,
        presentDays: 30,
        overtimeHours: 0,
      });
      // annual gross = 480000, taxable = 230000, tds annual = 23000, monthly ~= 1916
      expect(r.tdsDeduction).toBeGreaterThan(0n);
      expect(r.tdsDeduction).toBeLessThan(BigInt(2_500 * 100));
    });

    it('prorates when present days < work days', () => {
      const full = svc.computeSalary({
        basicSalaryPaise: BigInt(30_000 * 100),
        hraPaise: 0n,
        daPaise: 0n,
        conveyancePaise: 0n,
        medicalPaise: 0n,
        otherAllowancePaise: 0n,
        workDays: 30,
        presentDays: 30,
        overtimeHours: 0,
      });
      const half = svc.computeSalary({
        basicSalaryPaise: BigInt(30_000 * 100),
        hraPaise: 0n,
        daPaise: 0n,
        conveyancePaise: 0n,
        medicalPaise: 0n,
        otherAllowancePaise: 0n,
        workDays: 30,
        presentDays: 15,
        overtimeHours: 0,
      });
      expect(half.basicSalary).toBe(full.basicSalary / 2n);
    });

    it('computes overtime pay at 2x hourly rate', () => {
      const r = svc.computeSalary({
        basicSalaryPaise: BigInt(24_000 * 100), // 100/hr at 30*8=240 hours
        hraPaise: 0n,
        daPaise: 0n,
        conveyancePaise: 0n,
        medicalPaise: 0n,
        otherAllowancePaise: 0n,
        workDays: 30,
        presentDays: 30,
        overtimeHours: 10,
      });
      // hourly = 24000/240 = 100, OT = 2*100*10 = 2000
      expect(r.overtimePay).toBe(BigInt(2_000 * 100));
      expect(r.grossSalary).toBe(BigInt(26_000 * 100));
    });

    it('PF percent constant is 12', () => {
      expect(PF_EMPLOYEE_PERCENT).toBe(12);
    });
  });
});
