import { describe, it, expect } from 'vitest';
import {
  metalValueByWeight,
  metalValueByPurity,
  convertCurrency,
  troyOzToPerGram,
  tolaToPerGram,
  per10GramToPerGram,
} from '../rates';
import { MoneyUtil } from '../money';

describe('metalValueByWeight', () => {
  it('calculates value for 10g gold at Rs 6000/g', () => {
    // 10g = 10000mg, rate = 600000 paise/g (Rs 6000)
    const result = metalValueByWeight(10000, 600000, 'INR');
    expect(result.amount).toBe(6000000); // Rs 60,000
    expect(result.currencyCode).toBe('INR');
  });

  it('calculates value for 1g gold at Rs 6000/g', () => {
    const result = metalValueByWeight(1000, 600000, 'INR');
    expect(result.amount).toBe(600000); // Rs 6,000
  });

  it('calculates value for 100g silver at Rs 80/g', () => {
    const result = metalValueByWeight(100000, 8000, 'INR');
    expect(result.amount).toBe(800000); // Rs 8,000
  });

  it('handles zero weight', () => {
    const result = metalValueByWeight(0, 600000, 'INR');
    expect(result.amount).toBe(0);
  });

  it('handles fractional mg producing correct rounding', () => {
    // 1 mg at 600000 paise/g = 600000/1000 = 600 paise
    const result = metalValueByWeight(1, 600000, 'INR');
    expect(result.amount).toBe(600);
  });

  it('calculates value in USD', () => {
    // 10g at $70/g = 7000 cents/g
    const result = metalValueByWeight(10000, 700000, 'USD');
    expect(result.amount).toBe(7000000); // $70,000
    expect(result.currencyCode).toBe('USD');
  });

  it('handles very large weight (1kg)', () => {
    // 1kg = 1000000 mg at Rs 6000/g = Rs 60,00,000
    const result = metalValueByWeight(1000000, 600000, 'INR');
    expect(result.amount).toBe(600000000);
  });
});

describe('metalValueByPurity', () => {
  it('calculates value of 10g at 22K given 24K rate', () => {
    // 10g gross at 22K (916 fineness), rate = Rs 6000/g for pure gold
    // Fine weight = 10000 * 916 / 1000 = 9160 mg
    // Value = 9160 * 600000 / 1000 = 5496000 paise = Rs 54,960
    const result = metalValueByPurity(10000, 916, 600000, 'INR');
    expect(result.amount).toBe(5496000);
  });

  it('calculates value of 10g at 24K (pure gold)', () => {
    // Fine weight = 10000 * 999 / 1000 = 9990 mg
    // Value = 9990 * 600000 / 1000 = 5994000
    const result = metalValueByPurity(10000, 999, 600000, 'INR');
    expect(result.amount).toBe(5994000);
  });

  it('calculates value of 10g at 18K', () => {
    // Fine weight = 10000 * 750 / 1000 = 7500 mg
    // Value = 7500 * 600000 / 1000 = 4500000
    const result = metalValueByPurity(10000, 750, 600000, 'INR');
    expect(result.amount).toBe(4500000);
  });

  it('handles zero weight', () => {
    const result = metalValueByPurity(0, 916, 600000, 'INR');
    expect(result.amount).toBe(0);
  });

  it('value at higher purity is greater than lower purity for same weight', () => {
    const val22k = metalValueByPurity(10000, 916, 600000, 'INR');
    const val18k = metalValueByPurity(10000, 750, 600000, 'INR');
    expect(val22k.amount).toBeGreaterThan(val18k.amount);
  });
});

describe('convertCurrency', () => {
  it('converts INR to USD using exchange rate', () => {
    const amount = MoneyUtil.of(10000000, 'INR'); // Rs 1,00,000
    const rate = {
      fromCurrency: 'INR',
      toCurrency: 'USD',
      rate: 0.012,
      timestamp: new Date(),
      source: 'test',
    };
    const result = convertCurrency(amount, rate);
    expect(result.currencyCode).toBe('USD');
    // Rs 1,00,000 * 0.012 = $1,200 = 120000 cents
    expect(result.amount).toBe(120000);
  });

  it('converts USD to INR', () => {
    const amount = MoneyUtil.of(10000, 'USD'); // $100
    const rate = {
      fromCurrency: 'USD',
      toCurrency: 'INR',
      rate: 83.5,
      timestamp: new Date(),
      source: 'test',
    };
    const result = convertCurrency(amount, rate);
    expect(result.currencyCode).toBe('INR');
    expect(result.amount).toBe(835000);
  });

  it('throws on currency mismatch', () => {
    const amount = MoneyUtil.of(10000, 'GBP');
    const rate = {
      fromCurrency: 'USD',
      toCurrency: 'INR',
      rate: 83.5,
      timestamp: new Date(),
      source: 'test',
    };
    expect(() => convertCurrency(amount, rate)).toThrow('Currency mismatch');
  });

  it('converts zero amount', () => {
    const amount = MoneyUtil.of(0, 'INR');
    const rate = {
      fromCurrency: 'INR',
      toCurrency: 'USD',
      rate: 0.012,
      timestamp: new Date(),
      source: 'test',
    };
    const result = convertCurrency(amount, rate);
    expect(result.amount).toBe(0);
  });
});

describe('troyOzToPerGram', () => {
  it('converts troy ounce rate to per gram rate', () => {
    // If gold is $2000/troy oz in cents = 200000 cents
    // Per gram = 200000 / 31.1035 = 6430 cents
    const result = troyOzToPerGram(200000);
    expect(result).toBe(Math.round(200000 / 31.1035));
  });

  it('handles zero rate', () => {
    expect(troyOzToPerGram(0)).toBe(0);
  });

  it('rounds to nearest integer', () => {
    // 100000 / 31.1035 = 3215.07... -> 3215
    const result = troyOzToPerGram(100000);
    expect(result).toBe(Math.round(100000 / 31.1035));
  });

  it('large rate (platinum at $1000/oz in paise)', () => {
    // Rs 1000/troy oz = 100000 paise
    const result = troyOzToPerGram(100000);
    expect(result).toBe(Math.round(100000 / 31.1035));
    expect(result).toBeGreaterThan(0);
  });
});

describe('tolaToPerGram', () => {
  it('converts tola rate to per gram rate', () => {
    // If gold is Rs 60000/tola = 6000000 paise/tola
    // Per gram = 6000000 / 11.664 = 514403
    const result = tolaToPerGram(6000000);
    expect(result).toBe(Math.round(6000000 / 11.664));
  });

  it('handles zero rate', () => {
    expect(tolaToPerGram(0)).toBe(0);
  });

  it('rounds to nearest integer', () => {
    const result = tolaToPerGram(100000);
    expect(result).toBe(Math.round(100000 / 11.664));
  });
});

describe('per10GramToPerGram', () => {
  it('converts per-10-gram rate to per-gram rate', () => {
    // Rs 60000/10g = 6000000 paise/10g -> 600000 paise/g
    const result = per10GramToPerGram(6000000);
    expect(result).toBe(600000);
  });

  it('handles zero rate', () => {
    expect(per10GramToPerGram(0)).toBe(0);
  });

  it('rounds when not evenly divisible', () => {
    // 100001 / 10 = 10000.1 -> 10000
    const result = per10GramToPerGram(100001);
    expect(result).toBe(10000);
  });

  it('exact division', () => {
    expect(per10GramToPerGram(1000)).toBe(100);
    expect(per10GramToPerGram(50000)).toBe(5000);
  });

  it('rounds up when appropriate', () => {
    // 100005 / 10 = 10000.5 -> 10001
    const result = per10GramToPerGram(100005);
    expect(result).toBe(10001);
  });
});
