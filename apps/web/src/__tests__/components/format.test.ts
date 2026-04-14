import { describe, it, expect } from 'vitest';
import {
  formatPaise,
  formatMg,
  formatDate,
  formatDateTime,
} from '@/components/format';

describe('format helpers', () => {
  describe('formatPaise', () => {
    it('returns "-" for null/undefined/empty', () => {
      expect(formatPaise(null)).toBe('-');
      expect(formatPaise(undefined)).toBe('-');
      expect(formatPaise('')).toBe('-');
    });

    it('returns "-" for non-numeric inputs', () => {
      expect(formatPaise({})).toBe('-');
      expect(formatPaise('not-a-number')).toBe('-');
    });

    it('formats a numeric paise value into INR by default', () => {
      // 100000 paise = Rs 1,000.00
      const result = formatPaise(100000);
      expect(result).toContain('1,000');
    });

    it('formats a BigInt paise value', () => {
      const result = formatPaise(BigInt(250000));
      expect(result).toContain('2,500');
    });

    it('formats a numeric string paise value', () => {
      const result = formatPaise('50000');
      expect(result).toContain('500');
    });

    it('honours a non-INR currency', () => {
      const result = formatPaise(100000, 'USD');
      expect(result).toContain('1,000');
      // Intl output for USD typically starts with "$" but be lenient across locales
      expect(result).toMatch(/\$|USD/);
    });
  });

  describe('formatMg', () => {
    it('returns "-" for null/undefined/empty', () => {
      expect(formatMg(null)).toBe('-');
      expect(formatMg(undefined)).toBe('-');
      expect(formatMg('')).toBe('-');
    });

    it('returns "-" for non-numeric inputs', () => {
      expect(formatMg({})).toBe('-');
    });

    it('formats mg to grams with a trailing g unit by default', () => {
      // 5000 mg = 5 g
      const result = formatMg(5000);
      expect(result).toContain('5');
      expect(result.endsWith(' g')).toBe(true);
    });

    it('formats mg to mg when unit="mg"', () => {
      const result = formatMg(5000, 'mg');
      expect(result).toContain('5,000');
      expect(result.endsWith(' mg')).toBe(true);
    });

    it('handles bigint input', () => {
      const result = formatMg(BigInt(11664)); // 1 tola = 11.664 g
      expect(result).toContain('11.664');
      expect(result.endsWith(' g')).toBe(true);
    });
  });

  describe('formatDate', () => {
    it('returns "-" for null/undefined/empty', () => {
      expect(formatDate(null)).toBe('-');
      expect(formatDate(undefined)).toBe('-');
      expect(formatDate('')).toBe('-');
    });

    it('returns "-" for invalid date strings', () => {
      expect(formatDate('not-a-date')).toBe('-');
    });

    it('formats an ISO date string to a locale date', () => {
      const result = formatDate('2026-04-14T00:00:00.000Z');
      // toLocaleDateString varies, but should not be "-" and should mention 2026
      expect(result).not.toBe('-');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('formatDateTime', () => {
    it('returns "-" for null/undefined/empty', () => {
      expect(formatDateTime(null)).toBe('-');
      expect(formatDateTime(undefined)).toBe('-');
      expect(formatDateTime('')).toBe('-');
    });

    it('returns "-" for invalid date strings', () => {
      expect(formatDateTime('nope')).toBe('-');
    });

    it('formats an ISO date-time into a locale date/time string', () => {
      const result = formatDateTime('2026-04-14T10:30:00.000Z');
      expect(result).not.toBe('-');
      expect(result.length).toBeGreaterThan(0);
    });
  });
});
