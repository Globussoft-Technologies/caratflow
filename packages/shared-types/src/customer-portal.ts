// ─── CaratFlow Customer Portal Types ───────────────────────────
// B2C customer self-service portal: profile, orders, returns,
// loyalty, schemes, KYC, notifications, dashboard.

import { z } from 'zod';
import { PaginationSchema } from './common';

// ─── Enums ────────────────────────────────────────────────────────

export const OnlineOrderStatusEnum = z.enum([
  'PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED',
  'CANCELLED', 'RETURNED', 'REFUNDED',
]);
export type OnlineOrderStatusValue = z.infer<typeof OnlineOrderStatusEnum>;

export const ShipmentStatusEnum = z.enum([
  'LABEL_CREATED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'RETURNED',
]);
export type ShipmentStatusValue = z.infer<typeof ShipmentStatusEnum>;

export const KycVerificationTypeEnum = z.enum([
  'AADHAAR', 'PAN', 'VOTER_ID', 'PASSPORT', 'DRIVING_LICENSE',
]);

export const KycVerificationStatusEnum = z.enum([
  'PENDING', 'VERIFIED', 'FAILED', 'EXPIRED',
]);

// ─── Profile ──────────────────────────────────────────────────────

export const CustomerProfileResponseSchema = z.object({
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
  dateOfBirth: z.coerce.date().nullable(),
  anniversary: z.coerce.date().nullable(),
  loyaltyPoints: z.number().int(),
  loyaltyTier: z.string().nullable(),
  preferences: z.unknown().nullable(),
  isEmailVerified: z.boolean(),
  isPhoneVerified: z.boolean(),
  createdAt: z.coerce.date(),
});
export type CustomerProfileResponse = z.infer<typeof CustomerProfileResponseSchema>;

export const UpdateProfileInputSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  email: z.string().email().max(255).optional(),
  phone: z.string().max(20).optional(),
  alternatePhone: z.string().max(20).optional(),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  country: z.string().max(2).optional(),
  postalCode: z.string().max(20).optional(),
  dateOfBirth: z.coerce.date().optional(),
  anniversary: z.coerce.date().optional(),
  preferences: z.record(z.unknown()).optional(),
});
export type UpdateProfileInput = z.infer<typeof UpdateProfileInputSchema>;

export const ChangePasswordInputSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});
export type ChangePasswordInput = z.infer<typeof ChangePasswordInputSchema>;

// ─── Notification Preferences ─────────────────────────────────────

export const NotificationCategoryToggleSchema = z.object({
  email: z.boolean().default(true),
  sms: z.boolean().default(true),
  whatsapp: z.boolean().default(false),
  push: z.boolean().default(true),
});
export type NotificationCategoryToggle = z.infer<typeof NotificationCategoryToggleSchema>;

export const NotificationPreferencesInputSchema = z.object({
  orders: NotificationCategoryToggleSchema.optional(),
  promotions: NotificationCategoryToggleSchema.optional(),
  schemes: NotificationCategoryToggleSchema.optional(),
  loyalty: NotificationCategoryToggleSchema.optional(),
  reminders: NotificationCategoryToggleSchema.optional(),
});
export type NotificationPreferencesInput = z.infer<typeof NotificationPreferencesInputSchema>;

// ─── Orders ───────────────────────────────────────────────────────

export const OrderListInputSchema = PaginationSchema.extend({
  status: OnlineOrderStatusEnum.optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
});
export type OrderListInput = z.infer<typeof OrderListInputSchema>;

export const OrderSummaryResponseSchema = z.object({
  id: z.string().uuid(),
  orderNumber: z.string(),
  status: OnlineOrderStatusEnum,
  totalPaise: z.number().int(),
  currencyCode: z.string(),
  itemCount: z.number().int(),
  thumbnail: z.string().nullable(),
  placedAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
});
export type OrderSummaryResponse = z.infer<typeof OrderSummaryResponseSchema>;

export const OrderItemResponseSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  sku: z.string().nullable(),
  quantity: z.number().int(),
  unitPricePaise: z.number().int(),
  totalPaise: z.number().int(),
  weightMg: z.number().int().nullable(),
  image: z.string().nullable(),
});
export type OrderItemResponse = z.infer<typeof OrderItemResponseSchema>;

export const ShipmentTrackingResponseSchema = z.object({
  id: z.string().uuid(),
  shipmentNumber: z.string(),
  carrier: z.string().nullable(),
  trackingNumber: z.string().nullable(),
  trackingUrl: z.string().nullable(),
  status: ShipmentStatusEnum,
  estimatedDeliveryDate: z.coerce.date().nullable(),
  actualDeliveryDate: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
});
export type ShipmentTrackingResponse = z.infer<typeof ShipmentTrackingResponseSchema>;

export const PaymentInfoResponseSchema = z.object({
  id: z.string().uuid(),
  method: z.string().nullable(),
  amountPaise: z.number().int(),
  currencyCode: z.string(),
  status: z.string(),
  completedAt: z.coerce.date().nullable(),
});
export type PaymentInfoResponse = z.infer<typeof PaymentInfoResponseSchema>;

export const OrderDetailResponseSchema = z.object({
  id: z.string().uuid(),
  orderNumber: z.string(),
  status: OnlineOrderStatusEnum,
  subtotalPaise: z.number().int(),
  shippingPaise: z.number().int(),
  taxPaise: z.number().int(),
  discountPaise: z.number().int(),
  totalPaise: z.number().int(),
  currencyCode: z.string(),
  shippingAddress: z.unknown().nullable(),
  billingAddress: z.unknown().nullable(),
  notes: z.string().nullable(),
  cancelReason: z.string().nullable(),
  placedAt: z.coerce.date().nullable(),
  confirmedAt: z.coerce.date().nullable(),
  shippedAt: z.coerce.date().nullable(),
  deliveredAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  items: z.array(OrderItemResponseSchema),
  payments: z.array(PaymentInfoResponseSchema),
  shipments: z.array(ShipmentTrackingResponseSchema),
  invoiceUrl: z.string().nullable(),
});
export type OrderDetailResponse = z.infer<typeof OrderDetailResponseSchema>;

// ─── Returns ──────────────────────────────────────────────────────

export const ReturnItemInputSchema = z.object({
  orderItemId: z.string().uuid(),
  quantity: z.number().int().min(1),
  reason: z.string().min(1).max(500),
});
export type ReturnItemInput = z.infer<typeof ReturnItemInputSchema>;

export const ReturnRequestInputSchema = z.object({
  orderId: z.string().uuid(),
  items: z.array(ReturnItemInputSchema).min(1),
  reason: z.string().min(1).max(1000),
  preferredRefundMethod: z.enum(['ORIGINAL_PAYMENT', 'STORE_CREDIT', 'BANK_TRANSFER']),
});
export type ReturnRequestInput = z.infer<typeof ReturnRequestInputSchema>;

export const ReturnRequestResponseSchema = z.object({
  id: z.string().uuid(),
  returnNumber: z.string(),
  status: z.string(),
  reason: z.string().nullable(),
  subtotalPaise: z.number().int(),
  refundAmountPaise: z.number().int(),
  refundMethod: z.string().nullable(),
  metalRateDifferencePaise: z.number().int(),
  createdAt: z.coerce.date(),
  items: z.array(z.object({
    id: z.string().uuid(),
    productId: z.string().nullable(),
    quantity: z.number().int(),
    returnPricePaise: z.number().int(),
    reason: z.string().nullable(),
  })),
});
export type ReturnRequestResponse = z.infer<typeof ReturnRequestResponseSchema>;

// ─── Loyalty ──────────────────────────────────────────────────────

export const LoyaltyDashboardResponseSchema = z.object({
  currentPoints: z.number().int(),
  tier: z.string().nullable(),
  tierBenefits: z.array(z.string()),
  tierMultiplier: z.number().nullable(),
  lifetimeEarned: z.number().int(),
  lifetimeRedeemed: z.number().int(),
  pointsExpiringSoon: z.number().int(),
  pointsExpiryDate: z.coerce.date().nullable(),
  nextTier: z.string().nullable(),
  pointsToNextTier: z.number().int().nullable(),
  nextTierBenefits: z.array(z.string()),
});
export type LoyaltyDashboardResponse = z.infer<typeof LoyaltyDashboardResponseSchema>;

export const PointsHistoryItemSchema = z.object({
  id: z.string().uuid(),
  transactionType: z.string(),
  points: z.number().int(),
  balanceAfter: z.number().int(),
  description: z.string().nullable(),
  referenceType: z.string().nullable(),
  referenceId: z.string().nullable(),
  expiresAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
});
export type PointsHistoryItem = z.infer<typeof PointsHistoryItemSchema>;

export const RedeemPointsInputSchema = z.object({
  points: z.number().int().positive(),
  orderId: z.string().uuid(),
});
export type RedeemPointsInput = z.infer<typeof RedeemPointsInputSchema>;

// ─── Schemes ──────────────────────────────────────────────────────

export const SchemeMembershipSummarySchema = z.object({
  id: z.string().uuid(),
  memberNumber: z.string(),
  schemeType: z.enum(['KITTY', 'GOLD_SAVINGS']),
  schemeName: z.string(),
  status: z.string(),
  totalPaidPaise: z.number().int(),
  monthlyAmountPaise: z.number().int(),
  durationMonths: z.number().int(),
  paidInstallments: z.number().int(),
  totalInstallments: z.number().int(),
  nextDueDate: z.coerce.date().nullable(),
  maturityDate: z.coerce.date().nullable(),
});
export type SchemeMembershipSummary = z.infer<typeof SchemeMembershipSummarySchema>;

export const SchemeDashboardResponseSchema = z.object({
  activeSchemes: z.array(SchemeMembershipSummarySchema),
  totalInvestedPaise: z.number().int(),
  upcomingInstallments: z.array(z.object({
    membershipId: z.string().uuid(),
    schemeName: z.string(),
    installmentNumber: z.number().int(),
    dueDate: z.coerce.date(),
    amountPaise: z.number().int(),
  })),
});
export type SchemeDashboardResponse = z.infer<typeof SchemeDashboardResponseSchema>;

export const SchemeInstallmentResponseSchema = z.object({
  id: z.string().uuid(),
  installmentNumber: z.number().int(),
  dueDate: z.coerce.date(),
  paidDate: z.coerce.date().nullable(),
  amountPaise: z.number().int(),
  lateFeePaise: z.number().int().nullable(),
  status: z.string(),
});
export type SchemeInstallmentResponse = z.infer<typeof SchemeInstallmentResponseSchema>;

export const SchemeDetailResponseSchema = z.object({
  id: z.string().uuid(),
  memberNumber: z.string(),
  schemeType: z.enum(['KITTY', 'GOLD_SAVINGS']),
  schemeName: z.string(),
  schemeDescription: z.string().nullable(),
  status: z.string(),
  joinedDate: z.coerce.date(),
  monthlyAmountPaise: z.number().int(),
  durationMonths: z.number().int(),
  bonusPercent: z.number().int().nullable(),
  bonusMonths: z.number().int().nullable(),
  totalPaidPaise: z.number().int(),
  maturityDate: z.coerce.date().nullable(),
  maturityValuePaise: z.number().int().nullable(),
  installments: z.array(SchemeInstallmentResponseSchema),
});
export type SchemeDetailResponse = z.infer<typeof SchemeDetailResponseSchema>;

export const PayInstallmentInputSchema = z.object({
  paymentMethod: z.enum(['UPI', 'BANK_TRANSFER', 'CARD']),
});
export type PayInstallmentInput = z.infer<typeof PayInstallmentInputSchema>;

export const EnrollSchemeInputSchema = z.object({
  schemeId: z.string().uuid(),
  schemeType: z.enum(['KITTY', 'GOLD_SAVINGS']),
});
export type EnrollSchemeInput = z.infer<typeof EnrollSchemeInputSchema>;

// ─── KYC ──────────────────────────────────────────────────────────

export const KycDocumentStatusSchema = z.object({
  id: z.string().uuid(),
  type: KycVerificationTypeEnum,
  documentNumber: z.string(),
  status: KycVerificationStatusEnum,
  verifiedAt: z.coerce.date().nullable(),
  validUntil: z.coerce.date().nullable(),
});
export type KycDocumentStatus = z.infer<typeof KycDocumentStatusSchema>;

export const KycStatusResponseSchema = z.object({
  documents: z.array(KycDocumentStatusSchema),
  isAadhaarVerified: z.boolean(),
  isPanVerified: z.boolean(),
  isKycComplete: z.boolean(),
  overallStatus: z.enum(['NOT_STARTED', 'PARTIAL', 'PENDING_REVIEW', 'COMPLETE']),
});
export type CustomerPortalKycStatusResponse = z.infer<typeof KycStatusResponseSchema>;

export const KycUploadInputSchema = z.object({
  documentType: KycVerificationTypeEnum,
  documentNumber: z.string().min(1).max(50),
  fileUrl: z.string().url().max(500),
});
export type KycUploadInput = z.infer<typeof KycUploadInputSchema>;

export const KycRequirementsResponseSchema = z.object({
  purpose: z.string(),
  requiredDocuments: z.array(z.object({
    type: KycVerificationTypeEnum,
    description: z.string(),
    isMandatory: z.boolean(),
    isVerified: z.boolean(),
  })),
  isComplete: z.boolean(),
});
export type KycRequirementsResponse = z.infer<typeof KycRequirementsResponseSchema>;

// ─── Dashboard ────────────────────────────────────────────────────

export const CustomerDashboardResponseSchema = z.object({
  greeting: z.string(),
  recentOrders: z.array(OrderSummaryResponseSchema),
  loyalty: z.object({
    currentPoints: z.number().int(),
    tier: z.string().nullable(),
    pointsExpiringSoon: z.number().int(),
  }),
  activeSchemesCount: z.number().int(),
  upcomingInstallments: z.array(z.object({
    schemeName: z.string(),
    dueDate: z.coerce.date(),
    amountPaise: z.number().int(),
  })),
  wishlistCount: z.number().int(),
  pendingReturns: z.number().int(),
});
export type CustomerDashboardResponse = z.infer<typeof CustomerDashboardResponseSchema>;
