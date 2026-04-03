// ─── CaratFlow Purity Utility ──────────────────────────────────
// Handles gold/silver/platinum purity conversions.
// Fineness is stored as integer: 999 = 24K, 916 = 22K, etc.

/** Standard karat to fineness mapping */
const KARAT_FINENESS_MAP: Record<number, number> = {
  24: 999,
  23: 958,
  22: 916,
  21: 875,
  20: 833,
  18: 750,
  16: 667,
  14: 585,
  12: 500,
  10: 417,
  9: 375,
};

/** Reverse map: fineness -> karat (common values) */
const FINENESS_KARAT_MAP: Record<number, number> = {};
for (const [k, v] of Object.entries(KARAT_FINENESS_MAP)) {
  FINENESS_KARAT_MAP[v] = parseInt(k, 10);
}

export class PurityUtil {
  private constructor() {}

  /** Convert karat to fineness (e.g., 22 -> 916) */
  static karatToFineness(karat: number): number {
    const mapped = KARAT_FINENESS_MAP[karat];
    if (mapped !== undefined) return mapped;
    // Calculate: fineness = (karat / 24) * 1000, rounded
    return Math.round((karat / 24) * 1000);
  }

  /** Convert fineness to karat (e.g., 916 -> 22). Returns nearest standard karat. */
  static finenessToKarat(fineness: number): number {
    const mapped = FINENESS_KARAT_MAP[fineness];
    if (mapped !== undefined) return mapped;
    // Calculate: karat = (fineness / 1000) * 24
    return Math.round((fineness / 1000) * 24 * 100) / 100;
  }

  /** Convert fineness to percentage (e.g., 916 -> 91.6) */
  static finenessToPercentage(fineness: number): number {
    return fineness / 10;
  }

  /** Convert percentage to fineness (e.g., 91.6 -> 916) */
  static percentageToFineness(percentage: number): number {
    return Math.round(percentage * 10);
  }

  /**
   * Calculate fine weight (pure metal content) in milligrams.
   * fineWeight = grossWeightMg * fineness / 1000
   */
  static fineWeight(grossWeightMg: number, fineness: number): number {
    return Math.round((grossWeightMg * fineness) / 1000);
  }

  /**
   * Calculate gross weight needed for a desired fine weight.
   * grossWeight = fineWeightMg * 1000 / fineness
   */
  static grossWeightForFineWeight(fineWeightMg: number, fineness: number): number {
    if (fineness <= 0) throw new Error('Fineness must be positive');
    return Math.round((fineWeightMg * 1000) / fineness);
  }

  /** Get display string (e.g., "22K (916)") */
  static displayString(fineness: number): string {
    const karat = FINENESS_KARAT_MAP[fineness];
    if (karat !== undefined) {
      return `${karat}K (${fineness})`;
    }
    return `${fineness} fineness`;
  }

  /** Get all standard purities for a metal type */
  static standardPurities(metalType: 'GOLD' | 'SILVER' | 'PLATINUM'): Array<{ karat: number; fineness: number; label: string }> {
    switch (metalType) {
      case 'GOLD':
        return [
          { karat: 24, fineness: 999, label: '24K Pure Gold' },
          { karat: 22, fineness: 916, label: '22K Gold' },
          { karat: 18, fineness: 750, label: '18K Gold' },
          { karat: 14, fineness: 585, label: '14K Gold' },
        ];
      case 'SILVER':
        return [
          { karat: 24, fineness: 999, label: 'Fine Silver (999)' },
          { karat: 23, fineness: 958, label: 'Britannia Silver (958)' },
          { karat: 22, fineness: 925, label: 'Sterling Silver (925)' },
          { karat: 20, fineness: 800, label: 'Continental Silver (800)' },
        ];
      case 'PLATINUM':
        return [
          { karat: 24, fineness: 999, label: 'Pt999' },
          { karat: 23, fineness: 950, label: 'Pt950' },
          { karat: 22, fineness: 900, label: 'Pt900' },
          { karat: 21, fineness: 850, label: 'Pt850' },
        ];
    }
  }

  /** Validate that a fineness value is within valid range */
  static isValid(fineness: number): boolean {
    return Number.isInteger(fineness) && fineness > 0 && fineness <= 999;
  }
}
