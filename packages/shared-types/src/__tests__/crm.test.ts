import { describe, it, expect } from 'vitest';
import {
  LoyaltyProgramInputSchema,
  LoyaltyTransactionInputSchema,
  CampaignInputSchema,
  LeadInputSchema,
  FeedbackInputSchema,
  CustomerOccasionInputSchema,
  CustomerInteractionInputSchema,
  CustomerSegmentInputSchema,
  LeadStatusUpdateSchema,
  NotificationTemplateInputSchema,
  LeadSourceEnum,
  FeedbackTypeEnum,
  OccasionTypeEnum,
  InteractionTypeEnum,
  InteractionDirectionEnum,
  NotificationChannelEnum,
  NotificationCategoryEnum,
  LeadStatusEnum,
} from '../crm';

const validUuid = '550e8400-e29b-41d4-a716-446655440000';

describe('LoyaltyProgramInputSchema', () => {
  it('should parse valid loyalty program', () => {
    const result = LoyaltyProgramInputSchema.safeParse({
      name: 'Gold Rewards',
      pointsPerCurrencyUnit: 10,
      redemptionRate: 100,
      tiers: [
        { name: 'Bronze', minPoints: 0, multiplier: 1, benefits: ['5% discount'] },
        { name: 'Silver', minPoints: 1000, multiplier: 1.5, benefits: ['10% discount'] },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('should reject non-positive pointsPerCurrencyUnit', () => {
    const result = LoyaltyProgramInputSchema.safeParse({
      name: 'Test',
      pointsPerCurrencyUnit: 0,
      redemptionRate: 100,
      tiers: [],
    });
    expect(result.success).toBe(false);
  });

  it('should validate nested tier config', () => {
    const result = LoyaltyProgramInputSchema.safeParse({
      name: 'Test',
      pointsPerCurrencyUnit: 1,
      redemptionRate: 1,
      tiers: [{ name: '', minPoints: -1, multiplier: 0, benefits: [] }],
    });
    expect(result.success).toBe(false);
  });
});

describe('LoyaltyTransactionInputSchema', () => {
  it('should parse valid loyalty transaction', () => {
    const result = LoyaltyTransactionInputSchema.safeParse({
      customerId: validUuid,
      transactionType: 'EARNED',
      points: 500,
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid transactionType', () => {
    const result = LoyaltyTransactionInputSchema.safeParse({
      customerId: validUuid,
      transactionType: 'INVALID',
      points: 100,
    });
    expect(result.success).toBe(false);
  });
});

describe('CampaignInputSchema', () => {
  it('should parse valid campaign', () => {
    const result = CampaignInputSchema.safeParse({
      name: 'Diwali Campaign',
      channel: 'WHATSAPP',
    });
    expect(result.success).toBe(true);
  });

  it('should allow optional fields', () => {
    const result = CampaignInputSchema.safeParse({
      name: 'New Year Campaign',
      channel: 'EMAIL',
      description: 'Promotional campaign',
      scheduledAt: '2026-12-25T10:00:00Z',
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid channel', () => {
    const result = CampaignInputSchema.safeParse({
      name: 'Test',
      channel: 'TELEGRAM',
    });
    expect(result.success).toBe(false);
  });
});

describe('LeadInputSchema', () => {
  it('should parse valid lead', () => {
    const result = LeadInputSchema.safeParse({
      firstName: 'Priya',
      lastName: 'Patel',
      source: 'WALK_IN',
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid source enum', () => {
    const result = LeadInputSchema.safeParse({
      firstName: 'Test',
      lastName: 'User',
      source: 'COLD_CALL',
    });
    expect(result.success).toBe(false);
  });

  it('should accept optional fields', () => {
    const result = LeadInputSchema.safeParse({
      firstName: 'Amit',
      lastName: 'Shah',
      source: 'REFERRAL',
      phone: '9876543210',
      email: 'amit@example.com',
      estimatedValuePaise: 10000000,
      notes: 'Interested in diamond set',
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid email', () => {
    const result = LeadInputSchema.safeParse({
      firstName: 'Test',
      lastName: 'User',
      source: 'WEBSITE',
      email: 'not-an-email',
    });
    expect(result.success).toBe(false);
  });
});

describe('FeedbackInputSchema', () => {
  it('should parse valid feedback', () => {
    const result = FeedbackInputSchema.safeParse({
      customerId: validUuid,
      feedbackType: 'PURCHASE',
      rating: 5,
    });
    expect(result.success).toBe(true);
  });

  it('should reject rating outside 1-5', () => {
    expect(FeedbackInputSchema.safeParse({
      customerId: validUuid,
      feedbackType: 'SERVICE',
      rating: 0,
    }).success).toBe(false);

    expect(FeedbackInputSchema.safeParse({
      customerId: validUuid,
      feedbackType: 'SERVICE',
      rating: 6,
    }).success).toBe(false);
  });
});

describe('CustomerOccasionInputSchema', () => {
  it('should parse valid occasion', () => {
    const result = CustomerOccasionInputSchema.safeParse({
      customerId: validUuid,
      occasionType: 'BIRTHDAY',
      date: '2026-08-15',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.reminderDaysBefore).toBe(7);
    }
  });

  it('should reject reminderDaysBefore over 90', () => {
    const result = CustomerOccasionInputSchema.safeParse({
      customerId: validUuid,
      occasionType: 'ANNIVERSARY',
      date: '2026-08-15',
      reminderDaysBefore: 91,
    });
    expect(result.success).toBe(false);
  });
});

describe('CustomerInteractionInputSchema', () => {
  it('should parse valid interaction', () => {
    const result = CustomerInteractionInputSchema.safeParse({
      customerId: validUuid,
      interactionType: 'CALL',
      direction: 'OUTBOUND',
    });
    expect(result.success).toBe(true);
  });
});

describe('CustomerSegmentInputSchema', () => {
  it('should parse valid segment', () => {
    const result = CustomerSegmentInputSchema.safeParse({
      name: 'High Value Customers',
      criteria: {
        minTotalSpendPaise: 50000000,
        loyaltyTier: ['GOLD', 'PLATINUM'],
      },
    });
    expect(result.success).toBe(true);
  });
});

describe('LeadStatusUpdateSchema', () => {
  it('should parse valid status update', () => {
    const result = LeadStatusUpdateSchema.safeParse({
      leadId: validUuid,
      status: 'WON',
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid status', () => {
    const result = LeadStatusUpdateSchema.safeParse({
      leadId: validUuid,
      status: 'INVALID',
    });
    expect(result.success).toBe(false);
  });
});

describe('NotificationTemplateInputSchema', () => {
  it('should parse valid template', () => {
    const result = NotificationTemplateInputSchema.safeParse({
      name: 'Order Confirmation',
      channel: 'EMAIL',
      body: 'Your order has been confirmed.',
      category: 'TRANSACTIONAL',
    });
    expect(result.success).toBe(true);
  });
});
