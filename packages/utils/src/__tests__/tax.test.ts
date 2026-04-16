import { describe, it, expect } from 'vitest';
import {
  IndianGstCalculator,
  TdsCalculator,
  TcsCalculator,
  UsSalesTaxCalculator,
} from '../tax';
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

    it('returns 3% for platinum HSN 7110', () => {
      expect(IndianGstCalculator.getRate('7110')).toBe(3);
    });

    it('returns 3% for pearls HSN 7101', () => {
      expect(IndianGstCalculator.getRate('7101')).toBe(3);
    });

    it('returns 3% for precious stones HSN 7103', () => {
      expect(IndianGstCalculator.getRate('7103')).toBe(3);
    });

    it('returns 3% for articles of precious metal HSN 7115', () => {
      expect(IndianGstCalculator.getRate('7115')).toBe(3);
    });

    it('returns 5% for making charges', () => {
      expect(IndianGstCalculator.getRate(undefined, true)).toBe(5);
    });

    it('returns 5% for making charges regardless of HSN code', () => {
      expect(IndianGstCalculator.getRate('7113', true)).toBe(5);
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

    it('Maharashtra to Karnataka is inter-state', () => {
      expect(IndianGstCalculator.isInterState('MH', 'KA')).toBe(true);
    });

    it('Delhi to Delhi is intra-state', () => {
      expect(IndianGstCalculator.isInterState('DL', 'DL')).toBe(false);
    });

    it('mixed case comparison works', () => {
      expect(IndianGstCalculator.isInterState('Mh', 'mH')).toBe(false);
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

    it('CGST and SGST amounts are equal', () => {
      const amount = MoneyUtil.of(5000000, 'INR');
      const result = calc.calculate(amount, {
        sourceState: 'KA',
        destinationState: 'KA',
        hsnCode: '7113',
      });

      const cgst = result.taxes.find((t) => t.type === 'CGST')!;
      const sgst = result.taxes.find((t) => t.type === 'SGST')!;
      expect(cgst.amount.amount).toBe(sgst.amount.amount);
    });

    it('calculates GST on zero amount', () => {
      const amount = MoneyUtil.of(0, 'INR');
      const result = calc.calculate(amount, {
        sourceState: 'MH',
        destinationState: 'MH',
        hsnCode: '7113',
      });
      expect(result.totalTax.amount).toBe(0);
      expect(result.totalWithTax.amount).toBe(0);
    });

    it('calculates GST on very large amount (Rs 10 crore)', () => {
      // Rs 10 crore = 10,00,00,000 rupees = 10_00_00_000_00 paise
      const amount = MoneyUtil.of(10_00_00_000_00, 'INR');
      const result = calc.calculate(amount, {
        sourceState: 'MH',
        destinationState: 'MH',
        hsnCode: '7113',
      });
      // 3% of 10 crore = 30 lakh = 30,00,000 rupees = 30_00_000_00 paise
      expect(result.totalTax.amount).toBe(30_00_000_00);
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

    it('IGST has single tax component', () => {
      const amount = MoneyUtil.of(1000000, 'INR');
      const result = calc.calculate(amount, {
        sourceState: 'MH',
        destinationState: 'GJ',
      });
      expect(result.taxes).toHaveLength(1);
      expect(result.taxes[0]!.type).toBe('IGST');
    });

    it('inter-state and intra-state total tax is same for same amount', () => {
      const amount = MoneyUtil.of(10000000, 'INR');
      const interState = calc.calculate(amount, {
        sourceState: 'MH',
        destinationState: 'GJ',
        hsnCode: '7113',
      });
      const intraState = calc.calculate(amount, {
        sourceState: 'MH',
        destinationState: 'MH',
        hsnCode: '7113',
      });
      expect(interState.totalTax.amount).toBe(intraState.totalTax.amount);
    });
  });

  // ─── Override GST Rate ────────────────────────────────────────

  describe('custom gstRate override', () => {
    it('uses provided gstRate instead of HSN lookup', () => {
      const amount = MoneyUtil.of(1000000, 'INR'); // Rs 10,000
      const result = calc.calculate(amount, {
        sourceState: 'MH',
        destinationState: 'MH',
        gstRate: 12,
      });

      expect(result.totalTax.amount).toBe(120000); // Rs 1,200
    });

    it('gstRate override works for inter-state too', () => {
      const amount = MoneyUtil.of(1000000, 'INR');
      const result = calc.calculate(amount, {
        sourceState: 'MH',
        destinationState: 'GJ',
        gstRate: 18,
      });

      const igst = result.taxes[0]!;
      expect(igst.type).toBe('IGST');
      expect(igst.rate).toBe(18);
      expect(igst.amount.amount).toBe(180000);
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

    it('totalWithTax = taxableAmount + totalTax', () => {
      const amount = MoneyUtil.of(7777777, 'INR');
      const result = calc.calculate(amount, {
        sourceState: 'MH',
        destinationState: 'GJ',
      });
      expect(result.totalWithTax.amount).toBe(
        result.taxableAmount.amount + result.totalTax.amount,
      );
    });
  });

  // ─── Rounding ─────────────────────────────────────────────────

  describe('rounding behavior', () => {
    it('handles odd amount where 3% produces fractional paise', () => {
      // 33333 * 3 / 100 = 999.99 -> rounds to 1000
      const amount = MoneyUtil.of(33333, 'INR');
      const result = calc.calculate(amount, {
        sourceState: 'MH',
        destinationState: 'GJ',
        hsnCode: '7113',
      });
      expect(result.totalTax.amount).toBe(1000);
    });

    it('handles 1 paise taxable amount', () => {
      const amount = MoneyUtil.of(1, 'INR');
      const result = calc.calculate(amount, {
        sourceState: 'MH',
        destinationState: 'MH',
        hsnCode: '7113',
      });
      // 3% of 1 paise = 0.03 -> rounds to 0
      expect(result.totalTax.amount).toBe(0);
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
      const purchase = MoneyUtil.of(100000, 'INR');
      const result = TdsCalculator.calculate(purchase, {
        cumulativePurchasePaise: 400_000_000,
        hasPan: true,
      });
      expect(result.amount).toBe(0);
    });

    it('at exactly threshold returns no TDS', () => {
      const purchase = MoneyUtil.of(100000, 'INR');
      const result = TdsCalculator.calculate(purchase, {
        cumulativePurchasePaise: 500_000_000,
        hasPan: true,
      });
      expect(result.amount).toBe(0);
    });

    it('above threshold applies TDS', () => {
      const purchase = MoneyUtil.of(10000000, 'INR');
      const result = TdsCalculator.calculate(purchase, {
        cumulativePurchasePaise: 500_000_001,
        hasPan: true,
      });
      expect(result.amount).toBeGreaterThan(0);
    });

    it('just 1 paise above threshold triggers TDS', () => {
      const purchase = MoneyUtil.of(1000000, 'INR');
      const result = TdsCalculator.calculate(purchase, {
        cumulativePurchasePaise: 500_000_001,
        hasPan: true,
      });
      expect(result.amount).toBeGreaterThan(0);
    });

    it('far below threshold returns no TDS', () => {
      const purchase = MoneyUtil.of(100000, 'INR');
      const result = TdsCalculator.calculate(purchase, {
        cumulativePurchasePaise: 0,
        hasPan: true,
      });
      expect(result.amount).toBe(0);
    });
  });

  describe('TDS rates', () => {
    it('applies 0.1% with PAN', () => {
      const purchase = MoneyUtil.of(10000000, 'INR'); // Rs 1,00,000
      const result = TdsCalculator.calculate(purchase, {
        cumulativePurchasePaise: 600_000_000,
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

    it('rate constants are correct', () => {
      expect(TdsCalculator.RATE_WITH_PAN).toBe(0.1);
      expect(TdsCalculator.RATE_WITHOUT_PAN).toBe(5);
    });

    it('TDS without PAN is 50x higher than with PAN', () => {
      const purchase = MoneyUtil.of(10000000, 'INR');
      const withPan = TdsCalculator.calculate(purchase, {
        cumulativePurchasePaise: 600_000_000,
        hasPan: true,
      });
      const withoutPan = TdsCalculator.calculate(purchase, {
        cumulativePurchasePaise: 600_000_000,
        hasPan: false,
      });
      expect(withoutPan.amount).toBe(withPan.amount * 50);
    });

    it('TDS on small amount above threshold', () => {
      // Rs 100 purchase = 10000 paise
      const purchase = MoneyUtil.of(10000, 'INR');
      const result = TdsCalculator.calculate(purchase, {
        cumulativePurchasePaise: 600_000_000,
        hasPan: true,
      });
      // 0.1% of 10000 = 10
      expect(result.amount).toBe(10);
    });

    it('returns INR currency code', () => {
      const purchase = MoneyUtil.of(10000000, 'INR');
      const result = TdsCalculator.calculate(purchase, {
        cumulativePurchasePaise: 600_000_000,
        hasPan: true,
      });
      expect(result.currencyCode).toBe('INR');
    });

    it('returns zero with correct currency when below threshold', () => {
      const purchase = MoneyUtil.of(10000000, 'INR');
      const result = TdsCalculator.calculate(purchase, {
        cumulativePurchasePaise: 100_000_000,
        hasPan: true,
      });
      expect(result.amount).toBe(0);
      expect(result.currencyCode).toBe('INR');
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

    it('returns false for zero', () => {
      expect(TdsCalculator.isThresholdExceeded(0)).toBe(false);
    });

    it('returns true for very large amount', () => {
      expect(TdsCalculator.isThresholdExceeded(10_000_000_000)).toBe(true);
    });
  });

  describe('threshold tracking across multiple payments', () => {
    it('no TDS on first payment, TDS on payment that crosses threshold', () => {
      const payment = MoneyUtil.of(30_00_00_000, 'INR'); // Rs 30 lakh

      // First payment: cumulative = Rs 30 lakh (below threshold)
      const first = TdsCalculator.calculate(payment, {
        cumulativePurchasePaise: 30_00_00_000,
        hasPan: true,
      });
      expect(first.amount).toBe(0);

      // Second payment: cumulative = Rs 60 lakh (above threshold)
      const second = TdsCalculator.calculate(payment, {
        cumulativePurchasePaise: 60_00_00_000,
        hasPan: true,
      });
      expect(second.amount).toBeGreaterThan(0);
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

    it('at exactly threshold returns no TCS', () => {
      const sale = MoneyUtil.of(100000, 'INR');
      const result = TcsCalculator.calculate(sale, {
        cumulativeSalePaise: 500_000_000,
        hasPan: true,
      });
      expect(result.amount).toBe(0);
    });

    it('above threshold applies TCS', () => {
      const sale = MoneyUtil.of(10000000, 'INR');
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

    it('rate constants are correct', () => {
      expect(TcsCalculator.RATE_WITH_PAN).toBe(0.1);
      expect(TcsCalculator.RATE_WITHOUT_PAN).toBe(1);
    });

    it('TCS without PAN is 10x higher than with PAN', () => {
      const sale = MoneyUtil.of(10000000, 'INR');
      const withPan = TcsCalculator.calculate(sale, {
        cumulativeSalePaise: 600_000_000,
        hasPan: true,
      });
      const withoutPan = TcsCalculator.calculate(sale, {
        cumulativeSalePaise: 600_000_000,
        hasPan: false,
      });
      expect(withoutPan.amount).toBe(withPan.amount * 10);
    });

    it('returns correct currency code', () => {
      const sale = MoneyUtil.of(10000000, 'INR');
      const result = TcsCalculator.calculate(sale, {
        cumulativeSalePaise: 600_000_000,
        hasPan: true,
      });
      expect(result.currencyCode).toBe('INR');
    });

    it('TCS on small sale amount', () => {
      const sale = MoneyUtil.of(10000, 'INR'); // Rs 100
      const result = TcsCalculator.calculate(sale, {
        cumulativeSalePaise: 600_000_000,
        hasPan: true,
      });
      // 0.1% of 10000 = 10
      expect(result.amount).toBe(10);
    });
  });

  describe('isThresholdExceeded', () => {
    it('returns false below threshold', () => {
      expect(TcsCalculator.isThresholdExceeded(400_000_000)).toBe(false);
    });

    it('returns false at exact threshold', () => {
      expect(TcsCalculator.isThresholdExceeded(500_000_000)).toBe(false);
    });

    it('returns true above threshold', () => {
      expect(TcsCalculator.isThresholdExceeded(600_000_000)).toBe(true);
    });

    it('returns false for zero', () => {
      expect(TcsCalculator.isThresholdExceeded(0)).toBe(false);
    });
  });
});

describe('UsSalesTaxCalculator', () => {
  const calc = new UsSalesTaxCalculator();

  it('calculates California state sales tax (7.25%)', () => {
    const amount = MoneyUtil.of(10000, 'USD'); // $100
    const result = calc.calculate(amount, { stateCode: 'CA' });
    // 7.25% of 10000 = 725
    expect(result.totalTax.amount).toBe(725);
  });

  it('calculates New York state sales tax (4%)', () => {
    const amount = MoneyUtil.of(10000, 'USD');
    const result = calc.calculate(amount, { stateCode: 'NY' });
    expect(result.totalTax.amount).toBe(400);
  });

  it('calculates Texas state sales tax (6.25%)', () => {
    const amount = MoneyUtil.of(10000, 'USD');
    const result = calc.calculate(amount, { stateCode: 'TX' });
    expect(result.totalTax.amount).toBe(625);
  });

  it('includes county and city rates', () => {
    const amount = MoneyUtil.of(10000, 'USD');
    const result = calc.calculate(amount, {
      stateCode: 'CA',
      countyRate: 1,
      cityRate: 0.5,
    });
    // Total rate = 7.25 + 1 + 0.5 = 8.75%
    expect(result.totalTax.amount).toBe(875);
  });

  it('returns 0 tax for unknown state', () => {
    const amount = MoneyUtil.of(10000, 'USD');
    const result = calc.calculate(amount, { stateCode: 'XX' });
    expect(result.totalTax.amount).toBe(0);
  });

  it('preserves taxable amount', () => {
    const amount = MoneyUtil.of(50000, 'USD');
    const result = calc.calculate(amount, { stateCode: 'CA' });
    expect(result.taxableAmount.amount).toBe(50000);
  });

  it('totalWithTax equals amount plus tax', () => {
    const amount = MoneyUtil.of(10000, 'USD');
    const result = calc.calculate(amount, { stateCode: 'FL' });
    expect(result.totalWithTax.amount).toBe(
      result.taxableAmount.amount + result.totalTax.amount,
    );
  });

  it('tax component type is SALES_TAX', () => {
    const amount = MoneyUtil.of(10000, 'USD');
    const result = calc.calculate(amount, { stateCode: 'CA' });
    expect(result.taxes).toHaveLength(1);
    expect(result.taxes[0]!.type).toBe('SALES_TAX');
  });

  it('covers all 50 states plus DC in the rate table', () => {
    const fifty = [
      'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
      'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
      'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
      'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
      'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
    ];
    for (const code of fifty) {
      expect(UsSalesTaxCalculator.STATE_RATES).toHaveProperty(code);
    }
    expect(UsSalesTaxCalculator.STATE_RATES).toHaveProperty('DC');
  });

  it('returns 0 tax for states without statewide sales tax', () => {
    const amount = MoneyUtil.of(10000, 'USD');
    for (const noTax of ['AK', 'DE', 'MT', 'NH', 'OR']) {
      const result = calc.calculate(amount, { stateCode: noTax });
      expect(result.totalTax.amount, `${noTax} should have no state tax`).toBe(0);
    }
  });

  it('honours preciousMetalExempt by zeroing state rate only', () => {
    const amount = MoneyUtil.of(10000, 'USD');
    const result = calc.calculate(amount, {
      stateCode: 'TX',
      countyRate: 1,
      preciousMetalExempt: true,
    });
    // State 6.25% zeroed, county 1% remains => 100 paise
    expect(result.totalTax.amount).toBe(100);
  });

  it('uses stateRateOverride when provided (Avalara escape hatch)', () => {
    const amount = MoneyUtil.of(10000, 'USD');
    const result = calc.calculate(amount, {
      stateCode: 'CA',
      stateRateOverride: 8.125,
    });
    expect(result.totalTax.amount).toBe(813); // rounded 812.5
  });

  it('lowercases state codes via getStateRate', () => {
    expect(UsSalesTaxCalculator.getStateRate('ca')).toBe(7.25);
    expect(UsSalesTaxCalculator.getStateRate('tx')).toBe(6.25);
  });
});
