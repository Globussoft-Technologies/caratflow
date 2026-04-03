// ─── Lightweight Money Utility for Mobile ───────────────────────
// Mirrors @caratflow/utils MoneyUtil for offline/mobile use.

export interface Money {
  amount: number; // integer in smallest currency unit (paise, cents)
  currencyCode: string;
}

const CURRENCY_META: Record<
  string,
  { symbol: string; locale: string; decimals: number }
> = {
  INR: { symbol: '\u20B9', locale: 'en-IN', decimals: 2 },
  USD: { symbol: '$', locale: 'en-US', decimals: 2 },
  AED: { symbol: '\u062F.\u0625', locale: 'ar-AE', decimals: 2 },
  GBP: { symbol: '\u00A3', locale: 'en-GB', decimals: 2 },
  EUR: { symbol: '\u20AC', locale: 'de-DE', decimals: 2 },
  SGD: { symbol: 'S$', locale: 'en-SG', decimals: 2 },
};

export function formatMoney(
  amountPaise: number,
  currencyCode: string = 'INR',
  locale?: string,
): string {
  const meta = CURRENCY_META[currencyCode];
  const decimals = meta?.decimals ?? 2;
  const displayLocale = locale ?? meta?.locale ?? 'en-US';
  const value = amountPaise / Math.pow(10, decimals);

  try {
    return new Intl.NumberFormat(displayLocale, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  } catch {
    const symbol = meta?.symbol ?? currencyCode;
    return `${symbol}${value.toFixed(decimals)}`;
  }
}

export function formatMoneyShort(
  amountPaise: number,
  currencyCode: string = 'INR',
): string {
  const meta = CURRENCY_META[currencyCode];
  const decimals = meta?.decimals ?? 2;
  const value = amountPaise / Math.pow(10, decimals);
  const symbol = meta?.symbol ?? currencyCode + ' ';

  if (value >= 10_000_000) {
    return `${symbol}${(value / 10_000_000).toFixed(2)}Cr`;
  }
  if (value >= 100_000) {
    return `${symbol}${(value / 100_000).toFixed(2)}L`;
  }
  if (value >= 1_000) {
    return `${symbol}${(value / 1_000).toFixed(1)}K`;
  }
  return `${symbol}${value.toFixed(decimals)}`;
}

export function paiseToDecimal(
  amountPaise: number,
  currencyCode: string = 'INR',
): number {
  const decimals = CURRENCY_META[currencyCode]?.decimals ?? 2;
  return amountPaise / Math.pow(10, decimals);
}

export function decimalToPaise(
  decimalAmount: number,
  currencyCode: string = 'INR',
): number {
  const decimals = CURRENCY_META[currencyCode]?.decimals ?? 2;
  return Math.round(decimalAmount * Math.pow(10, decimals));
}
