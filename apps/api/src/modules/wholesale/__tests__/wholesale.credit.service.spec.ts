import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WholesaleCreditService } from '../wholesale.credit.service';
import { createMockPrismaService, TEST_TENANT_ID, TEST_USER_ID, resetAllMocks } from '../../../__tests__/setup';

describe('WholesaleCreditService (Unit)', () => {
  let service: WholesaleCreditService;
  let mockPrisma: ReturnType<typeof createMockPrismaService>;

  beforeEach(() => {
    mockPrisma = createMockPrismaService();
    service = new WholesaleCreditService(mockPrisma as any);
    resetAllMocks(mockPrisma);
  });

  // ─── Credit Limit ──────────────────────────────────────────────

  describe('setCreditLimit', () => {
    it('creates new credit limit when none exists', async () => {
      mockPrisma.creditLimit.findFirst.mockResolvedValue(null);
      mockPrisma.creditLimit.create.mockResolvedValue({
        id: 'cl-1',
        tenantId: TEST_TENANT_ID,
        entityType: 'CUSTOMER',
        entityId: 'cust-1',
        creditLimitPaise: BigInt(10000000),
        usedPaise: BigInt(0),
        availablePaise: BigInt(10000000),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // For mapCreditLimitToResponse
      mockPrisma.customer.findFirst.mockResolvedValue({
        id: 'cust-1',
        firstName: 'Test',
        lastName: 'Customer',
      });

      const result = await service.setCreditLimit(TEST_TENANT_ID, TEST_USER_ID, {
        entityType: 'CUSTOMER',
        entityId: 'cust-1',
        creditLimitPaise: 10000000,
      } as any);

      expect(result.creditLimitPaise).toBe(10000000);
      expect(result.availablePaise).toBe(10000000);
    });

    it('updates existing credit limit, recalculates available', async () => {
      mockPrisma.creditLimit.findFirst.mockResolvedValue({
        id: 'cl-1',
        tenantId: TEST_TENANT_ID,
        entityType: 'CUSTOMER',
        entityId: 'cust-1',
        creditLimitPaise: BigInt(5000000),
        usedPaise: BigInt(2000000),
        availablePaise: BigInt(3000000),
      });

      mockPrisma.creditLimit.update.mockResolvedValue({
        id: 'cl-1',
        tenantId: TEST_TENANT_ID,
        entityType: 'CUSTOMER',
        entityId: 'cust-1',
        creditLimitPaise: BigInt(10000000),
        usedPaise: BigInt(2000000),
        availablePaise: BigInt(8000000),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockPrisma.customer.findFirst.mockResolvedValue({
        firstName: 'Test',
        lastName: 'Customer',
      });

      const result = await service.setCreditLimit(TEST_TENANT_ID, TEST_USER_ID, {
        entityType: 'CUSTOMER',
        entityId: 'cust-1',
        creditLimitPaise: 10000000,
      } as any);

      expect(result.creditLimitPaise).toBe(10000000);
      expect(result.availablePaise).toBe(8000000);
    });
  });

  // ─── Credit Check ──────────────────────────────────────────────

  describe('checkCredit', () => {
    it('allows order within credit limit', async () => {
      mockPrisma.creditLimit.findFirst.mockResolvedValue({
        id: 'cl-1',
        creditLimitPaise: BigInt(10000000),
        usedPaise: BigInt(3000000),
        availablePaise: BigInt(7000000),
      });

      const result = await service.checkCredit(
        TEST_TENANT_ID,
        'CUSTOMER',
        'cust-1',
        5000000, // 50 lakh paise <= 70 lakh available
      );

      expect(result.allowed).toBe(true);
      expect(result.availablePaise).toBe(7000000);
    });

    it('rejects order exceeding credit limit', async () => {
      mockPrisma.creditLimit.findFirst.mockResolvedValue({
        id: 'cl-1',
        creditLimitPaise: BigInt(10000000),
        usedPaise: BigInt(8000000),
        availablePaise: BigInt(2000000),
      });

      const result = await service.checkCredit(
        TEST_TENANT_ID,
        'CUSTOMER',
        'cust-1',
        5000000, // 50 lakh > 20 lakh available
      );

      expect(result.allowed).toBe(false);
      expect(result.availablePaise).toBe(2000000);
    });

    it('allows order exactly at available limit', async () => {
      mockPrisma.creditLimit.findFirst.mockResolvedValue({
        id: 'cl-1',
        creditLimitPaise: BigInt(10000000),
        usedPaise: BigInt(5000000),
        availablePaise: BigInt(5000000),
      });

      const result = await service.checkCredit(
        TEST_TENANT_ID,
        'CUSTOMER',
        'cust-1',
        5000000,
      );

      expect(result.allowed).toBe(true);
    });

    it('returns not allowed when no credit limit exists', async () => {
      mockPrisma.creditLimit.findFirst.mockResolvedValue(null);

      const result = await service.checkCredit(
        TEST_TENANT_ID,
        'CUSTOMER',
        'cust-1',
        100000,
      );

      expect(result.allowed).toBe(false);
      expect(result.limitPaise).toBe(0);
    });
  });

  // ─── Outstanding Balance Tracking ──────────────────────────────

  describe('addOutstandingBalance', () => {
    it('creates outstanding balance record', async () => {
      mockPrisma.outstandingBalance.create.mockResolvedValue({
        id: 'ob-1',
        tenantId: TEST_TENANT_ID,
        entityType: 'CUSTOMER',
        entityId: 'cust-1',
        invoiceId: 'inv-1',
        invoiceNumber: 'INV-001',
        invoiceDate: new Date(),
        dueDate: new Date(),
        originalPaise: BigInt(500000),
        paidPaise: BigInt(0),
        balancePaise: BigInt(500000),
        status: 'CURRENT',
        daysOverdue: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // For recalculateUsedCredit
      mockPrisma.outstandingBalance.aggregate.mockResolvedValue({
        _sum: { balancePaise: BigInt(500000) },
      });
      mockPrisma.creditLimit.findFirst.mockResolvedValue({
        id: 'cl-1',
        creditLimitPaise: BigInt(10000000),
      });
      mockPrisma.creditLimit.update.mockResolvedValue({});

      // For mapOutstandingToResponse
      mockPrisma.customer.findFirst.mockResolvedValue({
        firstName: 'Test',
        lastName: 'Customer',
      });

      const result = await service.addOutstandingBalance(TEST_TENANT_ID, TEST_USER_ID, {
        entityType: 'CUSTOMER',
        entityId: 'cust-1',
        invoiceId: 'inv-1',
        invoiceNumber: 'INV-001',
        invoiceDate: new Date(),
        dueDate: new Date(),
        originalPaise: 500000,
      });

      expect(result.originalPaise).toBe(500000);
      expect(result.status).toBe('CURRENT');
    });
  });

  describe('recordPaymentOnOutstanding', () => {
    it('reduces outstanding balance on payment', async () => {
      mockPrisma.outstandingBalance.findFirst.mockResolvedValue({
        id: 'ob-1',
        tenantId: TEST_TENANT_ID,
        entityType: 'CUSTOMER',
        entityId: 'cust-1',
        originalPaise: BigInt(500000),
        paidPaise: BigInt(100000),
        balancePaise: BigInt(400000),
        status: 'CURRENT',
        dueDate: new Date(),
      });
      mockPrisma.outstandingBalance.update.mockResolvedValue({});
      mockPrisma.outstandingBalance.aggregate.mockResolvedValue({
        _sum: { balancePaise: BigInt(200000) },
      });
      mockPrisma.creditLimit.findFirst.mockResolvedValue({
        id: 'cl-1',
        creditLimitPaise: BigInt(10000000),
      });
      mockPrisma.creditLimit.update.mockResolvedValue({});
      const now = new Date().toISOString();
      mockPrisma.outstandingBalance.findUnique.mockResolvedValue({
        id: 'ob-1',
        tenantId: TEST_TENANT_ID,
        entityType: 'CUSTOMER',
        entityId: 'cust-1',
        invoiceId: 'inv-1',
        invoiceNumber: 'INV-001',
        invoiceDate: now,
        originalPaise: BigInt(500000),
        paidPaise: BigInt(300000),
        balancePaise: BigInt(200000),
        status: 'CURRENT',
        dueDate: now,
        createdAt: now,
        updatedAt: now,
      });
      mockPrisma.customer.findFirst.mockResolvedValue({
        firstName: 'Test',
        lastName: 'Customer',
      });

      const result = await service.recordPaymentOnOutstanding(
        TEST_TENANT_ID,
        TEST_USER_ID,
        'ob-1',
        200000,
      );

      expect(mockPrisma.outstandingBalance.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            paidPaise: BigInt(300000),
            balancePaise: BigInt(200000),
          }),
        }),
      );
    });

    it('marks as PAID when fully paid', async () => {
      mockPrisma.outstandingBalance.findFirst.mockResolvedValue({
        id: 'ob-1',
        tenantId: TEST_TENANT_ID,
        entityType: 'CUSTOMER',
        entityId: 'cust-1',
        originalPaise: BigInt(500000),
        paidPaise: BigInt(300000),
        balancePaise: BigInt(200000),
        status: 'CURRENT',
        dueDate: new Date(),
      });
      mockPrisma.outstandingBalance.update.mockResolvedValue({});
      mockPrisma.outstandingBalance.aggregate.mockResolvedValue({
        _sum: { balancePaise: BigInt(0) },
      });
      mockPrisma.creditLimit.findFirst.mockResolvedValue(null);
      const now = new Date().toISOString();
      mockPrisma.outstandingBalance.findUnique.mockResolvedValue({
        id: 'ob-1',
        tenantId: TEST_TENANT_ID,
        entityType: 'CUSTOMER',
        entityId: 'cust-1',
        invoiceId: 'inv-1',
        invoiceNumber: 'INV-001',
        invoiceDate: now,
        originalPaise: BigInt(500000),
        paidPaise: BigInt(500000),
        balancePaise: BigInt(0),
        status: 'PAID',
        dueDate: now,
        createdAt: now,
        updatedAt: now,
      });
      mockPrisma.customer.findFirst.mockResolvedValue({
        firstName: 'Test',
        lastName: 'Customer',
      });

      const result = await service.recordPaymentOnOutstanding(
        TEST_TENANT_ID,
        TEST_USER_ID,
        'ob-1',
        200000,
      );

      expect(mockPrisma.outstandingBalance.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'PAID',
          }),
        }),
      );
    });

    it('rejects payment exceeding outstanding balance', async () => {
      mockPrisma.outstandingBalance.findFirst.mockResolvedValue({
        id: 'ob-1',
        tenantId: TEST_TENANT_ID,
        entityType: 'CUSTOMER',
        entityId: 'cust-1',
        originalPaise: BigInt(500000),
        paidPaise: BigInt(400000),
        balancePaise: BigInt(100000),
        dueDate: new Date(),
      });

      await expect(
        service.recordPaymentOnOutstanding(
          TEST_TENANT_ID,
          TEST_USER_ID,
          'ob-1',
          200000, // Would result in negative balance
        ),
      ).rejects.toThrow('Payment exceeds outstanding balance');
    });
  });

  // ─── Aging Calculation ─────────────────────────────────────────

  describe('getAgingSummary', () => {
    it('buckets outstanding balances by 0-30, 31-60, 61-90, 90+ days', async () => {
      mockPrisma.outstandingBalance.findMany.mockResolvedValue([
        { balancePaise: BigInt(100000), daysOverdue: 0 },    // current
        { balancePaise: BigInt(200000), daysOverdue: 15 },   // 1-30
        { balancePaise: BigInt(300000), daysOverdue: 45 },   // 31-60
        { balancePaise: BigInt(400000), daysOverdue: 75 },   // 61-90
        { balancePaise: BigInt(500000), daysOverdue: 120 },  // 90+
      ]);

      const result = await service.getAgingSummary(TEST_TENANT_ID);

      expect(result.current.count).toBe(1);
      expect(result.current.totalPaise).toBe(100000);
      expect(result.overdue1to30.count).toBe(1);
      expect(result.overdue1to30.totalPaise).toBe(200000);
      expect(result.overdue31to60.count).toBe(1);
      expect(result.overdue31to60.totalPaise).toBe(300000);
      expect(result.overdue61to90.count).toBe(1);
      expect(result.overdue61to90.totalPaise).toBe(400000);
      expect(result.overdue90Plus.count).toBe(1);
      expect(result.overdue90Plus.totalPaise).toBe(500000);
    });

    it('handles empty outstanding balances', async () => {
      mockPrisma.outstandingBalance.findMany.mockResolvedValue([]);

      const result = await service.getAgingSummary(TEST_TENANT_ID);

      expect(result.current.count).toBe(0);
      expect(result.overdue1to30.count).toBe(0);
      expect(result.overdue31to60.count).toBe(0);
      expect(result.overdue61to90.count).toBe(0);
      expect(result.overdue90Plus.count).toBe(0);
    });

    it('filters by entity type', async () => {
      mockPrisma.outstandingBalance.findMany.mockResolvedValue([]);

      await service.getAgingSummary(TEST_TENANT_ID, 'CUSTOMER');

      expect(mockPrisma.outstandingBalance.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            entityType: 'CUSTOMER',
          }),
        }),
      );
    });
  });

  describe('updateAgingStatuses', () => {
    it('updates overdue status based on days past due', async () => {
      const pastDue = new Date();
      pastDue.setDate(pastDue.getDate() - 10);

      mockPrisma.outstandingBalance.findMany.mockResolvedValue([
        {
          id: 'ob-1',
          status: 'CURRENT',
          daysOverdue: 0,
          dueDate: pastDue,
        },
      ]);
      mockPrisma.outstandingBalance.update.mockResolvedValue({});

      const count = await service.updateAgingStatuses(TEST_TENANT_ID);

      expect(count).toBe(1);
      expect(mockPrisma.outstandingBalance.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'OVERDUE',
            daysOverdue: expect.any(Number),
          }),
        }),
      );
    });
  });
});
