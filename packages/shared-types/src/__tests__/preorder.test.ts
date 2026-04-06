import { describe, it, expect } from 'vitest';
import {
  CreatePreOrderInputSchema,
  RequestModificationInputSchema,
  PreOrderConfigInputSchema,
  BulkPreOrderConfigInputSchema,
  ReviewModificationInputSchema,
  PreOrderType,
  ModificationType,
} from '../preorder';

const validUuid = '550e8400-e29b-41d4-a716-446655440000';

describe('CreatePreOrderInputSchema', () => {
  it('should parse valid pre-order with defaults', () => {
    const result = CreatePreOrderInputSchema.safeParse({
      customerId: validUuid,
      productId: validUuid,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.quantity).toBe(1);
      expect(result.data.orderType).toBe(PreOrderType.PRE_ORDER);
      expect(result.data.isPriceLocked).toBe(false);
    }
  });

  it('should accept made-to-order type', () => {
    const result = CreatePreOrderInputSchema.safeParse({
      customerId: validUuid,
      productId: validUuid,
      orderType: PreOrderType.MADE_TO_ORDER,
      quantity: 2,
      notes: 'Custom size 16',
    });
    expect(result.success).toBe(true);
  });

  it('should reject non-positive quantity', () => {
    const result = CreatePreOrderInputSchema.safeParse({
      customerId: validUuid,
      productId: validUuid,
      quantity: 0,
    });
    expect(result.success).toBe(false);
  });

  it('should reject invalid order type', () => {
    const result = CreatePreOrderInputSchema.safeParse({
      customerId: validUuid,
      productId: validUuid,
      orderType: 'RESERVATION',
    });
    expect(result.success).toBe(false);
  });
});

describe('RequestModificationInputSchema', () => {
  it('should parse valid modification request', () => {
    const result = RequestModificationInputSchema.safeParse({
      orderId: validUuid,
      customerId: validUuid,
      modificationType: ModificationType.ADDRESS_CHANGE,
      requestedData: { newAddress: '456 New Street' },
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid modification type', () => {
    const result = RequestModificationInputSchema.safeParse({
      orderId: validUuid,
      customerId: validUuid,
      modificationType: 'CHANGE_PAYMENT',
      requestedData: {},
    });
    expect(result.success).toBe(false);
  });

  it('should accept optional reason', () => {
    const result = RequestModificationInputSchema.safeParse({
      orderId: validUuid,
      customerId: validUuid,
      modificationType: ModificationType.SIZE_CHANGE,
      requestedData: { newSize: '16' },
      reason: 'Wrong size selected',
    });
    expect(result.success).toBe(true);
  });
});

describe('PreOrderConfigInputSchema', () => {
  it('should parse valid config', () => {
    const result = PreOrderConfigInputSchema.safeParse({
      productId: validUuid,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isPreOrderEnabled).toBe(false);
      expect(result.data.depositPercentage).toBe(0);
      expect(result.data.estimatedLeadDays).toBe(14);
    }
  });

  it('should reject deposit percentage above 100', () => {
    const result = PreOrderConfigInputSchema.safeParse({
      productId: validUuid,
      depositPercentage: 101,
    });
    expect(result.success).toBe(false);
  });
});

describe('BulkPreOrderConfigInputSchema', () => {
  it('should parse valid bulk config', () => {
    const result = BulkPreOrderConfigInputSchema.safeParse({
      productIds: [validUuid],
      config: { isPreOrderEnabled: true },
    });
    expect(result.success).toBe(true);
  });

  it('should reject empty productIds', () => {
    const result = BulkPreOrderConfigInputSchema.safeParse({
      productIds: [],
      config: {},
    });
    expect(result.success).toBe(false);
  });
});

describe('ReviewModificationInputSchema', () => {
  it('should parse valid review', () => {
    const result = ReviewModificationInputSchema.safeParse({
      requestId: validUuid,
      approved: true,
    });
    expect(result.success).toBe(true);
  });

  it('should parse rejection with reason', () => {
    const result = ReviewModificationInputSchema.safeParse({
      requestId: validUuid,
      approved: false,
      reason: 'Order already shipped',
    });
    expect(result.success).toBe(true);
  });
});
