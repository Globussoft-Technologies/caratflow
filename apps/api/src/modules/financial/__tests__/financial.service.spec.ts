import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FinancialService } from '../financial.service';
import { createMockPrismaService, TEST_TENANT_ID, TEST_USER_ID, resetAllMocks } from '../../../__tests__/setup';

describe('FinancialService (Unit)', () => {
  let service: FinancialService;
  let mockPrisma: ReturnType<typeof createMockPrismaService>;

  beforeEach(() => {
    mockPrisma = createMockPrismaService();
    service = new FinancialService(mockPrisma as any);
    resetAllMocks(mockPrisma);
  });

  // ─── Journal Entries ──────────────────────────────────────────

  describe('createJournalEntry', () => {
    it('creates a balanced journal entry successfully', async () => {
      mockPrisma.journalEntry.count.mockResolvedValue(0);
      const mockEntry = {
        id: 'je-1',
        tenantId: TEST_TENANT_ID,
        entryNumber: 'JE-202604-0001',
        status: 'DRAFT',
        lines: [
          { accountId: 'acc-1', debitPaise: BigInt(100000), creditPaise: BigInt(0) },
          { accountId: 'acc-2', debitPaise: BigInt(0), creditPaise: BigInt(100000) },
        ],
      };
      mockPrisma.journalEntry.create.mockResolvedValue(mockEntry);

      const result = await service.createJournalEntry(TEST_TENANT_ID, TEST_USER_ID, {
        date: new Date(),
        description: 'Test entry',
        lines: [
          { accountId: 'acc-1', debitPaise: 100000, creditPaise: 0, description: 'Debit' },
          { accountId: 'acc-2', debitPaise: 0, creditPaise: 100000, description: 'Credit' },
        ],
      } as any);

      expect(result).toBeDefined();
      expect(result.status).toBe('DRAFT');
      expect(mockPrisma.journalEntry.create).toHaveBeenCalled();
    });

    it('rejects unbalanced entry (debits != credits)', async () => {
      await expect(
        service.createJournalEntry(TEST_TENANT_ID, TEST_USER_ID, {
          date: new Date(),
          description: 'Unbalanced',
          lines: [
            { accountId: 'acc-1', debitPaise: 100000, creditPaise: 0 },
            { accountId: 'acc-2', debitPaise: 0, creditPaise: 50000 },
          ],
        } as any),
      ).rejects.toThrow('Total debits must equal total credits');
    });

    it('rejects entry with zero total amount', async () => {
      await expect(
        service.createJournalEntry(TEST_TENANT_ID, TEST_USER_ID, {
          date: new Date(),
          description: 'Zero entry',
          lines: [
            { accountId: 'acc-1', debitPaise: 0, creditPaise: 0 },
            { accountId: 'acc-2', debitPaise: 0, creditPaise: 0 },
          ],
        } as any),
      ).rejects.toThrow('Total debits must equal total credits and be greater than zero');
    });

    it('auto-generates entry number with correct prefix', async () => {
      mockPrisma.journalEntry.count.mockResolvedValue(3);
      mockPrisma.journalEntry.create.mockResolvedValue({
        id: 'je-1',
        entryNumber: 'JE-202604-0004',
        status: 'DRAFT',
        lines: [],
      });

      await service.createJournalEntry(TEST_TENANT_ID, TEST_USER_ID, {
        date: new Date(),
        description: 'Test',
        lines: [
          { accountId: 'acc-1', debitPaise: 1000, creditPaise: 0 },
          { accountId: 'acc-2', debitPaise: 0, creditPaise: 1000 },
        ],
      } as any);

      expect(mockPrisma.journalEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            entryNumber: expect.stringContaining('JE-'),
          }),
        }),
      );
    });

    it('creates all lines with tenant ID', async () => {
      mockPrisma.journalEntry.count.mockResolvedValue(0);
      mockPrisma.journalEntry.create.mockResolvedValue({
        id: 'je-1',
        status: 'DRAFT',
        lines: [],
      });

      await service.createJournalEntry(TEST_TENANT_ID, TEST_USER_ID, {
        date: new Date(),
        description: 'Test',
        lines: [
          { accountId: 'acc-1', debitPaise: 5000, creditPaise: 0 },
          { accountId: 'acc-2', debitPaise: 0, creditPaise: 5000 },
        ],
      } as any);

      const createCall = mockPrisma.journalEntry.create.mock.calls[0]![0];
      const linesCreate = createCall.data.lines.create;
      for (const line of linesCreate) {
        expect(line.tenantId).toBe(TEST_TENANT_ID);
      }
    });
  });

  describe('postJournalEntry', () => {
    it('posts a DRAFT entry: changes status and sets postedAt', async () => {
      mockPrisma.journalEntry.findFirst.mockResolvedValue({
        id: 'je-1',
        tenantId: TEST_TENANT_ID,
        status: 'DRAFT',
      });
      const postedEntry = {
        id: 'je-1',
        status: 'POSTED',
        postedAt: new Date(),
        lines: [],
      };
      mockPrisma.journalEntry.update.mockResolvedValue(postedEntry);

      const result = await service.postJournalEntry(TEST_TENANT_ID, TEST_USER_ID, 'je-1');

      expect(result.status).toBe('POSTED');
      expect(mockPrisma.journalEntry.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'POSTED',
            postedAt: expect.any(Date),
          }),
        }),
      );
    });

    it('rejects posting a non-DRAFT entry', async () => {
      mockPrisma.journalEntry.findFirst.mockResolvedValue({
        id: 'je-1',
        tenantId: TEST_TENANT_ID,
        status: 'POSTED',
      });

      await expect(
        service.postJournalEntry(TEST_TENANT_ID, TEST_USER_ID, 'je-1'),
      ).rejects.toThrow('Only DRAFT entries can be posted');
    });

    it('throws not found for missing entry', async () => {
      mockPrisma.journalEntry.findFirst.mockResolvedValue(null);

      await expect(
        service.postJournalEntry(TEST_TENANT_ID, TEST_USER_ID, 'nonexistent'),
      ).rejects.toThrow('Journal entry not found');
    });
  });

  describe('voidJournalEntry', () => {
    it('voids a POSTED entry', async () => {
      mockPrisma.journalEntry.findFirst.mockResolvedValue({
        id: 'je-1',
        tenantId: TEST_TENANT_ID,
        status: 'POSTED',
      });
      mockPrisma.journalEntry.update.mockResolvedValue({
        id: 'je-1',
        status: 'VOIDED',
        voidedAt: new Date(),
        voidReason: 'Error correction',
        lines: [],
      });

      const result = await service.voidJournalEntry(TEST_TENANT_ID, TEST_USER_ID, 'je-1', 'Error correction');

      expect(result.status).toBe('VOIDED');
      expect(mockPrisma.journalEntry.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'VOIDED',
            voidReason: 'Error correction',
            voidedAt: expect.any(Date),
          }),
        }),
      );
    });

    it('voids a DRAFT entry', async () => {
      mockPrisma.journalEntry.findFirst.mockResolvedValue({
        id: 'je-1',
        tenantId: TEST_TENANT_ID,
        status: 'DRAFT',
      });
      mockPrisma.journalEntry.update.mockResolvedValue({
        id: 'je-1',
        status: 'VOIDED',
        lines: [],
      });

      const result = await service.voidJournalEntry(TEST_TENANT_ID, TEST_USER_ID, 'je-1', 'No longer needed');
      expect(result.status).toBe('VOIDED');
    });

    it('rejects voiding an already VOIDED entry', async () => {
      mockPrisma.journalEntry.findFirst.mockResolvedValue({
        id: 'je-1',
        tenantId: TEST_TENANT_ID,
        status: 'VOIDED',
      });

      await expect(
        service.voidJournalEntry(TEST_TENANT_ID, TEST_USER_ID, 'je-1', 'duplicate'),
      ).rejects.toThrow('Entry is already voided');
    });
  });

  // ─── Invoices ──────────────────────────────────────────────────

  describe('createInvoice', () => {
    it('auto-generates invoice number with correct prefix for SALES', async () => {
      mockPrisma.invoice.count.mockResolvedValue(0);
      mockPrisma.invoice.create.mockResolvedValue({
        id: 'inv-1',
        invoiceNumber: 'INV-202604-0001',
        invoiceType: 'SALES',
        status: 'DRAFT',
        subtotalPaise: BigInt(1000000),
        discountPaise: BigInt(0),
        taxPaise: BigInt(30000),
        totalPaise: BigInt(1030000),
        lineItems: [],
        customer: null,
        supplier: null,
      });
      mockPrisma.taxTransaction.createMany.mockResolvedValue({ count: 2 });

      const result = await service.createInvoice(TEST_TENANT_ID, TEST_USER_ID, {
        invoiceType: 'SALES',
        locationId: 'loc-1',
        sourceState: 'MH',
        destState: 'MH',
        lineItems: [
          { description: 'Gold Ring', quantity: 1, unitPricePaise: 1000000, hsnCode: '7113', gstRate: 300 },
        ],
      } as any);

      expect(result.invoiceNumber).toContain('INV-');
    });

    it('auto-generates PINV prefix for PURCHASE invoice', async () => {
      mockPrisma.invoice.count.mockResolvedValue(0);
      mockPrisma.invoice.create.mockResolvedValue({
        id: 'inv-1',
        invoiceNumber: 'PINV-202604-0001',
        invoiceType: 'PURCHASE',
        status: 'DRAFT',
        lineItems: [],
        customer: null,
        supplier: null,
      });
      mockPrisma.taxTransaction.createMany.mockResolvedValue({ count: 0 });

      await service.createInvoice(TEST_TENANT_ID, TEST_USER_ID, {
        invoiceType: 'PURCHASE',
        locationId: 'loc-1',
        sourceState: 'GJ',
        destState: 'GJ',
        lineItems: [
          { description: 'Gold Bar', quantity: 1, unitPricePaise: 5000000 },
        ],
      } as any);

      expect(mockPrisma.invoice.create).toHaveBeenCalled();
    });

    it('computes GST lines automatically for sales invoice', async () => {
      mockPrisma.invoice.count.mockResolvedValue(0);
      mockPrisma.invoice.create.mockResolvedValue({
        id: 'inv-1',
        invoiceNumber: 'INV-202604-0001',
        invoiceType: 'SALES',
        status: 'DRAFT',
        lineItems: [],
        customer: null,
        supplier: null,
      });
      mockPrisma.taxTransaction.createMany.mockResolvedValue({ count: 2 });

      await service.createInvoice(TEST_TENANT_ID, TEST_USER_ID, {
        invoiceType: 'SALES',
        locationId: 'loc-1',
        sourceState: 'MH',
        destState: 'MH',
        lineItems: [
          { description: 'Necklace', quantity: 1, unitPricePaise: 10000000, hsnCode: '7113', gstRate: 300 },
        ],
      } as any);

      // Tax transaction should be created for CGST and SGST
      expect(mockPrisma.taxTransaction.createMany).toHaveBeenCalled();
    });

    it('calculates correct totals with discount', async () => {
      mockPrisma.invoice.count.mockResolvedValue(0);

      let capturedData: any;
      mockPrisma.invoice.create.mockImplementation(async (args: any) => {
        capturedData = args.data;
        return {
          id: 'inv-1',
          invoiceNumber: 'INV-test',
          ...args.data,
          lineItems: [],
          customer: null,
          supplier: null,
        };
      });
      mockPrisma.taxTransaction.createMany.mockResolvedValue({ count: 0 });

      await service.createInvoice(TEST_TENANT_ID, TEST_USER_ID, {
        invoiceType: 'SALES',
        locationId: 'loc-1',
        sourceState: 'MH',
        destState: 'MH',
        lineItems: [
          {
            description: 'Ring',
            quantity: 2,
            unitPricePaise: 500000,
            discountPaise: 50000,
            hsnCode: '7113',
            gstRate: 300,
          },
        ],
      } as any);

      // subtotal = 500000 * 2 = 1000000
      // discount = 50000
      // taxable = 1000000 - 50000 = 950000
      // tax = 3% of 950000 = 28500
      // total = 1000000 - 50000 + 28500 = 978500
      expect(capturedData.subtotalPaise).toBe(BigInt(1000000));
      expect(capturedData.discountPaise).toBe(BigInt(50000));
      expect(capturedData.taxPaise).toBe(BigInt(28500));
      expect(capturedData.totalPaise).toBe(BigInt(978500));
    });

    it('handles multiple line items with different HSN codes', async () => {
      mockPrisma.invoice.count.mockResolvedValue(0);

      let capturedData: any;
      mockPrisma.invoice.create.mockImplementation(async (args: any) => {
        capturedData = args.data;
        return {
          id: 'inv-1',
          ...args.data,
          lineItems: [],
          customer: null,
          supplier: null,
        };
      });
      mockPrisma.taxTransaction.createMany.mockResolvedValue({ count: 0 });

      await service.createInvoice(TEST_TENANT_ID, TEST_USER_ID, {
        invoiceType: 'SALES',
        locationId: 'loc-1',
        sourceState: 'MH',
        destState: 'MH',
        lineItems: [
          { description: 'Ring', quantity: 1, unitPricePaise: 1000000, hsnCode: '7113', gstRate: 300 },
          { description: 'Making Charges', quantity: 1, unitPricePaise: 200000, hsnCode: '9988', gstRate: 500 },
        ],
      } as any);

      // Ring tax: 3% of 1000000 = 30000
      // Making tax: 5% of 200000 = 10000
      expect(capturedData.taxPaise).toBe(BigInt(40000));
    });
  });

  // ─── Payments ──────────────────────────────────────────────────

  describe('recordPayment', () => {
    const setupPaymentMocks = () => {
      mockPrisma.journalEntry.count.mockResolvedValue(0);
      mockPrisma.account.findFirst.mockResolvedValue(null);
      mockPrisma.journalEntry.create.mockResolvedValue({ id: 'je-pay-1' });
      mockPrisma.payment.count.mockResolvedValue(0);
    };

    it('records payment against invoice and updates paid amount', async () => {
      setupPaymentMocks();
      mockPrisma.invoice.findFirst.mockResolvedValue({
        id: 'inv-1',
        tenantId: TEST_TENANT_ID,
        totalPaise: BigInt(1000000),
        paidPaise: BigInt(0),
      });
      mockPrisma.invoice.update.mockResolvedValue({});
      mockPrisma.payment.create.mockResolvedValue({
        id: 'pay-1',
        paymentNumber: 'PAY-202604-0001',
        amountPaise: BigInt(500000),
        status: 'COMPLETED',
        customer: null,
        supplier: null,
        invoice: null,
      });

      const result = await service.recordPayment(TEST_TENANT_ID, TEST_USER_ID, {
        paymentType: 'RECEIVED',
        method: 'BANK_TRANSFER',
        amountPaise: 500000,
        invoiceId: 'inv-1',
      } as any);

      expect(result.status).toBe('COMPLETED');
      expect(mockPrisma.invoice.update).toHaveBeenCalled();
    });

    it('marks invoice as PAID when fully paid', async () => {
      setupPaymentMocks();
      mockPrisma.invoice.findFirst.mockResolvedValue({
        id: 'inv-1',
        tenantId: TEST_TENANT_ID,
        totalPaise: BigInt(1000000),
        paidPaise: BigInt(500000),
      });
      mockPrisma.invoice.update.mockResolvedValue({});
      mockPrisma.payment.create.mockResolvedValue({
        id: 'pay-1',
        status: 'COMPLETED',
        customer: null,
        supplier: null,
        invoice: null,
      });

      await service.recordPayment(TEST_TENANT_ID, TEST_USER_ID, {
        paymentType: 'RECEIVED',
        method: 'CASH',
        amountPaise: 500000,
        invoiceId: 'inv-1',
      } as any);

      expect(mockPrisma.invoice.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'PAID',
            paidPaise: BigInt(1000000),
          }),
        }),
      );
    });

    it('marks invoice as PARTIALLY_PAID for partial payment', async () => {
      setupPaymentMocks();
      mockPrisma.invoice.findFirst.mockResolvedValue({
        id: 'inv-1',
        tenantId: TEST_TENANT_ID,
        totalPaise: BigInt(1000000),
        paidPaise: BigInt(0),
      });
      mockPrisma.invoice.update.mockResolvedValue({});
      mockPrisma.payment.create.mockResolvedValue({
        id: 'pay-1',
        status: 'COMPLETED',
        customer: null,
        supplier: null,
        invoice: null,
      });

      await service.recordPayment(TEST_TENANT_ID, TEST_USER_ID, {
        paymentType: 'RECEIVED',
        method: 'CASH',
        amountPaise: 300000,
        invoiceId: 'inv-1',
      } as any);

      expect(mockPrisma.invoice.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'PARTIALLY_PAID',
          }),
        }),
      );
    });

    it('marks as PAID when overpayment occurs (implementation allows it)', async () => {
      setupPaymentMocks();
      mockPrisma.invoice.findFirst.mockResolvedValue({
        id: 'inv-1',
        tenantId: TEST_TENANT_ID,
        totalPaise: BigInt(1000000),
        paidPaise: BigInt(900000),
      });
      mockPrisma.invoice.update.mockResolvedValue({});
      mockPrisma.payment.create.mockResolvedValue({
        id: 'pay-1',
        status: 'COMPLETED',
        customer: null,
        supplier: null,
        invoice: null,
      });

      await service.recordPayment(TEST_TENANT_ID, TEST_USER_ID, {
        paymentType: 'RECEIVED',
        method: 'CASH',
        amountPaise: 200000,
        invoiceId: 'inv-1',
      } as any);

      // newPaidPaise = 900000 + 200000 = 1100000 >= 1000000 => PAID
      expect(mockPrisma.invoice.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'PAID',
          }),
        }),
      );
    });

    it('throws when invoice not found', async () => {
      setupPaymentMocks();
      mockPrisma.invoice.findFirst.mockResolvedValue(null);

      await expect(
        service.recordPayment(TEST_TENANT_ID, TEST_USER_ID, {
          paymentType: 'RECEIVED',
          method: 'CASH',
          amountPaise: 100000,
          invoiceId: 'nonexistent',
        } as any),
      ).rejects.toThrow('Invoice not found');
    });

    it('creates payment without invoice (standalone payment)', async () => {
      setupPaymentMocks();
      mockPrisma.payment.create.mockResolvedValue({
        id: 'pay-1',
        paymentNumber: 'PAY-202604-0001',
        status: 'COMPLETED',
        customer: null,
        supplier: null,
        invoice: null,
      });

      const result = await service.recordPayment(TEST_TENANT_ID, TEST_USER_ID, {
        paymentType: 'RECEIVED',
        method: 'CASH',
        amountPaise: 500000,
      } as any);

      expect(result.status).toBe('COMPLETED');
      expect(mockPrisma.invoice.findFirst).not.toHaveBeenCalled();
    });
  });

  // ─── GST Computation ──────────────────────────────────────────

  describe('computeGst', () => {
    it('intra-state 3% jewelry: 1.5% CGST + 1.5% SGST', () => {
      const result = service.computeGst({
        taxableAmountPaise: 10000000,
        gstRate: 300,
        sourceState: 'MH',
        destState: 'MH',
        hsnCode: '7113',
      });

      expect(result.isInterState).toBe(false);
      expect(result.cgstPaise).toBe(150000);
      expect(result.sgstPaise).toBe(150000);
      expect(result.igstPaise).toBe(0);
      expect(result.totalTaxPaise).toBe(300000);
    });

    it('inter-state 3% jewelry: 3% IGST', () => {
      const result = service.computeGst({
        taxableAmountPaise: 10000000,
        gstRate: 300,
        sourceState: 'MH',
        destState: 'GJ',
        hsnCode: '7113',
      });

      expect(result.isInterState).toBe(true);
      expect(result.igstPaise).toBe(300000);
      expect(result.cgstPaise).toBe(0);
      expect(result.sgstPaise).toBe(0);
    });

    it('making charges at 5% GST', () => {
      const result = service.computeGst({
        taxableAmountPaise: 200000,
        gstRate: 500,
        sourceState: 'MH',
        destState: 'MH',
        hsnCode: '9988',
      });

      expect(result.cgstPaise).toBe(5000);
      expect(result.sgstPaise).toBe(5000);
      expect(result.totalTaxPaise).toBe(10000);
    });
  });

  // ─── Trial Balance ─────────────────────────────────────────────

  describe('getTrialBalance', () => {
    it('produces total debits == total credits', async () => {
      mockPrisma.account.findMany.mockResolvedValue([
        { id: 'acc-1', accountCode: '1001', name: 'Cash', accountType: 'ASSET', isActive: true },
        { id: 'acc-2', accountCode: '2001', name: 'Revenue', accountType: 'REVENUE', isActive: true },
      ]);

      mockPrisma.journalEntryLine.findMany
        .mockResolvedValueOnce([
          { debitPaise: BigInt(500000), creditPaise: BigInt(0) },
        ])
        .mockResolvedValueOnce([
          { debitPaise: BigInt(0), creditPaise: BigInt(500000) },
        ]);

      const dateRange = { from: new Date('2026-04-01'), to: new Date('2026-04-30') };
      const result = await service.getTrialBalance(TEST_TENANT_ID, dateRange);

      expect(result.totalDebits).toBe(result.totalCredits);
    });
  });
});
