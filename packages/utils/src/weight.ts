// ─── CaratFlow Weight Utility ──────────────────────────────────
// All weights stored internally as integers in milligrams.
// Supports conversion between mg, g, kg, carat, tola, troy oz, grain.

import { WeightUnit } from '@caratflow/shared-types';
import type { Weight } from '@caratflow/shared-types';

/** Conversion factors: how many milligrams per unit */
const MG_PER_UNIT: Record<WeightUnit, number> = {
  [WeightUnit.MILLIGRAM]: 1,
  [WeightUnit.GRAM]: 1000,
  [WeightUnit.KILOGRAM]: 1_000_000,
  [WeightUnit.CARAT]: 200, // 1 carat = 200 mg
  [WeightUnit.TOLA]: 11_664, // 1 tola = 11.664 g (Indian standard)
  [WeightUnit.TROY_OUNCE]: 31_103.4768, // 1 troy oz = 31.1035 g
  [WeightUnit.GRAIN]: 64.79891, // 1 grain = 64.799 mg
};

/** Display labels */
const UNIT_LABELS: Record<WeightUnit, string> = {
  [WeightUnit.MILLIGRAM]: 'mg',
  [WeightUnit.GRAM]: 'g',
  [WeightUnit.KILOGRAM]: 'kg',
  [WeightUnit.CARAT]: 'ct',
  [WeightUnit.TOLA]: 'tola',
  [WeightUnit.TROY_OUNCE]: 'troy oz',
  [WeightUnit.GRAIN]: 'gr',
};

export class WeightUtil {
  private constructor() {}

  /** Create a Weight from milligrams */
  static ofMilligrams(mg: number, displayUnit: WeightUnit = WeightUnit.GRAM): Weight {
    if (!Number.isInteger(mg) || mg < 0) {
      throw new Error(`Weight milligrams must be a non-negative integer, got ${mg}`);
    }
    return { milligrams: mg, displayUnit };
  }

  /** Create a Weight from a value in the given unit (converts to mg internally) */
  static fromUnit(value: number, unit: WeightUnit): Weight {
    const factor = MG_PER_UNIT[unit];
    const mg = Math.round(value * factor);
    if (mg < 0) throw new Error('Weight cannot be negative');
    return { milligrams: mg, displayUnit: unit };
  }

  /** Convert milligrams to the specified unit */
  static toUnit(weight: Weight, unit: WeightUnit): number {
    return weight.milligrams / MG_PER_UNIT[unit];
  }

  /** Convert between any two units */
  static convert(value: number, fromUnit: WeightUnit, toUnit: WeightUnit): number {
    const mg = value * MG_PER_UNIT[fromUnit];
    return mg / MG_PER_UNIT[toUnit];
  }

  /** Get the value in the weight's display unit */
  static displayValue(weight: Weight): number {
    return WeightUtil.toUnit(weight, weight.displayUnit);
  }

  /** Add two weights */
  static add(a: Weight, b: Weight): Weight {
    return {
      milligrams: a.milligrams + b.milligrams,
      displayUnit: a.displayUnit,
    };
  }

  /** Subtract b from a */
  static subtract(a: Weight, b: Weight): Weight {
    const result = a.milligrams - b.milligrams;
    if (result < 0) throw new Error('Weight subtraction would result in negative value');
    return {
      milligrams: result,
      displayUnit: a.displayUnit,
    };
  }

  /** Multiply weight by a factor */
  static multiply(weight: Weight, factor: number): Weight {
    return {
      milligrams: Math.round(weight.milligrams * factor),
      displayUnit: weight.displayUnit,
    };
  }

  /** Compare two weights. Returns -1, 0, or 1. */
  static compare(a: Weight, b: Weight): -1 | 0 | 1 {
    if (a.milligrams < b.milligrams) return -1;
    if (a.milligrams > b.milligrams) return 1;
    return 0;
  }

  static isZero(weight: Weight): boolean {
    return weight.milligrams === 0;
  }

  /** Format weight for display with unit label */
  static format(weight: Weight, decimalPlaces: number = 3): string {
    const value = WeightUtil.displayValue(weight);
    const label = UNIT_LABELS[weight.displayUnit];
    return `${value.toFixed(decimalPlaces)} ${label}`;
  }

  /** Parse a weight string like "10.5 g" or "2.3 ct" */
  static parse(str: string): Weight {
    const trimmed = str.trim();
    const match = trimmed.match(/^([\d.]+)\s*(.+)$/);
    if (!match) throw new Error(`Cannot parse weight string: "${str}"`);

    const value = parseFloat(match[1]!);
    const unitStr = match[2]!.toLowerCase().trim();

    const unitMap: Record<string, WeightUnit> = {
      mg: WeightUnit.MILLIGRAM,
      milligram: WeightUnit.MILLIGRAM,
      milligrams: WeightUnit.MILLIGRAM,
      g: WeightUnit.GRAM,
      gram: WeightUnit.GRAM,
      grams: WeightUnit.GRAM,
      kg: WeightUnit.KILOGRAM,
      kilogram: WeightUnit.KILOGRAM,
      kilograms: WeightUnit.KILOGRAM,
      ct: WeightUnit.CARAT,
      carat: WeightUnit.CARAT,
      carats: WeightUnit.CARAT,
      tola: WeightUnit.TOLA,
      'troy oz': WeightUnit.TROY_OUNCE,
      'troy ounce': WeightUnit.TROY_OUNCE,
      gr: WeightUnit.GRAIN,
      grain: WeightUnit.GRAIN,
      grains: WeightUnit.GRAIN,
    };

    const unit = unitMap[unitStr];
    if (!unit) throw new Error(`Unknown weight unit: "${unitStr}"`);

    return WeightUtil.fromUnit(value, unit);
  }

  /** Get milligrams per unit for external use */
  static getConversionFactor(unit: WeightUnit): number {
    return MG_PER_UNIT[unit];
  }
}
