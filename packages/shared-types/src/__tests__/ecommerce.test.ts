import { describe, it, expect } from 'vitest';
import {
  SalesChannelInputSchema,
  OnlineOrderInputSchema,
  ShipmentInputSchema,
  CatalogSyncInputSchema,
  OnlinePaymentInputSchema,
  ClickAndCollectInputSchema,
  ProductReviewInputSchema,
  SalesChannelType,
  OnlineOrderStatus,
} from '../ecommerce';

const validUuid = '550e8400-e29b-41d4-a716-446655440000';

describe('SalesChannelInputSchema', () => {
  it('should parse valid sales channel', () => {
    const result = SalesChannelInputSchema.safeParse({
      name: 'Shopify Store',
      channelType: SalesChannelType.SHOPIFY,
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid channel type', () => {
    const result = SalesChannelInputSchema.safeParse({
      name: 'Test',
      channelType: 'EBAY',
    });
    expect(result.success).toBe(false);
  });

  it('should accept optional storeUrl with valid URL', () => {
    const result = SalesChannelInputSchema.safeParse({
      name: 'Website',
      channelType: SalesChannelType.WEBSITE,
      storeUrl: 'https://shop.example.com',
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid storeUrl', () => {
    const result = SalesChannelInputSchema.safeParse({
      name: 'Website',
      channelType: SalesChannelType.WEBSITE,
      storeUrl: 'not-a-url',
    });
    expect(result.success).toBe(false);
  });
});

describe('OnlineOrderInputSchema', () => {
  it('should parse valid online order', () => {
    const result = OnlineOrderInputSchema.safeParse({
      channelId: validUuid,
      subtotalPaise: 5000000,
      totalPaise: 5150000,
      items: [{ title: '22K Gold Ring', quantity: 1, unitPricePaise: 5000000, totalPaise: 5000000 }],
    });
    expect(result.success).toBe(true);
  });

  it('should reject empty items', () => {
    const result = OnlineOrderInputSchema.safeParse({
      channelId: validUuid,
      subtotalPaise: 100,
      totalPaise: 100,
      items: [],
    });
    expect(result.success).toBe(false);
  });

  it('should accept optional shipping address', () => {
    const result = OnlineOrderInputSchema.safeParse({
      channelId: validUuid,
      subtotalPaise: 100,
      totalPaise: 100,
      items: [{ title: 'Test', quantity: 1, unitPricePaise: 100, totalPaise: 100 }],
      shippingAddress: {
        line1: '123 Main St',
        city: 'Mumbai',
        state: 'MH',
        country: 'IN',
        postalCode: '400001',
      },
    });
    expect(result.success).toBe(true);
  });
});

describe('ShipmentInputSchema', () => {
  it('should parse valid shipment', () => {
    const result = ShipmentInputSchema.safeParse({
      orderId: validUuid,
    });
    expect(result.success).toBe(true);
  });

  it('should accept optional tracking fields', () => {
    const result = ShipmentInputSchema.safeParse({
      orderId: validUuid,
      carrier: 'BlueDart',
      trackingNumber: 'BD123456',
      trackingUrl: 'https://tracking.bluedart.com/BD123456',
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid tracking URL', () => {
    const result = ShipmentInputSchema.safeParse({
      orderId: validUuid,
      trackingUrl: 'not-a-url',
    });
    expect(result.success).toBe(false);
  });
});

describe('CatalogSyncInputSchema', () => {
  it('should parse valid catalog sync input', () => {
    const result = CatalogSyncInputSchema.safeParse({
      productId: validUuid,
      channelId: validUuid,
      title: '22K Gold Necklace',
      pricePaise: 15000000,
    });
    expect(result.success).toBe(true);
  });
});

describe('OnlinePaymentInputSchema', () => {
  it('should parse valid online payment', () => {
    const result = OnlinePaymentInputSchema.safeParse({
      orderId: validUuid,
      gatewayId: validUuid,
      amountPaise: 5000000,
    });
    expect(result.success).toBe(true);
  });

  it('should reject zero amount', () => {
    const result = OnlinePaymentInputSchema.safeParse({
      orderId: validUuid,
      gatewayId: validUuid,
      amountPaise: 0,
    });
    expect(result.success).toBe(false);
  });
});

describe('ProductReviewInputSchema', () => {
  it('should parse valid review', () => {
    const result = ProductReviewInputSchema.safeParse({
      productId: validUuid,
      customerName: 'Rahul Sharma',
      rating: 5,
    });
    expect(result.success).toBe(true);
  });

  it('should reject rating outside 1-5', () => {
    expect(ProductReviewInputSchema.safeParse({
      productId: validUuid,
      customerName: 'Test',
      rating: 0,
    }).success).toBe(false);

    expect(ProductReviewInputSchema.safeParse({
      productId: validUuid,
      customerName: 'Test',
      rating: 6,
    }).success).toBe(false);
  });
});
