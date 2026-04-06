// ─── CaratFlow BNPL & EMI Types ────────────────────────────────
// Types for Buy Now Pay Later, EMI plans, transactions,
// schedules, and saved payment methods.

import { z } from 'zod';

// ─── Enums ────────────────────────────────────────────────────────

export enum BnplProviderName {
  SIMPL = 'SIMPL',
  LAZYPAY = 'LAZYPAY',
  ZESTMONEY = 'ZESTMONEY',
  BAJAJ_FINSERV = 'BAJAJ_FINSERV',
  HDFC_FLEXIPAY = 'HDFC_FLEXIPAY',
  CUSTOM = 'CUSTOM',
}

export enum BnplTransactionStatus {
  INITIATED = 'INITIATED',
  APPROVED = 'APPROVED',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  DEFAULTED = 'DEFAULTED',
  CANCELLED = 'CANCELLED',
}

export enum EmiInstallmentStatus {
  UPCOMING = 'UPCOMING',
  DUE = 'DUE',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
  WAIVED = 'WAIVED',
}

export enum SavedMethodType {
  CARD = 'CARD',
  UPI = 'UPI',
  WALLET = 'WALLET',
  NET_BANKING = 'NET_BANKING',
}

export enum SavedCardType {
  CREDIT = 'CREDIT',
  DEBIT = 'DEBIT',
}

export enum EmiCardType {
  CREDIT = 'CREDIT',
  DEBIT = 'DEBIT',
  BOTH = 'BOTH',
}

// ─── BnplProvider ─────────────────────────────────────────────────

export const BnplProviderInputSchema = z.object({
  providerName: z.nativeEnum(BnplProviderName),
  displayName: z.string().min(1).max(255),
  apiKey: z.string().max(500).optional(),
  apiSecret: z.string().max(500).optional(),
  webhookSecret: z.string().max(500).optional(),
  isActive: z.boolean().optional(),
  minOrderPaise: z.number().int().nonnegative(),
  maxOrderPaise: z.number().int().positive(),
  supportedTenures: z.array(z.number().int().positive()),
  processingFeePct: z.number().int().nonnegative().default(0),
  settings: z.record(z.unknown()).optional(),
});
export type BnplProviderInput = z.infer<typeof BnplProviderInputSchema>;

export const BnplProviderResponseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string(),
  providerName: z.nativeEnum(BnplProviderName),
  displayName: z.string(),
  isActive: z.boolean(),
  minOrderPaise: z.number(),
  maxOrderPaise: z.number(),
  supportedTenures: z.array(z.number()),
  processingFeePct: z.number(),
  settings: z.unknown().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type BnplProviderResponse = z.infer<typeof BnplProviderResponseSchema>;

// ─── EmiPlan ──────────────────────────────────────────────────────

export const EmiPlanInputSchema = z.object({
  providerId: z.string().uuid().optional(),
  bankName: z.string().max(255).optional(),
  tenure: z.number().int().positive(),
  interestRatePct: z.number().int().nonnegative(),
  processingFeePaise: z.number().int().nonnegative().default(0),
  minAmountPaise: z.number().int().nonnegative(),
  maxAmountPaise: z.number().int().positive(),
  isNoCostEmi: z.boolean().default(false),
  subventionPct: z.number().int().nonnegative().default(0),
  isActive: z.boolean().optional(),
  cardType: z.nativeEnum(EmiCardType).optional(),
});
export type EmiPlanInput = z.infer<typeof EmiPlanInputSchema>;

export const EmiPlanResponseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string(),
  providerId: z.string().uuid().nullable(),
  bankName: z.string().nullable(),
  tenure: z.number(),
  interestRatePct: z.number(),
  processingFeePaise: z.number(),
  minAmountPaise: z.number(),
  maxAmountPaise: z.number(),
  isNoCostEmi: z.boolean(),
  subventionPct: z.number(),
  isActive: z.boolean(),
  cardType: z.nativeEnum(EmiCardType).nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type EmiPlanResponse = z.infer<typeof EmiPlanResponseSchema>;

// ─── EMI Calculation ──────────────────────────────────────────────

export const EmiCalculatorInputSchema = z.object({
  amountPaise: z.number().int().positive(),
  tenure: z.number().int().positive(),
  interestRatePct: z.number().int().nonnegative(), // percent * 100
});
export type EmiCalculatorInput = z.infer<typeof EmiCalculatorInputSchema>;

export const EmiScheduleItemSchema = z.object({
  installmentNumber: z.number().int().positive(),
  dueDate: z.string(), // ISO date string
  amountPaise: z.number().int(),
  principalPaise: z.number().int(),
  interestPaise: z.number().int(),
  outstandingPaise: z.number().int(),
});
export type EmiScheduleItem = z.infer<typeof EmiScheduleItemSchema>;

export const EmiCalculatorResultSchema = z.object({
  monthlyEmiPaise: z.number().int(),
  totalInterestPaise: z.number().int(),
  totalPayablePaise: z.number().int(),
  processingFeePaise: z.number().int(),
  schedule: z.array(EmiScheduleItemSchema),
});
export type EmiCalculatorResult = z.infer<typeof EmiCalculatorResultSchema>;

export const EmiCalculationSchema = z.object({
  planId: z.string().uuid(),
  bankName: z.string().nullable(),
  tenure: z.number(),
  interestRatePct: z.number(),
  isNoCostEmi: z.boolean(),
  monthlyEmiPaise: z.number().int(),
  totalInterestPaise: z.number().int(),
  totalPayablePaise: z.number().int(),
  processingFeePaise: z.number().int(),
});
export type EmiCalculation = z.infer<typeof EmiCalculationSchema>;

// ─── BNPL Transaction ─────────────────────────────────────────────

export const InitiateBnplInputSchema = z.object({
  orderId: z.string().min(1),
  providerName: z.nativeEnum(BnplProviderName),
  planId: z.string().uuid().optional(),
});
export type InitiateBnplInput = z.infer<typeof InitiateBnplInputSchema>;

export const BnplTransactionResponseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string(),
  orderId: z.string(),
  customerId: z.string(),
  providerName: z.nativeEnum(BnplProviderName),
  planId: z.string().uuid().nullable(),
  orderAmountPaise: z.number(),
  emiAmountPaise: z.number(),
  tenure: z.number(),
  interestPaise: z.number(),
  processingFeePaise: z.number(),
  totalPayablePaise: z.number(),
  status: z.nativeEnum(BnplTransactionStatus),
  externalTransactionId: z.string().nullable(),
  approvedAt: z.date().nullable(),
  nextDueDate: z.date().nullable(),
  completedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type BnplTransactionResponse = z.infer<typeof BnplTransactionResponseSchema>;

// ─── EMI Schedule Response ────────────────────────────────────────

export const EmiScheduleResponseSchema = z.object({
  id: z.string().uuid(),
  transactionId: z.string().uuid(),
  installmentNumber: z.number(),
  dueDate: z.date(),
  amountPaise: z.number(),
  principalPaise: z.number(),
  interestPaise: z.number(),
  status: z.nativeEnum(EmiInstallmentStatus),
  paidAt: z.date().nullable(),
  paidAmountPaise: z.number().nullable(),
  lateFeePaise: z.number(),
});
export type EmiScheduleResponse = z.infer<typeof EmiScheduleResponseSchema>;

// ─── Saved Payment Method ─────────────────────────────────────────

export const SavedPaymentMethodInputSchema = z.object({
  methodType: z.nativeEnum(SavedMethodType),
  displayName: z.string().min(1).max(255),
  last4: z.string().length(4).optional(),
  cardBrand: z.string().max(50).optional(),
  cardType: z.nativeEnum(SavedCardType).optional(),
  upiId: z.string().max(100).optional(),
  walletProvider: z.string().max(100).optional(),
  tokenReference: z.string().min(1).max(500),
  isDefault: z.boolean().optional(),
  expiresAt: z.string().datetime().optional(),
});
export type SavedPaymentMethodInput = z.infer<typeof SavedPaymentMethodInputSchema>;

export const SavedPaymentMethodResponseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string(),
  customerId: z.string(),
  methodType: z.nativeEnum(SavedMethodType),
  displayName: z.string(),
  last4: z.string().nullable(),
  cardBrand: z.string().nullable(),
  cardType: z.nativeEnum(SavedCardType).nullable(),
  upiId: z.string().nullable(),
  walletProvider: z.string().nullable(),
  isDefault: z.boolean(),
  expiresAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type SavedPaymentMethodResponse = z.infer<typeof SavedPaymentMethodResponseSchema>;

// ─── Eligibility Check ───────────────────────────────────────────

export const CheckEligibilityInputSchema = z.object({
  customerId: z.string().uuid(),
  amountPaise: z.number().int().positive(),
});
export type CheckEligibilityInput = z.infer<typeof CheckEligibilityInputSchema>;

export const EligibilityResultSchema = z.object({
  eligible: z.boolean(),
  providers: z.array(z.object({
    providerName: z.nativeEnum(BnplProviderName),
    displayName: z.string(),
    providerId: z.string().uuid(),
    maxAmountPaise: z.number(),
    supportedTenures: z.array(z.number()),
    processingFeePct: z.number(),
  })),
  emiPlans: z.array(EmiCalculationSchema),
});
export type EligibilityResult = z.infer<typeof EligibilityResultSchema>;

// ─── List Filters ─────────────────────────────────────────────────

export const BnplTransactionListFilterSchema = z.object({
  status: z.nativeEnum(BnplTransactionStatus).optional(),
  providerName: z.nativeEnum(BnplProviderName).optional(),
  customerId: z.string().uuid().optional(),
  orderId: z.string().optional(),
  search: z.string().optional(),
});
export type BnplTransactionListFilter = z.infer<typeof BnplTransactionListFilterSchema>;

export const EmiPlanListFilterSchema = z.object({
  isActive: z.boolean().optional(),
  bankName: z.string().optional(),
  providerId: z.string().uuid().optional(),
  isNoCostEmi: z.boolean().optional(),
  search: z.string().optional(),
});
export type EmiPlanListFilter = z.infer<typeof EmiPlanListFilterSchema>;
