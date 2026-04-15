import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PayrollPayslipService } from '../payroll.payslip.service';
import { createMockPrismaService, TEST_TENANT_ID } from '../../../__tests__/setup';

function extend(base: ReturnType<typeof createMockPrismaService>) {
  return {
    ...base,
    payslip: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
  };
}

const samplePayslip = {
  id: 'ps1',
  tenantId: TEST_TENANT_ID,
  basicSalary: BigInt(1500000),
  hra: BigInt(500000),
  grossSalary: BigInt(2000000),
  pfDeduction: BigInt(180000),
  esiDeduction: BigInt(15000),
  tdsDeduction: 0n,
  professionalTax: BigInt(20000),
  totalDeductions: BigInt(215000),
  netSalary: BigInt(1785000),
  employee: {
    employeeCode: 'E001',
    firstName: 'Ravi',
    lastName: 'Kumar',
    designation: 'Manager',
  },
  payrollPeriod: { periodLabel: '2026-04' },
};

describe('PayrollPayslipService', () => {
  let svc: PayrollPayslipService;
  let prisma: ReturnType<typeof extend>;

  beforeEach(() => {
    prisma = extend(createMockPrismaService());
    svc = new PayrollPayslipService(prisma as any);
  });

  it('list: applies filters', async () => {
    prisma.payslip.findMany.mockResolvedValue([]);
    await svc.list(TEST_TENANT_ID, { payrollPeriodId: 'p1', employeeId: 'e1', status: 'DRAFT' });
    const where = prisma.payslip.findMany.mock.calls[0]![0].where;
    expect(where.tenantId).toBe(TEST_TENANT_ID);
    expect(where.payrollPeriodId).toBe('p1');
    expect(where.employeeId).toBe('e1');
    expect(where.status).toBe('DRAFT');
  });

  it('getById: throws when not found', async () => {
    prisma.payslip.findFirst.mockResolvedValue(null);
    await expect(svc.getById(TEST_TENANT_ID, 'x')).rejects.toThrow(/not found/);
  });

  it('generatePayslip: returns HTML content with expected fields', async () => {
    prisma.payslip.findFirst.mockResolvedValue(samplePayslip);
    const res = await svc.generatePayslip(TEST_TENANT_ID, 'ps1');
    expect(res.format).toBe('HTML');
    expect(res.filename).toBe('payslip-E001-2026-04.html');
    expect(res.content).toContain('Ravi Kumar');
    expect(res.content).toContain('2026-04');
    expect(res.content).toContain('Rs. 20000.00'); // gross in rupees
    expect(res.content).toContain('Rs. 17850.00'); // net
  });

  it('emailPayslip: returns sent result (stub)', async () => {
    prisma.payslip.findFirst.mockResolvedValue(samplePayslip);
    const res = await svc.emailPayslip(TEST_TENANT_ID, 'ps1', 'test@example.com');
    expect(res.sent).toBe(true);
    expect(res.to).toBe('test@example.com');
  });

  it('emailPayslip: falls back to default email when not provided', async () => {
    prisma.payslip.findFirst.mockResolvedValue(samplePayslip);
    const res = await svc.emailPayslip(TEST_TENANT_ID, 'ps1');
    expect(res.sent).toBe(true);
    expect(res.to).toContain('E001');
  });
});
