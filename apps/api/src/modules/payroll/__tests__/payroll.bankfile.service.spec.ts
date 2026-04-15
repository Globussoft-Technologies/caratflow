import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PayrollBankFileService } from '../payroll.bankfile.service';
import { createMockPrismaService, TEST_TENANT_ID } from '../../../__tests__/setup';

function extend(base: ReturnType<typeof createMockPrismaService>) {
  return {
    ...base,
    payrollPeriod: { findFirst: vi.fn() },
    payslip: { findMany: vi.fn() },
  };
}

describe('PayrollBankFileService', () => {
  let svc: PayrollBankFileService;
  let prisma: ReturnType<typeof extend>;

  beforeEach(() => {
    prisma = extend(createMockPrismaService());
    svc = new PayrollBankFileService(prisma as any);
  });

  it('throws when period missing', async () => {
    prisma.payrollPeriod.findFirst.mockResolvedValue(null);
    await expect(svc.generate(TEST_TENANT_ID, 'nope')).rejects.toThrow(/not found/);
  });

  it('throws when period is still DRAFT', async () => {
    prisma.payrollPeriod.findFirst.mockResolvedValue({ id: 'p1', status: 'DRAFT', periodLabel: '2026-04' });
    await expect(svc.generate(TEST_TENANT_ID, 'p1')).rejects.toThrow(/must be processed/);
  });

  it('generates CSV with NEFT rows and totals', async () => {
    prisma.payrollPeriod.findFirst.mockResolvedValue({
      id: 'p1',
      status: 'PROCESSED',
      periodLabel: '2026-04',
    });
    prisma.payslip.findMany.mockResolvedValue([
      {
        netSalary: BigInt(2500000), // Rs 25,000
        employee: {
          firstName: 'Ravi',
          lastName: 'Kumar',
          bankAccountNumber: '1111222233',
          bankIfsc: 'HDFC0001234',
        },
      },
      {
        netSalary: BigInt(3000000),
        employee: {
          firstName: 'Asha',
          lastName: 'Rao',
          bankAccountNumber: '9999888877',
          bankIfsc: 'ICIC0005678',
        },
      },
    ]);
    const result = await svc.generate(TEST_TENANT_ID, 'p1');
    expect(result.rows).toHaveLength(2);
    expect(result.totalPaise).toBe('5500000');
    expect(result.csv).toContain('account_number,ifsc,name,amount_inr,narration');
    expect(result.csv).toContain('HDFC0001234');
    expect(result.csv).toContain('25000.00');
    expect(result.csv).toContain('"Salary 2026-04"');
    expect(result.filename).toBe('neft-2026-04.csv');
  });

  it('skips employees without bank details', async () => {
    prisma.payrollPeriod.findFirst.mockResolvedValue({
      id: 'p1',
      status: 'PROCESSED',
      periodLabel: '2026-05',
    });
    prisma.payslip.findMany.mockResolvedValue([
      {
        netSalary: BigInt(1000000),
        employee: { firstName: 'A', lastName: 'B', bankAccountNumber: null, bankIfsc: null },
      },
    ]);
    const r = await svc.generate(TEST_TENANT_ID, 'p1');
    expect(r.rows).toHaveLength(0);
  });
});
