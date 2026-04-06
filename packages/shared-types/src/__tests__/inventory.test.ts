import { describe, it, expect } from 'vitest';
import {
  CreateStockItemSchema,
  CreateStockMovementSchema,
  StockValuationRequestSchema,
  CreateStockTransferSchema,
  CreateBatchLotSchema,
  CreateSerialNumberSchema,
  StockItemListInputSchema,
  MovementType,
  ValuationMethod,
  BatchSourceType,
} from '../inventory';

const validUuid = '550e8400-e29b-41d4-a716-446655440000';

describe('CreateStockItemSchema', () => {
  it('should parse valid stock item with defaults', () => {
    const result = CreateStockItemSchema.safeParse({
      productId: validUuid,
      locationId: validUuid,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.quantityOnHand).toBe(0);
      expect(result.data.quantityReserved).toBe(0);
    }
  });

  it('should parse stock item with all fields', () => {
    const result = CreateStockItemSchema.safeParse({
      productId: validUuid,
      locationId: validUuid,
      quantityOnHand: 100,
      quantityReserved: 5,
      reorderLevel: 10,
      reorderQuantity: 50,
      binLocation: 'A-12-3',
    });
    expect(result.success).toBe(true);
  });

  it('should reject non-UUID productId', () => {
    const result = CreateStockItemSchema.safeParse({
      productId: 'not-a-uuid',
      locationId: validUuid,
    });
    expect(result.success).toBe(false);
  });

  it('should reject negative quantityOnHand', () => {
    const result = CreateStockItemSchema.safeParse({
      productId: validUuid,
      locationId: validUuid,
      quantityOnHand: -5,
    });
    expect(result.success).toBe(false);
  });

  it('should allow optional binLocation', () => {
    const result = CreateStockItemSchema.safeParse({
      productId: validUuid,
      locationId: validUuid,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.binLocation).toBeUndefined();
    }
  });
});

describe('CreateStockMovementSchema', () => {
  it('should parse valid stock movement', () => {
    const result = CreateStockMovementSchema.safeParse({
      stockItemId: validUuid,
      movementType: MovementType.IN,
      quantityChange: 50,
    });
    expect(result.success).toBe(true);
  });

  it('should allow negative quantityChange (outward)', () => {
    const result = CreateStockMovementSchema.safeParse({
      stockItemId: validUuid,
      movementType: MovementType.OUT,
      quantityChange: -10,
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid movement type', () => {
    const result = CreateStockMovementSchema.safeParse({
      stockItemId: validUuid,
      movementType: 'INVALID',
      quantityChange: 10,
    });
    expect(result.success).toBe(false);
  });

  it('should allow optional fields', () => {
    const result = CreateStockMovementSchema.safeParse({
      stockItemId: validUuid,
      movementType: MovementType.ADJUST,
      quantityChange: 5,
      notes: 'Audit adjustment',
    });
    expect(result.success).toBe(true);
  });
});

describe('StockValuationRequestSchema', () => {
  it('should parse valid valuation request', () => {
    const result = StockValuationRequestSchema.safeParse({
      method: ValuationMethod.FIFO,
    });
    expect(result.success).toBe(true);
  });

  it('should accept optional locationId', () => {
    const result = StockValuationRequestSchema.safeParse({
      method: ValuationMethod.AVG,
      locationId: validUuid,
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid valuation method', () => {
    const result = StockValuationRequestSchema.safeParse({
      method: 'INVALID_METHOD',
    });
    expect(result.success).toBe(false);
  });
});

describe('CreateStockTransferSchema', () => {
  it('should parse valid transfer with items', () => {
    const result = CreateStockTransferSchema.safeParse({
      fromLocationId: validUuid,
      toLocationId: validUuid,
      items: [{ productId: validUuid, quantityRequested: 10 }],
    });
    expect(result.success).toBe(true);
  });

  it('should reject empty items array', () => {
    const result = CreateStockTransferSchema.safeParse({
      fromLocationId: validUuid,
      toLocationId: validUuid,
      items: [],
    });
    expect(result.success).toBe(false);
  });

  it('should reject items with non-positive quantity', () => {
    const result = CreateStockTransferSchema.safeParse({
      fromLocationId: validUuid,
      toLocationId: validUuid,
      items: [{ productId: validUuid, quantityRequested: 0 }],
    });
    expect(result.success).toBe(false);
  });
});

describe('CreateBatchLotSchema', () => {
  it('should parse valid batch lot', () => {
    const result = CreateBatchLotSchema.safeParse({
      productId: validUuid,
      batchNumber: 'BATCH-001',
      sourceType: BatchSourceType.PURCHASE,
      quantityInitial: 100,
    });
    expect(result.success).toBe(true);
  });

  it('should reject zero quantityInitial', () => {
    const result = CreateBatchLotSchema.safeParse({
      productId: validUuid,
      batchNumber: 'BATCH-001',
      sourceType: BatchSourceType.PRODUCTION,
      quantityInitial: 0,
    });
    expect(result.success).toBe(false);
  });
});

describe('CreateSerialNumberSchema', () => {
  it('should parse valid serial number', () => {
    const result = CreateSerialNumberSchema.safeParse({
      productId: validUuid,
      serialNumber: 'SN-12345',
    });
    expect(result.success).toBe(true);
  });

  it('should accept optional rfidTag and barcodeData', () => {
    const result = CreateSerialNumberSchema.safeParse({
      productId: validUuid,
      serialNumber: 'SN-12345',
      rfidTag: 'RFID-001',
      barcodeData: 'BC-001',
    });
    expect(result.success).toBe(true);
  });
});

describe('StockItemListInputSchema', () => {
  it('should parse with defaults from PaginationSchema', () => {
    const result = StockItemListInputSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.lowStockOnly).toBe(false);
    }
  });

  it('should accept filter parameters', () => {
    const result = StockItemListInputSchema.safeParse({
      locationId: validUuid,
      productType: 'GOLD',
      lowStockOnly: true,
      search: 'ring',
    });
    expect(result.success).toBe(true);
  });
});
