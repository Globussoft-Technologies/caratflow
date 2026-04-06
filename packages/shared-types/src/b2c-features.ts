// ─── CaratFlow B2C Features Types ──────────────────────────────
// Types for Wishlist, Product Comparison, Coupon Codes,
// Abandoned Cart Recovery, and Back-in-Stock Alerts.

import { z } from 'zod';

// ─── Enums ────────────────────────────────────────────────────────

export const CouponDiscountTypeEnum = z.enum([
  'PERCENTAGE', 'FIXED_AMOUNT', 'FREE_SHIPPING',
]);
export type CouponDiscountType = z.infer<typeof CouponDiscountTypeEnum>;

export const AbandonedCartStatusEnum = z.enum([
  'DETECTED', 'REMINDER_1_SENT', 'REMINDER_2_SENT', 'REMINDER_3_SENT', 'RECOVERED', 'EXPIRED',
]);
export type AbandonedCartStatus = z.infer<typeof AbandonedCartStatusEnum>;

export const BackInStockAlertStatusEnum = z.enum([
  'ACTIVE', 'NOTIFIED', 'CANCELLED',
]);
export type BackInStockAlertStatus = z.infer<typeof BackInStockAlertStatusEnum>;

// ─── Wishlist ─────────────────────────────────────────────────────

export const AddToWishlistInputSchema = z.object({
  productId: z.string().uuid(),
});
export type AddToWishlistInput = z.infer<typeof AddToWishlistInputSchema>;

export const PriceAlertInputSchema = z.object({
  productId: z.string().uuid(),
  thresholdPaise: z.number().int().positive(),
});
export type PriceAlertInput = z.infer<typeof PriceAlertInputSchema>;

export const WishlistItemSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  addedAt: z.coerce.date(),
  priceAtAddPaise: z.bigint(),
  currentPricePaise: z.bigint().nullable(),
  priceChange: z.enum(['UP', 'DOWN', 'SAME']),
  priceAlertEnabled: z.boolean(),
  priceAlertThresholdPaise: z.bigint().nullable(),
  priceAlertTriggered: z.boolean(),
  product: z.object({
    id: z.string().uuid(),
    name: z.string(),
    sku: z.string(),
    productType: z.string(),
    images: z.unknown().nullable(),
    sellingPricePaise: z.bigint().nullable(),
  }),
});
export type WishlistItem = z.infer<typeof WishlistItemSchema>;

// ─── Compare List ─────────────────────────────────────────────────

export const AddToCompareInputSchema = z.object({
  productId: z.string().uuid(),
  sessionId: z.string().optional(),
});
export type AddToCompareInput = z.infer<typeof AddToCompareInputSchema>;

export const RemoveFromCompareInputSchema = z.object({
  productId: z.string().uuid(),
  sessionId: z.string().optional(),
});
export type RemoveFromCompareInput = z.infer<typeof RemoveFromCompareInputSchema>;

export const CompareListOutputSchema = z.object({
  id: z.string().uuid(),
  productIds: z.array(z.string().uuid()),
  products: z.array(z.object({
    id: z.string().uuid(),
    name: z.string(),
    sku: z.string(),
    productType: z.string(),
    metalPurity: z.number().nullable(),
    metalWeightMg: z.bigint().nullable(),
    grossWeightMg: z.bigint().nullable(),
    netWeightMg: z.bigint().nullable(),
    makingCharges: z.bigint().nullable(),
    sellingPricePaise: z.bigint().nullable(),
    images: z.unknown().nullable(),
    attributes: z.unknown().nullable(),
    categoryName: z.string().nullable(),
  })),
});
export type CompareListOutput = z.infer<typeof CompareListOutputSchema>;

// ─── Coupon Code ──────────────────────────────────────────────────

export const CouponCodeInputSchema = z.object({
  code: z.string().min(3).max(50).toUpperCase(),
  description: z.string().max(500).optional(),
  discountType: CouponDiscountTypeEnum,
  discountValue: z.number().int().positive(),
  minOrderPaise: z.number().int().positive().optional(),
  maxDiscountPaise: z.number().int().positive().optional(),
  usageLimit: z.number().int().positive().optional(),
  usageLimitPerCustomer: z.number().int().positive().default(1),
  validFrom: z.coerce.date(),
  validTo: z.coerce.date(),
  isActive: z.boolean().default(true),
  applicableCategories: z.array(z.string().uuid()).optional(),
  applicableProducts: z.array(z.string().uuid()).optional(),
  excludedProducts: z.array(z.string().uuid()).optional(),
  isFirstOrderOnly: z.boolean().default(false),
  isAutoApply: z.boolean().default(false),
});
export type CouponCodeInput = z.infer<typeof CouponCodeInputSchema>;

export const CouponCodeUpdateSchema = CouponCodeInputSchema.partial().omit({ code: true });
export type CouponCodeUpdate = z.infer<typeof CouponCodeUpdateSchema>;

export const ValidateCouponInputSchema = z.object({
  code: z.string().toUpperCase(),
  cartTotalPaise: z.number().int().positive(),
  cartItems: z.array(z.object({
    productId: z.string().uuid(),
    categoryId: z.string().uuid().optional(),
    pricePaise: z.number().int().positive(),
    quantity: z.number().int().positive(),
  })),
});
export type ValidateCouponInput = z.infer<typeof ValidateCouponInputSchema>;

export const CouponValidationResultSchema = z.object({
  valid: z.boolean(),
  discountPaise: z.number().int().nonnegative(),
  errorMessage: z.string().optional(),
  coupon: z.object({
    id: z.string().uuid(),
    code: z.string(),
    discountType: CouponDiscountTypeEnum,
    discountValue: z.number().int(),
    description: z.string().nullable(),
  }).optional(),
});
export type CouponValidationResult = z.infer<typeof CouponValidationResultSchema>;

export const BulkCouponGenerateInputSchema = z.object({
  prefix: z.string().min(2).max(10).toUpperCase(),
  count: z.number().int().min(1).max(10000),
  discountType: CouponDiscountTypeEnum,
  discountValue: z.number().int().positive(),
  minOrderPaise: z.number().int().positive().optional(),
  maxDiscountPaise: z.number().int().positive().optional(),
  usageLimitPerCustomer: z.number().int().positive().default(1),
  validFrom: z.coerce.date(),
  validTo: z.coerce.date(),
  isFirstOrderOnly: z.boolean().default(false),
});
export type BulkCouponGenerateInput = z.infer<typeof BulkCouponGenerateInputSchema>;

// ─── Abandoned Cart ───────────────────────────────────────────────

export const AbandonedCartItemSchema = z.object({
  productId: z.string().uuid(),
  productName: z.string(),
  sku: z.string(),
  pricePaise: z.number().int(),
  quantity: z.number().int().positive(),
  imageUrl: z.string().nullable().optional(),
});
export type AbandonedCartItem = z.infer<typeof AbandonedCartItemSchema>;

export const AbandonedCartStatsSchema = z.object({
  totalAbandoned: z.number().int(),
  totalRecovered: z.number().int(),
  recoveryRate: z.number(),
  totalRevenueLostPaise: z.bigint(),
  totalRevenueRecoveredPaise: z.bigint(),
  averageCartValuePaise: z.bigint(),
  byStatus: z.record(z.string(), z.number().int()),
});
export type AbandonedCartStats = z.infer<typeof AbandonedCartStatsSchema>;

export const AbandonedCartDateRangeSchema = z.object({
  from: z.coerce.date(),
  to: z.coerce.date(),
});
export type AbandonedCartDateRange = z.infer<typeof AbandonedCartDateRangeSchema>;

// ─── Back In Stock Alert ──────────────────────────────────────────

export const BackInStockSubscribeInputSchema = z.object({
  productId: z.string().uuid(),
  email: z.string().email(),
});
export type BackInStockSubscribeInput = z.infer<typeof BackInStockSubscribeInputSchema>;
