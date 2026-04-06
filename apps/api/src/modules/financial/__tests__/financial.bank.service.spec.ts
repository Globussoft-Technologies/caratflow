import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FinancialBankService } from '../financial.bank.service';
import { createMockPrismaService, TEST_TENANT_ID, TEST_USER_ID, resetAllMocks } from '../../../__tests__/setup';

describe('FinancialBankService (Unit)', () => {
  let service: FinancialBankService;
  let mockPrisma: ReturnType<typeof createMockPrismaService>;

  beforeEach(() => {
    mockPrisma = createMockPrismaService();
    service = new FinancialBankService(mockPrisma as any);
    resetAllMocks(mockPrisma);
  });

  // ─── Auto Reconcile ────────────────────────────────────────────

  describe('autoReconcile', () => {
    it('matches bank transactions by amount + reference', async () => {
      mockPrisma.bankAccount.findFirst.mockResolvedValue({
        id: 'ba-1',
        tenantId: TEST_TENANT_ID,
      });

      const txnDate = new Date('2026-04-01');
      mockPrisma.bankTransaction.findMany.mockResolvedValue([
        {
          id: 'bt-1',
          tenantId: TEST_TENANT_ID,
          bankAccountId: 'ba-1',
          creditPaise: BigInt(500000),
          debitPaise: BigInt(0),
          reference: 'PAY-REF-001',
          transactionDate: txnDate,
          isReconciled: false,
        },
      ]);

      mockPrisma.payment.findMany.mockResolvedValue([
        {
          id: 'pay-1',
          amountPaise: BigInt(500000),
          reference: 'REF-001',
          processedAt: txnDate,
        },
      ]);

      mockPrisma.bankTransaction.update.mockResolvedValue({});

      const result = await service.autoReconcile(TEST_TENANT_ID, 'ba-1');

      expect(result.matched).toBe(1);
      expect(result.unmatched).toBe(0);
      expect(mockPrisma.bankTransaction.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isReconciled: true,
            reconciledWithId: 'pay-1',
          }),
        }),
      );
    });

    it('matches by amount + date within 3-day window', async () => {
      mockPrisma.bankAccount.findFirst.mockResolvedValue({
        id: 'ba-1',
        tenantId: TEST_TENANT_ID,
      });

      const txnDate = new Date('2026-04-01');
      const paymentDate = new Date('2026-04-02'); // 1 day apart

      mockPrisma.bankTransaction.findMany.mockResolvedValue([
        {
          id: 'bt-1',
          creditPaise: BigInt(750000),
          debitPaise: BigInt(0),
          reference: null,
          transactionDate: txnDate,
          isReconciled: false,
        },
      ]);

      mockPrisma.payment.findMany.mockResolvedValue([
        {
          id: 'pay-1',
          amountPaise: BigInt(750000),
          reference: null,
          processedAt: paymentDate,
        },
      ]);

      mockPrisma.bankTransaction.update.mockResolvedValue({});

      const result = await service.autoReconcile(TEST_TENANT_ID, 'ba-1');
      expect(result.matched).toBe(1);
    });

    it('does not match when amount differs', async () => {
      mockPrisma.bankAccount.findFirst.mockResolvedValue({
        id: 'ba-1',
        tenantId: TEST_TENANT_ID,
      });

      mockPrisma.bankTransaction.findMany.mockResolvedValue([
        {
          id: 'bt-1',
          creditPaise: BigInt(500000),
          debitPaise: BigInt(0),
          reference: 'REF-001',
          transactionDate: new Date(),
          isReconciled: false,
        },
      ]);

      mockPrisma.payment.findMany.mockResolvedValue([
        {
          id: 'pay-1',
          amountPaise: BigInt(600000), // Different amount
          reference: 'REF-001',
          processedAt: new Date(),
        },
      ]);

      const result = await service.autoReconcile(TEST_TENANT_ID, 'ba-1');
      expect(result.matched).toBe(0);
      expect(result.unmatched).toBe(1);
    });

    it('throws when bank account not found', async () => {
      mockPrisma.bankAccount.findFirst.mockResolvedValue(null);

      await expect(
        service.autoReconcile(TEST_TENANT_ID, 'nonexistent'),
      ).rejects.toThrow('Bank account not found');
    });
  });

  // ─── Manual Reconcile ──────────────────────────────────────────

  describe('manualReconcile', () => {
    it('links bank transaction to journal entry', async () => {
      mockPrisma.bankTransaction.findFirst.mockResolvedValue({
        id: 'bt-1',
        tenantId: TEST_TENANT_ID,
        isReconciled: false,
      });

      mockPrisma.bankTransaction.update.mockResolvedValue({
        id: 'bt-1',
        isReconciled: true,
        reconciledWithId: 'je-1',
        reconciledAt: new Date(),
      });

      const result = await service.manualReconcile(TEST_TENANT_ID, {
        bankTransactionId: 'bt-1',
        matchWithId: 'je-1',
      } as any);

      expect(result.isReconciled).toBe(true);
      expect(result.reconciledWithId).toBe('je-1');
    });

    it('rejects reconciliation of already reconciled transaction', async () => {
      mockPrisma.bankTransaction.findFirst.mockResolvedValue({
        id: 'bt-1',
        tenantId: TEST_TENANT_ID,
        isReconciled: true,
      });

      await expect(
        service.manualReconcile(TEST_TENANT_ID, {
          bankTransactionId: 'bt-1',
          matchWithId: 'je-1',
        } as any),
      ).rejects.toThrow('Transaction is already reconciled');
    });

    it('throws when bank transaction not found', async () => {
      mockPrisma.bankTransaction.findFirst.mockResolvedValue(null);

      await expect(
        service.manualReconcile(TEST_TENANT_ID, {
          bankTransactionId: 'nonexistent',
          matchWithId: 'je-1',
        } as any),
      ).rejects.toThrow('Bank transaction not found');
    });
  });

  // ─── Import Statement ──────────────────────────────────────────

  describe('importStatement', () => {
    it('creates bank transactions from imported data', async () => {
      mockPrisma.bankAccount.findFirst.mockResolvedValue({
        id: 'ba-1',
        tenantId: TEST_TENANT_ID,
      });

      mockPrisma.bankTransaction.createMany.mockResolvedValue({ count: 3 });
      mockPrisma.bankAccount.update.mockResolvedValue({});

      const result = await service.importStatement(TEST_TENANT_ID, {
        bankAccountId: 'ba-1',
        transactions: [
          { transactionDate: new Date(), description: 'Deposit', creditPaise: 100000, debitPaise: 0, runningBalancePaise: 100000 },
          { transactionDate: new Date(), description: 'Withdrawal', creditPaise: 0, debitPaise: 50000, runningBalancePaise: 50000 },
          { transactionDate: new Date(), description: 'Transfer', creditPaise: 200000, debitPaise: 0, runningBalancePaise: 250000 },
        ],
      } as any);

      expect(result.imported).toBe(3);
      expect(mockPrisma.bankTransaction.createMany).toHaveBeenCalled();
    });

    it('updates bank account balance to last transaction', async () => {
      mockPrisma.bankAccount.findFirst.mockResolvedValue({
        id: 'ba-1',
        tenantId: TEST_TENANT_ID,
      });

      mockPrisma.bankTransaction.createMany.mockResolvedValue({ count: 1 });
      mockPrisma.bankAccount.update.mockResolvedValue({});

      await service.importStatement(TEST_TENANT_ID, {
        bankAccountId: 'ba-1',
        transactions: [
          { transactionDate: new Date(), description: 'Deposit', creditPaise: 500000, debitPaise: 0, runningBalancePaise: 1500000 },
        ],
      } as any);

      expect(mockPrisma.bankAccount.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            currentBalancePaise: BigInt(1500000),
          }),
        }),
      );
    });

    it('throws when bank account not found', async () => {
      mockPrisma.bankAccount.findFirst.mockResolvedValue(null);

      await expect(
        service.importStatement(TEST_TENANT_ID, {
          bankAccountId: 'nonexistent',
          transactions: [],
        } as any),
      ).rejects.toThrow('Bank account not found');
    });
  });

  // ─── Unreconciled Transactions ─────────────────────────────────

  describe('listBankTransactions', () => {
    it('filters unreconciled transactions', async () => {
      mockPrisma.bankTransaction.findMany.mockResolvedValue([
        { id: 'bt-1', isReconciled: false },
        { id: 'bt-2', isReconciled: false },
      ]);
      mockPrisma.bankTransaction.count.mockResolvedValue(2);

      const result = await service.listBankTransactions(TEST_TENANT_ID, 'ba-1', {
        isReconciled: false,
      });

      expect(mockPrisma.bankTransaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isReconciled: false,
          }),
        }),
      );
    });
  });
});
