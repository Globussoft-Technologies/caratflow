// ─── CaratFlow Retail Types ────────────────────────────────────
// Types for sales, POS, returns, custom orders, repairs, layaway,
// old gold purchases, appraisals, discounts, gift cards.

import { z } from 'zod';

// ─── Enums ────────────────────────────────────────────────────────

export enum SaleStatus {
  DRAFT = 'DRAFT',
  COMPLETED = 'COMPLETED',
  RETURNED = 'RETURNED',
  PARTIALLY_RETURNED = 'PARTIALLY_RETURNED',
  VOIDED = 'VOIDED',
}

export enum SaleDiscountType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED = 'FIXED',
}

export enum SalePaymentMethod {
  CASH = 'CASH',
  CARD = 'CARD',
  UPI = 'UPI',
  BANK_TRANSFER = 'BANK_TRANSFER',
  CHEQUE = 'CHEQUE',
  OLD_GOLD = 'OLD_GOLD',
  GIFT_CARD = 'GIFT_CARD',
  LOYALTY_POINTS = 'LOYALTY_POINTS',
}

export enum SalePaymentStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

export enum SaleReturnStatus {
  DRAFT = 'DRAFT',
  APPROVED = 'APPROVED',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
}

export enum RepairOrderStatus {
  RECEIVED = 'RECEIVED',
  DIAGNOSED = 'DIAGNOSED',
  QUOTED = 'QUOTED',
  APPROVED = 'APPROVED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

export enum CustomOrderStatus {
  INQUIRY = 'INQUIRY',
  DESIGNED = 'DESIGNED',
  QUOTED = 'QUOTED',
  CONFIRMED = 'CONFIRMED',
  DEPOSIT_PAID = 'DEPOSIT_PAID',
  IN_PRODUCTION = 'IN_PRODUCTION',
  READY = 'READY',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

export enum LayawayStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  FORFEITED = 'FORFEITED',
}

export enum OldGoldPurchaseStatus {
  DRAFT = 'DRAFT',
  TESTED = 'TESTED',
  VALUED = 'VALUED',
  PURCHASED = 'PURCHASED',
  EXCHANGED = 'EXCHANGED',
}

export enum RetailDiscountType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED = 'FIXED',
  BUY_X_GET_Y = 'BUY_X_GET_Y',
}

export enum GiftCardStatus {
  ACTIVE = 'ACTIVE',
  USED = 'USED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

// ─── Sale Line Item ───────────────────────────────────────────────

export const SaleLineItemInputSchema = z.object({
  productId: z.string().uuid().optional(),
  description: z.string().min(1).max(500),
  quantity: z.number().int().min(1).default(1),
  unitPricePaise: z.number().int().nonnegative(),
  discountPaise: z.number().int().nonnegative().default(0),
  discountType: z.nativeEnum(SaleDiscountType).optional(),
  makingChargesPaise: z.number().int().nonnegative().default(0),
  wastageChargesPaise: z.number().int().nonnegative().default(0),
  metalRatePaise: z.number().int().nonnegative().default(0),
  metalWeightMg: z.number().int().nonnegative().default(0),
  hsnCode: z.string().default('7113'),
  gstRate: z.number().int().nonnegative().default(300), // percent * 100
});
export type SaleLineItemInput = z.infer<typeof SaleLineItemInputSchema>;

export const SaleLineItemResponseSchema = SaleLineItemInputSchema.extend({
  id: z.string().uuid(),
  saleId: z.string().uuid(),
  cgstPaise: z.number().int(),
  sgstPaise: z.number().int(),
  igstPaise: z.number().int(),
  lineTotalPaise: z.number().int(),
});
export type SaleLineItemResponse = z.infer<typeof SaleLineItemResponseSchema>;

// ─── Pricing Calculation ──────────────────────────────────────────

export const PricingCalculationSchema = z.object({
  metalRatePaisePerGram: z.number().int().nonnegative(),
  metalWeightMg: z.number().int().nonnegative(),
  metalValuePaise: z.number().int().nonnegative(),
  makingChargesPaise: z.number().int().nonnegative(),
  wastageChargesPaise: z.number().int().nonnegative(),
  subtotalPaise: z.number().int().nonnegative(),
  cgstPaise: z.number().int().nonnegative(),
  sgstPaise: z.number().int().nonnegative(),
  igstPaise: z.number().int().nonnegative(),
  totalTaxPaise: z.number().int().nonnegative(),
  totalPaise: z.number().int().nonnegative(),
});
export type PricingCalculation = z.infer<typeof PricingCalculationSchema>;

// ─── Sale Payment ─────────────────────────────────────────────────

export const SalePaymentInputSchema = z.object({
  method: z.nativeEnum(SalePaymentMethod),
  amountPaise: z.number().int().positive(),
  reference: z.string().max(255).optional(),
});
export type SalePaymentInput = z.infer<typeof SalePaymentInputSchema>;

export const SalePaymentResponseSchema = SalePaymentInputSchema.extend({
  id: z.string().uuid(),
  saleId: z.string().uuid(),
  status: z.nativeEnum(SalePaymentStatus),
  processedAt: z.coerce.date().nullable(),
});
export type SalePaymentResponse = z.infer<typeof SalePaymentResponseSchema>;

// ─── Sale ─────────────────────────────────────────────────────────

export const SaleInputSchema = z.object({
  customerId: z.string().uuid().optional(),
  locationId: z.string().uuid(),
  lineItems: z.array(SaleLineItemInputSchema).min(1),
  payments: z.array(SalePaymentInputSchema).min(1),
  discountPaise: z.number().int().nonnegative().default(0),
  notes: z.string().optional(),
  currencyCode: z.string().length(3).default('INR'),
});
export type SaleInput = z.infer<typeof SaleInputSchema>;

export const SaleResponseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  saleNumber: z.string(),
  customerId: z.string().uuid().nullable(),
  locationId: z.string().uuid(),
  userId: z.string().uuid(),
  status: z.nativeEnum(SaleStatus),
  subtotalPaise: z.number().int(),
  discountPaise: z.number().int(),
  taxPaise: z.number().int(),
  totalPaise: z.number().int(),
  currencyCode: z.string(),
  roundOffPaise: z.number().int(),
  notes: z.string().nullable(),
  lineItems: z.array(SaleLineItemResponseSchema),
  payments: z.array(SalePaymentResponseSchema),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type SaleResponse = z.infer<typeof SaleResponseSchema>;

// ─── Sale Return ──────────────────────────────────────────────────

export const SaleReturnItemInputSchema = z.object({
  originalLineItemId: z.string().uuid(),
  productId: z.string().uuid().optional(),
  quantity: z.number().int().min(1).default(1),
  returnPricePaise: z.number().int().nonnegative(),
  reason: z.string().optional(),
});
export type SaleReturnItemInput = z.infer<typeof SaleReturnItemInputSchema>;

export const SaleReturnInputSchema = z.object({
  originalSaleId: z.string().uuid(),
  customerId: z.string().uuid().optional(),
  locationId: z.string().uuid(),
  reason: z.string().optional(),
  refundMethod: z.string().optional(),
  items: z.array(SaleReturnItemInputSchema).min(1),
});
export type SaleReturnInput = z.infer<typeof SaleReturnInputSchema>;

export const SaleReturnResponseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  returnNumber: z.string(),
  originalSaleId: z.string().uuid(),
  customerId: z.string().uuid().nullable(),
  locationId: z.string().uuid(),
  reason: z.string().nullable(),
  status: z.nativeEnum(SaleReturnStatus),
  subtotalPaise: z.number().int(),
  refundAmountPaise: z.number().int(),
  refundMethod: z.string().nullable(),
  metalRateDifferencePaise: z.number().int(),
  items: z.array(z.object({
    id: z.string().uuid(),
    originalLineItemId: z.string().uuid(),
    productId: z.string().uuid().nullable(),
    quantity: z.number().int(),
    returnPricePaise: z.number().int(),
    reason: z.string().nullable(),
  })),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type SaleReturnResponse = z.infer<typeof SaleReturnResponseSchema>;

// ─── Repair Order ─────────────────────────────────────────────────

export const RepairOrderInputSchema = z.object({
  customerId: z.string().uuid(),
  locationId: z.string().uuid(),
  itemDescription: z.string().min(1).max(500),
  itemWeightMg: z.number().int().nonnegative().optional(),
  itemImages: z.array(z.string()).optional(),
  diagnosticNotes: z.string().optional(),
  estimatePaise: z.number().int().nonnegative().optional(),
  promisedDate: z.coerce.date().optional(),
});
export type RepairOrderInput = z.infer<typeof RepairOrderInputSchema>;

export const RepairStatusUpdateSchema = z.object({
  status: z.nativeEnum(RepairOrderStatus),
  diagnosticNotes: z.string().optional(),
  estimatePaise: z.number().int().nonnegative().optional(),
  actualCostPaise: z.number().int().nonnegative().optional(),
  laborPaise: z.number().int().nonnegative().optional(),
  materialPaise: z.number().int().nonnegative().optional(),
  completedDate: z.coerce.date().optional(),
  deliveredDate: z.coerce.date().optional(),
});
export type RepairStatusUpdate = z.infer<typeof RepairStatusUpdateSchema>;

export const RepairOrderResponseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  repairNumber: z.string(),
  customerId: z.string().uuid(),
  locationId: z.string().uuid(),
  status: z.nativeEnum(RepairOrderStatus),
  itemDescription: z.string(),
  itemWeightMg: z.number().int().nullable(),
  itemImages: z.unknown().nullable(),
  diagnosticNotes: z.string().nullable(),
  estimatePaise: z.number().int().nullable(),
  actualCostPaise: z.number().int().nullable(),
  laborPaise: z.number().int().nullable(),
  materialPaise: z.number().int().nullable(),
  promisedDate: z.coerce.date().nullable(),
  completedDate: z.coerce.date().nullable(),
  deliveredDate: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type RepairOrderResponse = z.infer<typeof RepairOrderResponseSchema>;

// ─── Custom Order ─────────────────────────────────────────────────

export const CustomOrderInputSchema = z.object({
  customerId: z.string().uuid(),
  locationId: z.string().uuid(),
  description: z.string().min(1),
  designNotes: z.string().optional(),
  designImages: z.array(z.string()).optional(),
  estimatePaise: z.number().int().nonnegative().optional(),
  expectedDate: z.coerce.date().optional(),
});
export type CustomOrderInput = z.infer<typeof CustomOrderInputSchema>;

export const CustomOrderResponseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  orderNumber: z.string(),
  customerId: z.string().uuid(),
  locationId: z.string().uuid(),
  status: z.nativeEnum(CustomOrderStatus),
  description: z.string(),
  designNotes: z.string().nullable(),
  designImages: z.unknown().nullable(),
  estimatePaise: z.number().int().nullable(),
  finalPricePaise: z.number().int().nullable(),
  depositPaise: z.number().int(),
  balancePaise: z.number().int(),
  expectedDate: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type CustomOrderResponse = z.infer<typeof CustomOrderResponseSchema>;

// ─── Layaway ──────────────────────────────────────────────────────

export const LayawayInputSchema = z.object({
  saleId: z.string().uuid(),
  customerId: z.string().uuid(),
  totalPaise: z.number().int().positive(),
  installmentCount: z.number().int().min(2),
  dueDate: z.coerce.date().optional(),
});
export type LayawayInput = z.infer<typeof LayawayInputSchema>;

export const LayawayPaymentInputSchema = z.object({
  layawayId: z.string().uuid(),
  amountPaise: z.number().int().positive(),
  method: z.string(),
  reference: z.string().optional(),
});
export type LayawayPaymentInput = z.infer<typeof LayawayPaymentInputSchema>;

export const LayawayResponseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  layawayNumber: z.string(),
  saleId: z.string().uuid(),
  customerId: z.string().uuid(),
  totalPaise: z.number().int(),
  paidPaise: z.number().int(),
  remainingPaise: z.number().int(),
  status: z.nativeEnum(LayawayStatus),
  dueDate: z.coerce.date().nullable(),
  installmentCount: z.number().int(),
  nextPaymentDate: z.coerce.date().nullable(),
  payments: z.array(z.object({
    id: z.string().uuid(),
    amountPaise: z.number().int(),
    method: z.string(),
    reference: z.string().nullable(),
    paidAt: z.coerce.date(),
  })),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type LayawayResponse = z.infer<typeof LayawayResponseSchema>;

// ─── Old Gold Purchase ────────────────────────────────────────────

export const OldGoldDeductionSchema = z.object({
  type: z.string(), // e.g. "stone_weight", "melting_loss", "impurity"
  description: z.string(),
  amountPaise: z.number().int().nonnegative(),
  weightMg: z.number().int().nonnegative().optional(),
});
export type OldGoldDeduction = z.infer<typeof OldGoldDeductionSchema>;

export const OldGoldInputSchema = z.object({
  customerId: z.string().uuid().optional(),
  locationId: z.string().uuid(),
  metalType: z.string(),
  grossWeightMg: z.number().int().positive(),
  netWeightMg: z.number().int().positive(),
  purityFineness: z.number().int().min(1).max(999),
  ratePaisePer10g: z.number().int().positive(),
  deductions: z.array(OldGoldDeductionSchema).optional(),
  paymentMethod: z.string().optional(),
  usedAgainstSaleId: z.string().uuid().optional(),
});
export type OldGoldInput = z.infer<typeof OldGoldInputSchema>;

export const OldGoldPurchaseResponseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  purchaseNumber: z.string(),
  customerId: z.string().uuid().nullable(),
  locationId: z.string().uuid(),
  metalType: z.string(),
  grossWeightMg: z.number().int(),
  netWeightMg: z.number().int(),
  purityFineness: z.number().int(),
  ratePaisePer10g: z.number().int(),
  totalValuePaise: z.number().int(),
  deductions: z.array(OldGoldDeductionSchema).nullable(),
  finalAmountPaise: z.number().int(),
  paymentMethod: z.string().nullable(),
  status: z.nativeEnum(OldGoldPurchaseStatus),
  usedAgainstSaleId: z.string().uuid().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type OldGoldPurchaseResponse = z.infer<typeof OldGoldPurchaseResponseSchema>;

// ─── Appraisal ────────────────────────────────────────────────────

export const AppraisalInputSchema = z.object({
  customerId: z.string().uuid(),
  locationId: z.string().uuid(),
  itemDescription: z.string().min(1).max(500),
  metalType: z.string().optional(),
  weightMg: z.number().int().nonnegative().optional(),
  purityFineness: z.number().int().min(1).max(999).optional(),
  stoneDetails: z.record(z.unknown()).optional(),
  appraisedValuePaise: z.number().int().nonnegative(),
  appraisedBy: z.string().min(1).max(100),
  validUntil: z.coerce.date().optional(),
  certificateUrl: z.string().url().optional(),
  notes: z.string().optional(),
});
export type AppraisalInput = z.infer<typeof AppraisalInputSchema>;

export const AppraisalResponseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  appraisalNumber: z.string(),
  customerId: z.string().uuid(),
  locationId: z.string().uuid(),
  itemDescription: z.string(),
  metalType: z.string().nullable(),
  weightMg: z.number().int().nullable(),
  purityFineness: z.number().int().nullable(),
  stoneDetails: z.unknown().nullable(),
  appraisedValuePaise: z.number().int(),
  appraisedBy: z.string(),
  appraisedAt: z.coerce.date(),
  validUntil: z.coerce.date().nullable(),
  certificateUrl: z.string().nullable(),
  notes: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type AppraisalResponse = z.infer<typeof AppraisalResponseSchema>;

// ─── Discount ─────────────────────────────────────────────────────

export const DiscountInputSchema = z.object({
  name: z.string().min(1).max(255),
  discountType: z.nativeEnum(RetailDiscountType),
  value: z.number().int().positive(),
  minPurchasePaise: z.number().int().nonnegative().optional(),
  maxDiscountPaise: z.number().int().nonnegative().optional(),
  applicableCategories: z.array(z.string().uuid()).optional(),
  applicableProducts: z.array(z.string().uuid()).optional(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  isActive: z.boolean().default(true),
  usageLimit: z.number().int().positive().optional(),
});
export type DiscountInput = z.infer<typeof DiscountInputSchema>;

export const DiscountValidationSchema = z.object({
  discountId: z.string().uuid(),
  isValid: z.boolean(),
  applicableAmount: z.number().int().nonnegative(),
  reason: z.string().optional(),
});
export type DiscountValidation = z.infer<typeof DiscountValidationSchema>;

export const DiscountResponseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  name: z.string(),
  discountType: z.nativeEnum(RetailDiscountType),
  value: z.number().int(),
  minPurchasePaise: z.number().int().nullable(),
  maxDiscountPaise: z.number().int().nullable(),
  applicableCategories: z.unknown().nullable(),
  applicableProducts: z.unknown().nullable(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  isActive: z.boolean(),
  usageLimit: z.number().int().nullable(),
  usedCount: z.number().int(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type DiscountResponse = z.infer<typeof DiscountResponseSchema>;

// ─── Gift Card ────────────────────────────────────────────────────

export const GiftCardInputSchema = z.object({
  initialValuePaise: z.number().int().positive(),
  customerId: z.string().uuid().optional(),
  expiresAt: z.coerce.date().optional(),
});
export type GiftCardInput = z.infer<typeof GiftCardInputSchema>;

export const GiftCardResponseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  cardNumber: z.string(),
  balancePaise: z.number().int(),
  initialValuePaise: z.number().int(),
  customerId: z.string().uuid().nullable(),
  status: z.nativeEnum(GiftCardStatus),
  expiresAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type GiftCardResponse = z.infer<typeof GiftCardResponseSchema>;

// ─── POS Session / Dashboard ──────────────────────────────────────

export const PosSessionResponseSchema = z.object({
  todaySalesCount: z.number().int(),
  todayRevenuePaise: z.number().int(),
  averageTicketPaise: z.number().int(),
  paymentBreakdown: z.array(z.object({
    method: z.nativeEnum(SalePaymentMethod),
    totalPaise: z.number().int(),
    count: z.number().int(),
  })),
  recentSales: z.array(z.object({
    id: z.string().uuid(),
    saleNumber: z.string(),
    customerName: z.string().nullable(),
    totalPaise: z.number().int(),
    status: z.nativeEnum(SaleStatus),
    createdAt: z.coerce.date(),
  })),
});
export type PosSessionResponse = z.infer<typeof PosSessionResponseSchema>;

export const RetailDashboardResponseSchema = z.object({
  todaySalesCount: z.number().int(),
  todayRevenuePaise: z.number().int(),
  averageTicketPaise: z.number().int(),
  monthRevenuePaise: z.number().int(),
  pendingReturns: z.number().int(),
  activeRepairs: z.number().int(),
  activeCustomOrders: z.number().int(),
  activeLayaways: z.number().int(),
  topProducts: z.array(z.object({
    productId: z.string().uuid(),
    productName: z.string(),
    quantitySold: z.number().int(),
    revenuePaise: z.number().int(),
  })),
  paymentBreakdown: z.array(z.object({
    method: z.nativeEnum(SalePaymentMethod),
    totalPaise: z.number().int(),
    count: z.number().int(),
  })),
  recentSales: z.array(z.object({
    id: z.string().uuid(),
    saleNumber: z.string(),
    customerName: z.string().nullable(),
    totalPaise: z.number().int(),
    status: z.nativeEnum(SaleStatus),
    createdAt: z.coerce.date(),
  })),
});
export type RetailDashboardResponse = z.infer<typeof RetailDashboardResponseSchema>;

// ─── List Filters ─────────────────────────────────────────────────

export const SaleListFilterSchema = z.object({
  status: z.nativeEnum(SaleStatus).optional(),
  customerId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  search: z.string().optional(),
});
export type SaleListFilter = z.infer<typeof SaleListFilterSchema>;

export const RepairListFilterSchema = z.object({
  status: z.nativeEnum(RepairOrderStatus).optional(),
  customerId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
});
export type RepairListFilter = z.infer<typeof RepairListFilterSchema>;

// ─── Staff Dashboard (mobile Sales app) ───────────────────────────
// Per-user (logged-in sales staff) today summary used by the mobile
// Sales app. Aggregates Sale rows for the user on the given date,
// pending repair orders, plus current gold/silver per-10g rates.

export const StaffDashboardInputSchema = z
  .object({
    date: z.coerce.date().optional(),
  })
  .optional();
export type StaffDashboardInput = z.infer<typeof StaffDashboardInputSchema>;

export const StaffDashboardSchema = z.object({
  mySalesCount: z.number().int().nonnegative(),
  myRevenuePaise: z.number().int().nonnegative(),
  pendingRepairs: z.array(
    z.object({
      id: z.string().uuid(),
      repairNumber: z.string(),
      customerName: z.string(),
      status: z.nativeEnum(RepairOrderStatus),
      itemDescription: z.string(),
    }),
  ),
  recentTransactions: z.array(
    z.object({
      id: z.string().uuid(),
      saleNumber: z.string(),
      customerName: z.string().nullable(),
      totalPaise: z.number().int(),
      createdAt: z.coerce.date(),
    }),
  ),
  goldRatePer10g: z.number().int().nonnegative(),
  silverRatePer10g: z.number().int().nonnegative(),
});
export type StaffDashboardResponse = z.infer<typeof StaffDashboardSchema>;
