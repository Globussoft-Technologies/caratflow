import { describe, it, expect } from 'vitest';
import { MoneyUtil } from '../money';

describe('MoneyUtil', () => {
  // ─── Factory Methods ─────────────────────────────────────────

  describe('of', () => {
    it('creates a Money value from integer amount', () => {
      const m = MoneyUtil.of(12345, 'INR');
      expect(m.amount).toBe(12345);
      expect(m.currencyCode).toBe('INR');
    });

    it('uppercases the currency code', () => {
      const m = MoneyUtil.of(100, 'inr');
      expect(m.currencyCode).toBe('INR');
    });

    it('throws when amount is not an integer', () => {
      expect(() => MoneyUtil.of(12.34, 'INR')).toThrow('must be an integer');
    });
  });

  describe('fromDecimal', () => {
    it('converts decimal string to paise for INR', () => {
      const m = MoneyUtil.fromDecimal('1234.56', 'INR');
      expect(m.amount).toBe(123456);
      expect(m.currencyCode).toBe('INR');
    });

    it('converts decimal string to cents for USD', () => {
      const m = MoneyUtil.fromDecimal('99.99', 'USD');
      expect(m.amount).toBe(9999);
    });

    it('handles whole number without decimal part', () => {
      const m = MoneyUtil.fromDecimal('500', 'INR');
      expect(m.amount).toBe(50000);
    });

    it('handles string with extra characters (formatting)', () => {
      const m = MoneyUtil.fromDecimal('1,23,456.78', 'INR');
      expect(m.amount).toBe(12345678);
    });

    it('handles zero', () => {
      const m = MoneyUtil.fromDecimal('0.00', 'INR');
      expect(m.amount).toBe(0);
    });
  });

  describe('toDecimal', () => {
    it('converts paise to decimal for INR', () => {
      const m = MoneyUtil.of(123456, 'INR');
      expect(MoneyUtil.toDecimal(m)).toBe(1234.56);
    });

    it('converts cents to decimal for USD', () => {
      const m = MoneyUtil.of(9999, 'USD');
      expect(MoneyUtil.toDecimal(m)).toBe(99.99);
    });
  });

  // ─── Arithmetic ──────────────────────────────────────────────

  describe('add', () => {
    it('adds two amounts of the same currency', () => {
      const a = MoneyUtil.of(10000, 'INR');
      const b = MoneyUtil.of(5050, 'INR');
      const result = MoneyUtil.add(a, b);
      expect(result.amount).toBe(15050);
      expect(result.currencyCode).toBe('INR');
    });

    it('throws on currency mismatch', () => {
      const a = MoneyUtil.of(100, 'INR');
      const b = MoneyUtil.of(100, 'USD');
      expect(() => MoneyUtil.add(a, b)).toThrow('Currency mismatch');
    });

    it('handles adding zero', () => {
      const a = MoneyUtil.of(5000, 'INR');
      const zero = MoneyUtil.of(0, 'INR');
      expect(MoneyUtil.add(a, zero).amount).toBe(5000);
    });
  });

  describe('subtract', () => {
    it('subtracts two amounts of the same currency', () => {
      const a = MoneyUtil.of(10000, 'INR');
      const b = MoneyUtil.of(3000, 'INR');
      const result = MoneyUtil.subtract(a, b);
      expect(result.amount).toBe(7000);
    });

    it('allows negative result (credit/refund scenario)', () => {
      const a = MoneyUtil.of(1000, 'INR');
      const b = MoneyUtil.of(5000, 'INR');
      const result = MoneyUtil.subtract(a, b);
      expect(result.amount).toBe(-4000);
    });

    it('throws on currency mismatch', () => {
      const a = MoneyUtil.of(100, 'INR');
      const b = MoneyUtil.of(100, 'AED');
      expect(() => MoneyUtil.subtract(a, b)).toThrow('Currency mismatch');
    });
  });

  describe('multiply', () => {
    it('multiplies by an integer factor', () => {
      const m = MoneyUtil.of(1000, 'INR');
      const result = MoneyUtil.multiply(m, 3);
      expect(result.amount).toBe(3000);
    });

    it('multiplies by a fractional factor with rounding', () => {
      const m = MoneyUtil.of(1000, 'INR');
      // 1000 * 1.5 = 1500
      expect(MoneyUtil.multiply(m, 1.5).amount).toBe(1500);
    });

    it('rounds to nearest integer (banker-safe)', () => {
      const m = MoneyUtil.of(333, 'INR');
      // 333 * 0.1 = 33.3 -> rounds to 33
      expect(MoneyUtil.multiply(m, 0.1).amount).toBe(33);
    });
  });

  describe('divide', () => {
    it('divides evenly', () => {
      const m = MoneyUtil.of(9000, 'INR');
      expect(MoneyUtil.divide(m, 3).amount).toBe(3000);
    });

    it('rounds when division is not exact', () => {
      const m = MoneyUtil.of(10000, 'INR');
      // 10000 / 3 = 3333.33... -> 3333
      expect(MoneyUtil.divide(m, 3).amount).toBe(3333);
    });

    it('throws when dividing by zero', () => {
      const m = MoneyUtil.of(1000, 'INR');
      expect(() => MoneyUtil.divide(m, 0)).toThrow('Cannot divide money by zero');
    });
  });

  // ─── Comparison and Predicates ───────────────────────────────

  describe('compare', () => {
    it('returns -1 when a < b', () => {
      expect(MoneyUtil.compare(MoneyUtil.of(100, 'INR'), MoneyUtil.of(200, 'INR'))).toBe(-1);
    });

    it('returns 0 when a == b', () => {
      expect(MoneyUtil.compare(MoneyUtil.of(500, 'INR'), MoneyUtil.of(500, 'INR'))).toBe(0);
    });

    it('returns 1 when a > b', () => {
      expect(MoneyUtil.compare(MoneyUtil.of(300, 'INR'), MoneyUtil.of(100, 'INR'))).toBe(1);
    });
  });

  describe('predicates', () => {
    it('isZero returns true for zero amount', () => {
      expect(MoneyUtil.isZero(MoneyUtil.of(0, 'INR'))).toBe(true);
    });

    it('isZero returns false for non-zero amount', () => {
      expect(MoneyUtil.isZero(MoneyUtil.of(1, 'INR'))).toBe(false);
    });

    it('isPositive returns true for positive amount', () => {
      expect(MoneyUtil.isPositive(MoneyUtil.of(100, 'INR'))).toBe(true);
    });

    it('isNegative returns true for negative amount', () => {
      expect(MoneyUtil.isNegative(MoneyUtil.of(-50, 'INR'))).toBe(true);
    });

    it('abs returns absolute value', () => {
      expect(MoneyUtil.abs(MoneyUtil.of(-5000, 'INR')).amount).toBe(5000);
      expect(MoneyUtil.abs(MoneyUtil.of(5000, 'INR')).amount).toBe(5000);
    });
  });

  // ─── Formatting ──────────────────────────────────────────────

  describe('format', () => {
    it('formats INR with Indian number grouping', () => {
      const m = MoneyUtil.of(12345678, 'INR'); // Rs 1,23,456.78
      const formatted = MoneyUtil.format(m);
      // Intl formatting may vary by environment, but should contain the digits
      expect(formatted).toContain('1,23,456.78');
    });

    it('formats USD with US number grouping', () => {
      const m = MoneyUtil.of(123456, 'USD'); // $1,234.56
      const formatted = MoneyUtil.format(m);
      expect(formatted).toContain('1,234.56');
    });

    it('formats AED', () => {
      const m = MoneyUtil.of(50000, 'AED'); // 500.00 AED
      const formatted = MoneyUtil.format(m);
      // Should contain the numeric value
      expect(formatted).toContain('500');
    });

    it('formats zero correctly', () => {
      const m = MoneyUtil.of(0, 'INR');
      const formatted = MoneyUtil.format(m);
      expect(formatted).toContain('0.00');
    });
  });

  // ─── Currency Conversion ─────────────────────────────────────

  describe('convert', () => {
    it('converts INR to USD using exchange rate', () => {
      // 100000 paise = Rs 1000, rate 0.012 means 1 INR = 0.012 USD
      const inr = MoneyUtil.of(10000000, 'INR'); // Rs 1,00,000
      const usd = MoneyUtil.convert(inr, 'USD', 0.012);
      // 100000 * 0.012 = 1200 USD = 120000 cents
      expect(usd.amount).toBe(120000);
      expect(usd.currencyCode).toBe('USD');
    });

    it('converts USD to INR', () => {
      const usd = MoneyUtil.of(10000, 'USD'); // $100
      const inr = MoneyUtil.convert(usd, 'INR', 83.5);
      // 100 * 83.5 = 8350 INR = 835000 paise
      expect(inr.amount).toBe(835000);
      expect(inr.currencyCode).toBe('INR');
    });

    it('throws on negative exchange rate', () => {
      const m = MoneyUtil.of(1000, 'INR');
      expect(() => MoneyUtil.convert(m, 'USD', -1)).toThrow('Exchange rate must be positive');
    });

    it('throws on zero exchange rate', () => {
      const m = MoneyUtil.of(1000, 'INR');
      expect(() => MoneyUtil.convert(m, 'USD', 0)).toThrow('Exchange rate must be positive');
    });
  });

  // ─── Percentage ──────────────────────────────────────────────

  describe('percentage', () => {
    it('calculates 3% GST on jewelry', () => {
      const amount = MoneyUtil.of(10000000, 'INR'); // Rs 1,00,000
      const gst = MoneyUtil.percentage(amount, 3);
      expect(gst.amount).toBe(300000); // Rs 3,000
    });

    it('calculates 1.5% CGST correctly', () => {
      const amount = MoneyUtil.of(10000000, 'INR');
      const cgst = MoneyUtil.percentage(amount, 1.5);
      expect(cgst.amount).toBe(150000); // Rs 1,500
    });

    it('handles zero percent', () => {
      const amount = MoneyUtil.of(10000, 'INR');
      expect(MoneyUtil.percentage(amount, 0).amount).toBe(0);
    });

    it('handles 100 percent', () => {
      const amount = MoneyUtil.of(10000, 'INR');
      expect(MoneyUtil.percentage(amount, 100).amount).toBe(10000);
    });
  });

  // ─── Split ───────────────────────────────────────────────────

  describe('split', () => {
    it('splits evenly', () => {
      const m = MoneyUtil.of(9000, 'INR');
      const parts = MoneyUtil.split(m, 3);
      expect(parts).toHaveLength(3);
      expect(parts.every((p) => p.amount === 3000)).toBe(true);
    });

    it('distributes remainder to first parts', () => {
      const m = MoneyUtil.of(10000, 'INR');
      const parts = MoneyUtil.split(m, 3);
      expect(parts).toHaveLength(3);
      // 10000 / 3 = 3333 base, remainder 1
      expect(parts[0]!.amount).toBe(3334);
      expect(parts[1]!.amount).toBe(3333);
      expect(parts[2]!.amount).toBe(3333);
      // Sum should equal original
      const total = parts.reduce((sum, p) => sum + p.amount, 0);
      expect(total).toBe(10000);
    });

    it('throws on zero parts', () => {
      expect(() => MoneyUtil.split(MoneyUtil.of(100, 'INR'), 0)).toThrow();
    });

    it('throws on non-integer parts', () => {
      expect(() => MoneyUtil.split(MoneyUtil.of(100, 'INR'), 1.5)).toThrow();
    });
  });

  // ─── Edge Cases ──────────────────────────────────────────────

  describe('edge cases', () => {
    it('handles very large amounts without overflow (within safe integer range)', () => {
      // Rs 10 crore = 1,00,00,00,000 paise = 10^9
      const large = MoneyUtil.of(1_000_000_000, 'INR');
      const doubled = MoneyUtil.add(large, large);
      expect(doubled.amount).toBe(2_000_000_000);
    });

    it('handles negative money amounts (refunds)', () => {
      const refund = MoneyUtil.of(-50000, 'INR');
      expect(MoneyUtil.isNegative(refund)).toBe(true);
      expect(MoneyUtil.format(refund)).toContain('500');
    });

    it('zero amount operations are stable', () => {
      const zero = MoneyUtil.of(0, 'INR');
      expect(MoneyUtil.multiply(zero, 100).amount).toBe(0);
      expect(MoneyUtil.percentage(zero, 50).amount).toBe(0);
    });
  });
});
