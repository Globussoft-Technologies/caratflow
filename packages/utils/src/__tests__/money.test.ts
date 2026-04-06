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

    it('throws on NaN', () => {
      expect(() => MoneyUtil.of(NaN, 'INR')).toThrow('must be an integer');
    });

    it('throws on Infinity', () => {
      expect(() => MoneyUtil.of(Infinity, 'INR')).toThrow('must be an integer');
    });

    it('allows zero amount', () => {
      const m = MoneyUtil.of(0, 'INR');
      expect(m.amount).toBe(0);
    });

    it('allows negative integer amount', () => {
      const m = MoneyUtil.of(-500, 'INR');
      expect(m.amount).toBe(-500);
    });

    it('handles mixed case currency', () => {
      const m = MoneyUtil.of(100, 'Usd');
      expect(m.currencyCode).toBe('USD');
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

    it('handles single decimal digit by padding', () => {
      const m = MoneyUtil.fromDecimal('10.5', 'INR');
      expect(m.amount).toBe(1050);
    });

    it('truncates extra decimal digits beyond currency precision', () => {
      const m = MoneyUtil.fromDecimal('10.999', 'INR');
      expect(m.amount).toBe(1099);
    });

    it('handles string with only fractional part', () => {
      const m = MoneyUtil.fromDecimal('0.01', 'INR');
      expect(m.amount).toBe(1);
    });

    it('uppercases currency code', () => {
      const m = MoneyUtil.fromDecimal('10.00', 'eur');
      expect(m.currencyCode).toBe('EUR');
    });

    it('handles large amounts (crore range)', () => {
      const m = MoneyUtil.fromDecimal('10000000.00', 'INR');
      expect(m.amount).toBe(1000000000);
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

    it('converts zero', () => {
      expect(MoneyUtil.toDecimal(MoneyUtil.of(0, 'INR'))).toBe(0);
    });

    it('converts negative amount', () => {
      expect(MoneyUtil.toDecimal(MoneyUtil.of(-5000, 'INR'))).toBe(-50);
    });

    it('handles single paise', () => {
      expect(MoneyUtil.toDecimal(MoneyUtil.of(1, 'INR'))).toBe(0.01);
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

    it('adds negative amounts (credits)', () => {
      const a = MoneyUtil.of(5000, 'INR');
      const b = MoneyUtil.of(-2000, 'INR');
      expect(MoneyUtil.add(a, b).amount).toBe(3000);
    });

    it('adds two negative amounts', () => {
      const a = MoneyUtil.of(-1000, 'INR');
      const b = MoneyUtil.of(-2000, 'INR');
      expect(MoneyUtil.add(a, b).amount).toBe(-3000);
    });

    it('returns a new object (immutability)', () => {
      const a = MoneyUtil.of(1000, 'INR');
      const b = MoneyUtil.of(2000, 'INR');
      const result = MoneyUtil.add(a, b);
      expect(result).not.toBe(a);
      expect(result).not.toBe(b);
      expect(a.amount).toBe(1000);
      expect(b.amount).toBe(2000);
    });

    it('throws when mixing INR and AED', () => {
      expect(() =>
        MoneyUtil.add(MoneyUtil.of(100, 'INR'), MoneyUtil.of(100, 'AED')),
      ).toThrow('Currency mismatch');
    });

    it('throws when mixing EUR and GBP', () => {
      expect(() =>
        MoneyUtil.add(MoneyUtil.of(100, 'EUR'), MoneyUtil.of(100, 'GBP')),
      ).toThrow('Currency mismatch');
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

    it('subtracting zero leaves value unchanged', () => {
      const a = MoneyUtil.of(5000, 'USD');
      expect(MoneyUtil.subtract(a, MoneyUtil.of(0, 'USD')).amount).toBe(5000);
    });

    it('subtracting from zero produces negative', () => {
      const zero = MoneyUtil.of(0, 'INR');
      const b = MoneyUtil.of(1000, 'INR');
      expect(MoneyUtil.subtract(zero, b).amount).toBe(-1000);
    });

    it('returns a new object (immutability)', () => {
      const a = MoneyUtil.of(5000, 'INR');
      const b = MoneyUtil.of(2000, 'INR');
      const result = MoneyUtil.subtract(a, b);
      expect(result).not.toBe(a);
      expect(a.amount).toBe(5000);
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
      expect(MoneyUtil.multiply(m, 1.5).amount).toBe(1500);
    });

    it('rounds to nearest integer (Math.round)', () => {
      const m = MoneyUtil.of(333, 'INR');
      // 333 * 0.1 = 33.3 -> rounds to 33
      expect(MoneyUtil.multiply(m, 0.1).amount).toBe(33);
    });

    it('rounds up when fraction >= 0.5', () => {
      const m = MoneyUtil.of(1, 'INR');
      // 1 * 1.5 = 1.5 -> rounds to 2
      expect(MoneyUtil.multiply(m, 1.5).amount).toBe(2);
    });

    it('multiplies by zero returns zero', () => {
      const m = MoneyUtil.of(99999, 'INR');
      expect(MoneyUtil.multiply(m, 0).amount).toBe(0);
    });

    it('multiplies by negative factor', () => {
      const m = MoneyUtil.of(1000, 'INR');
      expect(MoneyUtil.multiply(m, -2).amount).toBe(-2000);
    });

    it('returns a new object (immutability)', () => {
      const m = MoneyUtil.of(1000, 'INR');
      const result = MoneyUtil.multiply(m, 5);
      expect(result).not.toBe(m);
      expect(m.amount).toBe(1000);
    });

    it('preserves currency code', () => {
      const m = MoneyUtil.of(1000, 'EUR');
      expect(MoneyUtil.multiply(m, 2).currencyCode).toBe('EUR');
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

    it('rounds up when remainder >= 0.5', () => {
      const m = MoneyUtil.of(10, 'INR');
      // 10 / 3 = 3.333... -> 3
      expect(MoneyUtil.divide(m, 3).amount).toBe(3);
      // 20 / 3 = 6.666... -> 7
      expect(MoneyUtil.divide(MoneyUtil.of(20, 'INR'), 3).amount).toBe(7);
    });

    it('throws when dividing by zero', () => {
      const m = MoneyUtil.of(1000, 'INR');
      expect(() => MoneyUtil.divide(m, 0)).toThrow('Cannot divide money by zero');
    });

    it('divides by fractional divisor', () => {
      const m = MoneyUtil.of(1000, 'INR');
      // 1000 / 0.5 = 2000
      expect(MoneyUtil.divide(m, 0.5).amount).toBe(2000);
    });

    it('divides negative amount', () => {
      const m = MoneyUtil.of(-1000, 'INR');
      expect(MoneyUtil.divide(m, 2).amount).toBe(-500);
    });

    it('returns a new object (immutability)', () => {
      const m = MoneyUtil.of(1000, 'INR');
      const result = MoneyUtil.divide(m, 2);
      expect(result).not.toBe(m);
      expect(m.amount).toBe(1000);
    });

    it('preserves currency code', () => {
      const m = MoneyUtil.of(1000, 'GBP');
      expect(MoneyUtil.divide(m, 4).currencyCode).toBe('GBP');
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

    it('throws on currency mismatch', () => {
      expect(() =>
        MoneyUtil.compare(MoneyUtil.of(100, 'INR'), MoneyUtil.of(100, 'USD')),
      ).toThrow('Currency mismatch');
    });

    it('compares negative values correctly', () => {
      expect(MoneyUtil.compare(MoneyUtil.of(-200, 'INR'), MoneyUtil.of(-100, 'INR'))).toBe(-1);
      expect(MoneyUtil.compare(MoneyUtil.of(-100, 'INR'), MoneyUtil.of(-200, 'INR'))).toBe(1);
    });

    it('compares zero with positive and negative', () => {
      expect(MoneyUtil.compare(MoneyUtil.of(0, 'INR'), MoneyUtil.of(1, 'INR'))).toBe(-1);
      expect(MoneyUtil.compare(MoneyUtil.of(0, 'INR'), MoneyUtil.of(-1, 'INR'))).toBe(1);
      expect(MoneyUtil.compare(MoneyUtil.of(0, 'INR'), MoneyUtil.of(0, 'INR'))).toBe(0);
    });
  });

  describe('predicates', () => {
    it('isZero returns true for zero amount', () => {
      expect(MoneyUtil.isZero(MoneyUtil.of(0, 'INR'))).toBe(true);
    });

    it('isZero returns false for non-zero amount', () => {
      expect(MoneyUtil.isZero(MoneyUtil.of(1, 'INR'))).toBe(false);
    });

    it('isZero returns false for negative amount', () => {
      expect(MoneyUtil.isZero(MoneyUtil.of(-1, 'INR'))).toBe(false);
    });

    it('isPositive returns true for positive amount', () => {
      expect(MoneyUtil.isPositive(MoneyUtil.of(100, 'INR'))).toBe(true);
    });

    it('isPositive returns false for zero', () => {
      expect(MoneyUtil.isPositive(MoneyUtil.of(0, 'INR'))).toBe(false);
    });

    it('isPositive returns false for negative', () => {
      expect(MoneyUtil.isPositive(MoneyUtil.of(-1, 'INR'))).toBe(false);
    });

    it('isNegative returns true for negative amount', () => {
      expect(MoneyUtil.isNegative(MoneyUtil.of(-50, 'INR'))).toBe(true);
    });

    it('isNegative returns false for zero', () => {
      expect(MoneyUtil.isNegative(MoneyUtil.of(0, 'INR'))).toBe(false);
    });

    it('isNegative returns false for positive', () => {
      expect(MoneyUtil.isNegative(MoneyUtil.of(100, 'INR'))).toBe(false);
    });

    it('abs returns absolute value of negative', () => {
      expect(MoneyUtil.abs(MoneyUtil.of(-5000, 'INR')).amount).toBe(5000);
    });

    it('abs returns same value for positive', () => {
      expect(MoneyUtil.abs(MoneyUtil.of(5000, 'INR')).amount).toBe(5000);
    });

    it('abs returns zero for zero', () => {
      expect(MoneyUtil.abs(MoneyUtil.of(0, 'INR')).amount).toBe(0);
    });

    it('abs preserves currency code', () => {
      expect(MoneyUtil.abs(MoneyUtil.of(-100, 'USD')).currencyCode).toBe('USD');
    });
  });

  // ─── Formatting ──────────────────────────────────────────────

  describe('format', () => {
    it('formats INR with Indian number grouping', () => {
      const m = MoneyUtil.of(12345678, 'INR'); // Rs 1,23,456.78
      const formatted = MoneyUtil.format(m);
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
      expect(formatted).toContain('500');
    });

    it('formats zero correctly', () => {
      const m = MoneyUtil.of(0, 'INR');
      const formatted = MoneyUtil.format(m);
      expect(formatted).toContain('0.00');
    });

    it('formats negative amounts', () => {
      const m = MoneyUtil.of(-50000, 'INR');
      const formatted = MoneyUtil.format(m);
      expect(formatted).toContain('500.00');
    });

    it('formats very large amounts (crore range)', () => {
      const m = MoneyUtil.of(1_00_00_00_000, 'INR'); // Rs 1,00,00,000 = 1 crore
      const formatted = MoneyUtil.format(m);
      expect(formatted).toContain('1,00,00,000.00');
    });

    it('formats GBP', () => {
      const m = MoneyUtil.of(99999, 'GBP');
      const formatted = MoneyUtil.format(m);
      expect(formatted).toContain('999.99');
    });

    it('formats EUR', () => {
      const m = MoneyUtil.of(123456, 'EUR');
      const formatted = MoneyUtil.format(m);
      expect(formatted).toContain('1.234,56');
    });

    it('formats single paise/cent amount', () => {
      const m = MoneyUtil.of(1, 'INR');
      const formatted = MoneyUtil.format(m);
      expect(formatted).toContain('0.01');
    });

    it('accepts optional locale override', () => {
      const m = MoneyUtil.of(123456, 'INR');
      const formatted = MoneyUtil.format(m, 'en-US');
      // With en-US locale, INR should still format but with US grouping
      expect(formatted).toBeDefined();
    });
  });

  // ─── Currency Conversion ─────────────────────────────────────

  describe('convert', () => {
    it('converts INR to USD using exchange rate', () => {
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

    it('converts zero amount', () => {
      const zero = MoneyUtil.of(0, 'INR');
      const result = MoneyUtil.convert(zero, 'USD', 0.012);
      expect(result.amount).toBe(0);
    });

    it('uppercases target currency', () => {
      const m = MoneyUtil.of(10000, 'INR');
      const result = MoneyUtil.convert(m, 'usd', 0.012);
      expect(result.currencyCode).toBe('USD');
    });

    it('handles very small exchange rate', () => {
      const m = MoneyUtil.of(100000000, 'INR'); // Rs 10,00,000
      const result = MoneyUtil.convert(m, 'USD', 0.012);
      expect(result.amount).toBe(1200000);
    });

    it('handles rate of 1 (same currency equivalent)', () => {
      const m = MoneyUtil.of(5000, 'USD');
      const result = MoneyUtil.convert(m, 'SGD', 1);
      expect(result.amount).toBe(5000);
    });

    it('round-trip conversion is approximately accurate', () => {
      const inr = MoneyUtil.of(10000000, 'INR'); // Rs 1,00,000
      const rate = 0.012;
      const usd = MoneyUtil.convert(inr, 'USD', rate);
      const backToInr = MoneyUtil.convert(usd, 'INR', 1 / rate);
      // Should be close to original, within rounding
      expect(Math.abs(backToInr.amount - inr.amount)).toBeLessThan(100);
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

    it('handles small percentage on small amount', () => {
      // 100 paise (Rs 1) at 0.1% = 0.1 paise -> rounds to 0
      const amount = MoneyUtil.of(100, 'INR');
      expect(MoneyUtil.percentage(amount, 0.1).amount).toBe(0);
    });

    it('handles percentage over 100', () => {
      const amount = MoneyUtil.of(10000, 'INR');
      expect(MoneyUtil.percentage(amount, 200).amount).toBe(20000);
    });

    it('preserves currency code', () => {
      const amount = MoneyUtil.of(10000, 'USD');
      expect(MoneyUtil.percentage(amount, 10).currencyCode).toBe('USD');
    });

    it('calculates 5% making charges GST', () => {
      const amount = MoneyUtil.of(500000, 'INR'); // Rs 5,000
      expect(MoneyUtil.percentage(amount, 5).amount).toBe(25000); // Rs 250
    });

    it('rounds correctly for fractional percentages', () => {
      // 33333 * 3.5 / 100 = 1166.655 -> 1167
      const amount = MoneyUtil.of(33333, 'INR');
      expect(MoneyUtil.percentage(amount, 3.5).amount).toBe(1167);
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
      expect(parts[0]!.amount).toBe(3334);
      expect(parts[1]!.amount).toBe(3333);
      expect(parts[2]!.amount).toBe(3333);
      const total = parts.reduce((sum, p) => sum + p.amount, 0);
      expect(total).toBe(10000);
    });

    it('throws on zero parts', () => {
      expect(() => MoneyUtil.split(MoneyUtil.of(100, 'INR'), 0)).toThrow();
    });

    it('throws on non-integer parts', () => {
      expect(() => MoneyUtil.split(MoneyUtil.of(100, 'INR'), 1.5)).toThrow();
    });

    it('throws on negative parts', () => {
      expect(() => MoneyUtil.split(MoneyUtil.of(100, 'INR'), -1)).toThrow();
    });

    it('split into 1 part returns the full amount', () => {
      const m = MoneyUtil.of(5000, 'INR');
      const parts = MoneyUtil.split(m, 1);
      expect(parts).toHaveLength(1);
      expect(parts[0]!.amount).toBe(5000);
    });

    it('splits zero amount into multiple zero parts', () => {
      const m = MoneyUtil.of(0, 'INR');
      const parts = MoneyUtil.split(m, 5);
      expect(parts).toHaveLength(5);
      expect(parts.every((p) => p.amount === 0)).toBe(true);
    });

    it('sum of all parts always equals original', () => {
      const amounts = [10001, 7, 99999, 1, 100003];
      for (const amt of amounts) {
        const m = MoneyUtil.of(amt, 'INR');
        for (const n of [2, 3, 4, 5, 7]) {
          const parts = MoneyUtil.split(m, n);
          const total = parts.reduce((sum, p) => sum + p.amount, 0);
          expect(total).toBe(amt);
        }
      }
    });

    it('distributes remainder of 2 to first 2 parts', () => {
      const m = MoneyUtil.of(10, 'INR');
      const parts = MoneyUtil.split(m, 4);
      // 10 / 4 = 2 base, remainder 2
      expect(parts[0]!.amount).toBe(3);
      expect(parts[1]!.amount).toBe(3);
      expect(parts[2]!.amount).toBe(2);
      expect(parts[3]!.amount).toBe(2);
    });

    it('preserves currency code in all parts', () => {
      const m = MoneyUtil.of(100, 'GBP');
      const parts = MoneyUtil.split(m, 3);
      expect(parts.every((p) => p.currencyCode === 'GBP')).toBe(true);
    });
  });

  // ─── Edge Cases ──────────────────────────────────────────────

  describe('edge cases', () => {
    it('handles very large amounts without overflow (within safe integer range)', () => {
      const large = MoneyUtil.of(1_000_000_000, 'INR');
      const doubled = MoneyUtil.add(large, large);
      expect(doubled.amount).toBe(2_000_000_000);
    });

    it('handles max safe integer boundary', () => {
      // Number.MAX_SAFE_INTEGER = 9007199254740991
      const large = MoneyUtil.of(9_007_199_254_740_991, 'INR');
      expect(large.amount).toBe(9_007_199_254_740_991);
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
      expect(MoneyUtil.divide(zero, 5).amount).toBe(0);
    });

    it('immutability: operations never modify the original', () => {
      const original = MoneyUtil.of(10000, 'INR');
      MoneyUtil.add(original, MoneyUtil.of(5000, 'INR'));
      MoneyUtil.subtract(original, MoneyUtil.of(3000, 'INR'));
      MoneyUtil.multiply(original, 3);
      MoneyUtil.divide(original, 2);
      MoneyUtil.percentage(original, 50);
      MoneyUtil.abs(original);
      expect(original.amount).toBe(10000);
      expect(original.currencyCode).toBe('INR');
    });

    it('handles 1 paise operations', () => {
      const one = MoneyUtil.of(1, 'INR');
      expect(MoneyUtil.add(one, one).amount).toBe(2);
      expect(MoneyUtil.subtract(one, one).amount).toBe(0);
      expect(MoneyUtil.multiply(one, 100).amount).toBe(100);
    });

    it('chained operations produce correct result', () => {
      // Rs 1,00,000 + 3% GST + Rs 5,000 making charges + 5% on making charges
      const base = MoneyUtil.of(10000000, 'INR');
      const gst = MoneyUtil.percentage(base, 3);
      const making = MoneyUtil.of(500000, 'INR');
      const makingGst = MoneyUtil.percentage(making, 5);
      const total = MoneyUtil.add(MoneyUtil.add(MoneyUtil.add(base, gst), making), makingGst);
      // 10000000 + 300000 + 500000 + 25000 = 10825000
      expect(total.amount).toBe(10825000);
    });
  });
});
