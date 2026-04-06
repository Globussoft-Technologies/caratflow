import { describe, it, expect } from 'vitest';
import {
  ProductListInputSchema,
  CartItemInputSchema,
  UpdateCartItemInputSchema,
  CheckoutInputSchema,
  ReviewInputSchema,
  ReviewListInputSchema,
  AddressInputSchema,
  WishlistInputSchema,
  CouponValidationInputSchema,
  CouponCodeInputSchema,
  ProductCompareInputSchema,
  ReturnRequestInputSchema,
  PriceAlertInputSchema,
} from '../storefront';

const validUuid = '550e8400-e29b-41d4-a716-446655440000';

describe('ProductListInputSchema', () => {
  it('should parse with pagination defaults', () => {
    const result = ProductListInputSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(20);
    }
  });

  it('should accept product type filter', () => {
    const result = ProductListInputSchema.safeParse({
      productType: 'GOLD',
      metalPurity: 916,
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid product type', () => {
    const result = ProductListInputSchema.safeParse({
      productType: 'BRONZE',
    });
    expect(result.success).toBe(false);
  });

  it('should accept price range filters', () => {
    const result = ProductListInputSchema.safeParse({
      priceMinPaise: 100000,
      priceMaxPaise: 5000000,
    });
    expect(result.success).toBe(true);
  });
});

describe('CartItemInputSchema', () => {
  it('should parse valid cart item with default quantity', () => {
    const result = CartItemInputSchema.safeParse({
      productId: validUuid,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.quantity).toBe(1);
    }
  });

  it('should reject quantity less than 1', () => {
    const result = CartItemInputSchema.safeParse({
      productId: validUuid,
      quantity: 0,
    });
    expect(result.success).toBe(false);
  });
});

describe('UpdateCartItemInputSchema', () => {
  it('should parse valid update', () => {
    const result = UpdateCartItemInputSchema.safeParse({ quantity: 3 });
    expect(result.success).toBe(true);
  });
});

describe('CheckoutInputSchema', () => {
  it('should parse valid checkout', () => {
    const result = CheckoutInputSchema.safeParse({
      cartId: validUuid,
      addressId: validUuid,
      paymentMethod: 'UPI',
    });
    expect(result.success).toBe(true);
  });

  it('should reject empty payment method', () => {
    const result = CheckoutInputSchema.safeParse({
      cartId: validUuid,
      addressId: validUuid,
      paymentMethod: '',
    });
    expect(result.success).toBe(false);
  });

  it('should accept optional couponCode', () => {
    const result = CheckoutInputSchema.safeParse({
      cartId: validUuid,
      addressId: validUuid,
      paymentMethod: 'CARD',
      couponCode: 'DIWALI20',
    });
    expect(result.success).toBe(true);
  });
});

describe('ReviewInputSchema', () => {
  it('should parse valid review', () => {
    const result = ReviewInputSchema.safeParse({
      productId: validUuid,
      rating: 4,
    });
    expect(result.success).toBe(true);
  });

  it('should reject rating outside 1-5', () => {
    expect(ReviewInputSchema.safeParse({ productId: validUuid, rating: 0 }).success).toBe(false);
    expect(ReviewInputSchema.safeParse({ productId: validUuid, rating: 6 }).success).toBe(false);
  });

  it('should accept optional images', () => {
    const result = ReviewInputSchema.safeParse({
      productId: validUuid,
      rating: 5,
      title: 'Beautiful ring',
      body: 'Love the craftsmanship',
      images: ['https://example.com/img1.jpg'],
    });
    expect(result.success).toBe(true);
  });

  it('should reject more than 5 images', () => {
    const result = ReviewInputSchema.safeParse({
      productId: validUuid,
      rating: 5,
      images: Array(6).fill('https://example.com/img.jpg'),
    });
    expect(result.success).toBe(false);
  });
});

describe('AddressInputSchema', () => {
  it('should parse valid address', () => {
    const result = AddressInputSchema.safeParse({
      firstName: 'Priya',
      lastName: 'Patel',
      phone: '9876543210',
      addressLine1: '123 MG Road',
      city: 'Mumbai',
      state: 'Maharashtra',
      country: 'IN',
      postalCode: '400001',
    });
    expect(result.success).toBe(true);
  });

  it('should reject country code not length 2', () => {
    const result = AddressInputSchema.safeParse({
      firstName: 'Test',
      lastName: 'User',
      phone: '123',
      addressLine1: 'St',
      city: 'City',
      state: 'State',
      country: 'IND',
      postalCode: '12345',
    });
    expect(result.success).toBe(false);
  });
});

describe('WishlistInputSchema', () => {
  it('should parse valid wishlist input', () => {
    const result = WishlistInputSchema.safeParse({ productId: validUuid });
    expect(result.success).toBe(true);
  });
});

describe('CouponCodeInputSchema', () => {
  it('should parse valid coupon code', () => {
    const result = CouponCodeInputSchema.safeParse({
      code: 'DIWALI20',
      discountType: 'PERCENTAGE',
      discountValue: 2000,
      usageLimit: 100,
      validFrom: '2026-10-01',
      validTo: '2026-10-31',
    });
    expect(result.success).toBe(true);
  });
});

describe('ProductCompareInputSchema', () => {
  it('should parse valid compare input with 2 products', () => {
    const result = ProductCompareInputSchema.safeParse({
      productIds: [validUuid, validUuid],
    });
    expect(result.success).toBe(true);
  });

  it('should reject fewer than 2 products', () => {
    const result = ProductCompareInputSchema.safeParse({
      productIds: [validUuid],
    });
    expect(result.success).toBe(false);
  });

  it('should reject more than 4 products', () => {
    const result = ProductCompareInputSchema.safeParse({
      productIds: Array(5).fill(validUuid),
    });
    expect(result.success).toBe(false);
  });
});

describe('ReturnRequestInputSchema', () => {
  it('should parse valid return request', () => {
    const result = ReturnRequestInputSchema.safeParse({
      items: [{ orderItemId: validUuid, quantity: 1, reason: 'Defective' }],
      reason: 'Product had a defect',
    });
    expect(result.success).toBe(true);
  });

  it('should reject empty items', () => {
    const result = ReturnRequestInputSchema.safeParse({
      items: [],
      reason: 'Test',
    });
    expect(result.success).toBe(false);
  });
});

describe('PriceAlertInputSchema', () => {
  it('should parse valid price alert', () => {
    const result = PriceAlertInputSchema.safeParse({
      productId: validUuid,
      targetPricePaise: 3000000,
    });
    expect(result.success).toBe(true);
  });
});
