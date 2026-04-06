import { describe, it, expect, beforeEach } from 'vitest';
import { FinancialReportingService } from '../financial.reporting.service';
import { createMockPrismaService, TEST_TENANT_ID, resetAllMocks } from '../../../__tests__/setup';

describe('FinancialReportingService (Unit)', () => {
  let service: FinancialReportingService;
  let mockPrisma: ReturnType<typeof createMockPrismaService>;

  beforeEach(() => {
    mockPrisma = createMockPrismaService();
    service = new FinancialReportingService(mockPrisma as any);
    resetAllMocks(mockPrisma);
  });

  // ─── Trial Balance ─────────────────────────────────────────────

  describe('trialBalance', () => {
    it('total debits equal total credits', async () => {
      mockPrisma.account.findMany.mockResolvedValue([
        { id: 'acc-1', accountCode: '1001', name: 'Cash', accountType: 'ASSET', isActive: true },
        { id: 'acc-2', accountCode: '4001', name: 'Sales', accountType: 'REVENUE', isActive: true },
        { id: 'acc-3', accountCode: '5001', name: 'COGS', accountType: 'EXPENSE', isActive: true },
      ]);

      // Cash: debit 1000000
      mockPrisma.journalEntryLine.findMany
        .mockResolvedValueOnce([
          { debitPaise: BigInt(1000000), creditPaise: BigInt(0) },
        ])
        // Sales: credit 800000
        .mockResolvedValueOnce([
          { debitPaise: BigInt(0), creditPaise: BigInt(800000) },
        ])
        // COGS: debit 200000, credit 400000 (net: 200000 debit offset by 400000 credit)
        .mockResolvedValueOnce([
          { debitPaise: BigInt(200000), creditPaise: BigInt(400000) },
        ]);

      const dateRange = { from: new Date('2026-04-01'), to: new Date('2026-04-30') };
      const result = await service.trialBalance(TEST_TENANT_ID, dateRange);

      expect(result.totalDebits).toBe(result.totalCredits);
    });

    it('excludes zero-balance accounts', async () => {
      mockPrisma.account.findMany.mockResolvedValue([
        { id: 'acc-1', accountCode: '1001', name: 'Cash', accountType: 'ASSET', isActive: true },
        { id: 'acc-2', accountCode: '1002', name: 'Empty Account', accountType: 'ASSET', isActive: true },
      ]);

      mockPrisma.journalEntryLine.findMany
        .mockResolvedValueOnce([
          { debitPaise: BigInt(500000), creditPaise: BigInt(0) },
        ])
        .mockResolvedValueOnce([]); // No transactions

      const dateRange = { from: new Date('2026-04-01'), to: new Date('2026-04-30') };
      const result = await service.trialBalance(TEST_TENANT_ID, dateRange);

      expect(result.accounts).toHaveLength(1);
      expect(result.accounts[0]!.accountName).toBe('Cash');
    });

    it('returns correct debit and credit totals per account', async () => {
      mockPrisma.account.findMany.mockResolvedValue([
        { id: 'acc-1', accountCode: '1001', name: 'Cash', accountType: 'ASSET', isActive: true },
      ]);

      mockPrisma.journalEntryLine.findMany.mockResolvedValueOnce([
        { debitPaise: BigInt(500000), creditPaise: BigInt(0) },
        { debitPaise: BigInt(300000), creditPaise: BigInt(0) },
        { debitPaise: BigInt(0), creditPaise: BigInt(200000) },
      ]);

      const dateRange = { from: new Date('2026-04-01'), to: new Date('2026-04-30') };
      const result = await service.trialBalance(TEST_TENANT_ID, dateRange);

      expect(result.accounts[0]!.debitTotal).toBe(800000);
      expect(result.accounts[0]!.creditTotal).toBe(200000);
      expect(result.accounts[0]!.balance).toBe(600000);
    });
  });

  // ─── Profit & Loss ─────────────────────────────────────────────

  describe('profitAndLoss', () => {
    it('calculates revenue - expenses = net profit', async () => {
      mockPrisma.account.findMany
        .mockResolvedValueOnce([
          { id: 'rev-1', name: 'Sales Revenue', accountType: 'REVENUE', isActive: true },
        ])
        .mockResolvedValueOnce([
          { id: 'exp-1', name: 'Cost of Goods', accountType: 'EXPENSE', isActive: true },
        ]);

      // Revenue: credit - debit = 1000000 (revenue accounts are credit-normal)
      mockPrisma.journalEntryLine.findMany
        .mockResolvedValueOnce([
          { debitPaise: BigInt(0), creditPaise: BigInt(1000000) },
        ])
        // Expenses: credit - debit = -600000 => abs = 600000
        .mockResolvedValueOnce([
          { debitPaise: BigInt(600000), creditPaise: BigInt(0) },
        ]);

      const dateRange = { from: new Date('2026-04-01'), to: new Date('2026-04-30') };
      const result = await service.profitAndLoss(TEST_TENANT_ID, dateRange);

      expect(result.totalRevenue).toBe(1000000);
      expect(result.totalExpenses).toBe(600000);
      expect(result.netProfit).toBe(400000);
    });

    it('handles negative profit (loss)', async () => {
      mockPrisma.account.findMany
        .mockResolvedValueOnce([
          { id: 'rev-1', name: 'Sales', accountType: 'REVENUE', isActive: true },
        ])
        .mockResolvedValueOnce([
          { id: 'exp-1', name: 'Expenses', accountType: 'EXPENSE', isActive: true },
        ]);

      mockPrisma.journalEntryLine.findMany
        .mockResolvedValueOnce([
          { debitPaise: BigInt(0), creditPaise: BigInt(300000) },
        ])
        .mockResolvedValueOnce([
          { debitPaise: BigInt(700000), creditPaise: BigInt(0) },
        ]);

      const dateRange = { from: new Date('2026-04-01'), to: new Date('2026-04-30') };
      const result = await service.profitAndLoss(TEST_TENANT_ID, dateRange);

      expect(result.netProfit).toBe(-400000);
    });

    it('excludes zero-balance revenue and expense accounts', async () => {
      mockPrisma.account.findMany
        .mockResolvedValueOnce([
          { id: 'rev-1', name: 'Sales', accountType: 'REVENUE', isActive: true },
          { id: 'rev-2', name: 'Other Income', accountType: 'REVENUE', isActive: true },
        ])
        .mockResolvedValueOnce([]);

      mockPrisma.journalEntryLine.findMany
        .mockResolvedValueOnce([
          { debitPaise: BigInt(0), creditPaise: BigInt(500000) },
        ])
        .mockResolvedValueOnce([]); // Zero balance

      const dateRange = { from: new Date('2026-04-01'), to: new Date('2026-04-30') };
      const result = await service.profitAndLoss(TEST_TENANT_ID, dateRange);

      expect(result.revenue).toHaveLength(1);
    });
  });

  // ─── Balance Sheet ─────────────────────────────────────────────

  describe('balanceSheet', () => {
    it('assets = liabilities + equity (accounting equation)', async () => {
      mockPrisma.account.findMany.mockResolvedValue([
        { id: 'asset-1', name: 'Cash', accountType: 'ASSET', isActive: true },
        { id: 'liab-1', name: 'Accounts Payable', accountType: 'LIABILITY', isActive: true },
        { id: 'eq-1', name: 'Capital', accountType: 'EQUITY', isActive: true },
      ]);

      // Asset (debit-normal): debit - credit = 1000000
      mockPrisma.journalEntryLine.findMany
        .mockResolvedValueOnce([
          { debitPaise: BigInt(1000000), creditPaise: BigInt(0) },
        ])
        // Liability (credit-normal): -(debit - credit) = -(-400000) = 400000
        .mockResolvedValueOnce([
          { debitPaise: BigInt(0), creditPaise: BigInt(400000) },
        ])
        // Equity (credit-normal): -(debit - credit) = -(-600000) = 600000
        .mockResolvedValueOnce([
          { debitPaise: BigInt(0), creditPaise: BigInt(600000) },
        ]);

      const result = await service.balanceSheet(TEST_TENANT_ID, new Date());

      expect(result.totalAssets).toBe(1000000);
      expect(result.totalLiabilities).toBe(400000);
      expect(result.totalEquity).toBe(600000);
      expect(result.totalAssets).toBe(result.totalLiabilities + result.totalEquity);
    });

    it('excludes zero-balance accounts', async () => {
      mockPrisma.account.findMany.mockResolvedValue([
        { id: 'asset-1', name: 'Cash', accountType: 'ASSET', isActive: true },
        { id: 'asset-2', name: 'Empty Asset', accountType: 'ASSET', isActive: true },
      ]);

      mockPrisma.journalEntryLine.findMany
        .mockResolvedValueOnce([
          { debitPaise: BigInt(500000), creditPaise: BigInt(0) },
        ])
        .mockResolvedValueOnce([]);

      const result = await service.balanceSheet(TEST_TENANT_ID, new Date());
      expect(result.assets).toHaveLength(1);
    });
  });

  // ─── Aging Report ──────────────────────────────────────────────

  describe('agingReport', () => {
    it('correctly buckets invoices by 0-30/31-60/61-90/91-120/120+ days', async () => {
      const now = new Date();

      const makeInvoice = (daysAgo: number, total: number, paid: number) => {
        const dueDate = new Date(now);
        dueDate.setDate(dueDate.getDate() - daysAgo);
        return {
          id: `inv-${daysAgo}`,
          invoiceNumber: `INV-${daysAgo}`,
          invoiceType: 'SALES',
          status: 'SENT',
          totalPaise: BigInt(total),
          paidPaise: BigInt(paid),
          createdAt: dueDate,
          dueDate,
          customer: { firstName: 'John', lastName: 'Doe' },
          supplier: null,
        };
      };

      mockPrisma.invoice.findMany.mockResolvedValue([
        makeInvoice(10, 100000, 0),   // 0-30 days
        makeInvoice(45, 200000, 0),   // 31-60 days
        makeInvoice(75, 300000, 0),   // 61-90 days
        makeInvoice(100, 400000, 0),  // 91-120 days
        makeInvoice(150, 500000, 0),  // 120+ days
      ]);

      const result = await service.agingReport(TEST_TENANT_ID, 'AR');

      expect(result.type).toBe('AR');
      expect(result.buckets).toHaveLength(5);
      expect(result.buckets[0]!.label).toBe('0-30 days');
      expect(result.buckets[0]!.count).toBe(1);
      expect(result.buckets[1]!.label).toBe('31-60 days');
      expect(result.buckets[1]!.count).toBe(1);
      expect(result.buckets[2]!.label).toBe('61-90 days');
      expect(result.buckets[2]!.count).toBe(1);
      expect(result.buckets[3]!.label).toBe('91-120 days');
      expect(result.buckets[3]!.count).toBe(1);
      expect(result.buckets[4]!.label).toBe('120+ days');
      expect(result.buckets[4]!.count).toBe(1);
    });

    it('calculates correct outstanding amounts', async () => {
      const now = new Date();
      const dueDate = new Date(now);
      dueDate.setDate(dueDate.getDate() - 15);

      mockPrisma.invoice.findMany.mockResolvedValue([
        {
          id: 'inv-1',
          invoiceNumber: 'INV-001',
          invoiceType: 'SALES',
          status: 'PARTIALLY_PAID',
          totalPaise: BigInt(500000),
          paidPaise: BigInt(200000),
          createdAt: dueDate,
          dueDate,
          customer: { firstName: 'Jane', lastName: 'Smith' },
          supplier: null,
        },
      ]);

      const result = await service.agingReport(TEST_TENANT_ID, 'AR');

      expect(result.entries[0]!.outstandingPaise).toBe(300000);
      expect(result.totalOutstanding).toBe(300000);
    });

    it('generates AP aging report for purchase invoices', async () => {
      mockPrisma.invoice.findMany.mockResolvedValue([]);
      const result = await service.agingReport(TEST_TENANT_ID, 'AP');

      expect(result.type).toBe('AP');
      expect(mockPrisma.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            invoiceType: 'PURCHASE',
          }),
        }),
      );
    });

    it('handles empty invoice list', async () => {
      mockPrisma.invoice.findMany.mockResolvedValue([]);

      const result = await service.agingReport(TEST_TENANT_ID, 'AR');

      expect(result.totalOutstanding).toBe(0);
      expect(result.entries).toHaveLength(0);
      expect(result.buckets.every((b) => b.count === 0)).toBe(true);
    });
  });

  // ─── Cash Flow ─────────────────────────────────────────────────

  describe('cashFlow', () => {
    it('calculates opening + net movement = closing', async () => {
      mockPrisma.account.findMany.mockResolvedValue([
        { id: 'cash-1', name: 'Cash', accountType: 'ASSET', accountCode: '1001' },
      ]);

      // Opening lines
      mockPrisma.journalEntryLine.findMany
        .mockResolvedValueOnce([
          { debitPaise: BigInt(500000), creditPaise: BigInt(0) },
        ])
        // Period lines
        .mockResolvedValueOnce([
          { debitPaise: BigInt(300000), creditPaise: BigInt(100000) },
        ]);

      const dateRange = { from: new Date('2026-04-01'), to: new Date('2026-04-30') };
      const result = await service.cashFlow(TEST_TENANT_ID, dateRange);

      expect(result.openingCash).toBe(500000);
      expect(result.netCashFlow).toBe(200000);
      expect(result.closingCash).toBe(700000);
    });
  });
});
