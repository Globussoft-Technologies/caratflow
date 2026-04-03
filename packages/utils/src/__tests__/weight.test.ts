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

    it('rounds fractional milligrams to nearest integer', () => {
      // 10.5 grams = 10500 mg
      const w = WeightUtil.fromUnit(10.5, WeightUnit.GRAM);
      expect(w.milligrams).toBe(10500);
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
      // 1 troy oz = 31103.4768 mg
      const w = WeightUtil.ofMilligrams(31103);
      expect(WeightUtil.toUnit(w, WeightUnit.TROY_OUNCE)).toBeCloseTo(1, 2);
    });
  });

  describe('convert (between units)', () => {
    it('converts grams to carats', () => {
      // 1 gram = 5 carats (1000 mg / 200 mg per ct)
      const result = WeightUtil.convert(1, WeightUnit.GRAM, WeightUnit.CARAT);
      expect(result).toBe(5);
    });

    it('converts tola to grams', () => {
      // 1 tola = 11.664 g
      const result = WeightUtil.convert(1, WeightUnit.TOLA, WeightUnit.GRAM);
      expect(result).toBeCloseTo(11.664, 3);
    });

    it('converts troy ounce to grams', () => {
      // 1 troy oz ~ 31.1035 g
      const result = WeightUtil.convert(1, WeightUnit.TROY_OUNCE, WeightUnit.GRAM);
      expect(result).toBeCloseTo(31.1035, 2);
    });

    it('converts grams to kilograms', () => {
      expect(WeightUtil.convert(1000, WeightUnit.GRAM, WeightUnit.KILOGRAM)).toBe(1);
    });
  });

  describe('round-trip conversions', () => {
    it('mg -> g -> mg is lossless for integer grams', () => {
      const original = 10000; // 10 grams in mg
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
  });

  // ─── Formatting ──────────────────────────────────────────────

  describe('format', () => {
    it('formats weight with unit label', () => {
      const w = WeightUtil.fromUnit(10.5, WeightUnit.GRAM);
      expect(WeightUtil.format(w)).toBe('10.500 g');
    });

    it('formats carats', () => {
      const w = WeightUtil.fromUnit(2.3, WeightUnit.CARAT);
      expect(WeightUtil.format(w)).toBe('2.300 ct');
    });

    it('respects decimal places parameter', () => {
      const w = WeightUtil.fromUnit(10.5, WeightUnit.GRAM);
      expect(WeightUtil.format(w, 1)).toBe('10.5 g');
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

    it('throws on unparsable string', () => {
      expect(() => WeightUtil.parse('abc')).toThrow('Cannot parse');
    });

    it('throws on unknown unit', () => {
      expect(() => WeightUtil.parse('10 xyz')).toThrow('Unknown weight unit');
    });
  });

  // ─── Edge Cases ──────────────────────────────────────────────

  describe('edge cases', () => {
    it('handles zero weight', () => {
      const w = WeightUtil.ofMilligrams(0);
      expect(WeightUtil.isZero(w)).toBe(true);
      expect(WeightUtil.format(w)).toBe('0.000 g');
    });

    it('handles very small weight (0.001 mg is rounded to 0 from unit)', () => {
      // 0.001 grams = 1 mg
      const w = WeightUtil.fromUnit(0.001, WeightUnit.GRAM);
      expect(w.milligrams).toBe(1);
    });

    it('handles very large weight (1000 kg)', () => {
      const w = WeightUtil.fromUnit(1000, WeightUnit.KILOGRAM);
      expect(w.milligrams).toBe(1_000_000_000);
    });
  });
});
