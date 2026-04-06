import { describe, it, expect } from 'vitest';
import {
  RecommendationRequestSchema,
  TrackViewInputSchema,
  TrackClickInputSchema,
  RecommendationContext,
} from '../recommendations';

const validUuid = '550e8400-e29b-41d4-a716-446655440000';

describe('RecommendationRequestSchema', () => {
  it('should parse valid recommendation request', () => {
    const result = RecommendationRequestSchema.safeParse({
      sessionId: 'sess-abc-123',
      context: RecommendationContext.HOME,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(12);
    }
  });

  it('should accept optional customerId and productId', () => {
    const result = RecommendationRequestSchema.safeParse({
      customerId: validUuid,
      sessionId: 'sess-abc',
      context: RecommendationContext.PRODUCT_PAGE,
      productId: validUuid,
      limit: 6,
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid context', () => {
    const result = RecommendationRequestSchema.safeParse({
      sessionId: 'sess-abc',
      context: 'SEARCH_RESULTS',
    });
    expect(result.success).toBe(false);
  });

  it('should reject limit above 50', () => {
    const result = RecommendationRequestSchema.safeParse({
      sessionId: 'sess-abc',
      context: RecommendationContext.CART,
      limit: 51,
    });
    expect(result.success).toBe(false);
  });

  it('should reject empty sessionId', () => {
    const result = RecommendationRequestSchema.safeParse({
      sessionId: '',
      context: RecommendationContext.HOME,
    });
    expect(result.success).toBe(false);
  });
});

describe('TrackViewInputSchema', () => {
  it('should parse valid track view', () => {
    const result = TrackViewInputSchema.safeParse({
      productId: validUuid,
      sessionId: 'sess-123',
    });
    expect(result.success).toBe(true);
  });

  it('should accept optional customerId', () => {
    const result = TrackViewInputSchema.safeParse({
      productId: validUuid,
      sessionId: 'sess-123',
      customerId: validUuid,
    });
    expect(result.success).toBe(true);
  });
});

describe('TrackClickInputSchema', () => {
  it('should parse valid track click', () => {
    const result = TrackClickInputSchema.safeParse({
      recommendationLogId: validUuid,
      clickedProductId: validUuid,
    });
    expect(result.success).toBe(true);
  });

  it('should reject non-UUID', () => {
    const result = TrackClickInputSchema.safeParse({
      recommendationLogId: 'not-uuid',
      clickedProductId: validUuid,
    });
    expect(result.success).toBe(false);
  });
});
