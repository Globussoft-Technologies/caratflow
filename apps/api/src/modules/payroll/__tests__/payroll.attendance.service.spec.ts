import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PayrollAttendanceService } from '../payroll.attendance.service';
import { createMockPrismaService, createMockEventBus, TEST_TENANT_ID } from '../../../__tests__/setup';
import { PayrollAttendanceStatus, PayrollAttendanceSource } from '@caratflow/shared-types';

function extend(base: ReturnType<typeof createMockPrismaService>) {
  return {
    ...base,
    employee: { findFirst: vi.fn() },
    employeeAttendance: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  };
}

describe('PayrollAttendanceService', () => {
  let svc: PayrollAttendanceService;
  let prisma: ReturnType<typeof extend>;

  beforeEach(() => {
    prisma = extend(createMockPrismaService());
    svc = new PayrollAttendanceService(prisma as any, createMockEventBus() as any);
  });

  it('markDay: creates new row when no existing', async () => {
    prisma.employeeAttendance.findFirst.mockResolvedValue(null);
    prisma.employeeAttendance.create.mockResolvedValue({ id: 'a1' });
    await svc.markDay(TEST_TENANT_ID, {
      employeeId: 'e1',
      date: new Date('2026-04-01'),
      status: PayrollAttendanceStatus.PRESENT,
      hoursWorked: 8,
      overtimeHours: 0,
      source: PayrollAttendanceSource.MANUAL,
    });
    expect(prisma.employeeAttendance.create).toHaveBeenCalled();
    const arg = prisma.employeeAttendance.create.mock.calls[0]![0];
    expect(arg.data.tenantId).toBe(TEST_TENANT_ID);
    expect(arg.data.status).toBe('PRESENT');
  });

  it('markDay: updates existing row', async () => {
    prisma.employeeAttendance.findFirst.mockResolvedValue({ id: 'a1' });
    prisma.employeeAttendance.update.mockResolvedValue({ id: 'a1' });
    await svc.markDay(TEST_TENANT_ID, {
      employeeId: 'e1',
      date: new Date('2026-04-01'),
      status: PayrollAttendanceStatus.HALF_DAY,
      hoursWorked: 4,
      overtimeHours: 0,
      source: PayrollAttendanceSource.MANUAL,
    });
    expect(prisma.employeeAttendance.update).toHaveBeenCalled();
  });

  it('markBulk: processes all entries', async () => {
    prisma.employeeAttendance.findFirst.mockResolvedValue(null);
    prisma.employeeAttendance.create.mockResolvedValue({ id: 'a' });
    const res = await svc.markBulk(TEST_TENANT_ID, {
      entries: [
        {
          employeeId: 'e1',
          date: new Date('2026-04-01'),
          status: PayrollAttendanceStatus.PRESENT,
          hoursWorked: 8,
          overtimeHours: 0,
          source: PayrollAttendanceSource.MANUAL,
        },
        {
          employeeId: 'e1',
          date: new Date('2026-04-02'),
          status: PayrollAttendanceStatus.PRESENT,
          hoursWorked: 8,
          overtimeHours: 2,
          source: PayrollAttendanceSource.MANUAL,
        },
      ],
    });
    expect(res.count).toBe(2);
  });

  it('monthlySummary: aggregates statuses correctly', async () => {
    prisma.employeeAttendance.findMany.mockResolvedValue([
      { status: 'PRESENT', overtimeHours: 0 },
      { status: 'PRESENT', overtimeHours: 2 },
      { status: 'ABSENT', overtimeHours: 0 },
      { status: 'PAID_LEAVE', overtimeHours: 0 },
      { status: 'HOLIDAY', overtimeHours: 0 },
      { status: 'WEEKLY_OFF', overtimeHours: 0 },
      { status: 'HALF_DAY', overtimeHours: 0 },
      { status: 'UNPAID_LEAVE', overtimeHours: 0 },
    ]);
    const summary = await svc.monthlySummary(TEST_TENANT_ID, 'e1', '2026-04');
    expect(summary.workDays).toBe(8);
    expect(summary.presentDays).toBeGreaterThanOrEqual(2);
    expect(summary.absentDays).toBe(1);
    expect(summary.leaveDays).toBe(1);
    expect(summary.unpaidLeaveDays).toBe(1);
    expect(summary.holidays).toBe(1);
    expect(summary.weeklyOffs).toBe(1);
    expect(summary.halfDays).toBe(1);
    expect(summary.totalOvertimeHours).toBe(2);
  });

  it('list: applies date range filter', async () => {
    prisma.employeeAttendance.findMany.mockResolvedValue([]);
    await svc.list(TEST_TENANT_ID, {
      startDate: new Date('2026-04-01'),
      endDate: new Date('2026-04-30'),
      employeeId: 'e1',
    });
    const where = prisma.employeeAttendance.findMany.mock.calls[0]![0].where;
    expect(where.tenantId).toBe(TEST_TENANT_ID);
    expect(where.employeeId).toBe('e1');
    expect(where.date.gte).toBeInstanceOf(Date);
    expect(where.date.lte).toBeInstanceOf(Date);
  });
});
