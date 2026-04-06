import { describe, it, expect } from 'vitest';
import {
  JournalEntryInputSchema,
  JournalEntryLineInputSchema,
  InvoiceInputSchema,
  InvoiceLineInputSchema,
  PaymentInputSchema,
  GstComputationInputSchema,
  BankAccountInputSchema,
  BankTransactionInputSchema,
  TaxReportInputSchema,
  FinancialYearInputSchema,
  CostCenterInputSchema,
  BudgetInputSchema,
  InvoiceType,
  PaymentType,
  FinPaymentMethod,
} from '../financial';

const validUuid = '550e8400-e29b-41d4-a716-446655440000';

describe('JournalEntryLineInputSchema', () => {
  it('should parse valid journal entry line with defaults', () => {
    const result = JournalEntryLineInputSchema.safeParse({
      accountId: validUuid,
      debitPaise: 100000,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.creditPaise).toBe(0);
      expect(result.data.currencyCode).toBe('INR');
    }
  });
});

describe('JournalEntryInputSchema', () => {
  it('should parse valid balanced journal entry', () => {
    const result = JournalEntryInputSchema.safeParse({
      date: '2026-04-01',
      description: 'Gold purchase',
      lines: [
        { accountId: validUuid, debitPaise: 100000, creditPaise: 0 },
        { accountId: validUuid, debitPaise: 0, creditPaise: 100000 },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('should reject unbalanced journal entry (debits != credits)', () => {
    const result = JournalEntryInputSchema.safeParse({
      date: '2026-04-01',
      description: 'Unbalanced entry',
      lines: [
        { accountId: validUuid, debitPaise: 100000, creditPaise: 0 },
        { accountId: validUuid, debitPaise: 0, creditPaise: 50000 },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('should reject entry with zero totals', () => {
    const result = JournalEntryInputSchema.safeParse({
      date: '2026-04-01',
      description: 'Zero entry',
      lines: [
        { accountId: validUuid, debitPaise: 0, creditPaise: 0 },
        { accountId: validUuid, debitPaise: 0, creditPaise: 0 },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('should reject fewer than 2 lines', () => {
    const result = JournalEntryInputSchema.safeParse({
      date: '2026-04-01',
      description: 'Single line',
      lines: [
        { accountId: validUuid, debitPaise: 100000, creditPaise: 0 },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('should reject empty description', () => {
    const result = JournalEntryInputSchema.safeParse({
      date: '2026-04-01',
      description: '',
      lines: [
        { accountId: validUuid, debitPaise: 100000, creditPaise: 0 },
        { accountId: validUuid, debitPaise: 0, creditPaise: 100000 },
      ],
    });
    expect(result.success).toBe(false);
  });
});

describe('InvoiceLineInputSchema', () => {
  it('should parse valid invoice line with defaults', () => {
    const result = InvoiceLineInputSchema.safeParse({
      description: '22K Gold Necklace',
      unitPricePaise: 15000000,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.hsnCode).toBe('7113');
      expect(result.data.gstRate).toBe(300);
      expect(result.data.quantity).toBe(1);
    }
  });
});

describe('InvoiceInputSchema', () => {
  it('should parse valid invoice', () => {
    const result = InvoiceInputSchema.safeParse({
      invoiceType: InvoiceType.SALES,
      locationId: validUuid,
      sourceState: 'MH',
      destState: 'MH',
      lineItems: [{ description: 'Gold Ring', unitPricePaise: 5000000 }],
    });
    expect(result.success).toBe(true);
  });

  it('should reject empty lineItems', () => {
    const result = InvoiceInputSchema.safeParse({
      invoiceType: InvoiceType.PURCHASE,
      locationId: validUuid,
      sourceState: 'MH',
      destState: 'GJ',
      lineItems: [],
    });
    expect(result.success).toBe(false);
  });

  it('should reject invalid invoice type', () => {
    const result = InvoiceInputSchema.safeParse({
      invoiceType: 'INVALID',
      locationId: validUuid,
      sourceState: 'MH',
      destState: 'MH',
      lineItems: [{ description: 'Test', unitPricePaise: 100 }],
    });
    expect(result.success).toBe(false);
  });
});

describe('PaymentInputSchema', () => {
  it('should parse valid payment', () => {
    const result = PaymentInputSchema.safeParse({
      paymentType: PaymentType.RECEIVED,
      method: FinPaymentMethod.UPI,
      amountPaise: 5000000,
    });
    expect(result.success).toBe(true);
  });

  it('should reject zero amount', () => {
    const result = PaymentInputSchema.safeParse({
      paymentType: PaymentType.MADE,
      method: FinPaymentMethod.CASH,
      amountPaise: 0,
    });
    expect(result.success).toBe(false);
  });

  it('should reject invalid payment method', () => {
    const result = PaymentInputSchema.safeParse({
      paymentType: PaymentType.RECEIVED,
      method: 'CRYPTO',
      amountPaise: 100,
    });
    expect(result.success).toBe(false);
  });
});

describe('GstComputationInputSchema', () => {
  it('should parse valid GST computation input', () => {
    const result = GstComputationInputSchema.safeParse({
      taxableAmountPaise: 10000000,
      sourceState: 'MH',
      destState: 'GJ',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.hsnCode).toBe('7113');
      expect(result.data.gstRate).toBe(300);
    }
  });
});

describe('TaxReportInputSchema', () => {
  it('should parse valid tax report input', () => {
    const result = TaxReportInputSchema.safeParse({
      period: { month: 4, year: 2026 },
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid month', () => {
    const result = TaxReportInputSchema.safeParse({
      period: { month: 13, year: 2026 },
    });
    expect(result.success).toBe(false);
  });
});

describe('FinancialYearInputSchema', () => {
  it('should parse valid financial year', () => {
    const result = FinancialYearInputSchema.safeParse({
      name: 'FY 2025-26',
      startDate: '2025-04-01',
      endDate: '2026-03-31',
    });
    expect(result.success).toBe(true);
  });
});

describe('CostCenterInputSchema', () => {
  it('should parse valid cost center', () => {
    const result = CostCenterInputSchema.safeParse({
      code: 'CC001',
      name: 'Main Showroom',
    });
    expect(result.success).toBe(true);
  });
});

describe('BudgetInputSchema', () => {
  it('should parse valid budget with 12 monthly entries', () => {
    const result = BudgetInputSchema.safeParse({
      accountId: validUuid,
      financialYearId: validUuid,
      monthlyBudgets: [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200],
      totalBudgetPaise: 7800,
    });
    expect(result.success).toBe(true);
  });

  it('should reject monthlyBudgets with wrong length', () => {
    const result = BudgetInputSchema.safeParse({
      accountId: validUuid,
      financialYearId: validUuid,
      monthlyBudgets: [100, 200, 300],
      totalBudgetPaise: 600,
    });
    expect(result.success).toBe(false);
  });
});

describe('BankAccountInputSchema', () => {
  it('should parse valid bank account', () => {
    const result = BankAccountInputSchema.safeParse({
      accountId: validUuid,
      bankName: 'HDFC Bank',
      accountNumber: '1234567890',
    });
    expect(result.success).toBe(true);
  });
});

describe('BankTransactionInputSchema', () => {
  it('should parse valid bank transaction', () => {
    const result = BankTransactionInputSchema.safeParse({
      transactionDate: '2026-04-07',
      description: 'Customer payment',
      creditPaise: 500000,
    });
    expect(result.success).toBe(true);
  });
});
