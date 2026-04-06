import { describe, it, expect } from 'vitest';
import { WeightUtil } from '../weight';
import { WeightUnit } from '@caratflow/shared-types';

describe('WeightUtil', () => {
  // ─── Factory Methods ─────────────────────────────────────────

  describe('ofMilligrams', () => {
    it('creates a weight from milligrams', () => {
      const w = WeightUtil.ofMilligrams(10000);
      expect(w.milligrams).toBe(10000);
      expect(w.displayUnit).toBe(WeightUnit.GRAM);
    });

    it('accepts a custom display unit', () => {
      const w = WeightUtil.ofMilligrams(2000, WeightUnit.CARAT);
      expect(w.milligrams).toBe(2000);
      expect(w.displayUnit).toBe(WeightUnit.CARAT);
    });

    it('throws on negative milligrams', () => {
      expect(() => WeightUtil.ofMilligrams(-1)).toThrow();
    });

    it('throws on non-integer milligrams', () => {
      expect(() => WeightUtil.ofMilligrams(10.5)).toThrow();
    });

    it('allows zero milligrams', () => {
      const w = WeightUtil.ofMilligrams(0);
      expect(w.milligrams).toBe(0);
      expect(WeightUtil.isZero(w)).toBe(true);
    });

    it('allows very large milligrams (1 tonne = 1 billion mg)', () => {
      const w = WeightUtil.ofMilligrams(1_000_000_000);
      expect(w.milligrams).toBe(1_000_000_000);
    });

    it('defaults to GRAM display unit when not specified', () => {
      const w = WeightUtil.ofMilligrams(5000);
      expect(w.displayUnit).toBe(WeightUnit.GRAM);
    });

    it('accepts all weight unit types as display unit', () => {
      const units = [
        WeightUnit.MILLIGRAM,
        WeightUnit.GRAM,
        WeightUnit.KILOGRAM,
        WeightUnit.CARAT,
        WeightUnit.TOLA,
        WeightUnit.TROY_OUNCE,
        WeightUnit.GRAIN,
      ];
      for (const unit of units) {
        const w = WeightUtil.ofMilligrams(1000, unit);
        expect(w.displayUnit).toBe(unit);
      }
    });
  });

  describe('fromUnit', () => {
    it('converts grams to milligrams', () => {
      const w = WeightUtil.fromUnit(10, WeightUnit.GRAM);
      expect(w.milligrams).toBe(10000);
    });

    it('converts carats to milligrams (1 ct = 200 mg)', () => {
      const w = WeightUtil.fromUnit(5, WeightUnit.CARAT);
      expect(w.milligrams).toBe(1000);
    });

    it('converts tola to milligrams (1 tola = 11664 mg)', () => {
      const w = WeightUtil.fromUnit(1, WeightUnit.TOLA);
      expect(w.milligrams).toBe(11664);
    });

    it('converts kilograms to milligrams', () => {
      const w = WeightUtil.fromUnit(1, WeightUnit.KILOGRAM);
      expect(w.milligrams).toBe(1_000_000);
    });

    it('converts troy ounce to milligrams', () => {
      const w = WeightUtil.fromUnit(1, WeightUnit.TROY_OUNCE);
      // 1 troy oz = 31103.4768 mg, rounded to 31103
      expect(w.milligrams).toBe(31103);
    });

    it('converts grains to milligrams', () => {
      const w = WeightUtil.fromUnit(1, WeightUnit.GRAIN);
      // 1 grain = 64.79891 mg, rounded to 65
      expect(w.milligrams).toBe(65);
    });

    it('converts milligrams to milligrams (identity)', () => {
      const w = WeightUtil.fromUnit(500, WeightUnit.MILLIGRAM);
      expect(w.milligrams).toBe(500);
    });

    it('rounds fractional milligrams to nearest integer', () => {
      const w = WeightUtil.fromUnit(10.5, WeightUnit.GRAM);
      expect(w.milligrams).toBe(10500);
    });

    it('sets display unit to the source unit', () => {
      const w = WeightUtil.fromUnit(5, WeightUnit.CARAT);
      expect(w.displayUnit).toBe(WeightUnit.CARAT);
    });

    it('handles fractional carats', () => {
      // 0.5 ct = 100 mg
      const w = WeightUtil.fromUnit(0.5, WeightUnit.CARAT);
      expect(w.milligrams).toBe(100);
    });

    it('handles fractional tola', () => {
      // 0.5 tola = 5832 mg
      const w = WeightUtil.fromUnit(0.5, WeightUnit.TOLA);
      expect(w.milligrams).toBe(5832);
    });

    it('throws on negative result', () => {
      expect(() => WeightUtil.fromUnit(-1, WeightUnit.GRAM)).toThrow();
    });
  });

  // ─── Conversions ─────────────────────────────────────────────

  describe('toUnit', () => {
    it('converts milligrams to grams', () => {
      const w = WeightUtil.ofMilligrams(10000);
      expect(WeightUtil.toUnit(w, WeightUnit.GRAM)).toBe(10);
    });

    it('converts milligrams to carats', () => {
      const w = WeightUtil.ofMilligrams(1000);
      expect(WeightUtil.toUnit(w, WeightUnit.CARAT)).toBe(5);
    });

    it('converts milligrams to tola', () => {
      const w = WeightUtil.ofMilligrams(11664);
      expect(WeightUtil.toUnit(w, WeightUnit.TOLA)).toBeCloseTo(1, 4);
    });

    it('converts milligrams to troy ounce', () => {
      const w = WeightUtil.ofMilligrams(31103);
      expect(WeightUtil.toUnit(w, WeightUnit.TROY_OUNCE)).toBeCloseTo(1, 2);
    });

    it('converts milligrams to kilograms', () => {
      const w = WeightUtil.ofMilligrams(1_000_000);
      expect(WeightUtil.toUnit(w, WeightUnit.KILOGRAM)).toBe(1);
    });

    it('converts milligrams to grains', () => {
      const w = WeightUtil.ofMilligrams(65);
      expect(WeightUtil.toUnit(w, WeightUnit.GRAIN)).toBeCloseTo(1, 1);
    });

    it('identity conversion (mg to mg)', () => {
      const w = WeightUtil.ofMilligrams(12345);
      expect(WeightUtil.toUnit(w, WeightUnit.MILLIGRAM)).toBe(12345);
    });

    it('zero milligrams converts to zero in any unit', () => {
      const w = WeightUtil.ofMilligrams(0);
      expect(WeightUtil.toUnit(w, WeightUnit.GRAM)).toBe(0);
      expect(WeightUtil.toUnit(w, WeightUnit.CARAT)).toBe(0);
      expect(WeightUtil.toUnit(w, WeightUnit.TOLA)).toBe(0);
    });
  });

  describe('convert (between units)', () => {
    it('converts grams to carats', () => {
      const result = WeightUtil.convert(1, WeightUnit.GRAM, WeightUnit.CARAT);
      expect(result).toBe(5);
    });

    it('converts tola to grams', () => {
      const result = WeightUtil.convert(1, WeightUnit.TOLA, WeightUnit.GRAM);
      expect(result).toBeCloseTo(11.664, 3);
    });

    it('converts troy ounce to grams', () => {
      const result = WeightUtil.convert(1, WeightUnit.TROY_OUNCE, WeightUnit.GRAM);
      expect(result).toBeCloseTo(31.1035, 2);
    });

    it('converts grams to kilograms', () => {
      expect(WeightUtil.convert(1000, WeightUnit.GRAM, WeightUnit.KILOGRAM)).toBe(1);
    });

    it('converts carats to grams', () => {
      // 5 ct = 1000 mg = 1 g
      expect(WeightUtil.convert(5, WeightUnit.CARAT, WeightUnit.GRAM)).toBe(1);
    });

    it('converts tola to troy ounce', () => {
      const result = WeightUtil.convert(1, WeightUnit.TOLA, WeightUnit.TROY_OUNCE);
      // 1 tola = 11664 mg, 1 troy oz = 31103.4768 mg
      expect(result).toBeCloseTo(11664 / 31103.4768, 4);
    });

    it('converts grains to carats', () => {
      // 1 grain = 64.79891 mg, 1 ct = 200 mg
      const result = WeightUtil.convert(1, WeightUnit.GRAIN, WeightUnit.CARAT);
      expect(result).toBeCloseTo(64.79891 / 200, 4);
    });

    it('identity conversion returns same value', () => {
      expect(WeightUtil.convert(10, WeightUnit.GRAM, WeightUnit.GRAM)).toBe(10);
    });
  });

  describe('round-trip conversions', () => {
    it('mg -> g -> mg is lossless for integer grams', () => {
      const original = 10000;
      const inGrams = WeightUtil.convert(original, WeightUnit.MILLIGRAM, WeightUnit.GRAM);
      const backToMg = WeightUtil.convert(inGrams, WeightUnit.GRAM, WeightUnit.MILLIGRAM);
      expect(backToMg).toBe(original);
    });

    it('g -> ct -> g preserves value', () => {
      const grams = 10;
      const carats = WeightUtil.convert(grams, WeightUnit.GRAM, WeightUnit.CARAT);
      const backToGrams = WeightUtil.convert(carats, WeightUnit.CARAT, WeightUnit.GRAM);
      expect(backToGrams).toBeCloseTo(grams, 8);
    });

    it('g -> tola -> g is approximately lossless', () => {
      const grams = 11.664;
      const tola = WeightUtil.convert(grams, WeightUnit.GRAM, WeightUnit.TOLA);
      const backToGrams = WeightUtil.convert(tola, WeightUnit.TOLA, WeightUnit.GRAM);
      expect(backToGrams).toBeCloseTo(grams, 4);
    });

    it('g -> troy oz -> g is approximately lossless', () => {
      const grams = 31.1035;
      const troyOz = WeightUtil.convert(grams, WeightUnit.GRAM, WeightUnit.TROY_OUNCE);
      const backToGrams = WeightUtil.convert(troyOz, WeightUnit.TROY_OUNCE, WeightUnit.GRAM);
      expect(backToGrams).toBeCloseTo(grams, 4);
    });

    it('mg -> carat -> mg within 1mg for fromUnit/toUnit', () => {
      const w = WeightUtil.fromUnit(5, WeightUnit.CARAT); // 1000 mg
      const backToCarats = WeightUtil.toUnit(w, WeightUnit.CARAT);
      expect(backToCarats).toBe(5);
    });

    it('mg -> kg -> mg is lossless for integer kg', () => {
      const original = 1_000_000;
      const inKg = WeightUtil.convert(original, WeightUnit.MILLIGRAM, WeightUnit.KILOGRAM);
      const backToMg = WeightUtil.convert(inKg, WeightUnit.KILOGRAM, WeightUnit.MILLIGRAM);
      expect(backToMg).toBe(original);
    });
  });

  // ─── Known values ────────────────────────────────────────────

  describe('known conversion values', () => {
    it('1 tola = 11664 mg', () => {
      expect(WeightUtil.getConversionFactor(WeightUnit.TOLA)).toBe(11664);
    });

    it('1 carat = 200 mg', () => {
      expect(WeightUtil.getConversionFactor(WeightUnit.CARAT)).toBe(200);
    });

    it('1 troy ounce = 31103.4768 mg', () => {
      expect(WeightUtil.getConversionFactor(WeightUnit.TROY_OUNCE)).toBeCloseTo(31103.4768, 2);
    });

    it('1 grain = 64.79891 mg', () => {
      expect(WeightUtil.getConversionFactor(WeightUnit.GRAIN)).toBeCloseTo(64.79891, 3);
    });

    it('1 gram = 1000 mg', () => {
      expect(WeightUtil.getConversionFactor(WeightUnit.GRAM)).toBe(1000);
    });

    it('1 kilogram = 1000000 mg', () => {
      expect(WeightUtil.getConversionFactor(WeightUnit.KILOGRAM)).toBe(1_000_000);
    });
  });

  // ─── Arithmetic ──────────────────────────────────────────────

  describe('add', () => {
    it('adds two weights', () => {
      const a = WeightUtil.ofMilligrams(5000);
      const b = WeightUtil.ofMilligrams(3000);
      const result = WeightUtil.add(a, b);
      expect(result.milligrams).toBe(8000);
    });

    it('preserves display unit of the first operand', () => {
      const a = WeightUtil.ofMilligrams(5000, WeightUnit.CARAT);
      const b = WeightUtil.ofMilligrams(3000, WeightUnit.GRAM);
      const result = WeightUtil.add(a, b);
      expect(result.displayUnit).toBe(WeightUnit.CARAT);
    });

    it('adds zero weight', () => {
      const a = WeightUtil.ofMilligrams(5000);
      const zero = WeightUtil.ofMilligrams(0);
      expect(WeightUtil.add(a, zero).milligrams).toBe(5000);
    });

    it('commutative: a+b == b+a in milligrams', () => {
      const a = WeightUtil.ofMilligrams(3000);
      const b = WeightUtil.ofMilligrams(7000);
      expect(WeightUtil.add(a, b).milligrams).toBe(WeightUtil.add(b, a).milligrams);
    });
  });

  describe('subtract', () => {
    it('subtracts two weights', () => {
      const a = WeightUtil.ofMilligrams(5000);
      const b = WeightUtil.ofMilligrams(2000);
      const result = WeightUtil.subtract(a, b);
      expect(result.milligrams).toBe(3000);
    });

    it('throws when result would be negative', () => {
      const a = WeightUtil.ofMilligrams(1000);
      const b = WeightUtil.ofMilligrams(5000);
      expect(() => WeightUtil.subtract(a, b)).toThrow('negative');
    });

    it('allows subtraction to zero', () => {
      const a = WeightUtil.ofMilligrams(1000);
      const b = WeightUtil.ofMilligrams(1000);
      expect(WeightUtil.subtract(a, b).milligrams).toBe(0);
    });

    it('preserves display unit of the first operand', () => {
      const a = WeightUtil.ofMilligrams(5000, WeightUnit.TOLA);
      const b = WeightUtil.ofMilligrams(2000, WeightUnit.GRAM);
      expect(WeightUtil.subtract(a, b).displayUnit).toBe(WeightUnit.TOLA);
    });
  });

  describe('multiply', () => {
    it('multiplies weight by a factor', () => {
      const w = WeightUtil.ofMilligrams(1000);
      const result = WeightUtil.multiply(w, 3);
      expect(result.milligrams).toBe(3000);
    });

    it('rounds the result', () => {
      const w = WeightUtil.ofMilligrams(1000);
      const result = WeightUtil.multiply(w, 1.5);
      expect(result.milligrams).toBe(1500);
    });

    it('multiplies by fractional factor with rounding', () => {
      const w = WeightUtil.ofMilligrams(333);
      // 333 * 0.1 = 33.3 -> 33
      expect(WeightUtil.multiply(w, 0.1).milligrams).toBe(33);
    });

    it('multiplies by zero', () => {
      const w = WeightUtil.ofMilligrams(5000);
      expect(WeightUtil.multiply(w, 0).milligrams).toBe(0);
    });

    it('preserves display unit', () => {
      const w = WeightUtil.ofMilligrams(1000, WeightUnit.CARAT);
      expect(WeightUtil.multiply(w, 2).displayUnit).toBe(WeightUnit.CARAT);
    });
  });

  describe('compare', () => {
    it('returns -1 when a < b', () => {
      const a = WeightUtil.ofMilligrams(1000);
      const b = WeightUtil.ofMilligrams(2000);
      expect(WeightUtil.compare(a, b)).toBe(-1);
    });

    it('returns 0 when equal', () => {
      const a = WeightUtil.ofMilligrams(1000);
      const b = WeightUtil.ofMilligrams(1000);
      expect(WeightUtil.compare(a, b)).toBe(0);
    });

    it('returns 1 when a > b', () => {
      const a = WeightUtil.ofMilligrams(3000);
      const b = WeightUtil.ofMilligrams(1000);
      expect(WeightUtil.compare(a, b)).toBe(1);
    });

    it('compares zero with non-zero', () => {
      const zero = WeightUtil.ofMilligrams(0);
      const nonZero = WeightUtil.ofMilligrams(1);
      expect(WeightUtil.compare(zero, nonZero)).toBe(-1);
      expect(WeightUtil.compare(nonZero, zero)).toBe(1);
    });

    it('compares regardless of display unit', () => {
      const a = WeightUtil.ofMilligrams(1000, WeightUnit.GRAM);
      const b = WeightUtil.ofMilligrams(1000, WeightUnit.CARAT);
      expect(WeightUtil.compare(a, b)).toBe(0);
    });
  });

  // ─── Formatting ──────────────────────────────────────────────

  describe('format', () => {
    it('formats weight in grams with unit label', () => {
      const w = WeightUtil.fromUnit(10.5, WeightUnit.GRAM);
      expect(WeightUtil.format(w)).toBe('10.500 g');
    });

    it('formats carats', () => {
      const w = WeightUtil.fromUnit(2.3, WeightUnit.CARAT);
      expect(WeightUtil.format(w)).toBe('2.300 ct');
    });

    it('formats tola', () => {
      const w = WeightUtil.fromUnit(1, WeightUnit.TOLA);
      expect(WeightUtil.format(w)).toBe('1.000 tola');
    });

    it('formats troy ounce', () => {
      const w = WeightUtil.fromUnit(1, WeightUnit.TROY_OUNCE);
      const formatted = WeightUtil.format(w);
      expect(formatted).toContain('troy oz');
      expect(formatted).toContain('1.0');
    });

    it('formats kilograms', () => {
      const w = WeightUtil.fromUnit(2.5, WeightUnit.KILOGRAM);
      expect(WeightUtil.format(w)).toBe('2.500 kg');
    });

    it('formats milligrams', () => {
      const w = WeightUtil.ofMilligrams(500, WeightUnit.MILLIGRAM);
      expect(WeightUtil.format(w)).toBe('500.000 mg');
    });

    it('respects decimal places parameter', () => {
      const w = WeightUtil.fromUnit(10.5, WeightUnit.GRAM);
      expect(WeightUtil.format(w, 1)).toBe('10.5 g');
    });

    it('formats with 0 decimal places', () => {
      const w = WeightUtil.fromUnit(10.5, WeightUnit.GRAM);
      expect(WeightUtil.format(w, 0)).toBe('11 g');
    });

    it('formats with 2 decimal places', () => {
      const w = WeightUtil.fromUnit(10.5, WeightUnit.GRAM);
      expect(WeightUtil.format(w, 2)).toBe('10.50 g');
    });

    it('formats zero weight', () => {
      const w = WeightUtil.ofMilligrams(0);
      expect(WeightUtil.format(w)).toBe('0.000 g');
    });
  });

  // ─── Parsing ─────────────────────────────────────────────────

  describe('parse', () => {
    it('parses "10.5 g"', () => {
      const w = WeightUtil.parse('10.5 g');
      expect(w.milligrams).toBe(10500);
      expect(w.displayUnit).toBe(WeightUnit.GRAM);
    });

    it('parses "1.2 ct"', () => {
      const w = WeightUtil.parse('1.2 ct');
      expect(w.milligrams).toBe(240);
      expect(w.displayUnit).toBe(WeightUnit.CARAT);
    });

    it('parses "10.5g" without space', () => {
      const w = WeightUtil.parse('10.5g');
      expect(w.milligrams).toBe(10500);
    });

    it('parses "1 tola"', () => {
      const w = WeightUtil.parse('1 tola');
      expect(w.milligrams).toBe(11664);
    });

    it('parses "500 mg"', () => {
      const w = WeightUtil.parse('500 mg');
      expect(w.milligrams).toBe(500);
    });

    it('parses "1 kg"', () => {
      const w = WeightUtil.parse('1 kg');
      expect(w.milligrams).toBe(1_000_000);
    });

    it('parses "5 carats" (plural form)', () => {
      const w = WeightUtil.parse('5 carats');
      expect(w.milligrams).toBe(1000);
    });

    it('parses "2 grams" (plural form)', () => {
      const w = WeightUtil.parse('2 grams');
      expect(w.milligrams).toBe(2000);
    });

    it('parses "1 gram" (singular form)', () => {
      const w = WeightUtil.parse('1 gram');
      expect(w.milligrams).toBe(1000);
    });

    it('parses "1 kilogram"', () => {
      const w = WeightUtil.parse('1 kilogram');
      expect(w.milligrams).toBe(1_000_000);
    });

    it('parses "3 grains"', () => {
      const w = WeightUtil.parse('3 grains');
      // 3 * 64.79891 = 194.39673 -> 194 mg
      expect(w.milligrams).toBe(194);
    });

    it('parses "1 milligram"', () => {
      const w = WeightUtil.parse('1 milligram');
      expect(w.milligrams).toBe(1);
    });

    it('parses with leading/trailing whitespace', () => {
      const w = WeightUtil.parse('  10.5 g  ');
      expect(w.milligrams).toBe(10500);
    });

    it('parses "0 g" as zero', () => {
      const w = WeightUtil.parse('0 g');
      expect(w.milligrams).toBe(0);
    });

    it('throws on unparsable string', () => {
      expect(() => WeightUtil.parse('abc')).toThrow('Cannot parse');
    });

    it('throws on unknown unit', () => {
      expect(() => WeightUtil.parse('10 xyz')).toThrow('Unknown weight unit');
    });

    it('throws on empty string', () => {
      expect(() => WeightUtil.parse('')).toThrow('Cannot parse');
    });

    it('throws on unit only (no number)', () => {
      expect(() => WeightUtil.parse('g')).toThrow('Cannot parse');
    });
  });

  // ─── Display Value ───────────────────────────────────────────

  describe('displayValue', () => {
    it('returns value in the display unit', () => {
      const w = WeightUtil.fromUnit(10, WeightUnit.GRAM);
      expect(WeightUtil.displayValue(w)).toBe(10);
    });

    it('returns value in carats when display unit is carat', () => {
      const w = WeightUtil.ofMilligrams(1000, WeightUnit.CARAT);
      expect(WeightUtil.displayValue(w)).toBe(5);
    });

    it('returns zero for zero weight', () => {
      const w = WeightUtil.ofMilligrams(0, WeightUnit.TOLA);
      expect(WeightUtil.displayValue(w)).toBe(0);
    });
  });

  // ─── Edge Cases ──────────────────────────────────────────────

  describe('edge cases', () => {
    it('handles zero weight', () => {
      const w = WeightUtil.ofMilligrams(0);
      expect(WeightUtil.isZero(w)).toBe(true);
      expect(WeightUtil.format(w)).toBe('0.000 g');
    });

    it('handles very small weight (0.001 grams = 1 mg)', () => {
      const w = WeightUtil.fromUnit(0.001, WeightUnit.GRAM);
      expect(w.milligrams).toBe(1);
    });

    it('handles very large weight (1000 kg)', () => {
      const w = WeightUtil.fromUnit(1000, WeightUnit.KILOGRAM);
      expect(w.milligrams).toBe(1_000_000_000);
    });

    it('handles fractional troy ounce', () => {
      const w = WeightUtil.fromUnit(0.5, WeightUnit.TROY_OUNCE);
      expect(w.milligrams).toBe(15552); // 31103.4768 / 2 rounded
    });

    it('getConversionFactor returns correct factor for all units', () => {
      expect(WeightUtil.getConversionFactor(WeightUnit.MILLIGRAM)).toBe(1);
      expect(WeightUtil.getConversionFactor(WeightUnit.GRAM)).toBe(1000);
      expect(WeightUtil.getConversionFactor(WeightUnit.KILOGRAM)).toBe(1_000_000);
      expect(WeightUtil.getConversionFactor(WeightUnit.CARAT)).toBe(200);
      expect(WeightUtil.getConversionFactor(WeightUnit.TOLA)).toBe(11664);
    });
  });
});
