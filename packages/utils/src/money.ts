// ─── CaratFlow Money Utility ───────────────────────────────────
// All monetary values are stored as integers in the smallest currency unit
// (paise for INR, cents for USD, fils for AED, etc.)
// This prevents floating-point precision issues.

import type { Money } from '@caratflow/shared-types';

/** Currency metadata for formatting */
const CURRENCY_META: Record<string, { symbol: string; locale: string; decimals: number }> = {
  INR: { symbol: '\u20B9', locale: 'en-IN', decimals: 2 },
  USD: { symbol: '$', locale: 'en-US', decimals: 2 },
  AED: { symbol: '\u062F.\u0625', locale: 'ar-AE', decimals: 2 },
  GBP: { symbol: '\u00A3', locale: 'en-GB', decimals: 2 },
  EUR: { symbol: '\u20AC', locale: 'de-DE', decimals: 2 },
  SGD: { symbol: 'S$', locale: 'en-SG', decimals: 2 },
};

export class MoneyUtil {
  private constructor() {}

  /** Create a Money value from integer smallest-unit amount */
  static of(amount: number, currencyCode: string): Money {
    if (!Number.isInteger(amount)) {
      throw new Error(`Money amount must be an integer, got ${amount}`);
    }
    return { amount, currencyCode: currencyCode.toUpperCase() };
  }

  /** Create Money from a decimal string (e.g., "1234.56" INR -> 123456 paise) */
  static fromDecimal(decimalStr: string, currencyCode: string): Money {
    const code = currencyCode.toUpperCase();
    const decimals = CURRENCY_META[code]?.decimals ?? 2;
    const parts = decimalStr.replace(/[^0-9.-]/g, '').split('.');
    const whole = parseInt(parts[0] ?? '0', 10);
    const fractional = (parts[1] ?? '').padEnd(decimals, '0').slice(0, decimals);
    const multiplier = Math.pow(10, decimals);
    const amount = whole * multiplier + parseInt(fractional, 10) * (whole < 0 ? -1 : 1);
    return { amount, currencyCode: code };
  }

  /** Convert smallest-unit integer to decimal number (for display only) */
  static toDecimal(money: Money): number {
    const decimals = CURRENCY_META[money.currencyCode]?.decimals ?? 2;
    return money.amount / Math.pow(10, decimals);
  }

  /** Add two money values (must be same currency) */
  static add(a: Money, b: Money): Money {
    MoneyUtil.assertSameCurrency(a, b);
    return { amount: a.amount + b.amount, currencyCode: a.currencyCode };
  }

  /** Subtract b from a (must be same currency) */
  static subtract(a: Money, b: Money): Money {
    MoneyUtil.assertSameCurrency(a, b);
    return { amount: a.amount - b.amount, currencyCode: a.currencyCode };
  }

  /** Multiply by a factor (result is rounded to nearest integer) */
  static multiply(money: Money, factor: number): Money {
    return { amount: Math.round(money.amount * factor), currencyCode: money.currencyCode };
  }

  /** Divide by a divisor (result is rounded to nearest integer) */
  static divide(money: Money, divisor: number): Money {
    if (divisor === 0) throw new Error('Cannot divide money by zero');
    return { amount: Math.round(money.amount / divisor), currencyCode: money.currencyCode };
  }

  /** Compare two money values. Returns -1, 0, or 1. */
  static compare(a: Money, b: Money): -1 | 0 | 1 {
    MoneyUtil.assertSameCurrency(a, b);
    if (a.amount < b.amount) return -1;
    if (a.amount > b.amount) return 1;
    return 0;
  }

  static isZero(money: Money): boolean {
    return money.amount === 0;
  }

  static isPositive(money: Money): boolean {
    return money.amount > 0;
  }

  static isNegative(money: Money): boolean {
    return money.amount < 0;
  }

  static abs(money: Money): Money {
    return { amount: Math.abs(money.amount), currencyCode: money.currencyCode };
  }

  /** Format for display with currency symbol and locale grouping */
  static format(money: Money, locale?: string): string {
    const meta = CURRENCY_META[money.currencyCode];
    const decimals = meta?.decimals ?? 2;
    const displayLocale = locale ?? meta?.locale ?? 'en-US';
    const value = money.amount / Math.pow(10, decimals);

    try {
      return new Intl.NumberFormat(displayLocale, {
        style: 'currency',
        currency: money.currencyCode,
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(value);
    } catch {
      // Fallback if Intl doesn't support the currency
      const symbol = meta?.symbol ?? money.currencyCode;
      return `${symbol}${value.toFixed(decimals)}`;
    }
  }

  /** Convert between currencies using a rate (rate = target per 1 source unit) */
  static convert(money: Money, targetCurrencyCode: string, rate: number): Money {
    if (rate <= 0) throw new Error('Exchange rate must be positive');
    const targetCode = targetCurrencyCode.toUpperCase();
    const sourceDecimals = CURRENCY_META[money.currencyCode]?.decimals ?? 2;
    const targetDecimals = CURRENCY_META[targetCode]?.decimals ?? 2;

    // Normalize to base units, apply rate, convert to target smallest unit
    const baseValue = money.amount / Math.pow(10, sourceDecimals);
    const convertedBase = baseValue * rate;
    const targetAmount = Math.round(convertedBase * Math.pow(10, targetDecimals));

    return { amount: targetAmount, currencyCode: targetCode };
  }

  /** Calculate percentage of a money amount */
  static percentage(money: Money, percent: number): Money {
    return { amount: Math.round((money.amount * percent) / 100), currencyCode: money.currencyCode };
  }

  /** Split money into n equal parts (handles remainders by giving extra to first part) */
  static split(money: Money, parts: number): Money[] {
    if (parts <= 0 || !Number.isInteger(parts)) throw new Error('Parts must be a positive integer');
    const base = Math.floor(money.amount / parts);
    const remainder = money.amount - base * parts;
    return Array.from({ length: parts }, (_, i) => ({
      amount: base + (i < remainder ? 1 : 0),
      currencyCode: money.currencyCode,
    }));
  }

  private static assertSameCurrency(a: Money, b: Money): void {
    if (a.currencyCode !== b.currencyCode) {
      throw new Error(
        `Currency mismatch: cannot operate on ${a.currencyCode} and ${b.currencyCode}`,
      );
    }
  }
}
