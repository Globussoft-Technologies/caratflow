import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { formatDate, formatDateTime, isToday, daysFromNow } from '../date';

describe('formatDate', () => {
  it('formats a Date object', () => {
    const date = new Date(2025, 0, 15); // Jan 15, 2025
    const result = formatDate(date);
    expect(result).toContain('15');
    expect(result).toContain('Jan');
    expect(result).toContain('2025');
  });

  it('formats a date string', () => {
    const result = formatDate('2025-03-20T10:00:00Z');
    expect(result).toContain('2025');
    expect(result).toContain('Mar');
  });

  it('formats different months correctly', () => {
    const result = formatDate(new Date(2025, 11, 25)); // Dec 25
    expect(result).toContain('Dec');
    expect(result).toContain('25');
  });
});

describe('formatDateTime', () => {
  it('includes date and time components', () => {
    const date = new Date(2025, 5, 10, 14, 30); // Jun 10, 2025 14:30
    const result = formatDateTime(date);
    expect(result).toContain('10');
    expect(result).toContain('Jun');
    expect(result).toContain('2025');
  });

  it('formats a string input', () => {
    const result = formatDateTime('2025-01-01T09:15:00Z');
    expect(result).toContain('2025');
  });
});

describe('isToday', () => {
  it('returns true for current date', () => {
    expect(isToday(new Date())).toBe(true);
  });

  it('returns false for yesterday', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(isToday(yesterday)).toBe(false);
  });

  it('returns false for a distant date', () => {
    expect(isToday('2020-01-01T00:00:00Z')).toBe(false);
  });
});

describe('daysFromNow', () => {
  it('returns positive number for future dates', () => {
    const future = new Date();
    future.setDate(future.getDate() + 5);
    const result = daysFromNow(future);
    expect(result).toBeGreaterThanOrEqual(4);
    expect(result).toBeLessThanOrEqual(6);
  });

  it('returns negative number for past dates', () => {
    const past = new Date();
    past.setDate(past.getDate() - 3);
    const result = daysFromNow(past);
    expect(result).toBeLessThanOrEqual(-2);
    expect(result).toBeGreaterThanOrEqual(-4);
  });

  it('returns 0 or 1 for today', () => {
    const result = daysFromNow(new Date());
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(1);
  });
});
