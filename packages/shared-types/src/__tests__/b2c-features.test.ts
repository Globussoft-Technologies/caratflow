import { describe, it, expect } from 'vitest';
import {
  CouponCodeInputSchema,
  CouponCodeUpdateSchema,
  ValidateCouponInputSchema,
  AddToWishlistInputSchema,
  PriceAlertInputSchema,
  AddToCompareInputSchema,
  BulkCouponGenerateInputSchema,
  AbandonedCartItemSchema,
  BackInStockSubscribeInputSchema,
} from '../b2c-features';

const validUuid = '550e8400-e29b-41d4-a716-446655440000';

describe('CouponCodeInputSchema (b2c-features)', () => {
  it('should parse valid coupon code', () => {
    const result = CouponCodeInputSchema.safeParse({
      code: 'WELCOME10',
      discountType: 'PERCENTAGE',
      discountValue: 1000,
      validFrom: '2026-01-01',
      validTo: '2026-12-31',
    });
    expect(result.success).toBe(true);
  });

  it('should transform code to uppercase', () => {
    const result = CouponCodeInputSchema.safeParse({
      code: 'summer20',
      discountType: 'FIXED_AMOUNT',
      discountValue: 50000,
      validFrom: '2026-06-01',
      validTo: '2026-08-31',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.code).toBe('SUMMER20');
    }
  });

  it('should reject code shorter than 3 chars', () => {
    const result = CouponCodeInputSchema.safeParse({
      code: 'AB',
      discountType: 'PERCENTAGE',
      discountValue: 100,
      validFrom: '2026-01-01',
      validTo: '2026-12-31',
    });
    expect(result.success).toBe(false);
  });

  it('should reject invalid discount type', () => {
    const result = CouponCodeInputSchema.safeParse({
      code: 'TEST',
      discountType: 'BOGO',
      discountValue: 100,
      validFrom: '2026-01-01',
      validTo: '2026-12-31',
    });
    expect(result.success).toBe(false);
  });

  it('should set defaults for boolean fields', () => {
    const result = CouponCodeInputSchema.safeParse({
      code: 'NEWYEAR',
      discountType: 'FREE_SHIPPING',
      discountValue: 1,
      validFrom: '2026-01-01',
      validTo: '2026-01-31',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isActive).toBe(true);
      expect(result.data.isFirstOrderOnly).toBe(false);
      expect(result.data.isAutoApply).toBe(false);
      expect(result.data.usageLimitPerCustomer).toBe(1);
    }
  });
});

describe('ValidateCouponInputSchema', () => {
  it('should parse valid coupon validation', () => {
    const result = ValidateCouponInputSchema.safeParse({
      code: 'DIWALI20',
      cartTotalPaise: 5000000,
      cartItems: [
        { productId: validUuid, pricePaise: 5000000, quantity: 1 },
      ],
    });
    expect(result.success).toBe(true);
  });
});

describe('AddToWishlistInputSchema', () => {
  it('should parse valid wishlist add', () => {
    const result = AddToWishlistInputSchema.safeParse({
      productId: validUuid,
    });
    expect(result.success).toBe(true);
  });

  it('should reject non-UUID', () => {
    const result = AddToWishlistInputSchema.safeParse({
      productId: 'not-uuid',
    });
    expect(result.success).toBe(false);
  });
});

describe('PriceAlertInputSchema (b2c-features)', () => {
  it('should parse valid price alert', () => {
    const result = PriceAlertInputSchema.safeParse({
      productId: validUuid,
      thresholdPaise: 3000000,
    });
    expect(result.success).toBe(true);
  });

  it('should reject non-positive threshold', () => {
    const result = PriceAlertInputSchema.safeParse({
      productId: validUuid,
      thresholdPaise: 0,
    });
    expect(result.success).toBe(false);
  });
});

describe('AddToCompareInputSchema', () => {
  it('should parse valid compare input', () => {
    const result = AddToCompareInputSchema.safeParse({
      productId: validUuid,
    });
    expect(result.success).toBe(true);
  });
});

describe('BulkCouponGenerateInputSchema', () => {
  it('should parse valid bulk generation', () => {
    const result = BulkCouponGenerateInputSchema.safeParse({
      prefix: 'FEST',
      count: 100,
      discountType: 'PERCENTAGE',
      discountValue: 1000,
      validFrom: '2026-10-01',
      validTo: '2026-10-31',
    });
    expect(result.success).toBe(true);
  });

  it('should reject count above 10000', () => {
    const result = BulkCouponGenerateInputSchema.safeParse({
      prefix: 'TEST',
      count: 10001,
      discountType: 'FIXED_AMOUNT',
      discountValue: 100,
      validFrom: '2026-01-01',
      validTo: '2026-12-31',
    });
    expect(result.success).toBe(false);
  });
});

describe('AbandonedCartItemSchema', () => {
  it('should parse valid abandoned cart item', () => {
    const result = AbandonedCartItemSchema.safeParse({
      productId: validUuid,
      productName: 'Gold Ring',
      sku: 'GR-001',
      pricePaise: 5000000,
      quantity: 1,
    });
    expect(result.success).toBe(true);
  });
});

describe('BackInStockSubscribeInputSchema', () => {
  it('should parse valid subscription', () => {
    const result = BackInStockSubscribeInputSchema.safeParse({
      productId: validUuid,
      email: 'user@example.com',
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid email', () => {
    const result = BackInStockSubscribeInputSchema.safeParse({
      productId: validUuid,
      email: 'not-email',
    });
    expect(result.success).toBe(false);
  });
});
