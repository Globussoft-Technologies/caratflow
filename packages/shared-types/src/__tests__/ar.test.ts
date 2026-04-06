import { describe, it, expect } from 'vitest';
import {
  ArAssetInputSchema,
  TryOnSessionInputSchema,
  TryOnSessionEndSchema,
  Product360ConfigInputSchema,
  ArAnalyticsFilterSchema,
  ArAssetType,
  ArAssetFormat,
  ArJewelryCategory,
  ArDeviceType,
} from '../ar';

const validUuid = '550e8400-e29b-41d4-a716-446655440000';

describe('ArAssetInputSchema', () => {
  it('should parse valid AR asset', () => {
    const result = ArAssetInputSchema.safeParse({
      productId: validUuid,
      assetType: ArAssetType.AR_MODEL_3D,
      fileUrl: 'https://cdn.example.com/models/ring.glb',
      format: ArAssetFormat.GLB,
      fileSizeBytes: 2500000,
      category: ArJewelryCategory.RING,
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid asset type', () => {
    const result = ArAssetInputSchema.safeParse({
      productId: validUuid,
      assetType: 'HOLOGRAM',
      fileUrl: 'https://cdn.example.com/test.glb',
      format: ArAssetFormat.GLB,
      fileSizeBytes: 1000,
      category: ArJewelryCategory.RING,
    });
    expect(result.success).toBe(false);
  });

  it('should reject non-positive file size', () => {
    const result = ArAssetInputSchema.safeParse({
      productId: validUuid,
      assetType: ArAssetType.AR_OVERLAY_2D,
      fileUrl: 'https://cdn.example.com/overlay.png',
      format: ArAssetFormat.PNG_SEQUENCE,
      fileSizeBytes: 0,
      category: ArJewelryCategory.EARRING,
    });
    expect(result.success).toBe(false);
  });

  it('should accept optional dimensions and metadata', () => {
    const result = ArAssetInputSchema.safeParse({
      productId: validUuid,
      assetType: ArAssetType.AR_MODEL_3D,
      fileUrl: 'https://cdn.example.com/model.usdz',
      format: ArAssetFormat.USDZ,
      fileSizeBytes: 5000000,
      category: ArJewelryCategory.NECKLACE,
      dimensions: { width: 100, height: 50 },
      metadata: { scale: 1.5, offsetX: 0 },
    });
    expect(result.success).toBe(true);
  });
});

describe('TryOnSessionInputSchema', () => {
  it('should parse valid try-on session', () => {
    const result = TryOnSessionInputSchema.safeParse({
      productId: validUuid,
      deviceType: ArDeviceType.MOBILE_IOS,
    });
    expect(result.success).toBe(true);
  });

  it('should accept optional customerId', () => {
    const result = TryOnSessionInputSchema.safeParse({
      productId: validUuid,
      deviceType: ArDeviceType.DESKTOP_WEBCAM,
      customerId: validUuid,
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid device type', () => {
    const result = TryOnSessionInputSchema.safeParse({
      productId: validUuid,
      deviceType: 'TABLET',
    });
    expect(result.success).toBe(false);
  });
});

describe('TryOnSessionEndSchema', () => {
  it('should parse valid session end', () => {
    const result = TryOnSessionEndSchema.safeParse({
      sessionId: 'session-xyz',
      duration: 45,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.screenshotTaken).toBe(false);
      expect(result.data.addedToCart).toBe(false);
    }
  });

  it('should reject negative duration', () => {
    const result = TryOnSessionEndSchema.safeParse({
      sessionId: 'session-abc',
      duration: -1,
    });
    expect(result.success).toBe(false);
  });
});

describe('Product360ConfigInputSchema', () => {
  it('should parse valid 360 config', () => {
    const result = Product360ConfigInputSchema.safeParse({
      productId: validUuid,
      imageUrls: [
        'https://cdn.example.com/img1.jpg',
        'https://cdn.example.com/img2.jpg',
      ],
      frameCount: 2,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.autoRotate).toBe(true);
      expect(result.data.rotationSpeed).toBe(30);
      expect(result.data.backgroundColor).toBe('#FFFFFF');
    }
  });

  it('should reject fewer than 2 images', () => {
    const result = Product360ConfigInputSchema.safeParse({
      productId: validUuid,
      imageUrls: ['https://cdn.example.com/img1.jpg'],
      frameCount: 1,
    });
    expect(result.success).toBe(false);
  });
});

describe('ArAnalyticsFilterSchema', () => {
  it('should parse empty filter', () => {
    const result = ArAnalyticsFilterSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('should accept date range and category', () => {
    const result = ArAnalyticsFilterSchema.safeParse({
      dateFrom: '2026-01-01',
      dateTo: '2026-03-31',
      category: ArJewelryCategory.BANGLE,
    });
    expect(result.success).toBe(true);
  });
});
