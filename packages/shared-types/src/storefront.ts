// ─── CaratFlow Storefront Types ────────────────────────────────
// B2C public API types: catalog, cart, wishlist, checkout, orders,
// reviews, addresses, coupons, home page, product compare.

import { z } from 'zod';
import { PaginationSchema } from './common';

// ─── Enums ────────────────────────────────────────────────────────

export enum PriceAlertStatus {
  ACTIVE = 'ACTIVE',
  TRIGGERED = 'TRIGGERED',
  CANCELLED = 'CANCELLED',
}

export enum AbandonedCartStatus {
  DETECTED = 'DETECTED',
  REMINDER_1_SENT = 'REMINDER_1_SENT',
  REMINDER_2_SENT = 'REMINDER_2_SENT',
  REMINDER_3_SENT = 'REMINDER_3_SENT',
  RECOVERED = 'RECOVERED',
  EXPIRED = 'EXPIRED',
}

export enum CouponDiscountType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED_AMOUNT = 'FIXED_AMOUNT',
  FREE_SHIPPING = 'FREE_SHIPPING',
}

export const PriceAlertStatusEnum = z.enum(['ACTIVE', 'TRIGGERED', 'CANCELLED']);
export const AbandonedCartStatusEnum = z.enum(['DETECTED', 'REMINDER_1_SENT', 'REMINDER_2_SENT', 'REMINDER_3_SENT', 'RECOVERED', 'EXPIRED']);
export const CouponDiscountTypeEnum = z.enum(['PERCENTAGE', 'FIXED_AMOUNT', 'FREE_SHIPPING']);

// ─── Product List / Catalog ───────────────────────────────────────

export const ProductListInputSchema = PaginationSchema.extend({
  categoryId: z.string().uuid().optional(),
  productType: z.enum(['GOLD', 'SILVER', 'PLATINUM', 'DIAMOND', 'GEMSTONE', 'KUNDAN', 'OTHER']).optional(),
  metalPurity: z.number().int().min(1).max(999).optional(),
  priceMinPaise: z.number().int().nonnegative().optional(),
  priceMaxPaise: z.number().int().nonnegative().optional(),
  weightMinMg: z.number().int().nonnegative().optional(),
  weightMaxMg: z.number().int().nonnegative().optional(),
  search: z.string().max(500).optional(),
});
export type ProductListInput = z.infer<typeof ProductListInputSchema>;

export const ReviewSummarySchema = z.object({
  averageRating: z.number().min(0).max(5),
  totalReviews: z.number().int().nonnegative(),
  ratingBreakdown: z.record(z.string(), z.number().int().nonnegative()),
});
export type ReviewSummary = z.infer<typeof ReviewSummarySchema>;

export const CatalogProductResponseSchema = z.object({
  id: z.string().uuid(),
  sku: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  categoryId: z.string().uuid().nullable(),
  categoryName: z.string().nullable(),
  subCategoryId: z.string().uuid().nullable(),
  subCategoryName: z.string().nullable(),
  productType: z.string(),
  metalPurity: z.number().int().nullable(),
  metalWeightMg: z.number().int().nullable(),
  grossWeightMg: z.number().int().nullable(),
  netWeightMg: z.number().int().nullable(),
  stoneWeightCt: z.number().int().nullable(),
  makingChargesPaise: z.number().int().nullable(),
  wastagePercent: z.number().int().nullable(),
  // Live-calculated pricing
  metalValuePaise: z.number().int(),
  makingValuePaise: z.number().int(),
  wastageValuePaise: z.number().int(),
  subtotalPaise: z.number().int(),
  gstPaise: z.number().int(),
  totalPricePaise: z.number().int(),
  currencyCode: z.string(),
  images: z.array(z.string()).nullable(),
  attributes: z.record(z.unknown()).nullable(),
  huidNumber: z.string().nullable(),
  hallmarkNumber: z.string().nullable(),
  reviewSummary: ReviewSummarySchema,
  stockStatus: z.enum(['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK']),
  availableQuantity: z.number().int().nonnegative(),
  isActive: z.boolean(),
});
export type CatalogProductResponse = z.infer<typeof CatalogProductResponseSchema>;

// ─── Cart ─────────────────────────────────────────────────────────

export const CartItemInputSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1).default(1),
});
export type CartItemInput = z.infer<typeof CartItemInputSchema>;

export const UpdateCartItemInputSchema = z.object({
  quantity: z.number().int().min(1),
});
export type UpdateCartItemInput = z.infer<typeof UpdateCartItemInputSchema>;

export const CartItemResponseSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  productName: z.string(),
  productSku: z.string(),
  productImage: z.string().nullable(),
  productType: z.string(),
  metalPurity: z.number().int().nullable(),
  metalWeightMg: z.number().int().nullable(),
  quantity: z.number().int(),
  unitPricePaise: z.number().int(),
  lineTotalPaise: z.number().int(),
  metalRatePaiseLocked: z.number().int().nullable(),
  addedAt: z.coerce.date(),
});
export type CartItemResponse = z.infer<typeof CartItemResponseSchema>;

export const CartResponseSchema = z.object({
  id: z.string().uuid(),
  customerId: z.string().uuid().nullable(),
  sessionId: z.string(),
  currencyCode: z.string(),
  couponCode: z.string().nullable(),
  items: z.array(CartItemResponseSchema),
  subtotalPaise: z.number().int(),
  discountPaise: z.number().int(),
  taxPaise: z.number().int(),
  totalPaise: z.number().int(),
  itemCount: z.number().int(),
  expiresAt: z.coerce.date(),
});
export type CartResponse = z.infer<typeof CartResponseSchema>;

// ─── Wishlist ─────────────────────────────────────────────────────

export const WishlistInputSchema = z.object({
  productId: z.string().uuid(),
});
export type WishlistInput = z.infer<typeof WishlistInputSchema>;

export const WishlistItemResponseSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  productName: z.string(),
  productSku: z.string(),
  productImage: z.string().nullable(),
  productType: z.string(),
  currentPricePaise: z.number().int(),
  currencyCode: z.string(),
  stockStatus: z.enum(['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK']),
  priceAlertEnabled: z.boolean(),
  priceAlertThresholdPaise: z.number().int().nullable(),
  addedAt: z.coerce.date(),
});
export type WishlistItemResponse = z.infer<typeof WishlistItemResponseSchema>;

export const WishlistResponseSchema = z.object({
  items: z.array(WishlistItemResponseSchema),
  total: z.number().int(),
});
export type WishlistResponse = z.infer<typeof WishlistResponseSchema>;

// ─── Address ──────────────────────────────────────────────────────

export const AddressInputSchema = z.object({
  label: z.string().max(50).default('Home'),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  phone: z.string().min(1).max(20),
  addressLine1: z.string().min(1).max(500),
  addressLine2: z.string().max(500).optional(),
  city: z.string().min(1).max(100),
  state: z.string().min(1).max(100),
  country: z.string().length(2),
  postalCode: z.string().min(1).max(20),
  isDefault: z.boolean().default(false),
});
export type AddressInput = z.infer<typeof AddressInputSchema>;

export const AddressResponseSchema = z.object({
  id: z.string().uuid(),
  customerId: z.string().uuid(),
  label: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  phone: z.string(),
  addressLine1: z.string(),
  addressLine2: z.string().nullable(),
  city: z.string(),
  state: z.string(),
  country: z.string(),
  postalCode: z.string(),
  isDefault: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type AddressResponse = z.infer<typeof AddressResponseSchema>;

// ─── Checkout ─────────────────────────────────────────────────────

export const CheckoutInputSchema = z.object({
  cartId: z.string().uuid(),
  addressId: z.string().uuid(),
  paymentMethod: z.string().min(1),
  couponCode: z.string().max(100).optional(),
});
export type CheckoutInput = z.infer<typeof CheckoutInputSchema>;

// ─── Order Response (Customer-facing) ─────────────────────────────

export const StorefrontOrderItemSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid().nullable(),
  title: z.string(),
  quantity: z.number().int(),
  unitPricePaise: z.number().int(),
  totalPaise: z.number().int(),
  sku: z.string().nullable(),
  weightMg: z.number().int().nullable(),
  productImage: z.string().nullable(),
});
export type StorefrontOrderItem = z.infer<typeof StorefrontOrderItemSchema>;

export const StorefrontShipmentSchema = z.object({
  id: z.string().uuid(),
  shipmentNumber: z.string(),
  carrier: z.string().nullable(),
  trackingNumber: z.string().nullable(),
  trackingUrl: z.string().nullable(),
  status: z.string(),
  estimatedDeliveryDate: z.coerce.date().nullable(),
  actualDeliveryDate: z.coerce.date().nullable(),
});
export type StorefrontShipment = z.infer<typeof StorefrontShipmentSchema>;

export const StorefrontPaymentSchema = z.object({
  id: z.string().uuid(),
  method: z.string().nullable(),
  amountPaise: z.number().int(),
  status: z.string(),
  completedAt: z.coerce.date().nullable(),
});
export type StorefrontPayment = z.infer<typeof StorefrontPaymentSchema>;

export const OrderResponseSchema = z.object({
  id: z.string().uuid(),
  orderNumber: z.string(),
  status: z.string(),
  subtotalPaise: z.number().int(),
  shippingPaise: z.number().int(),
  taxPaise: z.number().int(),
  discountPaise: z.number().int(),
  totalPaise: z.number().int(),
  currencyCode: z.string(),
  shippingAddress: z.record(z.unknown()).nullable(),
  items: z.array(StorefrontOrderItemSchema),
  shipments: z.array(StorefrontShipmentSchema),
  payments: z.array(StorefrontPaymentSchema),
  placedAt: z.coerce.date().nullable(),
  confirmedAt: z.coerce.date().nullable(),
  shippedAt: z.coerce.date().nullable(),
  deliveredAt: z.coerce.date().nullable(),
  cancelReason: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type OrderResponse = z.infer<typeof OrderResponseSchema>;

// ─── Review ───────────────────────────────────────────────────────

export const ReviewInputSchema = z.object({
  productId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  title: z.string().max(500).optional(),
  body: z.string().max(5000).optional(),
  images: z.array(z.string().url()).max(5).optional(),
});
export type ReviewInput = z.infer<typeof ReviewInputSchema>;

export const ReviewResponseSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  customerId: z.string().uuid().nullable(),
  customerName: z.string(),
  rating: z.number().int(),
  title: z.string().nullable(),
  body: z.string().nullable(),
  images: z.array(z.string()).nullable(),
  isVerified: z.boolean(),
  helpfulCount: z.number().int(),
  createdAt: z.coerce.date(),
});
export type ReviewResponse = z.infer<typeof ReviewResponseSchema>;

export const ReviewListInputSchema = PaginationSchema.extend({
  productId: z.string().uuid(),
  sortBy: z.enum(['createdAt', 'rating', 'helpfulCount']).default('createdAt'),
});
export type ReviewListInput = z.infer<typeof ReviewListInputSchema>;

// ─── Coupon ───────────────────────────────────────────────────────

export const CouponValidationInputSchema = z.object({
  code: z.string().min(1).max(100),
  cartTotalPaise: z.number().int().nonnegative(),
});
export type CouponValidationInput = z.infer<typeof CouponValidationInputSchema>;

export const CouponValidationResultSchema = z.object({
  isValid: z.boolean(),
  code: z.string(),
  discountType: CouponDiscountTypeEnum.nullable(),
  discountValue: z.number().int().nullable(),
  discountAmountPaise: z.number().int(),
  reason: z.string().optional(),
});
export type CouponValidationResult = z.infer<typeof CouponValidationResultSchema>;

export const CouponCodeInputSchema = z.object({
  code: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  discountType: CouponDiscountTypeEnum,
  discountValue: z.number().int().positive(),
  minOrderPaise: z.number().int().nonnegative().optional(),
  maxDiscountPaise: z.number().int().nonnegative().optional(),
  usageLimit: z.number().int().positive(),
  validFrom: z.coerce.date(),
  validTo: z.coerce.date(),
  isActive: z.boolean().default(true),
  applicableCategories: z.array(z.string().uuid()).optional(),
  applicableProducts: z.array(z.string().uuid()).optional(),
  isFirstOrderOnly: z.boolean().default(false),
});
export type CouponCodeInput = z.infer<typeof CouponCodeInputSchema>;

export const CouponCodeResponseSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  description: z.string().nullable(),
  discountType: CouponDiscountTypeEnum,
  discountValue: z.number().int(),
  minOrderPaise: z.number().int().nullable(),
  maxDiscountPaise: z.number().int().nullable(),
  usageLimit: z.number().int(),
  usedCount: z.number().int(),
  validFrom: z.coerce.date(),
  validTo: z.coerce.date(),
  isActive: z.boolean(),
  applicableCategories: z.unknown().nullable(),
  applicableProducts: z.unknown().nullable(),
  isFirstOrderOnly: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type CouponCodeResponse = z.infer<typeof CouponCodeResponseSchema>;

// ─── Homepage ─────────────────────────────────────────────────────

export const StorefrontCategorySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  parentId: z.string().uuid().nullable(),
  description: z.string().nullable(),
  sortOrder: z.number().int(),
  children: z.array(z.lazy(() => StorefrontCategorySchema)).optional(),
});
export type StorefrontCategory = z.infer<typeof StorefrontCategorySchema>;

export const LiveRateSchema = z.object({
  metalType: z.string(),
  purity: z.number().int(),
  ratePaisePer10g: z.number().int(),
  currencyCode: z.string(),
  updatedAt: z.coerce.date(),
});
export type LiveRate = z.infer<typeof LiveRateSchema>;

export const StorefrontHomeResponseSchema = z.object({
  featuredProducts: z.array(CatalogProductResponseSchema),
  newArrivals: z.array(CatalogProductResponseSchema),
  categories: z.array(StorefrontCategorySchema),
  liveRates: z.array(LiveRateSchema),
  banners: z.array(z.object({
    id: z.string(),
    imageUrl: z.string(),
    linkUrl: z.string().nullable(),
    title: z.string().nullable(),
    sortOrder: z.number().int(),
  })),
});
export type StorefrontHomeResponse = z.infer<typeof StorefrontHomeResponseSchema>;

// ─── Product Compare ──────────────────────────────────────────────

export const ProductCompareInputSchema = z.object({
  productIds: z.array(z.string().uuid()).min(2).max(4),
});
export type ProductCompareInput = z.infer<typeof ProductCompareInputSchema>;

export const ProductCompareResponseSchema = z.object({
  products: z.array(CatalogProductResponseSchema),
});
export type ProductCompareResponse = z.infer<typeof ProductCompareResponseSchema>;

// ─── Return Request ───────────────────────────────────────────────

export const ReturnRequestInputSchema = z.object({
  items: z.array(z.object({
    orderItemId: z.string().uuid(),
    quantity: z.number().int().min(1),
    reason: z.string().min(1).max(500),
  })).min(1),
  reason: z.string().min(1).max(1000),
});
export type ReturnRequestInput = z.infer<typeof ReturnRequestInputSchema>;

// ─── Price Alert Input ────────────────────────────────────────────

export const PriceAlertInputSchema = z.object({
  productId: z.string().uuid(),
  targetPricePaise: z.number().int().positive(),
});
export type PriceAlertInput = z.infer<typeof PriceAlertInputSchema>;
