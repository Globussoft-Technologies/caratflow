import { describe, it, expect } from 'vitest';
import { IndianGstCalculator, TdsCalculator, TcsCalculator } from '../tax';
import { MoneyUtil } from '../money';

describe('IndianGstCalculator', () => {
  const calc = new IndianGstCalculator();

  // ─── Rate Lookup ─────────────────────────────────────────────

  describe('getRate', () => {
    it('returns 3% for jewelry HSN 7113', () => {
      expect(IndianGstCalculator.getRate('7113')).toBe(3);
    });

    it('returns 3% for gold HSN 7108', () => {
      expect(IndianGstCalculator.getRate('7108')).toBe(3);
    });

    it('returns 3% for silver HSN 7106', () => {
      expect(IndianGstCalculator.getRate('7106')).toBe(3);
    });

    it('returns 3% for diamond HSN 7102', () => {
      expect(IndianGstCalculator.getRate('7102')).toBe(3);
    });

    it('returns 5% for making charges', () => {
      expect(IndianGstCalculator.getRate(undefined, true)).toBe(5);
    });

    it('returns default 3% for unknown HSN', () => {
      expect(IndianGstCalculator.getRate('9999')).toBe(3);
    });

    it('returns default 3% when no HSN provided', () => {
      expect(IndianGstCalculator.getRate()).toBe(3);
    });
  });

  // ─── Inter/Intra State Detection ─────────────────────────────

  describe('isInterState', () => {
    it('same state is intra-state', () => {
      expect(IndianGstCalculator.isInterState('MH', 'MH')).toBe(false);
    });

    it('different states is inter-state', () => {
      expect(IndianGstCalculator.isInterState('MH', 'GJ')).toBe(true);
    });

    it('is case-insensitive', () => {
      expect(IndianGstCalculator.isInterState('mh', 'MH')).toBe(false);
    });
  });

  // ─── Intra-state Calculation (CGST + SGST) ────────────────────

  describe('intra-state GST (CGST + SGST)', () => {
    it('calculates 3% jewelry GST as 1.5% CGST + 1.5% SGST', () => {
      const amount = MoneyUtil.of(10000000, 'INR'); // Rs 1,00,000
      const result = calc.calculate(amount, {
        sourceState: 'MH',
        destinationState: 'MH',
        hsnCode: '7113',
      });

      expect(result.taxes).toHaveLength(2);

      const cgst = result.taxes.find((t) => t.type === 'CGST');
      const sgst = result.taxes.find((t) => t.type === 'SGST');

      expect(cgst).toBeDefined();
      expect(sgst).toBeDefined();
      expect(cgst!.rate).toBe(1.5);
      expect(sgst!.rate).toBe(1.5);
      expect(cgst!.amount.amount).toBe(150000); // Rs 1,500
      expect(sgst!.amount.amount).toBe(150000); // Rs 1,500

      expect(result.totalTax.amount).toBe(300000); // Rs 3,000
      expect(result.totalWithTax.amount).toBe(10300000); // Rs 1,03,000
    });

    it('calculates 5% making charges GST', () => {
      const amount = MoneyUtil.of(500000, 'INR'); // Rs 5,000
      const result = calc.calculate(amount, {
        sourceState: 'MH',
        destinationState: 'MH',
        isMakingCharges: true,
      });

      const cgst = result.taxes.find((t) => t.type === 'CGST');
      const sgst = result.taxes.find((t) => t.type === 'SGST');

      expect(cgst!.rate).toBe(2.5);
      expect(sgst!.rate).toBe(2.5);
      expect(result.totalTax.amount).toBe(25000); // Rs 250 (5% of 5000)
    });
  });

  // ─── Inter-state Calculation (IGST) ───────────────────────────

  describe('inter-state GST (IGST)', () => {
    it('calculates 3% IGST for jewelry', () => {
      const amount = MoneyUtil.of(10000000, 'INR'); // Rs 1,00,000
      const result = calc.calculate(amount, {
        sourceState: 'MH',
        destinationState: 'GJ',
        hsnCode: '7113',
      });

      expect(result.taxes).toHaveLength(1);

      const igst = result.taxes.find((t) => t.type === 'IGST');
      expect(igst).toBeDefined();
      expect(igst!.rate).toBe(3);
      expect(igst!.amount.amount).toBe(300000); // Rs 3,000

      expect(result.totalTax.amount).toBe(300000);
      expect(result.totalWithTax.amount).toBe(10300000);
    });

    it('calculates 5% IGST for making charges inter-state', () => {
      const amount = MoneyUtil.of(500000, 'INR'); // Rs 5,000
      const result = calc.calculate(amount, {
        sourceState: 'MH',
        destinationState: 'KA',
        isMakingCharges: true,
      });

      const igst = result.taxes.find((t) => t.type === 'IGST');
      expect(igst!.rate).toBe(5);
      expect(igst!.amount.amount).toBe(25000); // Rs 250
    });
  });

  // ─── Override GST Rate ────────────────────────────────────────

  describe('custom gstRate override', () => {
    it('uses provided gstRate instead of HSN lookup', () => {
      const amount = MoneyUtil.of(1000000, 'INR'); // Rs 10,000
      const result = calc.calculate(amount, {
        sourceState: 'MH',
        destinationState: 'MH',
        gstRate: 12, // 12% GST override
      });

      expect(result.totalTax.amount).toBe(120000); // Rs 1,200
    });
  });

  // ─── Taxable Amount Preservation ──────────────────────────────

  describe('taxable amount preservation', () => {
    it('preserves the original taxable amount in the breakdown', () => {
      const amount = MoneyUtil.of(5000000, 'INR');
      const result = calc.calculate(amount, {
        sourceState: 'MH',
        destinationState: 'MH',
      });

      expect(result.taxableAmount.amount).toBe(5000000);
      expect(result.taxableAmount.currencyCode).toBe('INR');
    });
  });
});

describe('TdsCalculator (Section 194Q)', () => {
  // ─── Threshold ───────────────────────────────────────────────

  describe('threshold detection', () => {
    it('threshold is Rs 50 lakh (5,000,000 * 100 paise)', () => {
      expect(TdsCalculator.THRESHOLD_PAISE).toBe(500_000_000);
    });

    it('below threshold returns no TDS', () => {
      const purchase = MoneyUtil.of(100000, 'INR'); // Rs 1,000
      const result = TdsCalculator.calculate(purchase, {
        cumulativePurchasePaise: 400_000_000, // Rs 40 lakh (below 50L)
        hasPan: true,
      });
      expect(result.amount).toBe(0);
    });

    it('at exactly threshold returns no TDS', () => {
      const purchase = MoneyUtil.of(100000, 'INR');
      const result = TdsCalculator.calculate(purchase, {
        cumulativePurchasePaise: 500_000_000, // exactly Rs 50 lakh
        hasPan: true,
      });
      expect(result.amount).toBe(0);
    });

    it('above threshold applies TDS', () => {
      const purchase = MoneyUtil.of(10000000, 'INR'); // Rs 1,00,000
      const result = TdsCalculator.calculate(purchase, {
        cumulativePurchasePaise: 500_000_001, // just over Rs 50 lakh
        hasPan: true,
      });
      expect(result.amount).toBeGreaterThan(0);
    });
  });

  describe('TDS rates', () => {
    it('applies 0.1% with PAN', () => {
      const purchase = MoneyUtil.of(10000000, 'INR'); // Rs 1,00,000
      const result = TdsCalculator.calculate(purchase, {
        cumulativePurchasePaise: 600_000_000, // Rs 60 lakh
        hasPan: true,
      });
      // 0.1% of Rs 1,00,000 = Rs 100 = 10000 paise
      expect(result.amount).toBe(10000);
    });

    it('applies 5% without PAN', () => {
      const purchase = MoneyUtil.of(10000000, 'INR'); // Rs 1,00,000
      const result = TdsCalculator.calculate(purchase, {
        cumulativePurchasePaise: 600_000_000,
        hasPan: false,
      });
      // 5% of Rs 1,00,000 = Rs 5,000 = 500000 paise
      expect(result.amount).toBe(500000);
    });
  });

  describe('isThresholdExceeded', () => {
    it('returns false when below threshold', () => {
      expect(TdsCalculator.isThresholdExceeded(400_000_000)).toBe(false);
    });

    it('returns false at exact threshold', () => {
      expect(TdsCalculator.isThresholdExceeded(500_000_000)).toBe(false);
    });

    it('returns true when above threshold', () => {
      expect(TdsCalculator.isThresholdExceeded(500_000_001)).toBe(true);
    });
  });
});

describe('TcsCalculator (Section 206C)', () => {
  describe('threshold detection', () => {
    it('threshold is Rs 50 lakh', () => {
      expect(TcsCalculator.THRESHOLD_PAISE).toBe(500_000_000);
    });

    it('below threshold returns no TCS', () => {
      const sale = MoneyUtil.of(100000, 'INR');
      const result = TcsCalculator.calculate(sale, {
        cumulativeSalePaise: 400_000_000,
        hasPan: true,
      });
      expect(result.amount).toBe(0);
    });

    it('above threshold applies TCS', () => {
      const sale = MoneyUtil.of(10000000, 'INR'); // Rs 1,00,000
      const result = TcsCalculator.calculate(sale, {
        cumulativeSalePaise: 600_000_000,
        hasPan: true,
      });
      expect(result.amount).toBeGreaterThan(0);
    });
  });

  describe('TCS rates', () => {
    it('applies 0.1% with PAN', () => {
      const sale = MoneyUtil.of(10000000, 'INR'); // Rs 1,00,000
      const result = TcsCalculator.calculate(sale, {
        cumulativeSalePaise: 600_000_000,
        hasPan: true,
      });
      // 0.1% of Rs 1,00,000 = Rs 100 = 10000 paise
      expect(result.amount).toBe(10000);
    });

    it('applies 1% without PAN', () => {
      const sale = MoneyUtil.of(10000000, 'INR'); // Rs 1,00,000
      const result = TcsCalculator.calculate(sale, {
        cumulativeSalePaise: 600_000_000,
        hasPan: false,
      });
      // 1% of Rs 1,00,000 = Rs 1,000 = 100000 paise
      expect(result.amount).toBe(100000);
    });
  });

  describe('isThresholdExceeded', () => {
    it('returns false below threshold', () => {
      expect(TcsCalculator.isThresholdExceeded(400_000_000)).toBe(false);
    });

    it('returns true above threshold', () => {
      expect(TcsCalculator.isThresholdExceeded(600_000_000)).toBe(true);
    });
  });
});
