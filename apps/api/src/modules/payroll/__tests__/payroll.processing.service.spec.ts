import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PayrollProcessingService } from '../payroll.processing.service';
import { PayrollSalaryService } from '../payroll.salary.service';
import { PayrollAttendanceService } from '../payroll.attendance.service';
import { createMockPrismaService, createMockEventBus, TEST_TENANT_ID } from '../../../__tests__/setup';

function extend(base: ReturnType<typeof createMockPrismaService>) {
  return {
    ...base,
    employee: { findMany: vi.fn() },
    employeeAttendance: { findMany: vi.fn() },
    payrollPeriod: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
    payslip: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
  };
}

describe('PayrollProcessingService', () => {
  let svc: PayrollProcessingService;
  let prisma: ReturnType<typeof extend>;
  let salary: PayrollSalaryService;
  let attendance: PayrollAttendanceService;

  beforeEach(() => {
    prisma = extend(createMockPrismaService());
    salary = new PayrollSalaryService(prisma as any);
    attendance = new PayrollAttendanceService(prisma as any, createMockEventBus() as any);
    svc = new PayrollProcessingService(prisma as any, salary, attendance);
  });

  describe('createPeriod', () => {
    it('creates a new period', async () => {
      prisma.payrollPeriod.findFirst.mockResolvedValue(null);
      prisma.payrollPeriod.create.mockResolvedValue({ id: 'p1', periodLabel: '2026-04' });
      const res = await svc.createPeriod(TEST_TENANT_ID, {
        periodLabel: '2026-04',
        startDate: new Date('2026-04-01'),
        endDate: new Date('2026-04-30'),
      });
      expect(res.id).toBe('p1');
    });

    it('rejects duplicate period label', async () => {
      prisma.payrollPeriod.findFirst.mockResolvedValue({ id: 'p1' });
      await expect(
        svc.createPeriod(TEST_TENANT_ID, {
          periodLabel: '2026-04',
          startDate: new Date(),
          endDate: new Date(),
        }),
      ).rejects.toThrow(/already exists/);
    });
  });

  describe('processPayroll', () => {
    it('processes period and persists payslips', async () => {
      prisma.payrollPeriod.findFirst.mockResolvedValue({
        id: 'p1',
        periodLabel: '2026-04',
        status: 'DRAFT',
        tenantId: TEST_TENANT_ID,
      });
      prisma.employee.findMany.mockResolvedValue([
        {
          id: 'e1',
          tenantId: TEST_TENANT_ID,
          basicSalaryPaise: BigInt(1500000),
          hraPaise: BigInt(500000),
          daPaise: 0n,
          conveyancePaise: 0n,
          medicalPaise: 0n,
          otherAllowancePaise: 0n,
        },
      ]);
      prisma.employeeAttendance.findMany.mockResolvedValue(
        Array.from({ length: 30 }, () => ({ status: 'PRESENT', overtimeHours: 0 })),
      );
      prisma.payslip.findFirst.mockResolvedValue(null);
      prisma.payslip.create.mockResolvedValue({ id: 'ps1' });
      prisma.payrollPeriod.update.mockResolvedValue({});

      const result = await svc.processPayroll(TEST_TENANT_ID, 'p1', 'user-1');
      expect(result.employeesProcessed).toBe(1);
      expect(BigInt(result.totalGrossPaise)).toBeGreaterThan(0n);
      expect(prisma.payslip.create).toHaveBeenCalled();
      // Period transitioned to PROCESSED
      const updates = prisma.payrollPeriod.update.mock.calls.map((c: any) => c[0].data.status);
      expect(updates).toContain('PROCESSED');
    });

    it('rejects processing of non-DRAFT period', async () => {
      prisma.payrollPeriod.findFirst.mockResolvedValue({
        id: 'p1',
        periodLabel: '2026-04',
        status: 'CLOSED',
      });
      await expect(svc.processPayroll(TEST_TENANT_ID, 'p1', 'u1')).rejects.toThrow();
    });

    it('throws NotFound when period missing', async () => {
      prisma.payrollPeriod.findFirst.mockResolvedValue(null);
      await expect(svc.processPayroll(TEST_TENANT_ID, 'nope', 'u1')).rejects.toThrow(/not found/);
    });

    it('updates existing payslip if already present', async () => {
      prisma.payrollPeriod.findFirst.mockResolvedValue({
        id: 'p1',
        periodLabel: '2026-04',
        status: 'DRAFT',
      });
      prisma.employee.findMany.mockResolvedValue([
        {
          id: 'e1',
          basicSalaryPaise: BigInt(1000000),
          hraPaise: 0n,
          daPaise: 0n,
          conveyancePaise: 0n,
          medicalPaise: 0n,
          otherAllowancePaise: 0n,
        },
      ]);
      prisma.employeeAttendance.findMany.mockResolvedValue([]);
      prisma.payslip.findFirst.mockResolvedValue({ id: 'existing' });
      prisma.payslip.update.mockResolvedValue({ id: 'existing' });
      await svc.processPayroll(TEST_TENANT_ID, 'p1', 'u1');
      expect(prisma.payslip.update).toHaveBeenCalled();
      expect(prisma.payslip.create).not.toHaveBeenCalled();
    });
  });

  describe('approvePeriod', () => {
    it('approves processed period and marks payslips APPROVED', async () => {
      prisma.payrollPeriod.findFirst.mockResolvedValue({ id: 'p1', status: 'PROCESSED', payslips: [] });
      prisma.payslip.updateMany.mockResolvedValue({ count: 5 });
      prisma.payrollPeriod.update.mockResolvedValue({ id: 'p1', status: 'PAID' });
      await svc.approvePeriod(TEST_TENANT_ID, 'p1');
      expect(prisma.payslip.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: 'APPROVED' },
        }),
      );
    });

    it('rejects approval of non-PROCESSED period', async () => {
      prisma.payrollPeriod.findFirst.mockResolvedValue({ id: 'p1', status: 'DRAFT', payslips: [] });
      await expect(svc.approvePeriod(TEST_TENANT_ID, 'p1')).rejects.toThrow();
    });
  });

  describe('cancelPeriod', () => {
    it('cancels DRAFT period and deletes payslips', async () => {
      prisma.payrollPeriod.findFirst.mockResolvedValue({ id: 'p1', status: 'PROCESSED', payslips: [] });
      prisma.payslip.deleteMany.mockResolvedValue({ count: 0 });
      prisma.payrollPeriod.update.mockResolvedValue({ id: 'p1', status: 'DRAFT' });
      await svc.cancelPeriod(TEST_TENANT_ID, 'p1');
      expect(prisma.payslip.deleteMany).toHaveBeenCalled();
    });

    it('rejects cancel of PAID period', async () => {
      prisma.payrollPeriod.findFirst.mockResolvedValue({ id: 'p1', status: 'PAID', payslips: [] });
      await expect(svc.cancelPeriod(TEST_TENANT_ID, 'p1')).rejects.toThrow();
    });
  });
});
