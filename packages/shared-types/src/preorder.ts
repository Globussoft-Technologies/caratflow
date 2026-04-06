// ─── CaratFlow Pre-Order / Backorder Types ─────────────────────
// Types for pre-orders, backorders, made-to-order, order
// modifications, and one-click reorder templates.

import { z } from 'zod';

// ─── Enums ────────────────────────────────────────────────────────

export enum PreOrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  IN_PRODUCTION = 'IN_PRODUCTION',
  AVAILABLE = 'AVAILABLE',
  FULFILLED = 'FULFILLED',
  CANCELLED = 'CANCELLED',
}

export enum PreOrderType {
  PRE_ORDER = 'PRE_ORDER',
  BACKORDER = 'BACKORDER',
  MADE_TO_ORDER = 'MADE_TO_ORDER',
}

export enum ModificationType {
  ADDRESS_CHANGE = 'ADDRESS_CHANGE',
  ITEM_CHANGE = 'ITEM_CHANGE',
  CANCEL_ITEM = 'CANCEL_ITEM',
  ADD_ITEM = 'ADD_ITEM',
  SIZE_CHANGE = 'SIZE_CHANGE',
}

export enum ModificationStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  AUTO_APPLIED = 'AUTO_APPLIED',
}

// ─── Pre-Order Schemas ────────────────────────────────────────────

export const CreatePreOrderInputSchema = z.object({
  customerId: z.string().uuid(),
  productId: z.string().uuid(),
  quantity: z.number().int().positive().default(1),
  orderType: z.nativeEnum(PreOrderType).default(PreOrderType.PRE_ORDER),
  notes: z.string().optional(),
  priceLockPaise: z.number().int().nonnegative().optional(),
  isPriceLocked: z.boolean().default(false),
});
export type CreatePreOrderInput = z.infer<typeof CreatePreOrderInputSchema>;

export const PreOrderResponseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  customerId: z.string().uuid(),
  customerName: z.string().nullable(),
  productId: z.string().uuid(),
  productName: z.string().nullable(),
  quantity: z.number().int(),
  status: z.nativeEnum(PreOrderStatus),
  orderType: z.nativeEnum(PreOrderType),
  depositPaise: z.number().int(),
  estimatedAvailableDate: z.coerce.date().nullable(),
  estimatedDeliveryDate: z.coerce.date().nullable(),
  actualAvailableDate: z.coerce.date().nullable(),
  notifiedAt: z.coerce.date().nullable(),
  fulfilledOrderId: z.string().uuid().nullable(),
  cancelReason: z.string().nullable(),
  notes: z.string().nullable(),
  priceLockPaise: z.number().int().nullable(),
  isPriceLocked: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type PreOrderResponse = z.infer<typeof PreOrderResponseSchema>;

export const PreOrderListFilterSchema = z.object({
  status: z.nativeEnum(PreOrderStatus).optional(),
  orderType: z.nativeEnum(PreOrderType).optional(),
  customerId: z.string().uuid().optional(),
  productId: z.string().uuid().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  search: z.string().optional(),
});
export type PreOrderListFilter = z.infer<typeof PreOrderListFilterSchema>;

export const PreOrderProductStatusSchema = z.object({
  productId: z.string().uuid(),
  isPreOrderAvailable: z.boolean(),
  isBackorderAvailable: z.boolean(),
  estimatedLeadDays: z.number().int().nullable(),
  depositPercentage: z.number().int(),
  maxPreOrderQty: z.number().int(),
  customMessage: z.string().nullable(),
  existingPreOrderCount: z.number().int(),
});
export type PreOrderProductStatus = z.infer<typeof PreOrderProductStatusSchema>;

// ─── Pre-Order Config Schemas ─────────────────────────────────────

export const PreOrderConfigInputSchema = z.object({
  productId: z.string().uuid(),
  isPreOrderEnabled: z.boolean().default(false),
  isBackorderEnabled: z.boolean().default(false),
  maxPreOrderQty: z.number().int().nonnegative().default(0),
  depositPercentage: z.number().int().min(0).max(100).default(0),
  estimatedLeadDays: z.number().int().positive().default(14),
  autoConfirm: z.boolean().default(false),
  customMessage: z.string().optional(),
});
export type PreOrderConfigInput = z.infer<typeof PreOrderConfigInputSchema>;

export const PreOrderConfigResponseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  productId: z.string().uuid(),
  productName: z.string().nullable(),
  isPreOrderEnabled: z.boolean(),
  isBackorderEnabled: z.boolean(),
  maxPreOrderQty: z.number().int(),
  depositPercentage: z.number().int(),
  estimatedLeadDays: z.number().int(),
  autoConfirm: z.boolean(),
  customMessage: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type PreOrderConfigResponse = z.infer<typeof PreOrderConfigResponseSchema>;

export const BulkPreOrderConfigInputSchema = z.object({
  productIds: z.array(z.string().uuid()).min(1),
  config: z.object({
    isPreOrderEnabled: z.boolean().optional(),
    isBackorderEnabled: z.boolean().optional(),
    maxPreOrderQty: z.number().int().nonnegative().optional(),
    depositPercentage: z.number().int().min(0).max(100).optional(),
    estimatedLeadDays: z.number().int().positive().optional(),
    autoConfirm: z.boolean().optional(),
    customMessage: z.string().optional(),
  }),
});
export type BulkPreOrderConfigInput = z.infer<typeof BulkPreOrderConfigInputSchema>;

// ─── Order Modification Schemas ───────────────────────────────────

export const RequestModificationInputSchema = z.object({
  orderId: z.string().uuid(),
  customerId: z.string().uuid(),
  modificationType: z.nativeEnum(ModificationType),
  requestedData: z.record(z.unknown()),
  reason: z.string().optional(),
});
export type RequestModificationInput = z.infer<typeof RequestModificationInputSchema>;

export const ModificationRequestResponseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  orderId: z.string().uuid(),
  customerId: z.string().uuid(),
  customerName: z.string().nullable(),
  orderNumber: z.string().nullable(),
  modificationType: z.nativeEnum(ModificationType),
  originalData: z.unknown(),
  requestedData: z.unknown(),
  status: z.nativeEnum(ModificationStatus),
  reason: z.string().nullable(),
  reviewedBy: z.string().uuid().nullable(),
  reviewedAt: z.coerce.date().nullable(),
  autoApplyWindow: z.number().int(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type ModificationRequestResponse = z.infer<typeof ModificationRequestResponseSchema>;

export const ModificationListFilterSchema = z.object({
  orderId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  status: z.nativeEnum(ModificationStatus).optional(),
  modificationType: z.nativeEnum(ModificationType).optional(),
  search: z.string().optional(),
});
export type ModificationListFilter = z.infer<typeof ModificationListFilterSchema>;

export const ReviewModificationInputSchema = z.object({
  requestId: z.string().uuid(),
  approved: z.boolean(),
  reason: z.string().optional(),
});
export type ReviewModificationInput = z.infer<typeof ReviewModificationInputSchema>;

// ─── Reorder Schemas ──────────────────────────────────────────────

export const ReorderTemplateItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive(),
});
export type ReorderTemplateItem = z.infer<typeof ReorderTemplateItemSchema>;

export const ReorderTemplateResponseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  customerId: z.string().uuid(),
  name: z.string(),
  sourceOrderId: z.string().uuid(),
  items: z.array(ReorderTemplateItemSchema),
  lastUsedAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type ReorderTemplateResponse = z.infer<typeof ReorderTemplateResponseSchema>;

export const ReorderResultSchema = z.object({
  availableItems: z.array(z.object({
    productId: z.string().uuid(),
    productName: z.string(),
    quantity: z.number().int(),
    unitPricePaise: z.number().int(),
    available: z.boolean(),
    availableQty: z.number().int(),
  })),
  unavailableItems: z.array(z.object({
    productId: z.string().uuid(),
    productName: z.string(),
    requestedQty: z.number().int(),
    reason: z.string(),
  })),
  totalAvailablePaise: z.number().int(),
});
export type ReorderResult = z.infer<typeof ReorderResultSchema>;

export const ReorderableOrderSchema = z.object({
  orderId: z.string().uuid(),
  orderNumber: z.string(),
  placedAt: z.coerce.date().nullable(),
  totalPaise: z.number().int(),
  itemCount: z.number().int(),
  allItemsAvailable: z.boolean(),
});
export type ReorderableOrder = z.infer<typeof ReorderableOrderSchema>;

// ─── Pre-Order Stats ──────────────────────────────────────────────

export const PreOrderStatsSchema = z.object({
  totalPending: z.number().int(),
  totalConfirmed: z.number().int(),
  totalInProduction: z.number().int(),
  totalAvailable: z.number().int(),
  totalFulfilled: z.number().int(),
  totalCancelled: z.number().int(),
  totalDepositPaise: z.number().int(),
});
export type PreOrderStats = z.infer<typeof PreOrderStatsSchema>;
