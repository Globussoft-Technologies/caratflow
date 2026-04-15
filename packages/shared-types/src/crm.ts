// ─── CaratFlow CRM Types ───────────────────────────────────────
// Types for customer interactions, loyalty, campaigns, notifications,
// leads, feedback, segments, and the Customer 360 view.

import { z } from 'zod';
import { LoyaltyTier, NotificationType } from './enums';
import { PaginationSchema } from './common';

// ─── Enums (mirroring Prisma enums for runtime use) ────────────

export const LoyaltyTransactionTypeEnum = z.enum([
  'EARNED', 'REDEEMED', 'EXPIRED', 'ADJUSTED', 'BONUS',
]);
export type LoyaltyTransactionType = z.infer<typeof LoyaltyTransactionTypeEnum>;

export const OccasionTypeEnum = z.enum([
  'BIRTHDAY', 'ANNIVERSARY', 'WEDDING', 'ENGAGEMENT', 'FESTIVAL', 'OTHER',
]);
export type OccasionType = z.infer<typeof OccasionTypeEnum>;

export const InteractionTypeEnum = z.enum([
  'CALL', 'EMAIL', 'SMS', 'WHATSAPP', 'VISIT', 'NOTE',
]);
export type InteractionTypeValue = z.infer<typeof InteractionTypeEnum>;

export const InteractionDirectionEnum = z.enum(['INBOUND', 'OUTBOUND']);
export type InteractionDirection = z.infer<typeof InteractionDirectionEnum>;

export const NotificationChannelEnum = z.enum(['WHATSAPP', 'SMS', 'EMAIL']);
export type NotificationChannel = z.infer<typeof NotificationChannelEnum>;

export const NotificationCategoryEnum = z.enum([
  'TRANSACTIONAL', 'PROMOTIONAL', 'REMINDER',
]);
export type NotificationCategory = z.infer<typeof NotificationCategoryEnum>;

export const NotificationStatusEnum = z.enum([
  'QUEUED', 'SENT', 'DELIVERED', 'FAILED', 'BOUNCED',
]);
export type NotificationStatusValue = z.infer<typeof NotificationStatusEnum>;

export const CampaignStatusEnum = z.enum([
  'DRAFT', 'SCHEDULED', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED',
]);
export type CampaignStatusValue = z.infer<typeof CampaignStatusEnum>;

export const LeadSourceEnum = z.enum([
  'WALK_IN', 'REFERRAL', 'WEBSITE', 'SOCIAL_MEDIA', 'CAMPAIGN', 'OTHER',
]);
export type LeadSource = z.infer<typeof LeadSourceEnum>;

export const LeadStatusEnum = z.enum([
  'NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST',
]);
export type LeadStatusValue = z.infer<typeof LeadStatusEnum>;

export const LeadActivityTypeEnum = z.enum([
  'NOTE', 'CALL', 'EMAIL', 'MEETING', 'FOLLOW_UP',
]);
export type LeadActivityType = z.infer<typeof LeadActivityTypeEnum>;

export const FeedbackTypeEnum = z.enum([
  'PURCHASE', 'REPAIR', 'SERVICE', 'GENERAL',
]);
export type FeedbackTypeValue = z.infer<typeof FeedbackTypeEnum>;

export const FeedbackStatusEnum = z.enum(['NEW', 'REVIEWED', 'ACTIONED']);
export type FeedbackStatusValue = z.infer<typeof FeedbackStatusEnum>;

export const PassbookTypeEnum = z.enum(['LOYALTY', 'GOLD_SAVINGS', 'KITTY']);
export type PassbookType = z.infer<typeof PassbookTypeEnum>;

// ─── Customer Profile (kept for backward compat) ───────────────

export const CustomerProfileSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  firstName: z.string(),
  lastName: z.string(),
  loyaltyPoints: z.number().int().nonnegative(),
  loyaltyTier: z.nativeEnum(LoyaltyTier).optional(),
});

export type CustomerProfile = z.infer<typeof CustomerProfileSchema>;

// ─── Notification Request (kept for backward compat) ───────────

export const NotificationRequestSchema = z.object({
  customerId: z.string().uuid(),
  channel: z.nativeEnum(NotificationType),
  templateId: z.string(),
  variables: z.record(z.string()),
});

export type NotificationRequest = z.infer<typeof NotificationRequestSchema>;

// ─── Loyalty Program ───────────────────────────────────────────

export const LoyaltyTierConfigSchema = z.object({
  name: z.string().min(1),
  minPoints: z.number().int().nonnegative(),
  multiplier: z.number().positive(),
  benefits: z.array(z.string()),
});
export type LoyaltyTierConfig = z.infer<typeof LoyaltyTierConfigSchema>;

export const LoyaltyProgramInputSchema = z.object({
  name: z.string().min(1).max(255),
  pointsPerCurrencyUnit: z.number().int().positive(),
  redemptionRate: z.number().int().positive(),
  tiers: z.array(LoyaltyTierConfigSchema),
  isActive: z.boolean().default(true),
});
export type LoyaltyProgramInput = z.infer<typeof LoyaltyProgramInputSchema>;

export const LoyaltyTransactionInputSchema = z.object({
  customerId: z.string().uuid(),
  transactionType: LoyaltyTransactionTypeEnum,
  points: z.number().int(),
  referenceType: z.string().max(50).optional(),
  referenceId: z.string().uuid().optional(),
  description: z.string().max(500).optional(),
  expiresAt: z.coerce.date().optional(),
});
export type LoyaltyTransactionInput = z.infer<typeof LoyaltyTransactionInputSchema>;

export const LoyaltyBalanceResponseSchema = z.object({
  customerId: z.string().uuid(),
  currentPoints: z.number().int(),
  tier: z.string().optional(),
  tierMultiplier: z.number().optional(),
  lifetimeEarned: z.number().int(),
  lifetimeRedeemed: z.number().int(),
  pointsExpiringSoon: z.number().int(),
  nextTier: z.string().optional(),
  pointsToNextTier: z.number().int().optional(),
});
export type LoyaltyBalanceResponse = z.infer<typeof LoyaltyBalanceResponseSchema>;

// ─── Customer Occasion ─────────────────────────────────────────

export const CustomerOccasionInputSchema = z.object({
  customerId: z.string().uuid(),
  occasionType: OccasionTypeEnum,
  date: z.coerce.date(),
  description: z.string().max(500).optional(),
  reminderDaysBefore: z.number().int().min(0).max(90).default(7),
});
export type CustomerOccasionInput = z.infer<typeof CustomerOccasionInputSchema>;

// ─── Customer Interaction ──────────────────────────────────────

export const CustomerInteractionInputSchema = z.object({
  customerId: z.string().uuid(),
  interactionType: InteractionTypeEnum,
  direction: InteractionDirectionEnum,
  subject: z.string().max(255).optional(),
  content: z.string().optional(),
  userId: z.string().uuid().optional(),
  attachments: z.array(z.object({
    name: z.string(),
    url: z.string().url(),
    size: z.number().optional(),
  })).optional(),
});
export type CustomerInteractionInput = z.infer<typeof CustomerInteractionInputSchema>;

export const InteractionResponseSchema = z.object({
  id: z.string().uuid(),
  customerId: z.string().uuid(),
  interactionType: InteractionTypeEnum,
  direction: InteractionDirectionEnum,
  subject: z.string().nullable(),
  content: z.string().nullable(),
  userId: z.string().uuid().nullable(),
  attachments: z.unknown().nullable(),
  createdAt: z.coerce.date(),
});
export type InteractionResponse = z.infer<typeof InteractionResponseSchema>;

// ─── Notification Template ─────────────────────────────────────

export const NotificationTemplateInputSchema = z.object({
  name: z.string().min(1).max(255),
  channel: NotificationChannelEnum,
  subject: z.string().max(500).optional(),
  body: z.string().min(1),
  variables: z.array(z.string()).optional(),
  category: NotificationCategoryEnum,
  isActive: z.boolean().default(true),
});
export type NotificationTemplateInput = z.infer<typeof NotificationTemplateInputSchema>;

export const SendNotificationInputSchema = z.object({
  customerId: z.string().uuid(),
  templateId: z.string().uuid().optional(),
  channel: NotificationChannelEnum,
  subject: z.string().max(500).optional(),
  body: z.string().optional(),
  variables: z.record(z.string()).optional(),
});
export type SendNotificationInput = z.infer<typeof SendNotificationInputSchema>;

export const NotificationLogResponseSchema = z.object({
  id: z.string().uuid(),
  customerId: z.string().uuid(),
  channel: NotificationChannelEnum,
  subject: z.string().nullable(),
  body: z.string(),
  status: NotificationStatusEnum,
  sentAt: z.coerce.date().nullable(),
  deliveredAt: z.coerce.date().nullable(),
  failureReason: z.string().nullable(),
  createdAt: z.coerce.date(),
});
export type NotificationLogResponse = z.infer<typeof NotificationLogResponseSchema>;

// ─── Email / SMS direct send (gateway smoke + manual send) ────

export const EmailTestInputSchema = z.object({
  to: z.string().email(),
});
export type EmailTestInput = z.infer<typeof EmailTestInputSchema>;

export const EmailSendInputSchema = z.object({
  customerId: z.string().uuid(),
  subject: z.string().min(1).max(500),
  html: z.string().min(1),
  text: z.string().optional(),
  cc: z.array(z.string().email()).optional(),
  bcc: z.array(z.string().email()).optional(),
  replyTo: z.string().email().optional(),
});
export type EmailSendInput = z.infer<typeof EmailSendInputSchema>;

export const SmsTestInputSchema = z.object({
  to: z.string().regex(/^\+[1-9]\d{6,14}$/u, 'Must be E.164 format'),
});
export type SmsTestInput = z.infer<typeof SmsTestInputSchema>;

export const SmsSendInputSchema = z.object({
  customerId: z.string().uuid(),
  body: z.string().min(1).max(1600),
});
export type SmsSendInput = z.infer<typeof SmsSendInputSchema>;

// ─── Campaign ──────────────────────────────────────────────────

export const AudienceFilterCriteriaSchema = z.object({
  customerType: z.array(z.string()).optional(),
  city: z.array(z.string()).optional(),
  loyaltyTier: z.array(z.string()).optional(),
  minPurchaseAmountPaise: z.number().int().optional(),
  maxPurchaseAmountPaise: z.number().int().optional(),
  lastPurchaseWithinDays: z.number().int().optional(),
  tags: z.array(z.string()).optional(),
  segmentId: z.string().uuid().optional(),
});
export type AudienceFilterCriteria = z.infer<typeof AudienceFilterCriteriaSchema>;

export const CampaignInputSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  channel: NotificationChannelEnum,
  templateId: z.string().uuid().optional(),
  audienceFilter: AudienceFilterCriteriaSchema.optional(),
  scheduledAt: z.coerce.date().optional(),
});
export type CampaignInput = z.infer<typeof CampaignInputSchema>;

export const CampaignResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  status: CampaignStatusEnum,
  channel: NotificationChannelEnum,
  templateId: z.string().uuid().nullable(),
  audienceFilter: z.unknown().nullable(),
  scheduledAt: z.coerce.date().nullable(),
  startedAt: z.coerce.date().nullable(),
  completedAt: z.coerce.date().nullable(),
  totalRecipients: z.number().int(),
  sentCount: z.number().int(),
  deliveredCount: z.number().int(),
  failedCount: z.number().int(),
  createdAt: z.coerce.date(),
});
export type CampaignResponse = z.infer<typeof CampaignResponseSchema>;

// ─── Lead ──────────────────────────────────────────────────────

export const LeadInputSchema = z.object({
  customerId: z.string().uuid().optional(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  phone: z.string().max(20).optional(),
  email: z.string().email().max(255).optional(),
  source: LeadSourceEnum,
  assignedTo: z.string().uuid().optional(),
  estimatedValuePaise: z.number().int().nonnegative().optional(),
  notes: z.string().optional(),
  nextFollowUpDate: z.coerce.date().optional(),
});
export type LeadInput = z.infer<typeof LeadInputSchema>;

export const LeadResponseSchema = z.object({
  id: z.string().uuid(),
  customerId: z.string().uuid().nullable(),
  firstName: z.string(),
  lastName: z.string(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  source: LeadSourceEnum,
  status: LeadStatusEnum,
  assignedTo: z.string().nullable(),
  estimatedValuePaise: z.number().nullable(),
  notes: z.string().nullable(),
  nextFollowUpDate: z.coerce.date().nullable(),
  lostReason: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type LeadResponse = z.infer<typeof LeadResponseSchema>;

export const LeadActivityInputSchema = z.object({
  leadId: z.string().uuid(),
  activityType: LeadActivityTypeEnum,
  description: z.string().optional(),
  scheduledAt: z.coerce.date().optional(),
  completedAt: z.coerce.date().optional(),
});
export type LeadActivityInput = z.infer<typeof LeadActivityInputSchema>;

export const LeadStatusUpdateSchema = z.object({
  leadId: z.string().uuid(),
  status: LeadStatusEnum,
  lostReason: z.string().max(500).optional(),
});
export type LeadStatusUpdate = z.infer<typeof LeadStatusUpdateSchema>;

// ─── Feedback ──────────────────────────────────────────────────

export const FeedbackInputSchema = z.object({
  customerId: z.string().uuid(),
  feedbackType: FeedbackTypeEnum,
  rating: z.number().int().min(1).max(5),
  comment: z.string().optional(),
  saleId: z.string().uuid().optional(),
});
export type FeedbackInput = z.infer<typeof FeedbackInputSchema>;

export const FeedbackResponseSchema = z.object({
  id: z.string().uuid(),
  customerId: z.string().uuid(),
  feedbackType: FeedbackTypeEnum,
  rating: z.number().int(),
  comment: z.string().nullable(),
  saleId: z.string().nullable(),
  status: FeedbackStatusEnum,
  reviewedBy: z.string().nullable(),
  reviewedAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
});
export type FeedbackResponse = z.infer<typeof FeedbackResponseSchema>;

// ─── Customer Segment ──────────────────────────────────────────

export const SegmentCriteriaSchema = z.object({
  customerType: z.array(z.string()).optional(),
  city: z.array(z.string()).optional(),
  state: z.array(z.string()).optional(),
  loyaltyTier: z.array(z.string()).optional(),
  minLoyaltyPoints: z.number().int().optional(),
  maxLoyaltyPoints: z.number().int().optional(),
  minTotalSpendPaise: z.number().int().optional(),
  maxTotalSpendPaise: z.number().int().optional(),
  hasEmail: z.boolean().optional(),
  hasPhone: z.boolean().optional(),
  createdAfter: z.coerce.date().optional(),
  createdBefore: z.coerce.date().optional(),
});
export type SegmentCriteria = z.infer<typeof SegmentCriteriaSchema>;

export const CustomerSegmentInputSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  criteria: SegmentCriteriaSchema,
});
export type CustomerSegmentInput = z.infer<typeof CustomerSegmentInputSchema>;

// ─── Video Consultation (Live Shopping) ────────────────────────

export const VideoConsultationStatusEnum = z.enum([
  'REQUESTED', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW',
]);
export type VideoConsultationStatus = z.infer<typeof VideoConsultationStatusEnum>;

export const VideoConsultationProductInterestSchema = z.object({
  productId: z.string().uuid(),
  notes: z.string().max(500).optional(),
});
export type VideoConsultationProductInterest = z.infer<typeof VideoConsultationProductInterestSchema>;

export const VideoConsultationInputSchema = z.object({
  customerId: z.string().uuid(),
  productsOfInterest: z.array(VideoConsultationProductInterestSchema).optional(),
  preferredLang: z.string().min(2).max(10).default('en'),
  customerPhone: z.string().max(20).optional(),
  notes: z.string().max(2000).optional(),
});
export type VideoConsultationInput = z.infer<typeof VideoConsultationInputSchema>;

export const VideoConsultationUpdateSchema = z.object({
  id: z.string().uuid(),
  status: VideoConsultationStatusEnum.optional(),
  scheduledAt: z.coerce.date().optional(),
  consultantId: z.string().uuid().optional(),
  meetingUrl: z.string().url().max(500).optional(),
  notes: z.string().max(2000).optional(),
});
export type VideoConsultationUpdate = z.infer<typeof VideoConsultationUpdateSchema>;

export const VideoConsultationScheduleSchema = z.object({
  id: z.string().uuid(),
  consultantId: z.string().uuid(),
  scheduledAt: z.coerce.date(),
});
export type VideoConsultationSchedule = z.infer<typeof VideoConsultationScheduleSchema>;

export const VideoConsultationFilterSchema = z.object({
  status: VideoConsultationStatusEnum.optional(),
  consultantId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});
export type VideoConsultationFilter = z.infer<typeof VideoConsultationFilterSchema>;

export const VideoConsultationResponseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  customerId: z.string().uuid(),
  consultantId: z.string().uuid().nullable(),
  requestedAt: z.coerce.date(),
  scheduledAt: z.coerce.date().nullable(),
  startedAt: z.coerce.date().nullable(),
  endedAt: z.coerce.date().nullable(),
  status: VideoConsultationStatusEnum,
  meetingUrl: z.string().nullable(),
  notes: z.string().nullable(),
  productsOfInterest: z.unknown().nullable(),
  customerPhone: z.string().nullable(),
  preferredLang: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type VideoConsultationResponse = z.infer<typeof VideoConsultationResponseSchema>;

// ─── Customer 360 ──────────────────────────────────────────────

export const Customer360ResponseSchema = z.object({
  profile: z.object({
    id: z.string().uuid(),
    firstName: z.string(),
    lastName: z.string(),
    email: z.string().nullable(),
    phone: z.string().nullable(),
    alternatePhone: z.string().nullable(),
    address: z.string().nullable(),
    city: z.string().nullable(),
    state: z.string().nullable(),
    country: z.string().nullable(),
    postalCode: z.string().nullable(),
    customerType: z.string(),
    panNumber: z.string().nullable(),
    aadhaarNumber: z.string().nullable(),
    gstinNumber: z.string().nullable(),
    dateOfBirth: z.coerce.date().nullable(),
    anniversary: z.coerce.date().nullable(),
    createdAt: z.coerce.date(),
  }),
  loyalty: z.object({
    currentPoints: z.number().int(),
    tier: z.string().nullable(),
    lifetimeEarned: z.number().int(),
    lifetimeRedeemed: z.number().int(),
    recentTransactions: z.array(z.object({
      id: z.string().uuid(),
      transactionType: LoyaltyTransactionTypeEnum,
      points: z.number().int(),
      balanceAfter: z.number().int(),
      description: z.string().nullable(),
      createdAt: z.coerce.date(),
    })),
  }),
  purchaseHistory: z.array(z.object({
    id: z.string().uuid(),
    invoiceNumber: z.string().optional(),
    totalPaise: z.number().int(),
    date: z.coerce.date(),
    itemCount: z.number().int(),
  })),
  occasions: z.array(z.object({
    id: z.string().uuid(),
    occasionType: OccasionTypeEnum,
    date: z.coerce.date(),
    description: z.string().nullable(),
    reminderDaysBefore: z.number().int(),
  })),
  recentInteractions: z.array(z.object({
    id: z.string().uuid(),
    interactionType: InteractionTypeEnum,
    direction: InteractionDirectionEnum,
    subject: z.string().nullable(),
    createdAt: z.coerce.date(),
  })),
  feedback: z.array(z.object({
    id: z.string().uuid(),
    feedbackType: FeedbackTypeEnum,
    rating: z.number().int(),
    comment: z.string().nullable(),
    status: FeedbackStatusEnum,
    createdAt: z.coerce.date(),
  })),
  schemes: z.array(z.object({
    id: z.string().uuid(),
    type: PassbookTypeEnum,
    schemeName: z.string(),
    currentBalancePaise: z.number().nullable(),
    currentPoints: z.number().nullable(),
  })),
});
export type Customer360Response = z.infer<typeof Customer360ResponseSchema>;

// ─── CRM Dashboard ─────────────────────────────────────────────

export const CrmDashboardResponseSchema = z.object({
  newLeads: z.number().int(),
  conversionRate: z.number(),
  activeCustomers: z.number().int(),
  loyaltyMetrics: z.object({
    totalMembers: z.number().int(),
    pointsIssuedThisMonth: z.number().int(),
    pointsRedeemedThisMonth: z.number().int(),
  }),
  upcomingOccasions: z.array(z.object({
    id: z.string().uuid(),
    customerId: z.string().uuid(),
    customerName: z.string(),
    occasionType: OccasionTypeEnum,
    date: z.coerce.date(),
    daysAway: z.number().int(),
  })),
  recentFeedback: z.object({
    averageRating: z.number(),
    totalCount: z.number().int(),
    recent: z.array(z.object({
      id: z.string().uuid(),
      customerName: z.string(),
      rating: z.number().int(),
      comment: z.string().nullable(),
      createdAt: z.coerce.date(),
    })),
  }),
  leadPipeline: z.record(z.string(), z.number().int()),
});
export type CrmDashboardResponse = z.infer<typeof CrmDashboardResponseSchema>;

// ─── Search / Filter ───────────────────────────────────────────

export const CustomerSearchInputSchema = z.object({
  query: z.string().min(1).max(255),
  limit: z.number().int().min(1).max(50).default(10),
});
export type CustomerSearchInput = z.infer<typeof CustomerSearchInputSchema>;

export const CustomerListFilterSchema = PaginationSchema.extend({
  customerType: z.string().optional(),
  city: z.string().optional(),
  loyaltyTier: z.string().optional(),
  search: z.string().optional(),
});
export type CustomerListFilter = z.infer<typeof CustomerListFilterSchema>;
