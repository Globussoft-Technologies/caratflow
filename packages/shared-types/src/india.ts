// ─── CaratFlow India-Specific Types & Zod Schemas ──────────────
// Girvi (mortgage lending), Kitty/Chit schemes, Gold Savings,
// MCX/IBJA rates, KYC verification, and India payment methods.

import { z } from 'zod';
import { PaginationSchema, UuidSchema, DateRangeSchema } from './common';
import type { DomainEventBase } from './events';

// ─── Enums ────────────────────────────────────────────────────────

export enum GirviLoanStatus {
  ACTIVE = 'ACTIVE',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  CLOSED = 'CLOSED',
  AUCTIONED = 'AUCTIONED',
  DEFAULTED = 'DEFAULTED',
}

export enum GirviInterestType {
  SIMPLE = 'SIMPLE',
  COMPOUND = 'COMPOUND',
}

export enum GirviCompoundingPeriod {
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  YEARLY = 'YEARLY',
}

export enum GirviPaymentType {
  INTEREST_ONLY = 'INTEREST_ONLY',
  PRINCIPAL_ONLY = 'PRINCIPAL_ONLY',
  BOTH = 'BOTH',
  CLOSURE = 'CLOSURE',
}

export enum GirviPaymentMethod {
  CASH = 'CASH',
  BANK_TRANSFER = 'BANK_TRANSFER',
  UPI = 'UPI',
  CHEQUE = 'CHEQUE',
}

export enum GirviAuctionStatus {
  SCHEDULED = 'SCHEDULED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum KittySchemeType {
  KITTY = 'KITTY',
  CHIT = 'CHIT',
}

export enum KittySchemeStatus {
  OPEN = 'OPEN',
  ACTIVE = 'ACTIVE',
  MATURED = 'MATURED',
  CANCELLED = 'CANCELLED',
}

export enum KittyMemberStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  DEFAULTED = 'DEFAULTED',
  WITHDRAWN = 'WITHDRAWN',
}

export enum KittyInstallmentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
  WAIVED = 'WAIVED',
}

export enum GoldSavingsSchemeStatus {
  OPEN = 'OPEN',
  ACTIVE = 'ACTIVE',
  CLOSED = 'CLOSED',
}

export enum GoldSavingsMemberStatus {
  ACTIVE = 'ACTIVE',
  MATURED = 'MATURED',
  REDEEMED = 'REDEEMED',
  CANCELLED = 'CANCELLED',
}

export enum GoldSavingsInstallmentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
}

export enum KycVerificationType {
  AADHAAR = 'AADHAAR',
  PAN = 'PAN',
  VOTER_ID = 'VOTER_ID',
  PASSPORT = 'PASSPORT',
  DRIVING_LICENSE = 'DRIVING_LICENSE',
}

export enum KycVerificationStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  FAILED = 'FAILED',
  EXPIRED = 'EXPIRED',
}

export enum MetalRateSource {
  MCX = 'MCX',
  MANUAL = 'MANUAL',
  IBJA = 'IBJA',
}

// ─── Girvi Loan ───────────────────────────────────────────────────

export const GirviLoanInputSchema = z.object({
  customerId: UuidSchema,
  locationId: UuidSchema,
  collateralDescription: z.string().min(1).max(5000),
  collateralImages: z.array(z.string().url()).optional(),
  metalType: z.string().min(1).max(20),
  grossWeightMg: z.number().int().positive(),
  netWeightMg: z.number().int().positive(),
  purityFineness: z.number().int().min(1).max(999),
  appraisedValuePaise: z.number().int().positive(),
  loanAmountPaise: z.number().int().positive(),
  interestRate: z.number().int().min(1).max(10000), // annual percent * 100
  interestType: z.nativeEnum(GirviInterestType),
  compoundingPeriod: z.nativeEnum(GirviCompoundingPeriod).optional(),
  disbursedDate: z.coerce.date(),
  dueDate: z.coerce.date(),
  notes: z.string().max(5000).optional(),
});
export type GirviLoanInput = z.infer<typeof GirviLoanInputSchema>;

export const GirviLoanListInputSchema = PaginationSchema.extend({
  status: z.nativeEnum(GirviLoanStatus).optional(),
  customerId: UuidSchema.optional(),
  search: z.string().optional(),
  dateRange: DateRangeSchema.optional(),
  overdueOnly: z.boolean().optional(),
});
export type GirviLoanListInput = z.infer<typeof GirviLoanListInputSchema>;

export interface GirviLoanResponse {
  id: string;
  loanNumber: string;
  customerId: string;
  customerName: string;
  locationId: string;
  status: GirviLoanStatus;
  collateralDescription: string;
  metalType: string;
  grossWeightMg: number;
  netWeightMg: number;
  purityFineness: number;
  appraisedValuePaise: number;
  loanAmountPaise: number;
  interestRate: number;
  interestType: GirviInterestType;
  disbursedDate: string;
  dueDate: string;
  closedDate: string | null;
  outstandingPrincipalPaise: number;
  outstandingInterestPaise: number;
  totalInterestPaidPaise: number;
  totalPrincipalPaidPaise: number;
  aadhaarVerified: boolean;
  panVerified: boolean;
  createdAt: string;
}

// ─── Girvi Payment ────────────────────────────────────────────────

export const GirviPaymentInputSchema = z.object({
  girviLoanId: UuidSchema,
  paymentDate: z.coerce.date(),
  paymentType: z.nativeEnum(GirviPaymentType),
  principalPaise: z.number().int().nonnegative().default(0),
  interestPaise: z.number().int().nonnegative().default(0),
  method: z.nativeEnum(GirviPaymentMethod),
  reference: z.string().max(255).optional(),
  receivedBy: z.string().max(255).optional(),
});
export type GirviPaymentInput = z.infer<typeof GirviPaymentInputSchema>;

// ─── Girvi Interest Calculation ───────────────────────────────────

export interface GirviInterestCalcResult {
  principalPaise: number;
  rateBps: number;
  daysCalculated: number;
  interestPaise: number;
  cumulativeInterestPaise: number;
  outstandingTotalPaise: number;
}

// ─── Girvi Auction ────────────────────────────────────────────────

export const GirviAuctionInputSchema = z.object({
  girviLoanId: UuidSchema,
  auctionDate: z.coerce.date(),
  reservePricePaise: z.number().int().positive(),
  notes: z.string().max(5000).optional(),
});
export type GirviAuctionInput = z.infer<typeof GirviAuctionInputSchema>;

export const GirviAuctionResultInputSchema = z.object({
  auctionId: UuidSchema,
  soldPricePaise: z.number().int().positive(),
  buyerName: z.string().min(1).max(255),
  buyerPhone: z.string().max(20).optional(),
});
export type GirviAuctionResultInput = z.infer<typeof GirviAuctionResultInputSchema>;

// ─── Girvi Dashboard ──────────────────────────────────────────────

export interface GirviDashboardResponse {
  activeLoans: number;
  totalPrincipalOutstandingPaise: number;
  totalInterestAccruedPaise: number;
  overdueLoans: number;
  upcomingAuctions: number;
  recentLoans: GirviLoanResponse[];
}

// ─── Kitty Scheme ─────────────────────────────────────────────────

export const KittySchemeInputSchema = z.object({
  schemeName: z.string().min(1).max(255),
  schemeType: z.nativeEnum(KittySchemeType),
  monthlyAmountPaise: z.number().int().positive(),
  durationMonths: z.number().int().min(1).max(120),
  bonusPercent: z.number().int().nonnegative().optional(),
  startDate: z.coerce.date(),
  maxMembers: z.number().int().min(1),
  terms: z.string().max(10000).optional(),
});
export type KittySchemeInput = z.infer<typeof KittySchemeInputSchema>;

export const KittySchemeListInputSchema = PaginationSchema.extend({
  status: z.nativeEnum(KittySchemeStatus).optional(),
  search: z.string().optional(),
});
export type KittySchemeListInput = z.infer<typeof KittySchemeListInputSchema>;

export const KittyMemberInputSchema = z.object({
  kittySchemeId: UuidSchema,
  customerId: UuidSchema,
  joinedDate: z.coerce.date(),
});
export type KittyMemberInput = z.infer<typeof KittyMemberInputSchema>;

export const KittyInstallmentInputSchema = z.object({
  kittyMemberId: UuidSchema,
  installmentNumber: z.number().int().min(1),
  paidDate: z.coerce.date(),
  amountPaise: z.number().int().positive(),
  lateFeePaise: z.number().int().nonnegative().default(0),
  method: z.nativeEnum(GirviPaymentMethod),
  reference: z.string().max(255).optional(),
});
export type KittyInstallmentInput = z.infer<typeof KittyInstallmentInputSchema>;

export interface KittySchemeResponse {
  id: string;
  schemeName: string;
  schemeType: KittySchemeType;
  monthlyAmountPaise: number;
  durationMonths: number;
  totalValuePaise: number;
  bonusPercent: number | null;
  startDate: string;
  endDate: string;
  status: KittySchemeStatus;
  maxMembers: number;
  currentMembers: number;
  totalCollectedPaise: number;
}

// ─── Gold Savings Scheme ──────────────────────────────────────────

export const GoldSavingsSchemeInputSchema = z.object({
  schemeName: z.string().min(1).max(255),
  monthlyAmountPaise: z.number().int().positive(),
  durationMonths: z.number().int().min(1).max(120),
  bonusMonths: z.number().int().nonnegative(),
  maturityBonusPercent: z.number().int().nonnegative(),
  startDate: z.coerce.date(),
  terms: z.string().max(10000).optional(),
});
export type GoldSavingsSchemeInput = z.infer<typeof GoldSavingsSchemeInputSchema>;

export const GoldSavingsSchemeListInputSchema = PaginationSchema.extend({
  status: z.nativeEnum(GoldSavingsSchemeStatus).optional(),
  search: z.string().optional(),
});
export type GoldSavingsSchemeListInput = z.infer<typeof GoldSavingsSchemeListInputSchema>;

export const GoldSavingsMemberInputSchema = z.object({
  goldSavingsSchemeId: UuidSchema,
  customerId: UuidSchema,
  joinedDate: z.coerce.date(),
});
export type GoldSavingsMemberInput = z.infer<typeof GoldSavingsMemberInputSchema>;

export const GoldSavingsInstallmentInputSchema = z.object({
  goldSavingsMemberId: UuidSchema,
  installmentNumber: z.number().int().min(1),
  paidDate: z.coerce.date(),
  amountPaise: z.number().int().positive(),
  method: z.nativeEnum(GirviPaymentMethod),
  reference: z.string().max(255).optional(),
});
export type GoldSavingsInstallmentInput = z.infer<typeof GoldSavingsInstallmentInputSchema>;

export interface GoldSavingsResponse {
  id: string;
  schemeName: string;
  monthlyAmountPaise: number;
  durationMonths: number;
  bonusMonths: number;
  maturityBonusPercent: number;
  startDate: string;
  status: GoldSavingsSchemeStatus;
  memberCount: number;
  totalCollectedPaise: number;
}

// ─── Metal Rates ──────────────────────────────────────────────────

export const MetalRateInputSchema = z.object({
  metalType: z.string().min(1).max(20),
  purity: z.number().int().min(1).max(999),
  ratePerGramPaise: z.number().int().positive(),
  ratePer10gPaise: z.number().int().positive(),
  ratePerTolaPaise: z.number().int().positive(),
  ratePerTroyOzPaise: z.number().int().positive(),
  source: z.nativeEnum(MetalRateSource),
  recordedAt: z.coerce.date(),
  currencyCode: z.string().length(3).default('INR'),
});
export type MetalRateInput = z.infer<typeof MetalRateInputSchema>;

export const MetalRateQuerySchema = z.object({
  metalType: z.string(),
  purity: z.number().int(),
  dateRange: DateRangeSchema.optional(),
});
export type MetalRateQuery = z.infer<typeof MetalRateQuerySchema>;

export interface MetalRateResponse {
  id: string;
  metalType: string;
  purity: number;
  ratePerGramPaise: number;
  ratePer10gPaise: number;
  ratePerTolaPaise: number;
  ratePerTroyOzPaise: number;
  source: string;
  recordedAt: string;
  currencyCode: string;
}

export interface LiveRateResponse {
  metalType: string;
  purity: number;
  ratePerGramPaise: number;
  ratePer10gPaise: number;
  ratePerTolaPaise: number;
  ratePerTroyOzPaise: number;
  source: string;
  updatedAt: string;
  currencyCode: string;
  changePercent: number | null;
}

// ─── KYC ──────────────────────────────────────────────────────────

export const KycVerificationInputSchema = z.object({
  customerId: UuidSchema,
  verificationType: z.nativeEnum(KycVerificationType),
  documentNumber: z.string().min(1).max(50),
  documentUrl: z.string().url().optional(),
  notes: z.string().max(5000).optional(),
});
export type KycVerificationInput = z.infer<typeof KycVerificationInputSchema>;

export const KycVerifyInputSchema = z.object({
  verificationId: UuidSchema,
  status: z.enum(['VERIFIED', 'FAILED']),
  notes: z.string().max(5000).optional(),
});
export type KycVerifyInput = z.infer<typeof KycVerifyInputSchema>;

// ─── eKYC Provider Result ─────────────────────────────────────────

export const KycProviderSourceSchema = z.enum(['cashfree', 'setu', 'karza', 'digilocker', 'local']);
export type KycProviderSource = z.infer<typeof KycProviderSourceSchema>;

export const KycResultSchema = z.object({
  verified: z.boolean(),
  name: z.string().optional(),
  dob: z.string().optional(),
  gender: z.string().optional(),
  address: z.string().optional(),
  source: KycProviderSourceSchema,
  errorCode: z.string().optional(),
  errorMessage: z.string().optional(),
  raw: z.unknown().optional(),
});
export type KycResult = z.infer<typeof KycResultSchema>;

// ─── eKYC tRPC Input Schemas ──────────────────────────────────────

export const AadhaarVerifyInputSchema = z.object({
  customerId: UuidSchema.optional(),
  aadhaarNumber: z.string().regex(/^\d{12}$/, 'Aadhaar must be 12 digits'),
  name: z.string().max(200).optional(),
  dob: z.string().optional(),
});
export type AadhaarVerifyInput = z.infer<typeof AadhaarVerifyInputSchema>;

export const PanVerifyInputSchema = z.object({
  customerId: UuidSchema.optional(),
  panNumber: z.string().regex(/^[A-Z]{5}\d{4}[A-Z]$/, 'Invalid PAN format'),
  name: z.string().max(200).optional(),
});
export type PanVerifyInput = z.infer<typeof PanVerifyInputSchema>;

export const AadhaarOtpRequestSchema = z.object({
  customerId: UuidSchema.optional(),
  aadhaarNumber: z.string().regex(/^\d{12}$/, 'Aadhaar must be 12 digits'),
});
export type AadhaarOtpRequestInput = z.infer<typeof AadhaarOtpRequestSchema>;

export const AadhaarOtpConfirmSchema = z.object({
  refId: z.string().min(1),
  otp: z.string().regex(/^\d{4,8}$/),
});
export type AadhaarOtpConfirmInput = z.infer<typeof AadhaarOtpConfirmSchema>;

export const KycListInputSchema = z.object({
  status: z.enum(['PENDING', 'VERIFIED', 'FAILED', 'EXPIRED']).optional(),
  customerId: UuidSchema.optional(),
});
export type KycListInput = z.infer<typeof KycListInputSchema>;

export interface KycStatusResponse {
  customerId: string;
  verifications: Array<{
    id: string;
    type: KycVerificationType;
    documentNumber: string;
    status: KycVerificationStatus;
    verifiedAt: string | null;
    validUntil: string | null;
  }>;
  isAadhaarVerified: boolean;
  isPanVerified: boolean;
  isKycComplete: boolean;
}

// ─── UPI / India Payments ─────────────────────────────────────────

export const UpiPaymentInputSchema = z.object({
  payeeVpa: z.string().min(1).max(100),
  payeeName: z.string().min(1).max(100),
  amountPaise: z.number().int().positive(),
  transactionNote: z.string().max(255).optional(),
  referenceId: z.string().max(50).optional(),
});
export type UpiPaymentInput = z.infer<typeof UpiPaymentInputSchema>;

export interface UpiQrData {
  upiUrl: string;
  payeeVpa: string;
  payeeName: string;
  amountRupees: string;
  transactionNote: string;
  referenceId: string;
}

export const BankTransferTemplateInputSchema = z.object({
  transferType: z.enum(['NEFT', 'RTGS', 'IMPS']),
  beneficiaryName: z.string().min(1).max(255),
  accountNumber: z.string().min(1).max(30),
  ifscCode: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/),
  amountPaise: z.number().int().positive(),
  remarks: z.string().max(255).optional(),
});
export type BankTransferTemplateInput = z.infer<typeof BankTransferTemplateInputSchema>;

export interface BankTransferTemplate {
  transferType: string;
  beneficiaryName: string;
  accountNumber: string;
  ifscCode: string;
  amountRupees: string;
  referenceFormat: string;
  remarks: string;
}

// ─── India Module Dashboard ───────────────────────────────────────

export interface IndiaFeaturesModuleDashboard {
  girvi: GirviDashboardResponse;
  kittySchemes: {
    activeSchemes: number;
    totalMembers: number;
    collectionDuePaise: number;
  };
  goldSavings: {
    activeSchemes: number;
    totalMembers: number;
    totalDepositsPaise: number;
  };
  currentRates: LiveRateResponse[];
  kycPending: number;
}

// ─── India Domain Events ──────────────────────────────────────────

export interface IndiaGirviLoanCreatedEvent extends DomainEventBase {
  type: 'india.girvi.loan_created';
  payload: {
    loanId: string;
    customerId: string;
    loanAmountPaise: number;
    metalType: string;
  };
}

export interface IndiaGirviPaymentReceivedEvent extends DomainEventBase {
  type: 'india.girvi.payment_received';
  payload: {
    loanId: string;
    paymentId: string;
    principalPaise: number;
    interestPaise: number;
  };
}

export interface IndiaGirviLoanClosedEvent extends DomainEventBase {
  type: 'india.girvi.loan_closed';
  payload: {
    loanId: string;
    customerId: string;
    totalPrincipalPaidPaise: number;
    totalInterestPaidPaise: number;
  };
}

export interface IndiaSchemeInstallmentDueEvent extends DomainEventBase {
  type: 'india.scheme.installment_due';
  payload: {
    schemeType: 'KITTY' | 'GOLD_SAVINGS';
    schemeId: string;
    memberId: string;
    customerId: string;
    amountPaise: number;
    dueDate: string;
  };
}

export interface IndiaMetalRateUpdatedEvent extends DomainEventBase {
  type: 'india.rates.updated';
  payload: {
    metalType: string;
    purity: number;
    ratePer10gPaise: number;
    source: string;
  };
}

export interface IndiaKycVerifiedEvent extends DomainEventBase {
  type: 'india.kyc.verified';
  payload: {
    verificationType: 'AADHAAR' | 'PAN';
    provider: KycProviderSource;
    verificationId: string | null;
    errorCode?: string;
    errorMessage?: string;
  };
}

export interface IndiaKycFailedEvent extends DomainEventBase {
  type: 'india.kyc.failed';
  payload: {
    verificationType: 'AADHAAR' | 'PAN';
    provider: KycProviderSource;
    verificationId: string | null;
    errorCode?: string;
    errorMessage?: string;
  };
}
