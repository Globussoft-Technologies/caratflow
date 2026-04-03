// ─── CaratFlow Rate Utilities ──────────────────────────────────
// Types and helpers for metal rate feeds and currency exchange.

import type { Money } from '@caratflow/shared-types';
import { MoneyUtil } from './money';

// ─── Rate Types ────────────────────────────────────────────────

export interface MetalRate {
  metalType: string; // GOLD, SILVER, PLATINUM
  purity: number; // fineness (e.g., 999, 916)
  pricePerGramPaise: number; // in smallest currency unit per gram
  currencyCode: string;
  timestamp: Date;
  source: string; // e.g., "MCX", "LBMA", "manual"
}

export interface ExchangeRate {
  fromCurrency: string;
  toCurrency: string;
  rate: number; // how many target per 1 source
  timestamp: Date;
  source: string;
}

// ─── Rate Cache Interface ──────────────────────────────────────

export interface RateCache {
  getMetalRate(metalType: string, purity: number, currencyCode: string): Promise<MetalRate | null>;
  setMetalRate(rate: MetalRate, ttlSeconds: number): Promise<void>;
  getExchangeRate(fromCurrency: string, toCurrency: string): Promise<ExchangeRate | null>;
  setExchangeRate(rate: ExchangeRate, ttlSeconds: number): Promise<void>;
}

// ─── Rate Conversion Helpers ───────────────────────────────────

/**
 * Calculate value of metal by weight.
 * @param weightMg - weight in milligrams
 * @param ratePerGramPaise - rate per gram in paise/cents
 * @param currencyCode - currency code
 * @returns Money value
 */
export function metalValueByWeight(
  weightMg: number,
  ratePerGramPaise: number,
  currencyCode: string,
): Money {
  // weightMg / 1000 = grams, then * rate per gram
  const valuePaise = Math.round((weightMg * ratePerGramPaise) / 1000);
  return MoneyUtil.of(valuePaise, currencyCode);
}

/**
 * Calculate value of metal considering purity.
 * @param grossWeightMg - gross weight in milligrams
 * @param fineness - purity fineness (e.g., 916)
 * @param ratePerGramPaise - rate for pure (999) metal per gram
 * @param currencyCode - currency code
 * @returns Money value for the fine metal content
 */
export function metalValueByPurity(
  grossWeightMg: number,
  fineness: number,
  ratePerGramPaise: number,
  currencyCode: string,
): Money {
  // Fine weight = gross * fineness / 1000
  // Value = fineWeightGrams * rate
  const fineWeightMg = Math.round((grossWeightMg * fineness) / 1000);
  return metalValueByWeight(fineWeightMg, ratePerGramPaise, currencyCode);
}

/**
 * Convert a money amount using an exchange rate.
 */
export function convertCurrency(
  amount: Money,
  rate: ExchangeRate,
): Money {
  if (amount.currencyCode !== rate.fromCurrency) {
    throw new Error(
      `Currency mismatch: amount is ${amount.currencyCode}, rate is from ${rate.fromCurrency}`,
    );
  }
  return MoneyUtil.convert(amount, rate.toCurrency, rate.rate);
}

/**
 * Calculate per-gram rate from a per-troy-ounce rate (used for international rates).
 * 1 troy ounce = 31.1035 grams
 */
export function troyOzToPerGram(ratePerTroyOzPaise: number): number {
  return Math.round(ratePerTroyOzPaise / 31.1035);
}

/**
 * Calculate per-gram rate from a per-tola rate (used in India).
 * 1 tola = 11.664 grams
 */
export function tolaToPerGram(ratePerTolaPaise: number): number {
  return Math.round(ratePerTolaPaise / 11.664);
}

/**
 * Calculate per-gram rate from a per-10-gram rate (common in India).
 */
export function per10GramToPerGram(ratePer10GramPaise: number): number {
  return Math.round(ratePer10GramPaise / 10);
}
