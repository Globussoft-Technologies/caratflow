import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ManufacturingKarigarService } from '../manufacturing.karigar.service';
import { KarigarTransactionType, AttendanceStatus } from '@caratflow/shared-types';
import { createMockPrismaService, TEST_TENANT_ID, TEST_USER_ID, resetAllMocks } from '../../../__tests__/setup';

describe('ManufacturingKarigarService (Unit)', () => {
  let service: ManufacturingKarigarService;
  let mockPrisma: ReturnType<typeof createMockPrismaService>;

  beforeEach(() => {
    mockPrisma = createMockPrismaService();
    service = new ManufacturingKarigarService(mockPrisma as any);
    resetAllMocks(mockPrisma);
    // Make $transaction execute the callback with mockPrisma as tx
    mockPrisma.$transaction.mockImplementation((fn: any) => fn(mockPrisma));
  });

  // ─── CRUD ─────────────────────────────────────────────────────

  describe('createKarigar', () => {
    it('creates karigar with skill level and daily wage', async () => {
      mockPrisma.karigar.findFirst.mockResolvedValue(null); // No duplicate
      mockPrisma.karigar.create.mockResolvedValue({
        id: 'kar-1',
        tenantId: TEST_TENANT_ID,
        firstName: 'Ramesh',
        lastName: 'Kumar',
        employeeCode: 'KAR-001',
        skillLevel: 'SENIOR',
        dailyWagePaise: BigInt(150000),
        isActive: true,
        location: { name: 'Workshop 1' },
      });

      const result = await service.createKarigar(TEST_TENANT_ID, TEST_USER_ID, {
        firstName: 'Ramesh',
        lastName: 'Kumar',
        employeeCode: 'KAR-001',
        skillLevel: 'SENIOR',
        dailyWagePaise: 150000,
        locationId: 'loc-1',
        isActive: true,
      } as any);

      expect(result.skillLevel).toBe('SENIOR');
      expect(result.dailyWagePaise).toBe(BigInt(150000));
    });

    it('rejects duplicate employee code', async () => {
      mockPrisma.karigar.findFirst.mockResolvedValue({
        id: 'kar-existing',
        employeeCode: 'KAR-001',
      });

      await expect(
        service.createKarigar(TEST_TENANT_ID, TEST_USER_ID, {
          firstName: 'New',
          lastName: 'Person',
          employeeCode: 'KAR-001',
          dailyWagePaise: 100000,
        } as any),
      ).rejects.toThrow('Employee code already exists');
    });
  });

  // ─── Metal Transactions ───────────────────────────────────────

  describe('issueMetal', () => {
    it('creates issue transaction and updates balance (issued increases)', async () => {
      mockPrisma.karigarTransaction.create.mockResolvedValue({
        id: 'txn-1',
        transactionType: 'ISSUE',
        weightMg: BigInt(10000),
      });
      mockPrisma.karigarMetalBalance.upsert.mockResolvedValue({});

      const result = await service.issueMetal(TEST_TENANT_ID, TEST_USER_ID, {
        karigarId: 'kar-1',
        transactionType: KarigarTransactionType.ISSUE,
        metalType: 'GOLD',
        purityFineness: 916,
        weightMg: 10000,
      } as any);

      expect(result.transactionType).toBe('ISSUE');
      expect(mockPrisma.karigarMetalBalance.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            issuedWeightMg: { increment: BigInt(10000) },
            balanceWeightMg: { increment: BigInt(10000) },
          }),
        }),
      );
    });

    it('rejects non-ISSUE transaction type', async () => {
      await expect(
        service.issueMetal(TEST_TENANT_ID, TEST_USER_ID, {
          karigarId: 'kar-1',
          transactionType: KarigarTransactionType.RETURN,
          metalType: 'GOLD',
          purityFineness: 916,
          weightMg: 5000,
        } as any),
      ).rejects.toThrow('Transaction type must be ISSUE');
    });
  });

  describe('recordReturn', () => {
    it('creates return transaction and decrements balance', async () => {
      mockPrisma.karigarMetalBalance.findUnique.mockResolvedValue({
        balanceWeightMg: BigInt(10000),
      });
      mockPrisma.karigarTransaction.create.mockResolvedValue({
        id: 'txn-2',
        transactionType: 'RETURN',
        weightMg: BigInt(5000),
      });
      mockPrisma.karigarMetalBalance.update.mockResolvedValue({});

      const result = await service.recordReturn(TEST_TENANT_ID, TEST_USER_ID, {
        karigarId: 'kar-1',
        transactionType: KarigarTransactionType.RETURN,
        metalType: 'GOLD',
        purityFineness: 916,
        weightMg: 5000,
      } as any);

      expect(result.transactionType).toBe('RETURN');
      expect(mockPrisma.karigarMetalBalance.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            returnedWeightMg: { increment: BigInt(5000) },
            balanceWeightMg: { decrement: BigInt(5000) },
          }),
        }),
      );
    });

    it('rejects return that exceeds balance', async () => {
      mockPrisma.karigarMetalBalance.findUnique.mockResolvedValue({
        balanceWeightMg: BigInt(3000),
      });

      await expect(
        service.recordReturn(TEST_TENANT_ID, TEST_USER_ID, {
          karigarId: 'kar-1',
          transactionType: KarigarTransactionType.RETURN,
          metalType: 'GOLD',
          purityFineness: 916,
          weightMg: 5000, // More than 3000 balance
        } as any),
      ).rejects.toThrow('Return weight exceeds balance');
    });

    it('rejects return when no balance exists', async () => {
      mockPrisma.karigarMetalBalance.findUnique.mockResolvedValue(null);

      await expect(
        service.recordReturn(TEST_TENANT_ID, TEST_USER_ID, {
          karigarId: 'kar-1',
          transactionType: KarigarTransactionType.RETURN,
          metalType: 'GOLD',
          purityFineness: 916,
          weightMg: 1000,
        } as any),
      ).rejects.toThrow('Return weight exceeds balance');
    });
  });

  describe('recordWastage', () => {
    it('creates wastage transaction and decrements balance', async () => {
      mockPrisma.karigarMetalBalance.findUnique.mockResolvedValue({
        balanceWeightMg: BigInt(10000),
      });
      mockPrisma.karigarTransaction.create.mockResolvedValue({
        id: 'txn-3',
        transactionType: 'WASTAGE',
        weightMg: BigInt(200),
      });
      mockPrisma.karigarMetalBalance.update.mockResolvedValue({});

      const result = await service.recordWastage(TEST_TENANT_ID, TEST_USER_ID, {
        karigarId: 'kar-1',
        transactionType: KarigarTransactionType.WASTAGE,
        metalType: 'GOLD',
        purityFineness: 916,
        weightMg: 200,
      } as any);

      expect(result.transactionType).toBe('WASTAGE');
      expect(mockPrisma.karigarMetalBalance.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            wastedWeightMg: { increment: BigInt(200) },
            balanceWeightMg: { decrement: BigInt(200) },
          }),
        }),
      );
    });

    it('rejects wastage exceeding balance', async () => {
      mockPrisma.karigarMetalBalance.findUnique.mockResolvedValue({
        balanceWeightMg: BigInt(100),
      });

      await expect(
        service.recordWastage(TEST_TENANT_ID, TEST_USER_ID, {
          karigarId: 'kar-1',
          transactionType: KarigarTransactionType.WASTAGE,
          metalType: 'GOLD',
          purityFineness: 916,
          weightMg: 200,
        } as any),
      ).rejects.toThrow('Wastage weight exceeds balance');
    });
  });

  // ─── Metal Balance ─────────────────────────────────────────────

  describe('getMetalBalanceSummary', () => {
    it('returns balance: issued - returned - wasted = balance', async () => {
      mockPrisma.karigar.findFirst.mockResolvedValue({
        id: 'kar-1',
        firstName: 'Ramesh',
        lastName: 'Kumar',
      });

      mockPrisma.karigarMetalBalance.findMany.mockResolvedValue([
        {
          id: 'bal-1',
          karigarId: 'kar-1',
          metalType: 'GOLD',
          purityFineness: 916,
          issuedWeightMg: BigInt(50000),
          returnedWeightMg: BigInt(30000),
          wastedWeightMg: BigInt(1000),
          balanceWeightMg: BigInt(19000), // 50000 - 30000 - 1000
          lastReconciledAt: null,
        },
      ]);

      const result = await service.getMetalBalanceSummary(TEST_TENANT_ID, 'kar-1');

      expect(result).toHaveLength(1);
      expect(result[0]!.issuedWeightMg).toBe(BigInt(50000));
      expect(result[0]!.returnedWeightMg).toBe(BigInt(30000));
      expect(result[0]!.wastedWeightMg).toBe(BigInt(1000));
      expect(result[0]!.balanceWeightMg).toBe(BigInt(19000));
    });
  });

  // ─── Attendance ───────────────────────────────────────────────

  describe('recordAttendance', () => {
    it('records present with full daily wage', async () => {
      mockPrisma.karigar.findFirst.mockResolvedValue({
        id: 'kar-1',
        dailyWagePaise: BigInt(150000),
      });

      mockPrisma.karigarAttendance.upsert.mockResolvedValue({
        status: 'PRESENT',
        wagePaidPaise: BigInt(150000),
      });

      const result = await service.recordAttendance(TEST_TENANT_ID, TEST_USER_ID, {
        karigarId: 'kar-1',
        date: new Date(),
        status: AttendanceStatus.PRESENT,
        wagePaidPaise: 0, // Auto-calculate
        overtimeMinutes: 0,
      } as any);

      expect(result.wagePaidPaise).toBe(BigInt(150000));
    });

    it('records half-day with half wage', async () => {
      mockPrisma.karigar.findFirst.mockResolvedValue({
        id: 'kar-1',
        dailyWagePaise: BigInt(150000),
      });

      mockPrisma.karigarAttendance.upsert.mockResolvedValue({
        status: 'HALF_DAY',
        wagePaidPaise: BigInt(75000),
      });

      const result = await service.recordAttendance(TEST_TENANT_ID, TEST_USER_ID, {
        karigarId: 'kar-1',
        date: new Date(),
        status: AttendanceStatus.HALF_DAY,
        wagePaidPaise: 0,
        overtimeMinutes: 0,
      } as any);

      expect(mockPrisma.karigarAttendance.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            wagePaidPaise: BigInt(75000),
          }),
        }),
      );
    });

    it('records absent with zero wage', async () => {
      mockPrisma.karigar.findFirst.mockResolvedValue({
        id: 'kar-1',
        dailyWagePaise: BigInt(150000),
      });

      mockPrisma.karigarAttendance.upsert.mockResolvedValue({
        status: 'ABSENT',
        wagePaidPaise: BigInt(0),
      });

      await service.recordAttendance(TEST_TENANT_ID, TEST_USER_ID, {
        karigarId: 'kar-1',
        date: new Date(),
        status: AttendanceStatus.ABSENT,
        wagePaidPaise: 0,
        overtimeMinutes: 0,
      } as any);

      expect(mockPrisma.karigarAttendance.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            wagePaidPaise: BigInt(0),
          }),
        }),
      );
    });
  });

  describe('getAttendanceReport', () => {
    it('summarizes attendance and total wages', async () => {
      mockPrisma.karigarAttendance.findMany.mockResolvedValue([
        { status: 'PRESENT', overtimeMinutes: 30, wagePaidPaise: BigInt(150000) },
        { status: 'PRESENT', overtimeMinutes: 0, wagePaidPaise: BigInt(150000) },
        { status: 'HALF_DAY', overtimeMinutes: 0, wagePaidPaise: BigInt(75000) },
        { status: 'ABSENT', overtimeMinutes: 0, wagePaidPaise: BigInt(0) },
        { status: 'LEAVE', overtimeMinutes: 0, wagePaidPaise: BigInt(0) },
      ]);

      const result = await service.getAttendanceReport(
        TEST_TENANT_ID,
        'kar-1',
        new Date('2026-04-01'),
        new Date('2026-04-30'),
      );

      expect(result.summary.present).toBe(2);
      expect(result.summary.halfDay).toBe(1);
      expect(result.summary.absent).toBe(1);
      expect(result.summary.leave).toBe(1);
      expect(result.summary.totalOvertimeMinutes).toBe(30);
      expect(result.summary.totalWagePaidPaise).toBe(BigInt(375000));
    });
  });

  // ─── Performance Metrics ──────────────────────────────────────

  describe('getPerformanceMetrics', () => {
    it('calculates jobs completed and wastage percentage', async () => {
      mockPrisma.jobOrder.count
        .mockResolvedValueOnce(8) // completed
        .mockResolvedValueOnce(10); // total

      mockPrisma.karigarTransaction.findMany.mockResolvedValue([
        { transactionType: 'ISSUE', weightMg: BigInt(50000) },
        { transactionType: 'ISSUE', weightMg: BigInt(30000) },
        { transactionType: 'WASTAGE', weightMg: BigInt(1600) },
      ]);

      mockPrisma.jobOrder.findMany.mockResolvedValue([
        { actualStartDate: new Date('2026-04-01'), actualEndDate: new Date('2026-04-03') },
        { actualStartDate: new Date('2026-04-05'), actualEndDate: new Date('2026-04-06') },
      ]);

      const result = await service.getPerformanceMetrics(TEST_TENANT_ID, 'kar-1');

      expect(result.completedJobs).toBe(8);
      expect(result.totalJobs).toBe(10);
      expect(result.completionRate).toBe(80);
      expect(result.totalIssuedMg).toBe(BigInt(80000));
      expect(result.totalWastedMg).toBe(BigInt(1600));
      // wastagePercent = (1600 * 10000 / 80000) / 100 = 2.0
      expect(result.wastagePercent).toBe(2);
    });

    it('handles zero issued metal (no wastage percent)', async () => {
      mockPrisma.jobOrder.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);
      mockPrisma.karigarTransaction.findMany.mockResolvedValue([]);
      mockPrisma.jobOrder.findMany.mockResolvedValue([]);

      const result = await service.getPerformanceMetrics(TEST_TENANT_ID, 'kar-1');

      expect(result.wastagePercent).toBe(0);
      expect(result.completionRate).toBe(0);
    });
  });
});
