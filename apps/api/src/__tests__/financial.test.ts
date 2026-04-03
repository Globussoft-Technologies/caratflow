import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FinancialService } from '../modules/financial/financial.service';
import { createMockPrismaService, TEST_TENANT_ID, TEST_USER_ID, resetAllMocks } from './setup';

describe('FinancialService', () => {
  let service: FinancialService;
  let mockPrisma: ReturnType<typeof createMockPrismaService>;

  beforeEach(() => {
    mockPrisma = createMockPrismaService();
    service = new FinancialService(mockPrisma as any);
    resetAllMocks(mockPrisma);
  });

  // ─── GST Computation ─────────────────────────────────────────

  describe('computeGst', () => {
    it('computes CGST + SGST for intra-state (same state)', () => {
      const result = service.computeGst({
        taxableAmountPaise: 10000000, // Rs 1,00,000
        gstRate: 300, // 3%
        sourceState: 'MH',
        destState: 'MH',
        hsnCode: '7113',
      });

      expect(result.isInterState).toBe(false);
      expect(result.cgstRate).toBe(150); // half of 300
      expect(result.sgstRate).toBe(150);
      expect(result.igstRate).toBe(0);
      // 3% of 10000000 = 300000, split: 150000 each
      expect(result.cgstPaise).toBe(150000);
      expect(result.sgstPaise).toBe(150000);
      expect(result.igstPaise).toBe(0);
      expect(result.totalTaxPaise).toBe(300000);
    });

    it('computes IGST for inter-state (different states)', () => {
      const result = service.computeGst({
        taxableAmountPaise: 10000000,
        gstRate: 300,
        sourceState: 'MH',
        destState: 'GJ',
        hsnCode: '7113',
      });

      expect(result.isInterState).toBe(true);
      expect(result.cgstRate).toBe(0);
      expect(result.sgstRate).toBe(0);
      expect(result.igstRate).toBe(300);
      expect(result.cgstPaise).toBe(0);
      expect(result.sgstPaise).toBe(0);
      expect(result.igstPaise).toBe(300000);
      expect(result.totalTaxPaise).toBe(300000);
    });

    it('handles 5% making charges GST intra-state', () => {
      const result = service.computeGst({
        taxableAmountPaise: 500000, // Rs 5,000
        gstRate: 500, // 5%
        sourceState: 'MH',
        destState: 'MH',
        hsnCode: '9988',
      });

      expect(result.cgstPaise).toBe(12500); // 2.5% of 5000 = 125
      expect(result.sgstPaise).toBe(12500);
      expect(result.totalTaxPaise).toBe(25000);
    });
  });

  // ─── Journal Entries ─────────────────────────────────────────

  describe('createJournalEntry', () => {
    it('creates a balanced journal entry', async () => {
      mockPrisma.journalEntry.count.mockResolvedValue(0);
      mockPrisma.journalEntry.create.mockResolvedValue({
        id: 'je-1',
        tenantId: TEST_TENANT_ID,
        entryNumber: 'JE-202604-0001',
        status: 'DRAFT',
        lines: [
          { accountId: 'acc-1', debitPaise: BigInt(100000), creditPaise: BigInt(0) },
          { accountId: 'acc-2', debitPaise: BigInt(0), creditPaise: BigInt(100000) },
        ],
      });

      const result = await service.createJournalEntry(TEST_TENANT_ID, TEST_USER_ID, {
        date: new Date(),
        description: 'Test entry',
        reference: 'REF-001',
        lines: [
          { accountId: 'acc-1', debitPaise: 100000, creditPaise: 0, description: 'Debit' },
          { accountId: 'acc-2', debitPaise: 0, creditPaise: 100000, description: 'Credit' },
        ],
      });

      expect(result.entryNumber).toContain('JE-');
      expect(result.status).toBe('DRAFT');
    });

    it('throws when debits do not equal credits', async () => {
      await expect(
        service.createJournalEntry(TEST_TENANT_ID, TEST_USER_ID, {
          date: new Date(),
          description: 'Unbalanced entry',
          lines: [
            { accountId: 'acc-1', debitPaise: 100000, creditPaise: 0, description: 'Debit' },
            { accountId: 'acc-2', debitPaise: 0, creditPaise: 50000, description: 'Credit' },
          ],
        }),
      ).rejects.toThrow('Total debits must equal total credits');
    });

    it('throws when total is zero', async () => {
      await expect(
        service.createJournalEntry(TEST_TENANT_ID, TEST_USER_ID, {
          date: new Date(),
          description: 'Zero entry',
          lines: [
            { accountId: 'acc-1', debitPaise: 0, creditPaise: 0, description: 'Zero' },
            { accountId: 'acc-2', debitPaise: 0, creditPaise: 0, description: 'Zero' },
          ],
        }),
      ).rejects.toThrow('Total debits must equal total credits and be greater than zero');
    });
  });

  // ─── Invoice Creation ────────────────────────────────────────

  describe('createInvoice', () => {
    it('creates a sales invoice with auto-computed GST (intra-state)', async () => {
      mockPrisma.invoice.count.mockResolvedValue(0);
      mockPrisma.invoice.create.mockResolvedValue({
        id: 'inv-1',
        tenantId: TEST_TENANT_ID,
        invoiceNumber: 'INV-202604-0001',
        invoiceType: 'SALES',
        status: 'DRAFT',
        subtotalPaise: BigInt(6500000),
        discountPaise: BigInt(0),
        taxPaise: BigInt(195000),
        totalPaise: BigInt(6695000),
        lineItems: [{
          cgstPaise: BigInt(97500),
          sgstPaise: BigInt(97500),
          igstPaise: BigInt(0),
        }],
        customer: null,
        supplier: null,
      });
      mockPrisma.taxTransaction.createMany.mockResolvedValue({ count: 2 });

      const result = await service.createInvoice(TEST_TENANT_ID, TEST_USER_ID, {
        invoiceType: 'SALES',
        locationId: 'loc-1',
        sourceState: 'MH',
        destState: 'MH', // same state -> CGST + SGST
        lineItems: [
          {
            description: '22K Gold Ring',
            quantity: 1,
            unitPricePaise: 6500000,
            hsnCode: '7113',
            gstRate: 300,
          },
        ],
      });

      expect(result.invoiceNumber).toContain('INV-');
      expect(mockPrisma.taxTransaction.createMany).toHaveBeenCalled();
    });

    it('creates inter-state invoice with IGST', async () => {
      mockPrisma.invoice.count.mockResolvedValue(0);
      mockPrisma.invoice.create.mockResolvedValue({
        id: 'inv-2',
        tenantId: TEST_TENANT_ID,
        invoiceNumber: 'INV-202604-0001',
        invoiceType: 'SALES',
        status: 'DRAFT',
        subtotalPaise: BigInt(6500000),
        discountPaise: BigInt(0),
        taxPaise: BigInt(195000),
        totalPaise: BigInt(6695000),
        lineItems: [{
          cgstPaise: BigInt(0),
          sgstPaise: BigInt(0),
          igstPaise: BigInt(195000),
        }],
        customer: null,
        supplier: null,
      });
      mockPrisma.taxTransaction.createMany.mockResolvedValue({ count: 1 });

      const result = await service.createInvoice(TEST_TENANT_ID, TEST_USER_ID, {
        invoiceType: 'SALES',
        locationId: 'loc-1',
        sourceState: 'MH',
        destState: 'GJ', // different state -> IGST
        lineItems: [
          {
            description: '22K Gold Ring',
            quantity: 1,
            unitPricePaise: 6500000,
            hsnCode: '7113',
            gstRate: 300,
          },
        ],
      });

      expect(result).toBeDefined();
      // IGST tax transaction should be created
      const taxCall = mockPrisma.taxTransaction.createMany.mock.calls[0]![0];
      expect(taxCall.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ taxType: 'IGST' }),
        ]),
      );
    });
  });

  // ─── Record Payment ──────────────────────────────────────────

  describe('recordPayment', () => {
    it('records payment against invoice and marks as PAID when fully paid', async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue({
        id: 'inv-1',
        tenantId: TEST_TENANT_ID,
        totalPaise: BigInt(6695000),
        paidPaise: BigInt(0),
      });

      mockPrisma.invoice.update.mockResolvedValue({
        id: 'inv-1',
        paidPaise: BigInt(6695000),
        status: 'PAID',
      });

      // Mock journal entry creation
      mockPrisma.journalEntry.count.mockResolvedValue(0);
      mockPrisma.account.findFirst.mockResolvedValue({
        id: 'acc-cash',
        tenantId: TEST_TENANT_ID,
        accountType: 'ASSET',
        accountCode: '1001',
      });
      mockPrisma.journalEntry.create.mockResolvedValue({
        id: 'je-pay',
        tenantId: TEST_TENANT_ID,
        entryNumber: 'JE-202604-0001',
      });

      mockPrisma.payment.count.mockResolvedValue(0);
      mockPrisma.payment.create.mockResolvedValue({
        id: 'pay-1',
        tenantId: TEST_TENANT_ID,
        paymentNumber: 'PAY-202604-0001',
        paymentType: 'RECEIVED',
        method: 'CASH',
        amountPaise: BigInt(6695000),
        status: 'COMPLETED',
        customer: null,
        supplier: null,
        invoice: { id: 'inv-1' },
      });

      const result = await service.recordPayment(TEST_TENANT_ID, TEST_USER_ID, {
        paymentType: 'RECEIVED',
        method: 'CASH',
        amountPaise: 6695000,
        invoiceId: 'inv-1',
      });

      expect(result.paymentNumber).toContain('PAY-');
      expect(result.status).toBe('COMPLETED');

      // Invoice should be updated to PAID
      expect(mockPrisma.invoice.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'PAID' }),
        }),
      );
    });

    it('marks invoice as PARTIALLY_PAID for partial payment', async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue({
        id: 'inv-1',
        tenantId: TEST_TENANT_ID,
        totalPaise: BigInt(6695000),
        paidPaise: BigInt(0),
      });

      mockPrisma.invoice.update.mockResolvedValue({
        id: 'inv-1',
        paidPaise: BigInt(3000000),
        status: 'PARTIALLY_PAID',
      });

      mockPrisma.journalEntry.count.mockResolvedValue(0);
      mockPrisma.account.findFirst.mockResolvedValue(null); // no accounts found
      mockPrisma.journalEntry.create.mockResolvedValue({ id: 'je-2' });
      mockPrisma.payment.count.mockResolvedValue(0);
      mockPrisma.payment.create.mockResolvedValue({
        id: 'pay-2',
        paymentNumber: 'PAY-202604-0001',
        status: 'COMPLETED',
        customer: null,
        supplier: null,
        invoice: { id: 'inv-1' },
      });

      await service.recordPayment(TEST_TENANT_ID, TEST_USER_ID, {
        paymentType: 'RECEIVED',
        method: 'CASH',
        amountPaise: 3000000, // partial
        invoiceId: 'inv-1',
      });

      expect(mockPrisma.invoice.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'PARTIALLY_PAID' }),
        }),
      );
    });

    it('throws when linked invoice not found', async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue(null);

      await expect(
        service.recordPayment(TEST_TENANT_ID, TEST_USER_ID, {
          paymentType: 'RECEIVED',
          method: 'CASH',
          amountPaise: 100000,
          invoiceId: 'nonexistent',
        }),
      ).rejects.toThrow('Invoice not found');
    });
  });

  // ─── Trial Balance ───────────────────────────────────────────

  describe('getTrialBalance', () => {
    it('returns trial balance where debits equal credits', async () => {
      mockPrisma.account.findMany.mockResolvedValue([
        { id: 'acc-1', accountCode: '1001', name: 'Cash', accountType: 'ASSET', isActive: true },
        { id: 'acc-2', accountCode: '2001', name: 'Revenue', accountType: 'REVENUE', isActive: true },
      ]);

      // Mock getAccountBalance behavior via journalEntryLine.findMany
      mockPrisma.journalEntryLine.findMany
        .mockResolvedValueOnce([
          { debitPaise: BigInt(500000), creditPaise: BigInt(0) },
        ])
        .mockResolvedValueOnce([
          { debitPaise: BigInt(0), creditPaise: BigInt(500000) },
        ]);

      const dateRange = { from: new Date(2026, 3, 1), to: new Date(2026, 3, 30) };
      const result = await service.getTrialBalance(TEST_TENANT_ID, dateRange);

      expect(result.totalDebits).toBe(result.totalCredits);
    });
  });

  // ─── Post Journal Entry ──────────────────────────────────────

  describe('postJournalEntry', () => {
    it('posts a DRAFT journal entry', async () => {
      mockPrisma.journalEntry.findFirst.mockResolvedValue({
        id: 'je-1',
        tenantId: TEST_TENANT_ID,
        status: 'DRAFT',
      });

      mockPrisma.journalEntry.update.mockResolvedValue({
        id: 'je-1',
        status: 'POSTED',
        postedAt: new Date(),
        lines: [],
      });

      const result = await service.postJournalEntry(TEST_TENANT_ID, TEST_USER_ID, 'je-1');
      expect(result.status).toBe('POSTED');
    });

    it('throws when posting a non-DRAFT entry', async () => {
      mockPrisma.journalEntry.findFirst.mockResolvedValue({
        id: 'je-1',
        tenantId: TEST_TENANT_ID,
        status: 'POSTED',
      });

      await expect(
        service.postJournalEntry(TEST_TENANT_ID, TEST_USER_ID, 'je-1'),
      ).rejects.toThrow('Only DRAFT entries can be posted');
    });
  });
});
