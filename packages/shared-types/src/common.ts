// ─── CaratFlow Common Types & Zod Schemas ──────────────────────
import { z } from 'zod';
import { WeightUnit } from './enums';

// ─── Money ─────────────────────────────────────────────────────
// All monetary values stored as integers in the smallest currency unit
// (paise for INR, cents for USD, etc.)

export const MoneySchema = z.object({
  amount: z.number().int(),
  currencyCode: z.string().length(3),
});
export type Money = z.infer<typeof MoneySchema>;

// ─── Weight ────────────────────────────────────────────────────
// All weights stored as integers in milligrams internally.

export const WeightSchema = z.object({
  milligrams: z.number().int().nonnegative(),
  displayUnit: z.nativeEnum(WeightUnit).default(WeightUnit.GRAM),
});
export type Weight = z.infer<typeof WeightSchema>;

// ─── Purity ────────────────────────────────────────────────────
// Fineness as integer: 999 = 24K, 916 = 22K, 750 = 18K, etc.

export const PuritySchema = z.object({
  fineness: z.number().int().min(0).max(999),
});
export type Purity = z.infer<typeof PuritySchema>;

// ─── Pagination ────────────────────────────────────────────────

export const PaginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
export type Pagination = z.infer<typeof PaginationSchema>;

export const PaginatedResultSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    totalPages: z.number().int().nonnegative(),
    hasNext: z.boolean(),
    hasPrevious: z.boolean(),
  });

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

// ─── API Response ──────────────────────────────────────────────

export const ApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z
      .object({
        code: z.string(),
        message: z.string(),
        details: z.record(z.unknown()).optional(),
      })
      .optional(),
    meta: z.record(z.unknown()).optional(),
  });

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: Record<string, unknown>;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// ─── Date Range ────────────────────────────────────────────────

export const DateRangeSchema = z.object({
  from: z.coerce.date(),
  to: z.coerce.date(),
});
export type DateRange = z.infer<typeof DateRangeSchema>;

// ─── Tenant Context ────────────────────────────────────────────

export interface TenantContext {
  tenantId: string;
  userId: string;
  userRole: string;
  permissions: string[];
  timezone: string;
  currencyCode: string;
}

// ─── Audit Metadata ────────────────────────────────────────────

export interface AuditMeta {
  userId: string;
  ipAddress?: string;
  userAgent?: string;
}

// ─── Base Entity ───────────────────────────────────────────────

export interface BaseEntity {
  id: string;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
}

// ─── ID Validation ─────────────────────────────────────────────

export const UuidSchema = z.string().uuid();
export const TenantIdSchema = z.string().uuid();
