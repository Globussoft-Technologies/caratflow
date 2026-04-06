// ─── CaratFlow Digital Gold Types & Zod Schemas ─────────────────
// Digital Gold: fractional gold ownership, buy/sell, SIP, redemption,
// price alerts. B2C facing for online gold accumulation.

import { z } from 'zod';
import { PaginationSchema, UuidSchema, DateRangeSchema } from './common';
import type { DomainEventBase } from './events';

// ─── Enums ────────────────────────────────────────────────────────

export enum GoldTransactionType {
  BUY = 'BUY',
  SELL = 'SELL',
  REDEEM_PHYSICAL = 'REDEEM_PHYSICAL',
  REDEEM_JEWELRY = 'REDEEM_JEWELRY',
  SIP_BUY = 'SIP_BUY',
  BONUS = 'BONUS',
}

export enum GoldTransactionStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum GoldSipType {
  FIXED_AMOUNT = 'FIXED_AMOUNT',
  FIXED_WEIGHT = 'FIXED_WEIGHT',
}

export enum GoldSipFrequency {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
}

export enum GoldSipStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
}

export enum SipExecutionStatus {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED',
}

export enum GoldRedemptionType {
  PHYSICAL_GOLD = 'PHYSICAL_GOLD',
  JEWELRY = 'JEWELRY',
  SELL_BACK = 'SELL_BACK',
}

export enum GoldRedemptionStatus {
  REQUESTED = 'REQUESTED',
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

export enum GoldPriceAlertType {
  PRICE_BELOW = 'PRICE_BELOW',
  PRICE_ABOVE = 'PRICE_ABOVE',
}

export enum GoldPriceAlertStatus {
  ACTIVE = 'ACTIVE',
  TRIGGERED = 'TRIGGERED',
  CANCELLED = 'CANCELLED',
}

// ─── Payment Method ───────────────────────────────────────────────

export const DigitalGoldPaymentMethodSchema = z.enum([
  'UPI',
  'NET_BANKING',
  'DEBIT_CARD',
  'CREDIT_CARD',
  'WALLET',
  'AUTO_DEBIT',
]);
export type DigitalGoldPaymentMethod = z.infer<typeof DigitalGoldPaymentMethodSchema>;

// ─── Buy Gold ─────────────────────────────────────────────────────

export const BuyGoldInputSchema = z
  .object({
    amountPaise: z.number().int().positive().optional(),
    weightMg: z.number().int().positive().optional(),
    paymentMethod: DigitalGoldPaymentMethodSchema,
  })
  .refine((data) => data.amountPaise || data.weightMg, {
    message: 'Either amountPaise or weightMg must be provided',
  })
  .refine((data) => !(data.amountPaise && data.weightMg), {
    message: 'Provide only one of amountPaise or weightMg, not both',
  });
export type BuyGoldInput = z.infer<typeof BuyGoldInputSchema>;

export interface BuyGoldResponse {
  transactionId: string;
  goldWeightMg: number;
  amountPaise: number;
  pricePerGramPaise: number;
  pricePer10gPaise: number;
  newBalanceMg: number;
  status: GoldTransactionStatus;
}

// ─── Sell Gold ────────────────────────────────────────────────────

export const SellGoldInputSchema = z.object({
  weightMg: z.number().int().positive(),
});
export type SellGoldInput = z.infer<typeof SellGoldInputSchema>;

export interface SellGoldResponse {
  transactionId: string;
  goldWeightMg: number;
  amountPaise: number;
  pricePerGramPaise: number;
  pricePer10gPaise: number;
  newBalanceMg: number;
  status: GoldTransactionStatus;
}

// ─── Create SIP ───────────────────────────────────────────────────

export const CreateSipInputSchema = z
  .object({
    sipType: z.nativeEnum(GoldSipType),
    amountPaise: z.number().int().positive().optional(),
    weightMg: z.number().int().positive().optional(),
    frequency: z.nativeEnum(GoldSipFrequency),
    dayOfMonth: z.number().int().min(1).max(28).optional(),
    dayOfWeek: z.number().int().min(0).max(6).optional(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date().optional(),
    paymentMethod: DigitalGoldPaymentMethodSchema,
    autoDebitReference: z.string().max(255).optional(),
  })
  .refine(
    (data) => {
      if (data.sipType === GoldSipType.FIXED_AMOUNT) return !!data.amountPaise;
      if (data.sipType === GoldSipType.FIXED_WEIGHT) return !!data.weightMg;
      return false;
    },
    { message: 'FIXED_AMOUNT requires amountPaise, FIXED_WEIGHT requires weightMg' },
  )
  .refine(
    (data) => {
      if (data.frequency === GoldSipFrequency.MONTHLY) return data.dayOfMonth != null;
      if (data.frequency === GoldSipFrequency.WEEKLY) return data.dayOfWeek != null;
      return true; // DAILY doesn't need day specification
    },
    { message: 'MONTHLY frequency requires dayOfMonth, WEEKLY requires dayOfWeek' },
  );
export type CreateSipInput = z.infer<typeof CreateSipInputSchema>;

export interface SipResponse {
  id: string;
  vaultId: string;
  customerId: string;
  sipType: GoldSipType;
  amountPaise: number | null;
  weightMg: number | null;
  frequency: GoldSipFrequency;
  dayOfMonth: number | null;
  dayOfWeek: number | null;
  status: GoldSipStatus;
  startDate: string;
  endDate: string | null;
  nextDeductionDate: string;
  totalDeductions: number;
  failedDeductions: number;
  paymentMethod: string;
  createdAt: string;
}

export interface SipExecutionResponse {
  id: string;
  sipId: string;
  executionDate: string;
  amountPaise: number;
  goldWeightMg: number;
  pricePerGramPaise: number;
  status: SipExecutionStatus;
  failureReason: string | null;
  transactionId: string | null;
  createdAt: string;
}

// ─── Redeem Gold ──────────────────────────────────────────────────

export const RedeemGoldInputSchema = z
  .object({
    redemptionType: z.nativeEnum(GoldRedemptionType),
    weightMg: z.number().int().positive().optional(),
    addressId: z.string().max(255),
    productId: UuidSchema.optional(),
  })
  .refine(
    (data) => {
      if (data.redemptionType === GoldRedemptionType.JEWELRY) return !!data.productId;
      return !!data.weightMg;
    },
    { message: 'JEWELRY redemption requires productId; others require weightMg' },
  );
export type RedeemGoldInput = z.infer<typeof RedeemGoldInputSchema>;

export interface RedeemGoldResponse {
  redemptionId: string;
  redemptionType: GoldRedemptionType;
  goldWeightMg: number;
  valuePaise: number;
  status: GoldRedemptionStatus;
  newBalanceMg: number;
}

// ─── Vault Response ───────────────────────────────────────────────

export interface GoldVaultResponse {
  id: string;
  customerId: string;
  balanceMg: number;
  balanceGrams: number;
  balanceTola: number;
  totalInvestedPaise: number;
  totalSoldPaise: number;
  avgBuyPricePer10gPaise: number;
  currentValuePaise: number;
  currentRatePer10gPaise: number;
  profitLossPaise: number;
  profitLossPercent: number;
  kycVerified: boolean;
  isActive: boolean;
}

// ─── Transaction Response ─────────────────────────────────────────

export interface GoldTransactionResponse {
  id: string;
  vaultId: string;
  transactionType: GoldTransactionType;
  amountPaise: number;
  goldWeightMg: number;
  pricePerGramPaise: number;
  pricePer10gPaise: number;
  status: GoldTransactionStatus;
  paymentMethod: string | null;
  reference: string | null;
  processedAt: string | null;
  createdAt: string;
}

// ─── Transaction List ─────────────────────────────────────────────

export const GoldTransactionListInputSchema = PaginationSchema.extend({
  transactionType: z.nativeEnum(GoldTransactionType).optional(),
  status: z.nativeEnum(GoldTransactionStatus).optional(),
  dateRange: DateRangeSchema.optional(),
});
export type GoldTransactionListInput = z.infer<typeof GoldTransactionListInputSchema>;

// ─── Portfolio Response ───────────────────────────────────────────

export interface GoldPortfolioResponse {
  vault: GoldVaultResponse;
  recentTransactions: GoldTransactionResponse[];
  activeSips: SipResponse[];
  pendingRedemptions: RedeemGoldResponse[];
  /** Monthly investment data for P&L chart (last 12 months) */
  performanceChart: Array<{
    month: string;
    investedPaise: number;
    valuePaise: number;
    goldWeightMg: number;
  }>;
}

// ─── Price Alert ──────────────────────────────────────────────────

export const GoldPriceAlertInputSchema = z.object({
  alertType: z.nativeEnum(GoldPriceAlertType),
  targetPricePer10gPaise: z.number().int().positive(),
});
export type GoldPriceAlertInput = z.infer<typeof GoldPriceAlertInputSchema>;

export interface GoldPriceAlertResponse {
  id: string;
  customerId: string;
  alertType: GoldPriceAlertType;
  targetPricePer10gPaise: number;
  currentPricePer10gPaise: number;
  status: GoldPriceAlertStatus;
  triggeredAt: string | null;
  createdAt: string;
}

// ─── Dashboard Response ───────────────────────────────────────────

export interface DigitalGoldDashboardResponse {
  totalCustomers: number;
  totalGoldHeldMg: number;
  totalGoldHeldGrams: number;
  totalAumPaise: number;
  activeSips: number;
  totalTransactionsToday: number;
  totalBuyVolumeTodayPaise: number;
  totalSellVolumeTodayPaise: number;
}

// ─── Digital Gold Domain Events ───────────────────────────────────

export interface DigitalGoldBoughtEvent extends DomainEventBase {
  type: 'digital-gold.gold.bought';
  payload: {
    transactionId: string;
    customerId: string;
    amountPaise: number;
    goldWeightMg: number;
    pricePer10gPaise: number;
  };
}

export interface DigitalGoldSoldEvent extends DomainEventBase {
  type: 'digital-gold.gold.sold';
  payload: {
    transactionId: string;
    customerId: string;
    amountPaise: number;
    goldWeightMg: number;
    pricePer10gPaise: number;
  };
}

export interface DigitalGoldSipExecutedEvent extends DomainEventBase {
  type: 'digital-gold.sip.executed';
  payload: {
    sipId: string;
    executionId: string;
    customerId: string;
    amountPaise: number;
    goldWeightMg: number;
  };
}

export interface DigitalGoldRedemptionRequestedEvent extends DomainEventBase {
  type: 'digital-gold.redemption.requested';
  payload: {
    redemptionId: string;
    customerId: string;
    redemptionType: string;
    goldWeightMg: number;
  };
}

export interface DigitalGoldPriceAlertTriggeredEvent extends DomainEventBase {
  type: 'digital-gold.alert.triggered';
  payload: {
    alertId: string;
    customerId: string;
    alertType: string;
    targetPricePer10gPaise: number;
    currentPricePer10gPaise: number;
  };
}
