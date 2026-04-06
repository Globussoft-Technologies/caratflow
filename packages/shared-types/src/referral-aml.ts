// ─── CaratFlow Referral & AML Types ────────────────────────────
// Zod schemas and TypeScript types for referral rewards and AML compliance.

import { z } from 'zod';

// ─── Referral Enums ───────────────────────────────────────────

export const ReferralRewardTypeEnum = z.enum(['POINTS', 'DISCOUNT_COUPON', 'CASHBACK']);
export type ReferralRewardType = z.infer<typeof ReferralRewardTypeEnum>;

export const ReferralStatusEnum = z.enum(['INVITED', 'REGISTERED', 'FIRST_ORDER', 'REWARDED', 'EXPIRED']);
export type ReferralStatus = z.infer<typeof ReferralStatusEnum>;

export const ReferralInviteChannelEnum = z.enum(['WHATSAPP', 'EMAIL', 'SMS', 'LINK', 'SOCIAL']);
export type ReferralInviteChannel = z.infer<typeof ReferralInviteChannelEnum>;

export const ReferralPayoutTypeEnum = z.enum(['LOYALTY_POINTS', 'COUPON_CODE', 'CASHBACK']);
export type ReferralPayoutType = z.infer<typeof ReferralPayoutTypeEnum>;

export const ReferralPayoutStatusEnum = z.enum(['PENDING', 'CREDITED', 'FAILED']);
export type ReferralPayoutStatus = z.infer<typeof ReferralPayoutStatusEnum>;

// ─── AML Enums ────────────────────────────────────────────────

export const AmlRuleTypeEnum = z.enum([
  'TRANSACTION_AMOUNT_LIMIT',
  'FREQUENCY_LIMIT',
  'VELOCITY_CHECK',
  'HIGH_VALUE_ALERT',
  'COUNTRY_RESTRICTION',
  'PEP_CHECK',
]);
export type AmlRuleType = z.infer<typeof AmlRuleTypeEnum>;

export const AmlAlertTypeEnum = z.enum([
  'SUSPICIOUS_TRANSACTION',
  'HIGH_VALUE',
  'RAPID_TRANSACTIONS',
  'UNUSUAL_PATTERN',
  'STRUCTURING',
  'COUNTRY_RISK',
]);
export type AmlAlertType = z.infer<typeof AmlAlertTypeEnum>;

export const AmlSeverityEnum = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
export type AmlSeverity = z.infer<typeof AmlSeverityEnum>;

export const AmlAlertStatusEnum = z.enum(['NEW', 'UNDER_REVIEW', 'ESCALATED', 'CLEARED', 'REPORTED']);
export type AmlAlertStatus = z.infer<typeof AmlAlertStatusEnum>;

export const AmlRiskLevelEnum = z.enum(['LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH']);
export type AmlRiskLevel = z.infer<typeof AmlRiskLevelEnum>;

export const AmlReportTypeEnum = z.enum(['SAR', 'CTR', 'STR']);
export type AmlReportType = z.infer<typeof AmlReportTypeEnum>;

export const AmlFilingStatusEnum = z.enum(['DRAFT', 'FILED', 'ACKNOWLEDGED']);
export type AmlFilingStatus = z.infer<typeof AmlFilingStatusEnum>;

// ─── Referral Program Input ───────────────────────────────────

export const ReferralProgramInputSchema = z.object({
  name: z.string().min(1).max(255),
  referrerRewardType: ReferralRewardTypeEnum,
  referrerRewardValue: z.number().int().positive(),
  refereeRewardType: ReferralRewardTypeEnum,
  refereeRewardValue: z.number().int().positive(),
  minOrderForRewardPaise: z.number().int().nonnegative().optional(),
  maxReferralsPerCustomer: z.number().int().positive().optional(),
  isActive: z.boolean().default(true),
  validFrom: z.coerce.date(),
  validTo: z.coerce.date().optional(),
});
export type ReferralProgramInput = z.infer<typeof ReferralProgramInputSchema>;

// ─── Apply Referral Input ─────────────────────────────────────

export const ApplyReferralInputSchema = z.object({
  referralCode: z.string().min(1).max(20),
  invitedVia: ReferralInviteChannelEnum.default('LINK'),
});
export type ApplyReferralInput = z.infer<typeof ApplyReferralInputSchema>;

// ─── Referral Stats ───────────────────────────────────────────

export const ReferralStatsResponseSchema = z.object({
  customerId: z.string().uuid(),
  referralCode: z.string(),
  totalReferrals: z.number().int(),
  successfulReferrals: z.number().int(),
  pendingReferrals: z.number().int(),
  totalRewardsEarnedPaise: z.number().int(),
  conversionRate: z.number(),
});
export type ReferralStatsResponse = z.infer<typeof ReferralStatsResponseSchema>;

// ─── Referral Leaderboard Entry ───────────────────────────────

export const ReferralLeaderboardEntrySchema = z.object({
  customerId: z.string().uuid(),
  customerName: z.string(),
  referralCount: z.number().int(),
  totalRewardsPaise: z.number().int(),
  rank: z.number().int(),
});
export type ReferralLeaderboardEntry = z.infer<typeof ReferralLeaderboardEntrySchema>;

// ─── AML Rule Input ───────────────────────────────────────────

export const AmlRuleParametersSchema = z.object({
  maxAmountPaise: z.number().int().optional(),
  period: z.string().optional(),
  maxCount: z.number().int().optional(),
  velocityThresholdPaise: z.number().int().optional(),
  structuringThresholdPaise: z.number().int().optional(),
  structuringWindowHours: z.number().int().optional(),
  restrictedCountries: z.array(z.string()).optional(),
});
export type AmlRuleParameters = z.infer<typeof AmlRuleParametersSchema>;

export const AmlRuleInputSchema = z.object({
  ruleName: z.string().min(1).max(255),
  ruleType: AmlRuleTypeEnum,
  parameters: AmlRuleParametersSchema,
  severity: AmlSeverityEnum,
  isActive: z.boolean().default(true),
});
export type AmlRuleInput = z.infer<typeof AmlRuleInputSchema>;

// ─── AML Alert Review Input ───────────────────────────────────

export const AmlAlertReviewInputSchema = z.object({
  alertId: z.string().uuid(),
  status: AmlAlertStatusEnum,
  reviewNotes: z.string().max(2000).optional(),
});
export type AmlAlertReviewInput = z.infer<typeof AmlAlertReviewInputSchema>;

// ─── AML SAR Report Input ─────────────────────────────────────

export const AmlSarReportInputSchema = z.object({
  alertId: z.string().uuid(),
  customerId: z.string().uuid(),
  reportType: AmlReportTypeEnum,
  reportData: z.record(z.unknown()),
  notes: z.string().optional(),
});
export type AmlSarReportInput = z.infer<typeof AmlSarReportInputSchema>;

// ─── AML Dashboard Response ───────────────────────────────────

export const AmlDashboardResponseSchema = z.object({
  alertsByStatus: z.record(AmlAlertStatusEnum, z.number().int()),
  alertsBySeverity: z.record(AmlSeverityEnum, z.number().int()),
  pendingReviews: z.number().int(),
  riskDistribution: z.record(AmlRiskLevelEnum, z.number().int()),
  recentHighValueTransactions: z.array(z.object({
    customerId: z.string().uuid(),
    customerName: z.string(),
    amountPaise: z.number().int(),
    date: z.coerce.date(),
  })),
  alertsTrend: z.array(z.object({
    date: z.string(),
    count: z.number().int(),
  })),
});
export type AmlDashboardResponse = z.infer<typeof AmlDashboardResponseSchema>;

// ─── AML Customer Risk Response ───────────────────────────────

export const AmlCustomerRiskResponseSchema = z.object({
  customerId: z.string().uuid(),
  customerName: z.string(),
  riskScore: z.number().int(),
  riskLevel: AmlRiskLevelEnum,
  factors: z.array(z.object({
    factor: z.string(),
    weight: z.number(),
    description: z.string(),
  })),
  lastAssessedAt: z.coerce.date(),
  nextReviewDate: z.coerce.date().nullable(),
  kycStatus: z.string().nullable(),
  transactionVolumePaise: z.number().int(),
  transactionCount: z.number().int(),
  flagCount: z.number().int(),
});
export type AmlCustomerRiskResponse = z.infer<typeof AmlCustomerRiskResponseSchema>;

// ─── Transaction Evaluation Result ────────────────────────────

export interface AmlEvaluationResult {
  passed: boolean;
  alertsCreated: number;
  alerts: Array<{
    ruleId: string;
    alertType: string;
    severity: string;
    description: string;
  }>;
}

// ─── Referral Events ──────────────────────────────────────────

export interface ReferralCompletedEvent {
  referralId: string;
  referrerId: string;
  refereeId: string;
  referrerRewardPaise: number;
  refereeRewardPaise: number;
}

export interface AmlAlertCreatedEvent {
  alertId: string;
  customerId: string;
  alertType: string;
  severity: string;
  amountPaise: number;
}
