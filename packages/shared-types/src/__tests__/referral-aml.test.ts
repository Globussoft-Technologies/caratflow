import { describe, it, expect } from 'vitest';
import {
  ReferralProgramInputSchema,
  ApplyReferralInputSchema,
  AmlRuleInputSchema,
  AmlAlertReviewInputSchema,
  AmlSarReportInputSchema,
} from '../referral-aml';

const validUuid = '550e8400-e29b-41d4-a716-446655440000';

describe('ReferralProgramInputSchema', () => {
  it('should parse valid referral program', () => {
    const result = ReferralProgramInputSchema.safeParse({
      name: 'Refer & Earn Gold',
      referrerRewardType: 'POINTS',
      referrerRewardValue: 500,
      refereeRewardType: 'DISCOUNT_COUPON',
      refereeRewardValue: 1000,
      validFrom: '2026-04-01',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isActive).toBe(true);
    }
  });

  it('should reject invalid reward type', () => {
    const result = ReferralProgramInputSchema.safeParse({
      name: 'Test',
      referrerRewardType: 'FREE_ITEM',
      referrerRewardValue: 1,
      refereeRewardType: 'POINTS',
      refereeRewardValue: 1,
      validFrom: '2026-01-01',
    });
    expect(result.success).toBe(false);
  });

  it('should reject non-positive reward value', () => {
    const result = ReferralProgramInputSchema.safeParse({
      name: 'Test',
      referrerRewardType: 'POINTS',
      referrerRewardValue: 0,
      refereeRewardType: 'POINTS',
      refereeRewardValue: 100,
      validFrom: '2026-01-01',
    });
    expect(result.success).toBe(false);
  });

  it('should accept optional fields', () => {
    const result = ReferralProgramInputSchema.safeParse({
      name: 'Premium Referral',
      referrerRewardType: 'CASHBACK',
      referrerRewardValue: 50000,
      refereeRewardType: 'CASHBACK',
      refereeRewardValue: 25000,
      validFrom: '2026-04-01',
      validTo: '2026-12-31',
      minOrderForRewardPaise: 5000000,
      maxReferralsPerCustomer: 10,
    });
    expect(result.success).toBe(true);
  });
});

describe('ApplyReferralInputSchema', () => {
  it('should parse valid referral application', () => {
    const result = ApplyReferralInputSchema.safeParse({
      referralCode: 'RAHUL2026',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.invitedVia).toBe('LINK');
    }
  });

  it('should accept specific invite channel', () => {
    const result = ApplyReferralInputSchema.safeParse({
      referralCode: 'ABC123',
      invitedVia: 'WHATSAPP',
    });
    expect(result.success).toBe(true);
  });
});

describe('AmlRuleInputSchema', () => {
  it('should parse valid AML rule', () => {
    const result = AmlRuleInputSchema.safeParse({
      ruleName: 'High Value Transaction Alert',
      ruleType: 'HIGH_VALUE_ALERT',
      parameters: {
        maxAmountPaise: 1000000000,
      },
      severity: 'HIGH',
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid rule type', () => {
    const result = AmlRuleInputSchema.safeParse({
      ruleName: 'Test Rule',
      ruleType: 'BLACKLIST_CHECK',
      parameters: {},
      severity: 'LOW',
    });
    expect(result.success).toBe(false);
  });

  it('should reject invalid severity', () => {
    const result = AmlRuleInputSchema.safeParse({
      ruleName: 'Test',
      ruleType: 'FREQUENCY_LIMIT',
      parameters: { maxCount: 10, period: '24h' },
      severity: 'EXTREME',
    });
    expect(result.success).toBe(false);
  });

  it('should accept complex parameters', () => {
    const result = AmlRuleInputSchema.safeParse({
      ruleName: 'Structuring Detection',
      ruleType: 'VELOCITY_CHECK',
      parameters: {
        velocityThresholdPaise: 5000000,
        structuringThresholdPaise: 1000000,
        structuringWindowHours: 24,
        restrictedCountries: ['NK', 'IR'],
      },
      severity: 'CRITICAL',
    });
    expect(result.success).toBe(true);
  });
});

describe('AmlAlertReviewInputSchema', () => {
  it('should parse valid alert review', () => {
    const result = AmlAlertReviewInputSchema.safeParse({
      alertId: validUuid,
      status: 'CLEARED',
      reviewNotes: 'False positive - regular customer bulk purchase',
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid status', () => {
    const result = AmlAlertReviewInputSchema.safeParse({
      alertId: validUuid,
      status: 'DISMISSED',
    });
    expect(result.success).toBe(false);
  });
});

describe('AmlSarReportInputSchema', () => {
  it('should parse valid SAR report', () => {
    const result = AmlSarReportInputSchema.safeParse({
      alertId: validUuid,
      customerId: validUuid,
      reportType: 'SAR',
      reportData: { description: 'Suspicious transaction pattern detected' },
    });
    expect(result.success).toBe(true);
  });
});
