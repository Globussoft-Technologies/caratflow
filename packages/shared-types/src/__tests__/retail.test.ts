import { describe, it, expect } from 'vitest';
import {
  SaleInputSchema,
  SaleLineItemInputSchema,
  SaleReturnInputSchema,
  SaleReturnItemInputSchema,
  SalePaymentInputSchema,
  RepairOrderInputSchema,
  CustomOrderInputSchema,
  LayawayInputSchema,
  OldGoldInputSchema,
  GiftCardInputSchema,
  DiscountInputSchema,
  SalePaymentMethod,
  SaleDiscountType,
  RetailDiscountType,
} from '../retail';

const validUuid = '550e8400-e29b-41d4-a716-446655440000';

describe('SaleLineItemInputSchema', () => {
  it('should parse valid line item with defaults', () => {
    const result = SaleLineItemInputSchema.safeParse({
      description: '22K Gold Ring',
      unitPricePaise: 5000000,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.quantity).toBe(1);
      expect(result.data.discountPaise).toBe(0);
      expect(result.data.hsnCode).toBe('7113');
      expect(result.data.gstRate).toBe(300);
    }
  });

  it('should reject empty description', () => {
    const result = SaleLineItemInputSchema.safeParse({
      description: '',
      unitPricePaise: 5000000,
    });
    expect(result.success).toBe(false);
  });

  it('should reject negative unitPricePaise', () => {
    const result = SaleLineItemInputSchema.safeParse({
      description: 'Test',
      unitPricePaise: -100,
    });
    expect(result.success).toBe(false);
  });
});

describe('SalePaymentInputSchema', () => {
  it('should parse valid payment', () => {
    const result = SalePaymentInputSchema.safeParse({
      method: SalePaymentMethod.CASH,
      amountPaise: 5000000,
    });
    expect(result.success).toBe(true);
  });

  it('should reject zero amountPaise', () => {
    const result = SalePaymentInputSchema.safeParse({
      method: SalePaymentMethod.UPI,
      amountPaise: 0,
    });
    expect(result.success).toBe(false);
  });

  it('should reject invalid payment method', () => {
    const result = SalePaymentInputSchema.safeParse({
      method: 'BITCOIN',
      amountPaise: 100,
    });
    expect(result.success).toBe(false);
  });
});

describe('SaleInputSchema', () => {
  const validLineItem = {
    description: '22K Gold Ring',
    unitPricePaise: 5000000,
  };
  const validPayment = {
    method: SalePaymentMethod.CASH,
    amountPaise: 5000000,
  };

  it('should parse valid sale', () => {
    const result = SaleInputSchema.safeParse({
      locationId: validUuid,
      lineItems: [validLineItem],
      payments: [validPayment],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.currencyCode).toBe('INR');
    }
  });

  it('should reject empty lineItems', () => {
    const result = SaleInputSchema.safeParse({
      locationId: validUuid,
      lineItems: [],
      payments: [validPayment],
    });
    expect(result.success).toBe(false);
  });

  it('should reject empty payments', () => {
    const result = SaleInputSchema.safeParse({
      locationId: validUuid,
      lineItems: [validLineItem],
      payments: [],
    });
    expect(result.success).toBe(false);
  });

  it('should allow optional customerId', () => {
    const result = SaleInputSchema.safeParse({
      locationId: validUuid,
      lineItems: [validLineItem],
      payments: [validPayment],
      customerId: validUuid,
    });
    expect(result.success).toBe(true);
  });
});

describe('SaleReturnInputSchema', () => {
  it('should parse valid return', () => {
    const result = SaleReturnInputSchema.safeParse({
      originalSaleId: validUuid,
      locationId: validUuid,
      items: [{
        originalLineItemId: validUuid,
        returnPricePaise: 500000,
      }],
    });
    expect(result.success).toBe(true);
  });

  it('should reject empty items', () => {
    const result = SaleReturnInputSchema.safeParse({
      originalSaleId: validUuid,
      locationId: validUuid,
      items: [],
    });
    expect(result.success).toBe(false);
  });
});

describe('RepairOrderInputSchema', () => {
  it('should parse valid repair order', () => {
    const result = RepairOrderInputSchema.safeParse({
      customerId: validUuid,
      locationId: validUuid,
      itemDescription: 'Broken clasp on gold chain',
    });
    expect(result.success).toBe(true);
  });

  it('should reject empty itemDescription', () => {
    const result = RepairOrderInputSchema.safeParse({
      customerId: validUuid,
      locationId: validUuid,
      itemDescription: '',
    });
    expect(result.success).toBe(false);
  });
});

describe('CustomOrderInputSchema', () => {
  it('should parse valid custom order', () => {
    const result = CustomOrderInputSchema.safeParse({
      customerId: validUuid,
      locationId: validUuid,
      description: 'Custom engagement ring with 0.5ct diamond',
    });
    expect(result.success).toBe(true);
  });
});

describe('LayawayInputSchema', () => {
  it('should parse valid layaway', () => {
    const result = LayawayInputSchema.safeParse({
      saleId: validUuid,
      customerId: validUuid,
      totalPaise: 10000000,
      installmentCount: 6,
    });
    expect(result.success).toBe(true);
  });

  it('should reject installmentCount less than 2', () => {
    const result = LayawayInputSchema.safeParse({
      saleId: validUuid,
      customerId: validUuid,
      totalPaise: 10000000,
      installmentCount: 1,
    });
    expect(result.success).toBe(false);
  });
});

describe('OldGoldInputSchema', () => {
  it('should parse valid old gold purchase', () => {
    const result = OldGoldInputSchema.safeParse({
      locationId: validUuid,
      metalType: 'GOLD',
      grossWeightMg: 10000,
      netWeightMg: 9500,
      purityFineness: 916,
      ratePaisePer10g: 6500000,
    });
    expect(result.success).toBe(true);
  });

  it('should reject zero netWeightMg', () => {
    const result = OldGoldInputSchema.safeParse({
      locationId: validUuid,
      metalType: 'GOLD',
      grossWeightMg: 10000,
      netWeightMg: 0,
      purityFineness: 916,
      ratePaisePer10g: 6500000,
    });
    expect(result.success).toBe(false);
  });
});

describe('GiftCardInputSchema', () => {
  it('should parse valid gift card', () => {
    const result = GiftCardInputSchema.safeParse({
      initialValuePaise: 500000,
    });
    expect(result.success).toBe(true);
  });

  it('should reject zero value', () => {
    const result = GiftCardInputSchema.safeParse({
      initialValuePaise: 0,
    });
    expect(result.success).toBe(false);
  });
});

describe('DiscountInputSchema', () => {
  it('should parse valid discount', () => {
    const result = DiscountInputSchema.safeParse({
      name: 'Diwali Sale',
      discountType: RetailDiscountType.PERCENTAGE,
      value: 10,
      startDate: '2026-10-01',
      endDate: '2026-10-31',
    });
    expect(result.success).toBe(true);
  });

  it('should reject missing startDate', () => {
    const result = DiscountInputSchema.safeParse({
      name: 'Test',
      discountType: RetailDiscountType.FIXED,
      value: 1000,
      endDate: '2026-10-31',
    });
    expect(result.success).toBe(false);
  });
});
