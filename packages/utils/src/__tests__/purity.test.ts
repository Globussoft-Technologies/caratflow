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

    it('10K = 417 fineness', () => {
      expect(PurityUtil.karatToFineness(10)).toBe(417);
    });

    it('9K = 375 fineness', () => {
      expect(PurityUtil.karatToFineness(9)).toBe(375);
    });

    it('12K = 500 fineness', () => {
      expect(PurityUtil.karatToFineness(12)).toBe(500);
    });

    it('23K = 958 fineness', () => {
      expect(PurityUtil.karatToFineness(23)).toBe(958);
    });

    it('21K = 875 fineness', () => {
      expect(PurityUtil.karatToFineness(21)).toBe(875);
    });

    it('20K = 833 fineness', () => {
      expect(PurityUtil.karatToFineness(20)).toBe(833);
    });

    it('16K = 667 fineness', () => {
      expect(PurityUtil.karatToFineness(16)).toBe(667);
    });

    it('calculates non-standard karat values', () => {
      // 15K should be (15/24)*1000 = 625
      expect(PurityUtil.karatToFineness(15)).toBe(625);
    });

    it('calculates 1K fineness', () => {
      // 1K = (1/24)*1000 = 41.67 -> 42
      expect(PurityUtil.karatToFineness(1)).toBe(42);
    });

    it('calculates 0K fineness', () => {
      // 0K = 0
      expect(PurityUtil.karatToFineness(0)).toBe(0);
    });

    it('calculates non-standard 19K', () => {
      // 19K -> (19/24)*1000 = 791.67 -> 792
      expect(PurityUtil.karatToFineness(19)).toBe(792);
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

    it('417 = 10K', () => {
      expect(PurityUtil.finenessToKarat(417)).toBe(10);
    });

    it('375 = 9K', () => {
      expect(PurityUtil.finenessToKarat(375)).toBe(9);
    });

    it('500 = 12K', () => {
      expect(PurityUtil.finenessToKarat(500)).toBe(12);
    });

    it('958 = 23K', () => {
      expect(PurityUtil.finenessToKarat(958)).toBe(23);
    });

    it('875 = 21K', () => {
      expect(PurityUtil.finenessToKarat(875)).toBe(21);
    });

    it('calculates non-standard fineness values', () => {
      // 625 -> (625/1000)*24 = 15
      expect(PurityUtil.finenessToKarat(625)).toBe(15);
    });

    it('calculates fineness 800 (non-mapped)', () => {
      // (800/1000)*24 = 19.2
      expect(PurityUtil.finenessToKarat(800)).toBe(19.2);
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

    it('585 fineness = 58.5%', () => {
      expect(PurityUtil.finenessToPercentage(585)).toBe(58.5);
    });

    it('417 fineness = 41.7%', () => {
      expect(PurityUtil.finenessToPercentage(417)).toBe(41.7);
    });

    it('0 fineness = 0%', () => {
      expect(PurityUtil.finenessToPercentage(0)).toBe(0);
    });
  });

  describe('percentageToFineness', () => {
    it('91.6% = 916', () => {
      expect(PurityUtil.percentageToFineness(91.6)).toBe(916);
    });

    it('99.9% = 999', () => {
      expect(PurityUtil.percentageToFineness(99.9)).toBe(999);
    });

    it('75% = 750', () => {
      expect(PurityUtil.percentageToFineness(75)).toBe(750);
    });

    it('0% = 0', () => {
      expect(PurityUtil.percentageToFineness(0)).toBe(0);
    });

    it('round-trip: fineness -> % -> fineness', () => {
      for (const fineness of [999, 916, 750, 585, 417, 375]) {
        const pct = PurityUtil.finenessToPercentage(fineness);
        expect(PurityUtil.percentageToFineness(pct)).toBe(fineness);
      }
    });
  });

  // ─── Fine Weight Calculation ─────────────────────────────────

  describe('fineWeight', () => {
    it('10g at 22K (916) = 9.16g fine weight', () => {
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

    it('100g at 22K = 91.6g', () => {
      expect(PurityUtil.fineWeight(100000, 916)).toBe(91600);
    });

    it('100g at 18K = 75.0g', () => {
      expect(PurityUtil.fineWeight(100000, 750)).toBe(75000);
    });

    it('handles zero weight', () => {
      expect(PurityUtil.fineWeight(0, 916)).toBe(0);
    });

    it('handles very large weight (1kg at 22K)', () => {
      // 1000000 mg * 916 / 1000 = 916000 mg
      expect(PurityUtil.fineWeight(1_000_000, 916)).toBe(916000);
    });

    it('rounds correctly for non-exact division', () => {
      // 333 * 916 / 1000 = 305.028 -> 305
      expect(PurityUtil.fineWeight(333, 916)).toBe(305);
    });
  });

  describe('grossWeightForFineWeight', () => {
    it('calculates gross weight needed for 9.16g fine at 22K', () => {
      expect(PurityUtil.grossWeightForFineWeight(9160, 916)).toBe(10000);
    });

    it('calculates gross weight for fine weight at 18K', () => {
      // 7500 * 1000 / 750 = 10000
      expect(PurityUtil.grossWeightForFineWeight(7500, 750)).toBe(10000);
    });

    it('calculates gross weight for fine weight at 24K', () => {
      // 9990 * 1000 / 999 = 10000
      expect(PurityUtil.grossWeightForFineWeight(9990, 999)).toBe(10000);
    });

    it('throws on zero fineness', () => {
      expect(() => PurityUtil.grossWeightForFineWeight(1000, 0)).toThrow('Fineness must be positive');
    });

    it('throws on negative fineness', () => {
      expect(() => PurityUtil.grossWeightForFineWeight(1000, -1)).toThrow('Fineness must be positive');
    });

    it('round-trip: fineWeight -> grossWeightForFineWeight', () => {
      const gross = 10000;
      const fineness = 916;
      const fine = PurityUtil.fineWeight(gross, fineness);
      const backToGross = PurityUtil.grossWeightForFineWeight(fine, fineness);
      expect(backToGross).toBe(gross);
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

    it('formats 18K as "18K (750)"', () => {
      expect(PurityUtil.displayString(750)).toBe('18K (750)');
    });

    it('formats 14K as "14K (585)"', () => {
      expect(PurityUtil.displayString(585)).toBe('14K (585)');
    });

    it('formats 10K as "10K (417)"', () => {
      expect(PurityUtil.displayString(417)).toBe('10K (417)');
    });

    it('formats 9K as "9K (375)"', () => {
      expect(PurityUtil.displayString(375)).toBe('9K (375)');
    });

    it('formats non-standard fineness as "NNN fineness"', () => {
      expect(PurityUtil.displayString(800)).toBe('800 fineness');
    });

    it('formats non-standard 925 as fineness string', () => {
      // 925 is not in the standard karat map (it maps to sterling silver, but
      // the KARAT_FINENESS_MAP does not have a 22K->925 entry)
      expect(PurityUtil.displayString(925)).toBe('925 fineness');
    });
  });

  // ─── Standard Purities ──────────────────────────────────────

  describe('standardPurities', () => {
    it('returns gold standard purities', () => {
      const purities = PurityUtil.standardPurities('GOLD');
      expect(purities.length).toBe(4);
      expect(purities.find((p) => p.karat === 24)?.fineness).toBe(999);
      expect(purities.find((p) => p.karat === 22)?.fineness).toBe(916);
      expect(purities.find((p) => p.karat === 18)?.fineness).toBe(750);
      expect(purities.find((p) => p.karat === 14)?.fineness).toBe(585);
    });

    it('gold purities have correct labels', () => {
      const purities = PurityUtil.standardPurities('GOLD');
      expect(purities.find((p) => p.karat === 24)?.label).toBe('24K Pure Gold');
      expect(purities.find((p) => p.karat === 22)?.label).toBe('22K Gold');
    });

    it('returns silver standard purities including sterling', () => {
      const purities = PurityUtil.standardPurities('SILVER');
      expect(purities.length).toBe(4);
      expect(purities.find((p) => p.fineness === 925)?.label).toContain('Sterling');
      expect(purities.find((p) => p.fineness === 999)?.label).toContain('Fine Silver');
    });

    it('returns platinum standard purities', () => {
      const purities = PurityUtil.standardPurities('PLATINUM');
      expect(purities.length).toBe(4);
      expect(purities.find((p) => p.fineness === 950)?.label).toContain('Pt950');
      expect(purities.find((p) => p.fineness === 999)?.label).toContain('Pt999');
      expect(purities.find((p) => p.fineness === 900)?.label).toContain('Pt900');
      expect(purities.find((p) => p.fineness === 850)?.label).toContain('Pt850');
    });

    it('all purities have required fields', () => {
      for (const metal of ['GOLD', 'SILVER', 'PLATINUM'] as const) {
        const purities = PurityUtil.standardPurities(metal);
        for (const p of purities) {
          expect(p).toHaveProperty('karat');
          expect(p).toHaveProperty('fineness');
          expect(p).toHaveProperty('label');
          expect(typeof p.karat).toBe('number');
          expect(typeof p.fineness).toBe('number');
          expect(typeof p.label).toBe('string');
        }
      }
    });
  });

  // ─── Validation ──────────────────────────────────────────────

  describe('isValid', () => {
    it('accepts valid fineness values', () => {
      expect(PurityUtil.isValid(999)).toBe(true);
      expect(PurityUtil.isValid(916)).toBe(true);
      expect(PurityUtil.isValid(750)).toBe(true);
      expect(PurityUtil.isValid(585)).toBe(true);
      expect(PurityUtil.isValid(417)).toBe(true);
      expect(PurityUtil.isValid(375)).toBe(true);
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
      expect(PurityUtil.isValid(-999)).toBe(false);
    });

    it('rejects non-integer fineness', () => {
      expect(PurityUtil.isValid(91.6)).toBe(false);
      expect(PurityUtil.isValid(99.9)).toBe(false);
    });

    it('accepts boundary value 999', () => {
      expect(PurityUtil.isValid(999)).toBe(true);
    });

    it('accepts boundary value 1', () => {
      expect(PurityUtil.isValid(1)).toBe(true);
    });
  });
});
