// ─── CaratFlow Financial Types ─────────────────────────────────
// Types for journal entries, invoices, payments, GST, TDS/TCS,
// bank reconciliation, and financial reports.

import { z } from 'zod';
import { DateRangeSchema, PaginationSchema, UuidSchema } from './common';

// ─── Enums (mirrors Prisma enums) ─────────────────────────────

export enum JournalEntryStatus {
  DRAFT = 'DRAFT',
  POSTED = 'POSTED',
  VOIDED = 'VOIDED',
}

export enum InvoiceType {
  SALES = 'SALES',
  PURCHASE = 'PURCHASE',
  CREDIT_NOTE = 'CREDIT_NOTE',
  DEBIT_NOTE = 'DEBIT_NOTE',
}

export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
  CANCELLED = 'CANCELLED',
  VOIDED = 'VOIDED',
}

export enum PaymentType {
  RECEIVED = 'RECEIVED',
  MADE = 'MADE',
}

export enum FinPaymentMethod {
  CASH = 'CASH',
  CARD = 'CARD',
  UPI = 'UPI',
  BANK_TRANSFER = 'BANK_TRANSFER',
  CHEQUE = 'CHEQUE',
  ONLINE = 'ONLINE',
}

export enum FinPaymentStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

export enum TaxType {
  CGST = 'CGST',
  SGST = 'SGST',
  IGST = 'IGST',
  CESS = 'CESS',
  TDS = 'TDS',
  TCS = 'TCS',
  SALES_TAX = 'SALES_TAX',
  VAT = 'VAT',
}

export enum FinancialYearStatusEnum {
  OPEN = 'OPEN',
  CLOSING = 'CLOSING',
  CLOSED = 'CLOSED',
}

// ─── Journal Entry Schemas ────────────────────────────────────

export const JournalEntryLineInputSchema = z.object({
  accountId: UuidSchema,
  debitPaise: z.number().int().min(0).default(0),
  creditPaise: z.number().int().min(0).default(0),
  description: z.string().max(500).optional(),
  currencyCode: z.string().length(3).default('INR'),
  exchangeRate: z.number().int().min(1).default(10000),
});
export type JournalEntryLineInput = z.infer<typeof JournalEntryLineInputSchema>;

export const JournalEntryInputSchema = z.object({
  date: z.coerce.date(),
  description: z.string().min(1).max(500),
  reference: z.string().max(255).optional(),
  lines: z.array(JournalEntryLineInputSchema).min(2),
}).refine(
  (data) => {
    const totalDebit = data.lines.reduce((sum, l) => sum + l.debitPaise, 0);
    const totalCredit = data.lines.reduce((sum, l) => sum + l.creditPaise, 0);
    return totalDebit === totalCredit && totalDebit > 0;
  },
  { message: 'Total debits must equal total credits and be greater than zero' },
);
export type JournalEntryInput = z.infer<typeof JournalEntryInputSchema>;

export const JournalEntryLineResponseSchema = z.object({
  id: UuidSchema,
  accountId: UuidSchema,
  accountName: z.string().optional(),
  accountCode: z.string().optional(),
  debitPaise: z.number().int(),
  creditPaise: z.number().int(),
  description: z.string().nullable(),
  currencyCode: z.string(),
  exchangeRate: z.number().int(),
});

export const JournalEntryResponseSchema = z.object({
  id: UuidSchema,
  tenantId: UuidSchema,
  entryNumber: z.string(),
  date: z.coerce.date(),
  description: z.string(),
  reference: z.string().nullable(),
  status: z.nativeEnum(JournalEntryStatus),
  postedAt: z.coerce.date().nullable(),
  voidedAt: z.coerce.date().nullable(),
  voidReason: z.string().nullable(),
  lines: z.array(JournalEntryLineResponseSchema),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type JournalEntryResponse = z.infer<typeof JournalEntryResponseSchema>;

export const JournalEntryListInputSchema = PaginationSchema.extend({
  status: z.nativeEnum(JournalEntryStatus).optional(),
  dateRange: DateRangeSchema.optional(),
  search: z.string().optional(),
});
export type JournalEntryListInput = z.infer<typeof JournalEntryListInputSchema>;

// ─── Invoice Schemas ──────────────────────────────────────────

export const InvoiceLineInputSchema = z.object({
  productId: UuidSchema.optional(),
  description: z.string().min(1).max(500),
  quantity: z.number().int().min(1).default(1),
  unitPricePaise: z.number().int().min(0),
  discountPaise: z.number().int().min(0).default(0),
  hsnCode: z.string().max(10).default('7113'),
  gstRate: z.number().int().min(0).default(300), // percent * 100
});
export type InvoiceLineInput = z.infer<typeof InvoiceLineInputSchema>;

export const InvoiceInputSchema = z.object({
  invoiceType: z.nativeEnum(InvoiceType),
  customerId: UuidSchema.optional(),
  supplierId: UuidSchema.optional(),
  locationId: UuidSchema,
  dueDate: z.coerce.date().optional(),
  notes: z.string().optional(),
  terms: z.string().optional(),
  currencyCode: z.string().length(3).default('INR'),
  sourceState: z.string().max(5),
  destState: z.string().max(5),
  lineItems: z.array(InvoiceLineInputSchema).min(1),
});
export type InvoiceInput = z.infer<typeof InvoiceInputSchema>;

export const InvoiceLineResponseSchema = z.object({
  id: UuidSchema,
  productId: z.string().nullable(),
  productName: z.string().optional(),
  description: z.string(),
  quantity: z.number().int(),
  unitPricePaise: z.number().int(),
  discountPaise: z.number().int(),
  taxableAmountPaise: z.number().int(),
  hsnCode: z.string(),
  gstRate: z.number().int(),
  cgstPaise: z.number().int(),
  sgstPaise: z.number().int(),
  igstPaise: z.number().int(),
  totalPaise: z.number().int(),
});

export const InvoiceResponseSchema = z.object({
  id: UuidSchema,
  tenantId: UuidSchema,
  invoiceNumber: z.string(),
  invoiceType: z.nativeEnum(InvoiceType),
  customerId: z.string().nullable(),
  customerName: z.string().optional(),
  supplierId: z.string().nullable(),
  supplierName: z.string().optional(),
  locationId: z.string(),
  status: z.nativeEnum(InvoiceStatus),
  subtotalPaise: z.number().int(),
  discountPaise: z.number().int(),
  taxPaise: z.number().int(),
  totalPaise: z.number().int(),
  currencyCode: z.string(),
  dueDate: z.coerce.date().nullable(),
  paidPaise: z.number().int(),
  notes: z.string().nullable(),
  terms: z.string().nullable(),
  lineItems: z.array(InvoiceLineResponseSchema),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type InvoiceResponse = z.infer<typeof InvoiceResponseSchema>;

export const InvoiceListInputSchema = PaginationSchema.extend({
  invoiceType: z.nativeEnum(InvoiceType).optional(),
  status: z.nativeEnum(InvoiceStatus).optional(),
  customerId: UuidSchema.optional(),
  supplierId: UuidSchema.optional(),
  dateRange: DateRangeSchema.optional(),
  search: z.string().optional(),
});
export type InvoiceListInput = z.infer<typeof InvoiceListInputSchema>;

// ─── Payment Schemas ──────────────────────────────────────────

export const PaymentInputSchema = z.object({
  paymentType: z.nativeEnum(PaymentType),
  method: z.nativeEnum(FinPaymentMethod),
  amountPaise: z.number().int().min(1),
  currencyCode: z.string().length(3).default('INR'),
  customerId: UuidSchema.optional(),
  supplierId: UuidSchema.optional(),
  invoiceId: UuidSchema.optional(),
  reference: z.string().max(255).optional(),
});
export type PaymentInput = z.infer<typeof PaymentInputSchema>;

export const PaymentResponseSchema = z.object({
  id: UuidSchema,
  tenantId: UuidSchema,
  paymentNumber: z.string(),
  paymentType: z.nativeEnum(PaymentType),
  method: z.nativeEnum(FinPaymentMethod),
  amountPaise: z.number().int(),
  currencyCode: z.string(),
  customerId: z.string().nullable(),
  customerName: z.string().optional(),
  supplierId: z.string().nullable(),
  supplierName: z.string().optional(),
  invoiceId: z.string().nullable(),
  invoiceNumber: z.string().optional(),
  reference: z.string().nullable(),
  status: z.nativeEnum(FinPaymentStatus),
  processedAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type PaymentResponse = z.infer<typeof PaymentResponseSchema>;

export const PaymentListInputSchema = PaginationSchema.extend({
  paymentType: z.nativeEnum(PaymentType).optional(),
  status: z.nativeEnum(FinPaymentStatus).optional(),
  customerId: UuidSchema.optional(),
  supplierId: UuidSchema.optional(),
  dateRange: DateRangeSchema.optional(),
  search: z.string().optional(),
});
export type PaymentListInput = z.infer<typeof PaymentListInputSchema>;

// ─── GST Computation ──────────────────────────────────────────

export const GstComputationInputSchema = z.object({
  taxableAmountPaise: z.number().int().min(0),
  hsnCode: z.string().default('7113'),
  gstRate: z.number().int().default(300), // percent * 100
  sourceState: z.string().max(5),
  destState: z.string().max(5),
});
export type GstComputationInput = z.infer<typeof GstComputationInputSchema>;

export interface GstComputationResult {
  taxableAmountPaise: number;
  cgstRate: number; // percent * 100
  sgstRate: number;
  igstRate: number;
  cgstPaise: number;
  sgstPaise: number;
  igstPaise: number;
  totalTaxPaise: number;
  isInterState: boolean;
}

// ─── Bank Reconciliation ──────────────────────────────────────

export const BankAccountInputSchema = z.object({
  accountId: UuidSchema,
  bankName: z.string().min(1).max(255),
  accountNumber: z.string().min(1).max(30),
  ifscCode: z.string().max(11).optional(),
  swiftCode: z.string().max(11).optional(),
  branchName: z.string().max(255).optional(),
  currencyCode: z.string().length(3).default('INR'),
  currentBalancePaise: z.number().int().default(0),
  isDefault: z.boolean().default(false),
});
export type BankAccountInput = z.infer<typeof BankAccountInputSchema>;

export const BankTransactionInputSchema = z.object({
  transactionDate: z.coerce.date(),
  description: z.string().min(1).max(500),
  debitPaise: z.number().int().min(0).default(0),
  creditPaise: z.number().int().min(0).default(0),
  runningBalancePaise: z.number().int().default(0),
  reference: z.string().max(255).optional(),
});
export type BankTransactionInput = z.infer<typeof BankTransactionInputSchema>;

export const BankReconciliationInputSchema = z.object({
  bankTransactionId: UuidSchema,
  matchWithId: UuidSchema,
});
export type BankReconciliationInput = z.infer<typeof BankReconciliationInputSchema>;

export const ImportStatementInputSchema = z.object({
  bankAccountId: UuidSchema,
  transactions: z.array(BankTransactionInputSchema).min(1),
});
export type ImportStatementInput = z.infer<typeof ImportStatementInputSchema>;

// ─── Financial Reports ────────────────────────────────────────

export interface AccountBalance {
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: string;
  debitTotal: number;
  creditTotal: number;
  balance: number; // net balance in paise
}

export interface TrialBalanceReport {
  asOfDate: string;
  accounts: AccountBalance[];
  totalDebits: number;
  totalCredits: number;
}

export interface ProfitAndLossReport {
  fromDate: string;
  toDate: string;
  revenue: Array<{ accountId: string; accountName: string; amount: number }>;
  expenses: Array<{ accountId: string; accountName: string; amount: number }>;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
}

export interface BalanceSheetReport {
  asOfDate: string;
  assets: Array<{ accountId: string; accountName: string; amount: number }>;
  liabilities: Array<{ accountId: string; accountName: string; amount: number }>;
  equity: Array<{ accountId: string; accountName: string; amount: number }>;
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
}

export interface LedgerEntry {
  date: string;
  entryNumber: string;
  description: string;
  debitPaise: number;
  creditPaise: number;
  runningBalance: number;
}

export interface LedgerReport {
  accountId: string;
  accountName: string;
  openingBalance: number;
  entries: LedgerEntry[];
  closingBalance: number;
}

export interface CashFlowReport {
  fromDate: string;
  toDate: string;
  operatingActivities: number;
  investingActivities: number;
  financingActivities: number;
  netCashFlow: number;
  openingCash: number;
  closingCash: number;
}

export interface AgingBucket {
  label: string; // e.g., "0-30 days", "31-60 days"
  amountPaise: number;
  count: number;
}

export interface AgingReport {
  type: 'AR' | 'AP';
  asOfDate: string;
  buckets: AgingBucket[];
  totalOutstanding: number;
  entries: Array<{
    invoiceId: string;
    invoiceNumber: string;
    partyName: string;
    invoiceDate: string;
    dueDate: string;
    totalPaise: number;
    paidPaise: number;
    outstandingPaise: number;
    ageDays: number;
  }>;
}

// ─── Tax Reports ──────────────────────────────────────────────

export const TaxReportInputSchema = z.object({
  period: z.object({
    month: z.number().int().min(1).max(12),
    year: z.number().int().min(2020),
  }),
});
export type TaxReportInput = z.infer<typeof TaxReportInputSchema>;

export interface Gstr1HsnSummary {
  hsnCode: string;
  description: string;
  quantity: number;
  taxableAmountPaise: number;
  cgstPaise: number;
  sgstPaise: number;
  igstPaise: number;
  cessPaise: number;
  totalTaxPaise: number;
}

export interface Gstr1Data {
  period: string;
  b2b: Array<{
    gstin: string;
    invoices: Array<{
      invoiceNumber: string;
      invoiceDate: string;
      totalPaise: number;
      taxableAmountPaise: number;
      cgstPaise: number;
      sgstPaise: number;
      igstPaise: number;
    }>;
  }>;
  b2c: Array<{
    invoiceNumber: string;
    invoiceDate: string;
    totalPaise: number;
    taxableAmountPaise: number;
    cgstPaise: number;
    sgstPaise: number;
    igstPaise: number;
  }>;
  hsnSummary: Gstr1HsnSummary[];
  totalTaxableAmount: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
}

export interface Gstr3bData {
  period: string;
  outwardSupplies: {
    taxableAmountPaise: number;
    igstPaise: number;
    cgstPaise: number;
    sgstPaise: number;
    cessPaise: number;
  };
  inwardSupplies: {
    taxableAmountPaise: number;
    igstPaise: number;
    cgstPaise: number;
    sgstPaise: number;
    cessPaise: number;
  };
  itcAvailable: {
    igstPaise: number;
    cgstPaise: number;
    sgstPaise: number;
    cessPaise: number;
  };
  taxPayable: {
    igstPaise: number;
    cgstPaise: number;
    sgstPaise: number;
    cessPaise: number;
  };
}

// ─── Financial Dashboard ──────────────────────────────────────

export interface FinancialDashboardResponse {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  cashPosition: number;
  accountsReceivable: number;
  accountsPayable: number;
  revenueTrend: number; // percent change vs prior period
  expenseTrend: number;
  recentTransactions: Array<{
    id: string;
    date: string;
    description: string;
    amountPaise: number;
    type: 'debit' | 'credit';
  }>;
  monthlyPnl: Array<{
    month: string;
    revenue: number;
    expenses: number;
    profit: number;
  }>;
  arAgingSummary: AgingBucket[];
  apAgingSummary: AgingBucket[];
}

// ─── Financial Year ───────────────────────────────────────────

export const FinancialYearInputSchema = z.object({
  name: z.string().min(1).max(50),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
});
export type FinancialYearInput = z.infer<typeof FinancialYearInputSchema>;

// ─── Cost Center ──────────────────────────────────────────────

export const CostCenterInputSchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(255),
  description: z.string().max(500).optional(),
  parentId: UuidSchema.optional(),
  isActive: z.boolean().default(true),
});
export type CostCenterInput = z.infer<typeof CostCenterInputSchema>;

// ─── Budget ───────────────────────────────────────────────────

export const BudgetInputSchema = z.object({
  costCenterId: UuidSchema.optional(),
  accountId: UuidSchema,
  financialYearId: UuidSchema,
  monthlyBudgets: z.array(z.number().int().min(0)).length(12),
  totalBudgetPaise: z.number().int().min(0),
});
export type BudgetInput = z.infer<typeof BudgetInputSchema>;
