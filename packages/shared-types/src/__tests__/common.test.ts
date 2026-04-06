import { describe, it, expect } from 'vitest';
import {
  MoneySchema,
  WeightSchema,
  PuritySchema,
  PaginationSchema,
  ApiResponseSchema,
  DateRangeSchema,
  PaginatedResultSchema,
  UuidSchema,
  TenantIdSchema,
} from '../common';
import { WeightUnit } from '../enums';
import { z } from 'zod';

describe('MoneySchema', () => {
  it('should parse valid money object', () => {
    const result = MoneySchema.safeParse({ amount: 10000, currencyCode: 'INR' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.amount).toBe(10000);
      expect(result.data.currencyCode).toBe('INR');
    }
  });

  it('should reject non-integer amount', () => {
    const result = MoneySchema.safeParse({ amount: 100.5, currencyCode: 'INR' });
    expect(result.success).toBe(false);
  });

  it('should reject currency code with wrong length', () => {
    const result = MoneySchema.safeParse({ amount: 100, currencyCode: 'IN' });
    expect(result.success).toBe(false);
  });

  it('should reject missing fields', () => {
    const result = MoneySchema.safeParse({ amount: 100 });
    expect(result.success).toBe(false);
  });
});

describe('WeightSchema', () => {
  it('should parse valid weight with default unit', () => {
    const result = WeightSchema.safeParse({ milligrams: 5000 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.milligrams).toBe(5000);
      expect(result.data.displayUnit).toBe(WeightUnit.GRAM);
    }
  });

  it('should parse valid weight with explicit unit', () => {
    const result = WeightSchema.safeParse({ milligrams: 5000, displayUnit: WeightUnit.TOLA });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.displayUnit).toBe(WeightUnit.TOLA);
    }
  });

  it('should reject negative milligrams', () => {
    const result = WeightSchema.safeParse({ milligrams: -100 });
    expect(result.success).toBe(false);
  });

  it('should reject non-integer milligrams', () => {
    const result = WeightSchema.safeParse({ milligrams: 5.5 });
    expect(result.success).toBe(false);
  });

  it('should reject invalid display unit', () => {
    const result = WeightSchema.safeParse({ milligrams: 5000, displayUnit: 'INVALID' });
    expect(result.success).toBe(false);
  });
});

describe('PuritySchema', () => {
  it('should parse valid purity (22K = 916)', () => {
    const result = PuritySchema.safeParse({ fineness: 916 });
    expect(result.success).toBe(true);
  });

  it('should parse boundary values 0 and 999', () => {
    expect(PuritySchema.safeParse({ fineness: 0 }).success).toBe(true);
    expect(PuritySchema.safeParse({ fineness: 999 }).success).toBe(true);
  });

  it('should reject fineness above 999', () => {
    const result = PuritySchema.safeParse({ fineness: 1000 });
    expect(result.success).toBe(false);
  });

  it('should reject negative fineness', () => {
    const result = PuritySchema.safeParse({ fineness: -1 });
    expect(result.success).toBe(false);
  });
});

describe('PaginationSchema', () => {
  it('should parse with defaults', () => {
    const result = PaginationSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(20);
      expect(result.data.sortOrder).toBe('desc');
    }
  });

  it('should parse explicit values', () => {
    const result = PaginationSchema.safeParse({ page: 3, limit: 50, sortBy: 'name', sortOrder: 'asc' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(3);
      expect(result.data.sortOrder).toBe('asc');
    }
  });

  it('should reject page less than 1', () => {
    const result = PaginationSchema.safeParse({ page: 0 });
    expect(result.success).toBe(false);
  });

  it('should reject limit greater than 100', () => {
    const result = PaginationSchema.safeParse({ limit: 101 });
    expect(result.success).toBe(false);
  });

  it('should reject invalid sort order', () => {
    const result = PaginationSchema.safeParse({ sortOrder: 'random' });
    expect(result.success).toBe(false);
  });
});

describe('ApiResponseSchema', () => {
  const StringApiResponse = ApiResponseSchema(z.string());

  it('should parse success response with data', () => {
    const result = StringApiResponse.safeParse({ success: true, data: 'hello' });
    expect(result.success).toBe(true);
  });

  it('should parse error response', () => {
    const result = StringApiResponse.safeParse({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Resource not found' },
    });
    expect(result.success).toBe(true);
  });

  it('should allow optional meta field', () => {
    const result = StringApiResponse.safeParse({
      success: true,
      data: 'hello',
      meta: { page: 1 },
    });
    expect(result.success).toBe(true);
  });

  it('should reject missing success field', () => {
    const result = StringApiResponse.safeParse({ data: 'hello' });
    expect(result.success).toBe(false);
  });
});

describe('DateRangeSchema', () => {
  it('should parse valid date range', () => {
    const result = DateRangeSchema.safeParse({
      from: '2025-01-01',
      to: '2025-12-31',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.from).toBeInstanceOf(Date);
      expect(result.data.to).toBeInstanceOf(Date);
    }
  });

  it('should coerce string dates to Date objects', () => {
    const result = DateRangeSchema.safeParse({
      from: '2025-04-01T00:00:00Z',
      to: '2026-03-31T23:59:59Z',
    });
    expect(result.success).toBe(true);
  });

  it('should reject missing from date', () => {
    const result = DateRangeSchema.safeParse({ to: '2025-12-31' });
    expect(result.success).toBe(false);
  });

  it('should reject invalid date strings', () => {
    const result = DateRangeSchema.safeParse({ from: 'not-a-date', to: '2025-12-31' });
    expect(result.success).toBe(false);
  });
});

describe('PaginatedResultSchema', () => {
  const PaginatedStrings = PaginatedResultSchema(z.string());

  it('should parse valid paginated result', () => {
    const result = PaginatedStrings.safeParse({
      items: ['a', 'b'],
      total: 10,
      page: 1,
      limit: 20,
      totalPages: 1,
      hasNext: false,
      hasPrevious: false,
    });
    expect(result.success).toBe(true);
  });

  it('should reject wrong item types', () => {
    const result = PaginatedStrings.safeParse({
      items: [1, 2],
      total: 10,
      page: 1,
      limit: 20,
      totalPages: 1,
      hasNext: false,
      hasPrevious: false,
    });
    expect(result.success).toBe(false);
  });
});

describe('UuidSchema', () => {
  it('should parse valid UUID', () => {
    const result = UuidSchema.safeParse('550e8400-e29b-41d4-a716-446655440000');
    expect(result.success).toBe(true);
  });

  it('should reject invalid UUID', () => {
    const result = UuidSchema.safeParse('not-a-uuid');
    expect(result.success).toBe(false);
  });
});

describe('TenantIdSchema', () => {
  it('should parse valid tenant UUID', () => {
    const result = TenantIdSchema.safeParse('550e8400-e29b-41d4-a716-446655440000');
    expect(result.success).toBe(true);
  });

  it('should reject non-UUID strings', () => {
    const result = TenantIdSchema.safeParse('tenant123');
    expect(result.success).toBe(false);
  });
});
