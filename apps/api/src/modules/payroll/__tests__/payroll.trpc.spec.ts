import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TrpcService } from '../../../trpc/trpc.service';
import { PayrollTrpcRouter } from '../payroll.trpc';
import { PayrollAttendanceStatus, PayrollAttendanceSource } from '@caratflow/shared-types';

describe('PayrollTrpcRouter', () => {
  const trpc = new TrpcService();

  const employeeService = {
    list: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    deactivate: vi.fn(),
    bulkImport: vi.fn(),
  };
  const attendanceService = {
    list: vi.fn(),
    markDay: vi.fn(),
    markBulk: vi.fn(),
    monthlySummary: vi.fn(),
  };
  const salaryService = {
    list: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    assign: vi.fn(),
  };
  const processingService = {
    listPeriods: vi.fn(),
    getPeriod: vi.fn(),
    createPeriod: vi.fn(),
    processPayroll: vi.fn(),
    approvePeriod: vi.fn(),
    closePeriod: vi.fn(),
    cancelPeriod: vi.fn(),
  };
  const payslipService = {
    list: vi.fn(),
    getById: vi.fn(),
    generatePayslip: vi.fn(),
    emailPayslip: vi.fn(),
  };
  const bankFileService = {
    generate: vi.fn(),
  };

  const ctx = {
    tenantId: 'tenant-1',
    userId: 'user-1',
    userRole: 'admin',
    userPermissions: ['*'],
  };

  const router = new PayrollTrpcRouter(
    trpc,
    employeeService as never,
    attendanceService as never,
    salaryService as never,
    processingService as never,
    payslipService as never,
    bankFileService as never,
  );
  const caller = router.router.createCaller(ctx);

  const EMP_ID = '11111111-1111-1111-1111-111111111111';
  const PERIOD_ID = '22222222-2222-2222-2222-222222222222';
  const STRUCTURE_ID = '33333333-3333-3333-3333-333333333333';
  const PAYSLIP_ID = '44444444-4444-4444-4444-444444444444';

  beforeEach(() => vi.clearAllMocks());

  // ─── Employees ─────────────────────────────────────────
  describe('employees', () => {
    it('list delegates to employeeService', async () => {
      employeeService.list.mockResolvedValue({ items: [], total: 0, page: 1, limit: 20, totalPages: 0, hasNext: false, hasPrevious: false });
      await caller.employees.list({ page: 1, limit: 20 });
      expect(employeeService.list).toHaveBeenCalledWith('tenant-1', expect.objectContaining({ page: 1 }));
    });

    it('get requires uuid', async () => {
      await expect(caller.employees.get({ id: 'bad' })).rejects.toThrow();
    });

    it('create forwards input', async () => {
      employeeService.create.mockResolvedValue({ id: EMP_ID });
      await caller.employees.create({
        employeeCode: 'E001',
        firstName: 'A',
        lastName: 'B',
        joinedAt: new Date('2024-01-01'),
        basicSalaryPaise: 1000000,
        hraPaise: 200000,
        daPaise: 0,
        conveyancePaise: 0,
        medicalPaise: 0,
        otherAllowancePaise: 0,
      });
      expect(employeeService.create).toHaveBeenCalled();
    });

    it('deactivate delegates', async () => {
      employeeService.deactivate.mockResolvedValue({ id: EMP_ID });
      await caller.employees.deactivate({ id: EMP_ID });
      expect(employeeService.deactivate).toHaveBeenCalledWith('tenant-1', EMP_ID);
    });

    it('bulkImport requires csv', async () => {
      employeeService.bulkImport.mockResolvedValue({ created: 1, errors: [] });
      await caller.employees.bulkImport({ csv: 'header\nrow' });
      expect(employeeService.bulkImport).toHaveBeenCalled();
    });
  });

  // ─── Attendance ────────────────────────────────────────
  describe('attendance', () => {
    it('markDay forwards entry', async () => {
      attendanceService.markDay.mockResolvedValue({ id: 'a1' });
      await caller.attendance.markDay({
        employeeId: EMP_ID,
        date: new Date('2026-04-01'),
        status: PayrollAttendanceStatus.PRESENT,
        hoursWorked: 8,
        overtimeHours: 0,
        source: PayrollAttendanceSource.MANUAL,
      });
      expect(attendanceService.markDay).toHaveBeenCalled();
    });

    it('monthlySummary delegates', async () => {
      attendanceService.monthlySummary.mockResolvedValue({ workDays: 30 });
      await caller.attendance.monthlySummary({ employeeId: EMP_ID, yearMonth: '2026-04' });
      expect(attendanceService.monthlySummary).toHaveBeenCalledWith('tenant-1', EMP_ID, '2026-04');
    });
  });

  // ─── Salary Structures ─────────────────────────────────
  describe('salaryStructures', () => {
    it('list delegates', async () => {
      salaryService.list.mockResolvedValue([]);
      await caller.salaryStructures.list();
      expect(salaryService.list).toHaveBeenCalledWith('tenant-1');
    });

    it('create forwards input', async () => {
      salaryService.create.mockResolvedValue({ id: STRUCTURE_ID });
      await caller.salaryStructures.create({
        name: 'Std',
        basicPercent: 50,
        hraPercent: 20,
        daPercent: 10,
        conveyancePaise: 0,
        medicalPaise: 0,
        otherAllowancePaise: 0,
        effectiveFrom: new Date('2026-04-01'),
      });
      expect(salaryService.create).toHaveBeenCalled();
    });

    it('assign delegates', async () => {
      salaryService.assign.mockResolvedValue({ id: STRUCTURE_ID });
      await caller.salaryStructures.assign({ id: STRUCTURE_ID, employeeId: EMP_ID });
      expect(salaryService.assign).toHaveBeenCalledWith('tenant-1', STRUCTURE_ID, EMP_ID);
    });
  });

  // ─── Payroll Periods ───────────────────────────────────
  describe('payrollPeriods', () => {
    it('create delegates', async () => {
      processingService.createPeriod.mockResolvedValue({ id: PERIOD_ID });
      await caller.payrollPeriods.create({
        periodLabel: '2026-04',
        startDate: new Date('2026-04-01'),
        endDate: new Date('2026-04-30'),
      });
      expect(processingService.createPeriod).toHaveBeenCalled();
    });

    it('rejects invalid periodLabel format', async () => {
      await expect(
        caller.payrollPeriods.create({
          periodLabel: 'April',
          startDate: new Date(),
          endDate: new Date(),
        } as any),
      ).rejects.toThrow();
    });

    it('process delegates with userId', async () => {
      processingService.processPayroll.mockResolvedValue({ employeesProcessed: 5 } as any);
      await caller.payrollPeriods.process({ id: PERIOD_ID });
      expect(processingService.processPayroll).toHaveBeenCalledWith('tenant-1', PERIOD_ID, 'user-1');
    });

    it('approve delegates', async () => {
      processingService.approvePeriod.mockResolvedValue({ id: PERIOD_ID });
      await caller.payrollPeriods.approve({ id: PERIOD_ID });
      expect(processingService.approvePeriod).toHaveBeenCalled();
    });

    it('close + cancel delegate', async () => {
      processingService.closePeriod.mockResolvedValue({});
      processingService.cancelPeriod.mockResolvedValue({});
      await caller.payrollPeriods.close({ id: PERIOD_ID });
      await caller.payrollPeriods.cancel({ id: PERIOD_ID });
      expect(processingService.closePeriod).toHaveBeenCalled();
      expect(processingService.cancelPeriod).toHaveBeenCalled();
    });
  });

  // ─── Payslips ──────────────────────────────────────────
  describe('payslips', () => {
    it('list delegates', async () => {
      payslipService.list.mockResolvedValue([]);
      await caller.payslips.list({ payrollPeriodId: PERIOD_ID });
      expect(payslipService.list).toHaveBeenCalled();
    });

    it('downloadPdf delegates', async () => {
      payslipService.generatePayslip.mockResolvedValue({ format: 'HTML', content: 'x', filename: 'f' });
      await caller.payslips.downloadPdf({ id: PAYSLIP_ID });
      expect(payslipService.generatePayslip).toHaveBeenCalledWith('tenant-1', PAYSLIP_ID);
    });

    it('emailToEmployee delegates', async () => {
      payslipService.emailPayslip.mockResolvedValue({ sent: true, to: 'x@y' });
      await caller.payslips.emailToEmployee({ id: PAYSLIP_ID, toEmail: 'a@b.com' });
      expect(payslipService.emailPayslip).toHaveBeenCalledWith('tenant-1', PAYSLIP_ID, 'a@b.com');
    });
  });

  // ─── Bank File ─────────────────────────────────────────
  describe('bankFile', () => {
    it('generate delegates', async () => {
      bankFileService.generate.mockResolvedValue({ csv: '', rows: [], totalPaise: '0', filename: 'x' });
      await caller.bankFile.generate({ periodId: PERIOD_ID });
      expect(bankFileService.generate).toHaveBeenCalledWith('tenant-1', PERIOD_ID);
    });

    it('download delegates', async () => {
      bankFileService.generate.mockResolvedValue({ csv: '', rows: [], totalPaise: '0', filename: 'x' });
      await caller.bankFile.download({ periodId: PERIOD_ID });
      expect(bankFileService.generate).toHaveBeenCalled();
    });
  });
});
