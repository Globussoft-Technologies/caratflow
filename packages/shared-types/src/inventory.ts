// ─── CaratFlow Inventory Types ─────────────────────────────────
// Types for stock management, transfers, stock-takes, metal/stone
// inventory, batch/lot tracking, serial numbers, and valuation.

import { z } from 'zod';
import { PaginationSchema, DateRangeSchema, UuidSchema } from './common';

// ─── Enums ────────────────────────────────────────────────────

export enum MovementType {
  IN = 'IN',
  OUT = 'OUT',
  TRANSFER = 'TRANSFER',
  ADJUST = 'ADJUST',
  RETURN = 'RETURN',
  PRODUCTION = 'PRODUCTION',
}

export enum TransferStatus {
  DRAFT = 'DRAFT',
  IN_TRANSIT = 'IN_TRANSIT',
  RECEIVED = 'RECEIVED',
  CANCELLED = 'CANCELLED',
}

export enum StockTakeStatus {
  DRAFT = 'DRAFT',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum InventoryMetalType {
  GOLD = 'GOLD',
  SILVER = 'SILVER',
  PLATINUM = 'PLATINUM',
}

export enum BatchSourceType {
  PURCHASE = 'PURCHASE',
  PRODUCTION = 'PRODUCTION',
  TRANSFER = 'TRANSFER',
}

export enum SerialStatus {
  AVAILABLE = 'AVAILABLE',
  SOLD = 'SOLD',
  RESERVED = 'RESERVED',
  IN_REPAIR = 'IN_REPAIR',
  IN_TRANSIT = 'IN_TRANSIT',
}

export enum ValuationMethod {
  FIFO = 'FIFO',
  AVG = 'AVG',
  LAST_PURCHASE = 'LAST_PURCHASE',
  GROSS_PROFIT = 'GROSS_PROFIT',
  MARKET = 'MARKET',
}

// ─── StockItem Schemas ────────────────────────────────────────

export const CreateStockItemSchema = z.object({
  productId: UuidSchema,
  locationId: UuidSchema,
  quantityOnHand: z.number().int().nonnegative().default(0),
  quantityReserved: z.number().int().nonnegative().default(0),
  quantityOnOrder: z.number().int().nonnegative().default(0),
  reorderLevel: z.number().int().nonnegative().default(0),
  reorderQuantity: z.number().int().nonnegative().default(0),
  binLocation: z.string().max(100).optional(),
});
export type CreateStockItem = z.infer<typeof CreateStockItemSchema>;

export const UpdateStockItemSchema = z.object({
  quantityOnHand: z.number().int().nonnegative().optional(),
  quantityReserved: z.number().int().nonnegative().optional(),
  quantityOnOrder: z.number().int().nonnegative().optional(),
  reorderLevel: z.number().int().nonnegative().optional(),
  reorderQuantity: z.number().int().nonnegative().optional(),
  binLocation: z.string().max(100).optional(),
});
export type UpdateStockItem = z.infer<typeof UpdateStockItemSchema>;

export const StockItemResponseSchema = z.object({
  id: UuidSchema,
  tenantId: UuidSchema,
  productId: UuidSchema,
  locationId: UuidSchema,
  quantityOnHand: z.number().int(),
  quantityReserved: z.number().int(),
  quantityOnOrder: z.number().int(),
  quantityAvailable: z.number().int(),
  reorderLevel: z.number().int(),
  reorderQuantity: z.number().int(),
  lastCountedAt: z.coerce.date().nullable(),
  binLocation: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  product: z.object({
    id: UuidSchema,
    sku: z.string(),
    name: z.string(),
    productType: z.string(),
    costPricePaise: z.number().nullable(),
    sellingPricePaise: z.number().nullable(),
  }).optional(),
  location: z.object({
    id: UuidSchema,
    name: z.string(),
    locationType: z.string(),
  }).optional(),
});
export type StockItemResponse = z.infer<typeof StockItemResponseSchema>;

export const StockItemListInputSchema = PaginationSchema.extend({
  locationId: UuidSchema.optional(),
  categoryId: UuidSchema.optional(),
  productType: z.string().optional(),
  lowStockOnly: z.boolean().default(false),
  search: z.string().optional(),
});
export type StockItemListInput = z.infer<typeof StockItemListInputSchema>;

// ─── StockMovement Schemas ────────────────────────────────────

export const CreateStockMovementSchema = z.object({
  stockItemId: UuidSchema,
  movementType: z.nativeEnum(MovementType),
  quantityChange: z.number().int(),
  referenceType: z.string().max(100).optional(),
  referenceId: z.string().uuid().optional(),
  notes: z.string().optional(),
  movedAt: z.coerce.date().optional(),
});
export type CreateStockMovement = z.infer<typeof CreateStockMovementSchema>;

export const StockMovementResponseSchema = z.object({
  id: UuidSchema,
  tenantId: UuidSchema,
  stockItemId: UuidSchema,
  movementType: z.nativeEnum(MovementType),
  quantityChange: z.number().int(),
  referenceType: z.string().nullable(),
  referenceId: z.string().nullable(),
  notes: z.string().nullable(),
  movedAt: z.coerce.date(),
  createdAt: z.coerce.date(),
  createdBy: z.string().nullable(),
  stockItem: z.object({
    id: UuidSchema,
    product: z.object({
      id: UuidSchema,
      sku: z.string(),
      name: z.string(),
    }).optional(),
    location: z.object({
      id: UuidSchema,
      name: z.string(),
    }).optional(),
  }).optional(),
});
export type StockMovementResponse = z.infer<typeof StockMovementResponseSchema>;

export const StockMovementListInputSchema = PaginationSchema.extend({
  stockItemId: UuidSchema.optional(),
  productId: UuidSchema.optional(),
  locationId: UuidSchema.optional(),
  movementType: z.nativeEnum(MovementType).optional(),
  dateRange: DateRangeSchema.optional(),
});
export type StockMovementListInput = z.infer<typeof StockMovementListInputSchema>;

// ─── StockTransfer Schemas ────────────────────────────────────

export const StockTransferItemInputSchema = z.object({
  productId: UuidSchema,
  quantityRequested: z.number().int().positive(),
});

export const CreateStockTransferSchema = z.object({
  fromLocationId: UuidSchema,
  toLocationId: UuidSchema,
  notes: z.string().optional(),
  items: z.array(StockTransferItemInputSchema).min(1),
});
export type CreateStockTransfer = z.infer<typeof CreateStockTransferSchema>;

export const UpdateStockTransferSchema = z.object({
  notes: z.string().optional(),
  items: z.array(StockTransferItemInputSchema).min(1).optional(),
});
export type UpdateStockTransfer = z.infer<typeof UpdateStockTransferSchema>;

export const StockTransferResponseSchema = z.object({
  id: UuidSchema,
  tenantId: UuidSchema,
  fromLocationId: UuidSchema,
  toLocationId: UuidSchema,
  status: z.nativeEnum(TransferStatus),
  requestedBy: z.string().nullable(),
  approvedBy: z.string().nullable(),
  notes: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  fromLocation: z.object({ id: UuidSchema, name: z.string() }).optional(),
  toLocation: z.object({ id: UuidSchema, name: z.string() }).optional(),
  items: z.array(z.object({
    id: UuidSchema,
    productId: UuidSchema,
    quantityRequested: z.number().int(),
    quantityShipped: z.number().int(),
    quantitySent: z.number().int(),
    quantityReceived: z.number().int(),
    product: z.object({ id: UuidSchema, sku: z.string(), name: z.string() }).optional(),
  })).optional(),
});
export type StockTransferResponse = z.infer<typeof StockTransferResponseSchema>;

export const StockTransferListInputSchema = PaginationSchema.extend({
  status: z.nativeEnum(TransferStatus).optional(),
  fromLocationId: UuidSchema.optional(),
  toLocationId: UuidSchema.optional(),
});
export type StockTransferListInput = z.infer<typeof StockTransferListInputSchema>;

// ─── StockTake Schemas ────────────────────────────────────────

export const StockTakeItemInputSchema = z.object({
  productId: UuidSchema,
  countedQuantity: z.number().int().nonnegative(),
  notes: z.string().optional(),
});
export type StockTakeItemInput = z.infer<typeof StockTakeItemInputSchema>;

export const CreateStockTakeSchema = z.object({
  locationId: UuidSchema,
  notes: z.string().optional(),
});
export type CreateStockTake = z.infer<typeof CreateStockTakeSchema>;

export const StockTakeResponseSchema = z.object({
  id: UuidSchema,
  tenantId: UuidSchema,
  locationId: UuidSchema,
  status: z.nativeEnum(StockTakeStatus),
  startedAt: z.coerce.date().nullable(),
  completedAt: z.coerce.date().nullable(),
  notes: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  location: z.object({ id: UuidSchema, name: z.string() }).optional(),
  items: z.array(z.object({
    id: UuidSchema,
    productId: UuidSchema,
    systemQuantity: z.number().int(),
    countedQuantity: z.number().int().nullable(),
    varianceQuantity: z.number().int().nullable(),
    notes: z.string().nullable(),
    product: z.object({ id: UuidSchema, sku: z.string(), name: z.string() }).optional(),
  })).optional(),
});
export type StockTakeResponse = z.infer<typeof StockTakeResponseSchema>;

export const StockTakeListInputSchema = PaginationSchema.extend({
  locationId: UuidSchema.optional(),
  status: z.nativeEnum(StockTakeStatus).optional(),
});
export type StockTakeListInput = z.infer<typeof StockTakeListInputSchema>;

// ─── MetalStock Schemas ───────────────────────────────────────

export const MetalStockInputSchema = z.object({
  locationId: UuidSchema,
  metalType: z.nativeEnum(InventoryMetalType),
  purityFineness: z.number().int().min(1).max(999),
  weightMg: z.bigint().nonnegative(),
  valuePaise: z.bigint().nonnegative(),
});
export type MetalStockInput = z.infer<typeof MetalStockInputSchema>;

export const MetalStockAdjustSchema = z.object({
  locationId: UuidSchema,
  metalType: z.nativeEnum(InventoryMetalType),
  purityFineness: z.number().int().min(1).max(999),
  weightChangeMg: z.bigint(),
  valueChangePaise: z.bigint(),
  notes: z.string().optional(),
});
export type MetalStockAdjust = z.infer<typeof MetalStockAdjustSchema>;

export const MetalStockResponseSchema = z.object({
  id: UuidSchema,
  tenantId: UuidSchema,
  locationId: UuidSchema,
  metalType: z.nativeEnum(InventoryMetalType),
  purityFineness: z.number().int(),
  weightMg: z.bigint(),
  valuePaise: z.bigint(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  location: z.object({ id: UuidSchema, name: z.string() }).optional(),
});
export type MetalStockResponse = z.infer<typeof MetalStockResponseSchema>;

// ─── StoneStock Schemas ───────────────────────────────────────

export const StoneStockInputSchema = z.object({
  locationId: UuidSchema,
  stoneType: z.string().max(100),
  shape: z.string().max(50).optional(),
  sizeRange: z.string().max(50).optional(),
  color: z.string().max(50).optional(),
  clarity: z.string().max(50).optional(),
  cutGrade: z.string().max(50).optional(),
  totalWeightCt: z.number().int().nonnegative(),
  totalPieces: z.number().int().nonnegative(),
  valuePaise: z.bigint().nonnegative(),
  certificationNumber: z.string().max(100).optional(),
});
export type StoneStockInput = z.infer<typeof StoneStockInputSchema>;

export const StoneStockAdjustSchema = z.object({
  id: UuidSchema,
  weightChangeCt: z.number().int(),
  piecesChange: z.number().int(),
  valueChangePaise: z.bigint(),
  notes: z.string().optional(),
});
export type StoneStockAdjust = z.infer<typeof StoneStockAdjustSchema>;

export const StoneStockResponseSchema = z.object({
  id: UuidSchema,
  tenantId: UuidSchema,
  locationId: UuidSchema,
  stoneType: z.string(),
  shape: z.string().nullable(),
  sizeRange: z.string().nullable(),
  color: z.string().nullable(),
  clarity: z.string().nullable(),
  cutGrade: z.string().nullable(),
  totalWeightCt: z.number().int(),
  totalPieces: z.number().int(),
  valuePaise: z.bigint(),
  certificationNumber: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  location: z.object({ id: UuidSchema, name: z.string() }).optional(),
});
export type StoneStockResponse = z.infer<typeof StoneStockResponseSchema>;

// ─── BatchLot Schemas ─────────────────────────────────────────

export const CreateBatchLotSchema = z.object({
  productId: UuidSchema,
  batchNumber: z.string().max(100),
  lotNumber: z.string().max(100).optional(),
  sourceType: z.nativeEnum(BatchSourceType),
  sourceId: z.string().uuid().optional(),
  quantityInitial: z.number().int().positive(),
  expiryDate: z.coerce.date().optional(),
  notes: z.string().optional(),
});
export type CreateBatchLot = z.infer<typeof CreateBatchLotSchema>;

export const BatchLotResponseSchema = z.object({
  id: UuidSchema,
  tenantId: UuidSchema,
  productId: UuidSchema,
  batchNumber: z.string(),
  lotNumber: z.string().nullable(),
  sourceType: z.nativeEnum(BatchSourceType),
  sourceId: z.string().nullable(),
  quantityInitial: z.number().int(),
  quantityCurrent: z.number().int(),
  expiryDate: z.coerce.date().nullable(),
  notes: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  product: z.object({ id: UuidSchema, sku: z.string(), name: z.string() }).optional(),
});
export type BatchLotResponse = z.infer<typeof BatchLotResponseSchema>;

export const BatchLotListInputSchema = PaginationSchema.extend({
  productId: UuidSchema.optional(),
});
export type BatchLotListInput = z.infer<typeof BatchLotListInputSchema>;

// ─── SerialNumber Schemas ─────────────────────────────────────

export const CreateSerialNumberSchema = z.object({
  productId: UuidSchema,
  serialNumber: z.string().max(200),
  batchLotId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
  rfidTag: z.string().max(200).optional(),
  barcodeData: z.string().max(200).optional(),
});
export type CreateSerialNumber = z.infer<typeof CreateSerialNumberSchema>;

export const UpdateSerialStatusSchema = z.object({
  id: UuidSchema,
  status: z.nativeEnum(SerialStatus),
  locationId: z.string().uuid().optional(),
});
export type UpdateSerialStatus = z.infer<typeof UpdateSerialStatusSchema>;

export const SerialNumberResponseSchema = z.object({
  id: UuidSchema,
  tenantId: UuidSchema,
  productId: UuidSchema,
  serialNumber: z.string(),
  batchLotId: z.string().nullable(),
  locationId: z.string().nullable(),
  status: z.nativeEnum(SerialStatus),
  rfidTag: z.string().nullable(),
  barcodeData: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  product: z.object({ id: UuidSchema, sku: z.string(), name: z.string() }).optional(),
  location: z.object({ id: UuidSchema, name: z.string() }).optional(),
});
export type SerialNumberResponse = z.infer<typeof SerialNumberResponseSchema>;

export const SerialNumberListInputSchema = PaginationSchema.extend({
  productId: UuidSchema.optional(),
  locationId: UuidSchema.optional(),
  status: z.nativeEnum(SerialStatus).optional(),
  search: z.string().optional(),
});
export type SerialNumberListInput = z.infer<typeof SerialNumberListInputSchema>;

// ─── Valuation Schemas ────────────────────────────────────────

export const StockValuationRequestSchema = z.object({
  method: z.nativeEnum(ValuationMethod),
  locationId: UuidSchema.optional(),
  categoryId: UuidSchema.optional(),
  currentRatePaise: z.bigint().optional(),
});
export type StockValuationRequest = z.infer<typeof StockValuationRequestSchema>;

export const StockValuationResponseSchema = z.object({
  method: z.nativeEnum(ValuationMethod),
  locationId: z.string().nullable(),
  totalValuePaise: z.bigint(),
  items: z.array(z.object({
    productId: UuidSchema,
    productName: z.string(),
    sku: z.string(),
    category: z.string().nullable(),
    quantity: z.number().int(),
    unitValuePaise: z.bigint(),
    totalValuePaise: z.bigint(),
  })),
  categoryBreakdown: z.array(z.object({
    categoryId: z.string().nullable(),
    categoryName: z.string(),
    totalValuePaise: z.bigint(),
    itemCount: z.number().int(),
  })),
  generatedAt: z.coerce.date(),
});
export type StockValuationResponse = z.infer<typeof StockValuationResponseSchema>;

// ─── Dashboard Schemas ────────────────────────────────────────

export const InventoryDashboardResponseSchema = z.object({
  totalStockValuePaise: z.bigint(),
  totalSKUs: z.number().int(),
  lowStockAlerts: z.array(z.object({
    stockItemId: UuidSchema,
    productId: UuidSchema,
    productName: z.string(),
    sku: z.string(),
    locationName: z.string(),
    quantityOnHand: z.number().int(),
    reorderLevel: z.number().int(),
  })),
  pendingTransfers: z.number().int(),
  metalBreakdown: z.array(z.object({
    metalType: z.nativeEnum(InventoryMetalType),
    purityFineness: z.number().int(),
    totalWeightMg: z.bigint(),
    totalValuePaise: z.bigint(),
  })),
  stoneBreakdown: z.array(z.object({
    stoneType: z.string(),
    totalWeightCt: z.number().int(),
    totalPieces: z.number().int(),
    totalValuePaise: z.bigint(),
  })),
  recentMovements: z.array(StockMovementResponseSchema),
});
export type InventoryDashboardResponse = z.infer<typeof InventoryDashboardResponseSchema>;
