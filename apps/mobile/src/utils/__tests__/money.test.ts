import { describe, it, expect } from 'vitest';
import {
  formatMoney,
  formatMoneyShort,
  paiseToDecimal,
  decimalToPaise,
} from '../money';

describe('formatMoney', () => {
  it('formats INR with Indian locale grouping', () => {
    // 1,50,000.00 INR = 1_50_000_00 paise
    const result = formatMoney(15_000_000, 'INR');
    expect(result).toContain('1,50,000');
  });

  it('formats zero paise as zero amount', () => {
    const result = formatMoney(0, 'INR');
    expect(result).toContain('0');
  });

  it('formats USD with dollar symbol', () => {
    const result = formatMoney(1_999_99, 'USD');
    // 199999 cents = $1,999.99
    expect(result).toContain('$');
    expect(result).toContain('1,999.99');
  });

  it('formats small amounts correctly', () => {
    const result = formatMoney(150, 'INR');
    expect(result).toContain('1.50');
  });

  it('formats AED currency', () => {
    const result = formatMoney(50_000, 'AED');
    expect(result).toContain('500');
  });

  it('uses provided locale override', () => {
    const result = formatMoney(100_000, 'INR', 'en-US');
    // en-US uses commas differently from en-IN
    expect(result).toBeDefined();
    expect(typeof result).toBe('string');
  });

  it('handles unknown currency code gracefully', () => {
    const result = formatMoney(10_000, 'XYZ');
    // Falls back to the catch block or default formatting
    expect(result).toBeDefined();
    expect(typeof result).toBe('string');
  });
});

describe('formatMoneyShort', () => {
  it('formats crores (>= 1Cr) with Cr suffix', () => {
    // 1 crore = 10,000,000 INR = 1,000,000,000 paise
    const result = formatMoneyShort(1_000_000_000, 'INR');
    expect(result).toMatch(/₹.*Cr/);
  });

  it('formats lakhs (>= 1L) with L suffix', () => {
    // 1 lakh = 100,000 INR = 10,000,000 paise
    const result = formatMoneyShort(10_000_000, 'INR');
    expect(result).toMatch(/₹.*L/);
  });

  it('formats thousands (>= 1K) with K suffix', () => {
    // 5,000 INR = 500,000 paise
    const result = formatMoneyShort(500_000, 'INR');
    expect(result).toMatch(/₹.*K/);
  });

  it('formats amounts below 1K without suffix', () => {
    const result = formatMoneyShort(50_000, 'INR');
    expect(result).toContain('₹');
    expect(result).toContain('500.00');
    expect(result).not.toMatch(/[KLCr]/);
  });

  it('formats USD with dollar symbol', () => {
    const result = formatMoneyShort(1_000_000_00, 'USD');
    expect(result).toContain('$');
  });
});

describe('paiseToDecimal', () => {
  it('converts paise to rupees', () => {
    expect(paiseToDecimal(15_000, 'INR')).toBe(150);
  });

  it('converts cents to dollars', () => {
    expect(paiseToDecimal(9_999, 'USD')).toBe(99.99);
  });

  it('returns 0 for 0 paise', () => {
    expect(paiseToDecimal(0, 'INR')).toBe(0);
  });
});

describe('decimalToPaise', () => {
  it('converts rupees to paise', () => {
    expect(decimalToPaise(150, 'INR')).toBe(15_000);
  });

  it('converts dollars to cents', () => {
    expect(decimalToPaise(99.99, 'USD')).toBe(9_999);
  });

  it('rounds fractional sub-units', () => {
    // 10.555 INR -> 1055.5 paise -> rounds to 1056
    expect(decimalToPaise(10.555, 'INR')).toBe(1056);
  });

  it('handles 0', () => {
    expect(decimalToPaise(0, 'INR')).toBe(0);
  });
});
