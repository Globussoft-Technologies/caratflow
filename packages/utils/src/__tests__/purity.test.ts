import { describe, it, expect } from 'vitest';
import { PurityUtil } from '../purity';

describe('PurityUtil', () => {
  // ─── Karat to Fineness ───────────────────────────────────────

  describe('karatToFineness', () => {
    it('24K = 999 fineness', () => {
      expect(PurityUtil.karatToFineness(24)).toBe(999);
    });

    it('22K = 916 fineness', () => {
      expect(PurityUtil.karatToFineness(22)).toBe(916);
    });

    it('18K = 750 fineness', () => {
      expect(PurityUtil.karatToFineness(18)).toBe(750);
    });

    it('14K = 585 fineness', () => {
      expect(PurityUtil.karatToFineness(14)).toBe(585);
    });

    it('9K = 375 fineness', () => {
      expect(PurityUtil.karatToFineness(9)).toBe(375);
    });

    it('calculates non-standard karat values', () => {
      // 15K should be (15/24)*1000 = 625
      expect(PurityUtil.karatToFineness(15)).toBe(625);
    });
  });

  // ─── Fineness to Karat ───────────────────────────────────────

  describe('finenessToKarat', () => {
    it('999 = 24K', () => {
      expect(PurityUtil.finenessToKarat(999)).toBe(24);
    });

    it('916 = 22K', () => {
      expect(PurityUtil.finenessToKarat(916)).toBe(22);
    });

    it('750 = 18K', () => {
      expect(PurityUtil.finenessToKarat(750)).toBe(18);
    });

    it('585 = 14K', () => {
      expect(PurityUtil.finenessToKarat(585)).toBe(14);
    });

    it('calculates non-standard fineness values', () => {
      // 625 -> (625/1000)*24 = 15
      expect(PurityUtil.finenessToKarat(625)).toBe(15);
    });
  });

  // ─── Fineness and Percentage ─────────────────────────────────

  describe('finenessToPercentage', () => {
    it('916 fineness = 91.6%', () => {
      expect(PurityUtil.finenessToPercentage(916)).toBe(91.6);
    });

    it('999 fineness = 99.9%', () => {
      expect(PurityUtil.finenessToPercentage(999)).toBe(99.9);
    });

    it('750 fineness = 75.0%', () => {
      expect(PurityUtil.finenessToPercentage(750)).toBe(75);
    });
  });

  describe('percentageToFineness', () => {
    it('91.6% = 916', () => {
      expect(PurityUtil.percentageToFineness(91.6)).toBe(916);
    });

    it('99.9% = 999', () => {
      expect(PurityUtil.percentageToFineness(99.9)).toBe(999);
    });
  });

  // ─── Fine Weight Calculation ─────────────────────────────────

  describe('fineWeight', () => {
    it('10g at 22K (916) = 9.16g fine weight', () => {
      // 10g = 10000mg, fine = 10000 * 916 / 1000 = 9160 mg = 9.16g
      expect(PurityUtil.fineWeight(10000, 916)).toBe(9160);
    });

    it('10g at 24K (999) = ~9.99g fine weight', () => {
      expect(PurityUtil.fineWeight(10000, 999)).toBe(9990);
    });

    it('10g at 18K (750) = 7.50g fine weight', () => {
      expect(PurityUtil.fineWeight(10000, 750)).toBe(7500);
    });

    it('10g at 14K (585) = 5.85g fine weight', () => {
      expect(PurityUtil.fineWeight(10000, 585)).toBe(5850);
    });

    it('handles zero weight', () => {
      expect(PurityUtil.fineWeight(0, 916)).toBe(0);
    });
  });

  describe('grossWeightForFineWeight', () => {
    it('calculates gross weight needed for 9.16g fine at 22K', () => {
      // gross = 9160 * 1000 / 916 = 10000 mg = 10g
      expect(PurityUtil.grossWeightForFineWeight(9160, 916)).toBe(10000);
    });

    it('throws on zero fineness', () => {
      expect(() => PurityUtil.grossWeightForFineWeight(1000, 0)).toThrow('Fineness must be positive');
    });

    it('throws on negative fineness', () => {
      expect(() => PurityUtil.grossWeightForFineWeight(1000, -1)).toThrow('Fineness must be positive');
    });
  });

  // ─── Display ─────────────────────────────────────────────────

  describe('displayString', () => {
    it('formats standard purity as "22K (916)"', () => {
      expect(PurityUtil.displayString(916)).toBe('22K (916)');
    });

    it('formats 24K as "24K (999)"', () => {
      expect(PurityUtil.displayString(999)).toBe('24K (999)');
    });

    it('formats non-standard fineness as "NNN fineness"', () => {
      expect(PurityUtil.displayString(800)).toBe('800 fineness');
    });
  });

  // ─── Standard Purities ──────────────────────────────────────

  describe('standardPurities', () => {
    it('returns gold standard purities', () => {
      const purities = PurityUtil.standardPurities('GOLD');
      expect(purities.length).toBeGreaterThanOrEqual(4);
      expect(purities.find((p) => p.karat === 22)?.fineness).toBe(916);
      expect(purities.find((p) => p.karat === 24)?.fineness).toBe(999);
    });

    it('returns silver standard purities including sterling', () => {
      const purities = PurityUtil.standardPurities('SILVER');
      expect(purities.length).toBeGreaterThanOrEqual(3);
      expect(purities.find((p) => p.fineness === 925)?.label).toContain('Sterling');
    });

    it('returns platinum standard purities', () => {
      const purities = PurityUtil.standardPurities('PLATINUM');
      expect(purities.length).toBeGreaterThanOrEqual(3);
      expect(purities.find((p) => p.fineness === 950)?.label).toContain('Pt950');
    });
  });

  // ─── Validation ──────────────────────────────────────────────

  describe('isValid', () => {
    it('accepts valid fineness values', () => {
      expect(PurityUtil.isValid(999)).toBe(true);
      expect(PurityUtil.isValid(916)).toBe(true);
      expect(PurityUtil.isValid(750)).toBe(true);
      expect(PurityUtil.isValid(1)).toBe(true);
    });

    it('rejects zero fineness', () => {
      expect(PurityUtil.isValid(0)).toBe(false);
    });

    it('rejects fineness above 999', () => {
      expect(PurityUtil.isValid(1000)).toBe(false);
    });

    it('rejects negative fineness', () => {
      expect(PurityUtil.isValid(-1)).toBe(false);
    });

    it('rejects non-integer fineness', () => {
      expect(PurityUtil.isValid(91.6)).toBe(false);
    });
  });
});
