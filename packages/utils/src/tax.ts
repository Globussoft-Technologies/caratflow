// ─── CaratFlow Tax Utility ─────────────────────────────────────
// Indian GST, TDS, TCS calculators plus generic tax interface.

import type { Money } from '@caratflow/shared-types';
import { MoneyUtil } from './money';

// ─── Generic Tax Interface ─────────────────────────────────────

export interface TaxBreakdown {
  taxableAmount: Money;
  taxes: TaxComponent[];
  totalTax: Money;
  totalWithTax: Money;
}

export interface TaxComponent {
  type: string;
  rate: number; // percentage (e.g., 1.5 for 1.5%)
  amount: Money;
}

export interface TaxCalculator {
  calculate(amount: Money, params: Record<string, unknown>): TaxBreakdown;
}

// ─── Indian GST Calculator ─────────────────────────────────────

/** HSN code to GST rate mapping for jewelry industry */
const HSN_GST_RATES: Record<string, number> = {
  '7101': 3, // Pearls
  '7102': 3, // Diamonds
  '7103': 3, // Precious stones
  '7104': 3, // Synthetic stones
  '7105': 3, // Dust of precious stones
  '7106': 3, // Silver
  '7107': 3, // Base metals clad with silver
  '7108': 3, // Gold
  '7109': 3, // Base metals clad with gold
  '7110': 3, // Platinum
  '7113': 3, // Jewelry
  '7114': 3, // Articles of goldsmiths/silversmiths
  '7115': 3, // Articles of precious metal
  '7116': 3, // Articles of natural/cultured pearls
  '7117': 3, // Imitation jewelry -- actually 12% but included here
  DEFAULT: 3, // Default rate for jewelry
};

/** Making charges GST rate */
const MAKING_CHARGES_GST_RATE = 5;

export interface GstParams {
  /** Source state code (e.g., "MH" for Maharashtra) */
  sourceState: string;
  /** Destination state code */
  destinationState: string;
  /** HSN code for rate lookup */
  hsnCode?: string;
  /** Override GST rate instead of HSN lookup */
  gstRate?: number;
  /** Whether this is for making charges (5% rate) */
  isMakingCharges?: boolean;
}

export class IndianGstCalculator implements TaxCalculator {
  /** Get the GST rate for an HSN code */
  static getRate(hsnCode?: string, isMakingCharges?: boolean): number {
    if (isMakingCharges) return MAKING_CHARGES_GST_RATE;
    if (!hsnCode) return HSN_GST_RATES['DEFAULT']!;
    // Try exact match, then first 4 digits
    return HSN_GST_RATES[hsnCode] ?? HSN_GST_RATES[hsnCode.slice(0, 4)] ?? HSN_GST_RATES['DEFAULT']!;
  }

  /** Check if transaction is inter-state (IGST) or intra-state (CGST+SGST) */
  static isInterState(sourceState: string, destinationState: string): boolean {
    return sourceState.toUpperCase() !== destinationState.toUpperCase();
  }

  calculate(amount: Money, params: Record<string, unknown>): TaxBreakdown {
    const gstParams = params as unknown as GstParams;
    const rate = gstParams.gstRate ?? IndianGstCalculator.getRate(gstParams.hsnCode, gstParams.isMakingCharges);
    const isInterState = IndianGstCalculator.isInterState(
      gstParams.sourceState,
      gstParams.destinationState,
    );

    const taxes: TaxComponent[] = [];

    if (isInterState) {
      // IGST = full rate
      const igst = MoneyUtil.percentage(amount, rate);
      taxes.push({ type: 'IGST', rate, amount: igst });
    } else {
      // CGST = half rate, SGST = half rate
      const halfRate = rate / 2;
      const cgst = MoneyUtil.percentage(amount, halfRate);
      const sgst = MoneyUtil.percentage(amount, halfRate);
      taxes.push({ type: 'CGST', rate: halfRate, amount: cgst });
      taxes.push({ type: 'SGST', rate: halfRate, amount: sgst });
    }

    const totalTax = taxes.reduce(
      (sum, t) => MoneyUtil.add(sum, t.amount),
      MoneyUtil.of(0, amount.currencyCode),
    );

    return {
      taxableAmount: amount,
      taxes,
      totalTax,
      totalWithTax: MoneyUtil.add(amount, totalTax),
    };
  }
}

// ─── TDS Calculator (Section 194Q) ────────────────────────────
// TDS on purchase of goods exceeding Rs. 50 lakh in a financial year.

export interface TdsParams {
  /** Cumulative purchase amount from this supplier in the FY (paise) */
  cumulativePurchasePaise: number;
  /** Whether supplier has provided PAN */
  hasPan: boolean;
}

export class TdsCalculator {
  /** Threshold above which TDS applies (Rs. 50 lakh = 5,000,000 * 100 paise) */
  static readonly THRESHOLD_PAISE = 5_000_000_00;

  /** TDS rate with PAN */
  static readonly RATE_WITH_PAN = 0.1; // 0.1%

  /** TDS rate without PAN */
  static readonly RATE_WITHOUT_PAN = 5; // 5%

  static calculate(purchaseAmount: Money, params: TdsParams): Money {
    if (params.cumulativePurchasePaise <= TdsCalculator.THRESHOLD_PAISE) {
      return MoneyUtil.of(0, purchaseAmount.currencyCode);
    }

    const rate = params.hasPan ? TdsCalculator.RATE_WITH_PAN : TdsCalculator.RATE_WITHOUT_PAN;
    return MoneyUtil.percentage(purchaseAmount, rate);
  }

  /** Check if threshold is exceeded */
  static isThresholdExceeded(cumulativePaise: number): boolean {
    return cumulativePaise > TdsCalculator.THRESHOLD_PAISE;
  }
}

// ─── TCS Calculator (Section 206C) ────────────────────────────
// TCS on sale of goods exceeding Rs. 50 lakh in a financial year.

export interface TcsParams {
  /** Cumulative sale amount to this buyer in the FY (paise) */
  cumulativeSalePaise: number;
  /** Whether buyer has provided PAN */
  hasPan: boolean;
}

export class TcsCalculator {
  /** Threshold above which TCS applies (Rs. 50 lakh) */
  static readonly THRESHOLD_PAISE = 5_000_000_00;

  /** TCS rate with PAN */
  static readonly RATE_WITH_PAN = 0.1; // 0.1%

  /** TCS rate without PAN */
  static readonly RATE_WITHOUT_PAN = 1; // 1%

  static calculate(saleAmount: Money, params: TcsParams): Money {
    if (params.cumulativeSalePaise <= TcsCalculator.THRESHOLD_PAISE) {
      return MoneyUtil.of(0, saleAmount.currencyCode);
    }

    const rate = params.hasPan ? TcsCalculator.RATE_WITH_PAN : TcsCalculator.RATE_WITHOUT_PAN;
    return MoneyUtil.percentage(saleAmount, rate);
  }

  static isThresholdExceeded(cumulativePaise: number): boolean {
    return cumulativePaise > TcsCalculator.THRESHOLD_PAISE;
  }
}

// ─── US Sales Tax (Placeholder) ────────────────────────────────

export interface UsSalesTaxParams {
  stateCode: string;
  countyRate?: number;
  cityRate?: number;
}

export class UsSalesTaxCalculator implements TaxCalculator {
  /** State-level sales tax rates (simplified -- real implementation needs tax API) */
  private static readonly STATE_RATES: Record<string, number> = {
    CA: 7.25,
    NY: 4.0,
    TX: 6.25,
    FL: 6.0,
    NJ: 6.625,
    // Many states exempt precious metals from sales tax above certain amounts
  };

  calculate(amount: Money, params: Record<string, unknown>): TaxBreakdown {
    const taxParams = params as unknown as UsSalesTaxParams;
    const stateRate = UsSalesTaxCalculator.STATE_RATES[taxParams.stateCode] ?? 0;
    const totalRate = stateRate + (taxParams.countyRate ?? 0) + (taxParams.cityRate ?? 0);

    const taxAmount = MoneyUtil.percentage(amount, totalRate);

    return {
      taxableAmount: amount,
      taxes: [{ type: 'SALES_TAX', rate: totalRate, amount: taxAmount }],
      totalTax: taxAmount,
      totalWithTax: MoneyUtil.add(amount, taxAmount),
    };
  }
}
