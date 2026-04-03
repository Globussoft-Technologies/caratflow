// ─── CaratFlow E-Commerce Types ────────────────────────────────
// Types for online orders, product catalog sync, sales channels,
// shipping, payment gateways, webhooks, reviews, click & collect.

import { z } from 'zod';

// ─── Enums ────────────────────────────────────────────────────────

export enum SalesChannelType {
  SHOPIFY = 'SHOPIFY',
  AMAZON = 'AMAZON',
  FLIPKART = 'FLIPKART',
  WEBSITE = 'WEBSITE',
  INSTAGRAM = 'INSTAGRAM',
  CUSTOM = 'CUSTOM',
}

export enum CatalogItemStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
}

export enum CatalogSyncStatus {
  PENDING = 'PENDING',
  SYNCED = 'SYNCED',
  FAILED = 'FAILED',
  OUT_OF_SYNC = 'OUT_OF_SYNC',
}

export enum OnlineOrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  RETURNED = 'RETURNED',
  REFUNDED = 'REFUNDED',
}

export enum ShipmentStatus {
  LABEL_CREATED = 'LABEL_CREATED',
  PICKED_UP = 'PICKED_UP',
  IN_TRANSIT = 'IN_TRANSIT',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  DELIVERED = 'DELIVERED',
  RETURNED = 'RETURNED',
}

export enum PaymentGatewayType {
  RAZORPAY = 'RAZORPAY',
  STRIPE = 'STRIPE',
  PAYPAL = 'PAYPAL',
  PAYU = 'PAYU',
  CASHFREE = 'CASHFREE',
}

export enum OnlinePaymentStatus {
  INITIATED = 'INITIATED',
  AUTHORIZED = 'AUTHORIZED',
  CAPTURED = 'CAPTURED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED',
}

export enum WebhookLogStatus {
  RECEIVED = 'RECEIVED',
  PROCESSED = 'PROCESSED',
  FAILED = 'FAILED',
}

export enum ClickAndCollectStatus {
  READY_FOR_PICKUP = 'READY_FOR_PICKUP',
  NOTIFIED = 'NOTIFIED',
  PICKED_UP = 'PICKED_UP',
  CANCELLED = 'CANCELLED',
}

// ─── Address Schema ───────────────────────────────────────────────

export const AddressSchema = z.object({
  name: z.string().optional(),
  line1: z.string(),
  line2: z.string().optional(),
  city: z.string(),
  state: z.string(),
  country: z.string().length(2),
  postalCode: z.string(),
  phone: z.string().optional(),
});
export type Address = z.infer<typeof AddressSchema>;

// ─── Sales Channel ────────────────────────────────────────────────

export const SalesChannelInputSchema = z.object({
  name: z.string().min(1).max(255),
  channelType: z.nativeEnum(SalesChannelType),
  apiKey: z.string().max(500).optional(),
  apiSecret: z.string().max(500).optional(),
  storeUrl: z.string().url().max(500).optional(),
  webhookSecret: z.string().max(500).optional(),
  settings: z.record(z.unknown()).optional(),
  isActive: z.boolean().default(true),
});
export type SalesChannelInput = z.infer<typeof SalesChannelInputSchema>;

export const SalesChannelResponseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  name: z.string(),
  channelType: z.nativeEnum(SalesChannelType),
  storeUrl: z.string().nullable(),
  settings: z.record(z.unknown()).nullable(),
  isActive: z.boolean(),
  lastSyncAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type SalesChannelResponse = z.infer<typeof SalesChannelResponseSchema>;

export const SalesChannelListFilterSchema = z.object({
  channelType: z.nativeEnum(SalesChannelType).optional(),
  isActive: z.boolean().optional(),
  search: z.string().optional(),
});
export type SalesChannelListFilter = z.infer<typeof SalesChannelListFilterSchema>;

// ─── Catalog Item ─────────────────────────────────────────────────

export const CatalogSyncInputSchema = z.object({
  productId: z.string().uuid(),
  channelId: z.string().uuid(),
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  pricePaise: z.number().int().nonnegative(),
  comparePricePaise: z.number().int().nonnegative().optional(),
  currencyCode: z.string().length(3).default('INR'),
  images: z.array(z.string().url()).optional(),
  status: z.nativeEnum(CatalogItemStatus).default(CatalogItemStatus.DRAFT),
});
export type CatalogSyncInput = z.infer<typeof CatalogSyncInputSchema>;

export const CatalogItemResponseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  productId: z.string().uuid(),
  channelId: z.string().uuid(),
  externalProductId: z.string().nullable(),
  externalVariantId: z.string().nullable(),
  title: z.string(),
  description: z.string().nullable(),
  pricePaise: z.number().int(),
  comparePricePaise: z.number().int().nullable(),
  currencyCode: z.string(),
  images: z.unknown().nullable(),
  status: z.nativeEnum(CatalogItemStatus),
  syncStatus: z.nativeEnum(CatalogSyncStatus),
  lastSyncAt: z.coerce.date().nullable(),
  syncError: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type CatalogItemResponse = z.infer<typeof CatalogItemResponseSchema>;

export const BulkSyncResultSchema = z.object({
  totalItems: z.number().int(),
  synced: z.number().int(),
  failed: z.number().int(),
  skipped: z.number().int(),
  errors: z.array(z.object({
    productId: z.string().uuid(),
    error: z.string(),
  })),
});
export type BulkSyncResult = z.infer<typeof BulkSyncResultSchema>;

export const CatalogListFilterSchema = z.object({
  channelId: z.string().uuid().optional(),
  status: z.nativeEnum(CatalogItemStatus).optional(),
  syncStatus: z.nativeEnum(CatalogSyncStatus).optional(),
  search: z.string().optional(),
});
export type CatalogListFilter = z.infer<typeof CatalogListFilterSchema>;

// ─── Online Order ─────────────────────────────────────────────────

export const OnlineOrderItemInputSchema = z.object({
  catalogItemId: z.string().uuid().optional(),
  productId: z.string().uuid().optional(),
  externalLineItemId: z.string().optional(),
  title: z.string().min(1),
  quantity: z.number().int().positive(),
  unitPricePaise: z.number().int().nonnegative(),
  totalPaise: z.number().int().nonnegative(),
  sku: z.string().optional(),
  weightMg: z.number().int().nonnegative().optional(),
});
export type OnlineOrderItemInput = z.infer<typeof OnlineOrderItemInputSchema>;

export const OnlineOrderInputSchema = z.object({
  channelId: z.string().uuid(),
  externalOrderId: z.string().optional(),
  customerId: z.string().uuid().optional(),
  customerEmail: z.string().email().optional(),
  customerPhone: z.string().optional(),
  customerName: z.string().optional(),
  status: z.nativeEnum(OnlineOrderStatus).default(OnlineOrderStatus.PENDING),
  subtotalPaise: z.number().int().nonnegative(),
  shippingPaise: z.number().int().nonnegative().default(0),
  taxPaise: z.number().int().nonnegative().default(0),
  discountPaise: z.number().int().nonnegative().default(0),
  totalPaise: z.number().int().nonnegative(),
  currencyCode: z.string().length(3).default('INR'),
  shippingAddress: AddressSchema.optional(),
  billingAddress: AddressSchema.optional(),
  notes: z.string().optional(),
  placedAt: z.coerce.date().optional(),
  items: z.array(OnlineOrderItemInputSchema).min(1),
});
export type OnlineOrderInput = z.infer<typeof OnlineOrderInputSchema>;

export const OnlineOrderResponseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  orderNumber: z.string(),
  channelId: z.string().uuid(),
  externalOrderId: z.string().nullable(),
  customerId: z.string().uuid().nullable(),
  customerEmail: z.string().nullable(),
  customerPhone: z.string().nullable(),
  customerName: z.string().nullable(),
  status: z.nativeEnum(OnlineOrderStatus),
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
  items: z.array(z.object({
    id: z.string().uuid(),
    catalogItemId: z.string().uuid().nullable(),
    productId: z.string().uuid().nullable(),
    externalLineItemId: z.string().nullable(),
    title: z.string(),
    quantity: z.number().int(),
    unitPricePaise: z.number().int(),
    totalPaise: z.number().int(),
    sku: z.string().nullable(),
    weightMg: z.number().int().nullable(),
  })),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type OnlineOrderResponse = z.infer<typeof OnlineOrderResponseSchema>;

export const OrderStatusUpdateSchema = z.object({
  orderId: z.string().uuid(),
  status: z.nativeEnum(OnlineOrderStatus),
  cancelReason: z.string().optional(),
});
export type OrderStatusUpdate = z.infer<typeof OrderStatusUpdateSchema>;

export const OnlineOrderListFilterSchema = z.object({
  status: z.nativeEnum(OnlineOrderStatus).optional(),
  channelId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  search: z.string().optional(),
});
export type OnlineOrderListFilter = z.infer<typeof OnlineOrderListFilterSchema>;

// ─── Shipment ─────────────────────────────────────────────────────

export const ShipmentInputSchema = z.object({
  orderId: z.string().uuid(),
  carrier: z.string().max(100).optional(),
  trackingNumber: z.string().max(255).optional(),
  trackingUrl: z.string().url().max(500).optional(),
  estimatedDeliveryDate: z.coerce.date().optional(),
  weightGrams: z.number().int().positive().optional(),
  shippingCostPaise: z.number().int().nonnegative().default(0),
  labelUrl: z.string().url().max(500).optional(),
});
export type ShipmentInput = z.infer<typeof ShipmentInputSchema>;

export const ShipmentResponseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  orderId: z.string().uuid(),
  shipmentNumber: z.string(),
  carrier: z.string().nullable(),
  trackingNumber: z.string().nullable(),
  trackingUrl: z.string().nullable(),
  status: z.nativeEnum(ShipmentStatus),
  estimatedDeliveryDate: z.coerce.date().nullable(),
  actualDeliveryDate: z.coerce.date().nullable(),
  weightGrams: z.number().int().nullable(),
  shippingCostPaise: z.number().int(),
  labelUrl: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type ShipmentResponse = z.infer<typeof ShipmentResponseSchema>;

export const TrackingUpdateSchema = z.object({
  shipmentId: z.string().uuid(),
  status: z.nativeEnum(ShipmentStatus),
  trackingNumber: z.string().optional(),
  trackingUrl: z.string().url().optional(),
  actualDeliveryDate: z.coerce.date().optional(),
});
export type TrackingUpdate = z.infer<typeof TrackingUpdateSchema>;

export const ShipmentListFilterSchema = z.object({
  orderId: z.string().uuid().optional(),
  status: z.nativeEnum(ShipmentStatus).optional(),
  carrier: z.string().optional(),
  search: z.string().optional(),
});
export type ShipmentListFilter = z.infer<typeof ShipmentListFilterSchema>;

// ─── Payment Gateway ──────────────────────────────────────────────

export const PaymentGatewayInputSchema = z.object({
  name: z.string().min(1).max(255),
  gatewayType: z.nativeEnum(PaymentGatewayType),
  apiKey: z.string().max(500).optional(),
  apiSecret: z.string().max(500).optional(),
  webhookSecret: z.string().max(500).optional(),
  isActive: z.boolean().default(true),
  isDefault: z.boolean().default(false),
  supportedMethods: z.array(z.string()).optional(),
  settings: z.record(z.unknown()).optional(),
});
export type PaymentGatewayInput = z.infer<typeof PaymentGatewayInputSchema>;

export const PaymentGatewayResponseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  name: z.string(),
  gatewayType: z.nativeEnum(PaymentGatewayType),
  isActive: z.boolean(),
  isDefault: z.boolean(),
  supportedMethods: z.unknown().nullable(),
  settings: z.unknown().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type PaymentGatewayResponse = z.infer<typeof PaymentGatewayResponseSchema>;

// ─── Online Payment ───────────────────────────────────────────────

export const OnlinePaymentInputSchema = z.object({
  orderId: z.string().uuid(),
  gatewayId: z.string().uuid(),
  method: z.string().optional(),
  amountPaise: z.number().int().positive(),
  currencyCode: z.string().length(3).default('INR'),
});
export type OnlinePaymentInput = z.infer<typeof OnlinePaymentInputSchema>;

export const PaymentResponseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  orderId: z.string().uuid(),
  gatewayId: z.string().uuid(),
  externalPaymentId: z.string().nullable(),
  method: z.string().nullable(),
  amountPaise: z.number().int(),
  currencyCode: z.string(),
  status: z.nativeEnum(OnlinePaymentStatus),
  gatewayResponse: z.unknown().nullable(),
  initiatedAt: z.coerce.date().nullable(),
  completedAt: z.coerce.date().nullable(),
  refundedAt: z.coerce.date().nullable(),
  refundAmountPaise: z.number().int().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type PaymentResponse = z.infer<typeof PaymentResponseSchema>;

export const PaymentListFilterSchema = z.object({
  orderId: z.string().uuid().optional(),
  gatewayId: z.string().uuid().optional(),
  status: z.nativeEnum(OnlinePaymentStatus).optional(),
  search: z.string().optional(),
});
export type PaymentListFilter = z.infer<typeof PaymentListFilterSchema>;

// ─── Webhook Payload ──────────────────────────────────────────────

export const ShopifyWebhookPayloadSchema = z.object({
  id: z.number().or(z.string()),
  topic: z.string(),
  shop_domain: z.string().optional(),
  order_number: z.number().or(z.string()).optional(),
  email: z.string().email().optional(),
  total_price: z.string().optional(),
  currency: z.string().optional(),
  line_items: z.array(z.record(z.unknown())).optional(),
  shipping_address: z.record(z.unknown()).optional(),
  billing_address: z.record(z.unknown()).optional(),
  financial_status: z.string().optional(),
  fulfillment_status: z.string().nullable().optional(),
});
export type ShopifyWebhookPayload = z.infer<typeof ShopifyWebhookPayloadSchema>;

export const RazorpayWebhookPayloadSchema = z.object({
  event: z.string(),
  payload: z.object({
    payment: z.object({
      entity: z.object({
        id: z.string(),
        amount: z.number(),
        currency: z.string(),
        status: z.string(),
        order_id: z.string().optional(),
        method: z.string().optional(),
      }),
    }).optional(),
    refund: z.object({
      entity: z.object({
        id: z.string(),
        amount: z.number(),
        payment_id: z.string(),
      }),
    }).optional(),
  }),
});
export type RazorpayWebhookPayload = z.infer<typeof RazorpayWebhookPayloadSchema>;

export const StripeWebhookPayloadSchema = z.object({
  id: z.string(),
  type: z.string(),
  data: z.object({
    object: z.record(z.unknown()),
  }),
});
export type StripeWebhookPayload = z.infer<typeof StripeWebhookPayloadSchema>;

export const WebhookPayloadSchema = z.union([
  ShopifyWebhookPayloadSchema,
  RazorpayWebhookPayloadSchema,
  StripeWebhookPayloadSchema,
]);
export type WebhookPayload = z.infer<typeof WebhookPayloadSchema>;

// ─── Click & Collect ──────────────────────────────────────────────

export const ClickAndCollectInputSchema = z.object({
  orderId: z.string().uuid(),
  locationId: z.string().uuid(),
  expiresAt: z.coerce.date().optional(),
});
export type ClickAndCollectInput = z.infer<typeof ClickAndCollectInputSchema>;

export const ClickAndCollectResponseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  orderId: z.string().uuid(),
  locationId: z.string().uuid(),
  status: z.nativeEnum(ClickAndCollectStatus),
  readyAt: z.coerce.date().nullable(),
  notifiedAt: z.coerce.date().nullable(),
  pickedUpAt: z.coerce.date().nullable(),
  expiresAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type ClickAndCollectResponse = z.infer<typeof ClickAndCollectResponseSchema>;

export const ClickAndCollectListFilterSchema = z.object({
  locationId: z.string().uuid().optional(),
  status: z.nativeEnum(ClickAndCollectStatus).optional(),
});
export type ClickAndCollectListFilter = z.infer<typeof ClickAndCollectListFilterSchema>;

// ─── Product Review ───────────────────────────────────────────────

export const ProductReviewInputSchema = z.object({
  productId: z.string().uuid(),
  channelId: z.string().uuid().optional(),
  customerName: z.string().min(1).max(255),
  rating: z.number().int().min(1).max(5),
  title: z.string().max(500).optional(),
  body: z.string().optional(),
  isVerified: z.boolean().default(false),
});
export type ProductReviewInput = z.infer<typeof ProductReviewInputSchema>;

export const ProductReviewResponseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  productId: z.string().uuid(),
  channelId: z.string().uuid().nullable(),
  customerName: z.string(),
  rating: z.number().int(),
  title: z.string().nullable(),
  body: z.string().nullable(),
  isVerified: z.boolean(),
  isPublished: z.boolean(),
  publishedAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type ProductReviewResponse = z.infer<typeof ProductReviewResponseSchema>;

export const ReviewListFilterSchema = z.object({
  productId: z.string().uuid().optional(),
  channelId: z.string().uuid().optional(),
  isPublished: z.boolean().optional(),
  rating: z.number().int().min(1).max(5).optional(),
  search: z.string().optional(),
});
export type ReviewListFilter = z.infer<typeof ReviewListFilterSchema>;

// ─── Dashboard ────────────────────────────────────────────────────

export const EcommerceDashboardResponseSchema = z.object({
  totalOnlineOrders: z.number().int(),
  onlineRevenuePaise: z.number().int(),
  pendingShipments: z.number().int(),
  pendingOrders: z.number().int(),
  channelBreakdown: z.array(z.object({
    channelId: z.string().uuid(),
    channelName: z.string(),
    channelType: z.nativeEnum(SalesChannelType),
    orderCount: z.number().int(),
    revenuePaise: z.number().int(),
  })),
  conversionRate: z.number(), // percentage
  recentOrders: z.array(z.object({
    id: z.string().uuid(),
    orderNumber: z.string(),
    customerName: z.string().nullable(),
    channelType: z.nativeEnum(SalesChannelType),
    totalPaise: z.number().int(),
    status: z.nativeEnum(OnlineOrderStatus),
    placedAt: z.coerce.date().nullable(),
  })),
});
export type EcommerceDashboardResponse = z.infer<typeof EcommerceDashboardResponseSchema>;
