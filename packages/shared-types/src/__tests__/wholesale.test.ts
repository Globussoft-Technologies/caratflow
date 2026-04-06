import { describe, it, expect } from 'vitest';
import {
  PurchaseOrderInputSchema,
  PurchaseOrderItemInputSchema,
  ConsignmentOutInputSchema,
  ConsignmentInInputSchema,
  AgentBrokerInputSchema,
  CommissionInputSchema,
  CreditLimitInputSchema,
  RateContractInputSchema,
  GoodsReceiptInputSchema,
  WholesaleCommissionType,
  WholesaleCommissionRefType,
  WholesaleCreditEntityType,
} from '../wholesale';

const validUuid = '550e8400-e29b-41d4-a716-446655440000';

describe('PurchaseOrderItemInputSchema', () => {
  it('should parse valid PO item', () => {
    const result = PurchaseOrderItemInputSchema.safeParse({
      description: '22K Gold Chain',
      quantity: 10,
      unitPricePaise: 500000,
    });
    expect(result.success).toBe(true);
  });

  it('should reject non-positive quantity', () => {
    const result = PurchaseOrderItemInputSchema.safeParse({
      description: 'Test',
      quantity: 0,
      unitPricePaise: 100,
    });
    expect(result.success).toBe(false);
  });
});

describe('PurchaseOrderInputSchema', () => {
  it('should parse valid purchase order', () => {
    const result = PurchaseOrderInputSchema.safeParse({
      supplierId: validUuid,
      locationId: validUuid,
      items: [{ description: 'Gold Bar', quantity: 5, unitPricePaise: 10000000 }],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.currencyCode).toBe('INR');
    }
  });

  it('should reject empty items', () => {
    const result = PurchaseOrderInputSchema.safeParse({
      supplierId: validUuid,
      locationId: validUuid,
      items: [],
    });
    expect(result.success).toBe(false);
  });

  it('should reject missing supplierId', () => {
    const result = PurchaseOrderInputSchema.safeParse({
      locationId: validUuid,
      items: [{ description: 'Test', quantity: 1, unitPricePaise: 100 }],
    });
    expect(result.success).toBe(false);
  });
});

describe('ConsignmentOutInputSchema', () => {
  it('should parse valid consignment out', () => {
    const result = ConsignmentOutInputSchema.safeParse({
      customerId: validUuid,
      locationId: validUuid,
      items: [{ productId: validUuid, quantity: 5, weightMg: 50000, valuePaise: 5000000 }],
    });
    expect(result.success).toBe(true);
  });

  it('should reject empty items', () => {
    const result = ConsignmentOutInputSchema.safeParse({
      customerId: validUuid,
      locationId: validUuid,
      items: [],
    });
    expect(result.success).toBe(false);
  });
});

describe('ConsignmentInInputSchema', () => {
  it('should parse valid consignment in', () => {
    const result = ConsignmentInInputSchema.safeParse({
      supplierId: validUuid,
      locationId: validUuid,
      items: [{ productId: validUuid, quantity: 3, weightMg: 30000, valuePaise: 3000000 }],
    });
    expect(result.success).toBe(true);
  });
});

describe('AgentBrokerInputSchema', () => {
  it('should parse valid agent/broker', () => {
    const result = AgentBrokerInputSchema.safeParse({
      name: 'Ramesh Broker',
      commissionType: WholesaleCommissionType.PERCENTAGE,
      commissionRate: 200,
    });
    expect(result.success).toBe(true);
  });

  it('should accept optional email', () => {
    const result = AgentBrokerInputSchema.safeParse({
      name: 'Test Agent',
      commissionType: WholesaleCommissionType.FIXED_PER_PIECE,
      commissionRate: 50000,
      email: 'agent@example.com',
    });
    expect(result.success).toBe(true);
  });
});

describe('CommissionInputSchema', () => {
  it('should parse valid commission', () => {
    const result = CommissionInputSchema.safeParse({
      agentBrokerId: validUuid,
      referenceType: WholesaleCommissionRefType.SALE,
      referenceId: validUuid,
      amountPaise: 50000,
    });
    expect(result.success).toBe(true);
  });
});

describe('CreditLimitInputSchema', () => {
  it('should parse valid credit limit', () => {
    const result = CreditLimitInputSchema.safeParse({
      entityType: WholesaleCreditEntityType.CUSTOMER,
      entityId: validUuid,
      creditLimitPaise: 100000000,
    });
    expect(result.success).toBe(true);
  });
});

describe('RateContractInputSchema', () => {
  it('should parse valid rate contract', () => {
    const result = RateContractInputSchema.safeParse({
      supplierId: validUuid,
      validFrom: '2026-01-01',
      validTo: '2026-12-31',
    });
    expect(result.success).toBe(true);
  });
});

describe('GoodsReceiptInputSchema', () => {
  it('should parse valid goods receipt', () => {
    const result = GoodsReceiptInputSchema.safeParse({
      purchaseOrderId: validUuid,
      items: [{ productId: validUuid, receivedQuantity: 10, weightMg: 100000 }],
    });
    expect(result.success).toBe(true);
  });

  it('should reject empty items', () => {
    const result = GoodsReceiptInputSchema.safeParse({
      purchaseOrderId: validUuid,
      items: [],
    });
    expect(result.success).toBe(false);
  });
});
