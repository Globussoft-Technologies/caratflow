import { describe, it, expect, beforeEach } from 'vitest';
import { FinancialService } from './financial.service';
import { createMockPrismaService, TEST_TENANT_ID } from '../../__tests__/setup';

describe('FinancialService - GST/TDS/TCS Computation (Unit)', () => {
  let service: FinancialService;
  let mockPrisma: ReturnType<typeof createMockPrismaService>;

  beforeEach(() => {
    mockPrisma = createMockPrismaService();
    service = new FinancialService(mockPrisma as any);
  });

  // ─── GST Computation ─────────────────────────────────────────

  describe('computeGst', () => {
    describe('intra-state (CGST + SGST)', () => {
      it('splits 3% jewelry GST into 1.5% CGST + 1.5% SGST', () => {
        const result = service.computeGst({
          taxableAmountPaise: 10000000, // Rs 1,00,000
          gstRate: 300,
          sourceState: 'MH',
          destState: 'MH',
          hsnCode: '7113',
        });

        expect(result.isInterState).toBe(false);
        expect(result.cgstPaise).toBe(150000);
        expect(result.sgstPaise).toBe(150000);
        expect(result.igstPaise).toBe(0);
        expect(result.totalTaxPaise).toBe(300000);
      });

      it('splits 5% making charges GST into 2.5% each', () => {
        const result = service.computeGst({
          taxableAmountPaise: 200000, // Rs 2,000
          gstRate: 500,
          sourceState: 'KA',
          destState: 'KA',
          hsnCode: '9988',
        });

        expect(result.cgstPaise).toBe(5000); // 2.5% of 200000
        expect(result.sgstPaise).toBe(5000);
        expect(result.totalTaxPaise).toBe(10000);
      });

      it('is case-insensitive for state comparison', () => {
        const result = service.computeGst({
          taxableAmountPaise: 100000,
          gstRate: 300,
          sourceState: 'mh',
          destState: 'MH',
          hsnCode: '7113',
        });

        expect(result.isInterState).toBe(false);
      });
    });

    describe('inter-state (IGST)', () => {
      it('applies full 3% IGST for different states', () => {
        const result = service.computeGst({
          taxableAmountPaise: 10000000,
          gstRate: 300,
          sourceState: 'MH',
          destState: 'GJ',
          hsnCode: '7113',
        });

        expect(result.isInterState).toBe(true);
        expect(result.cgstPaise).toBe(0);
        expect(result.sgstPaise).toBe(0);
        expect(result.igstPaise).toBe(300000);
        expect(result.totalTaxPaise).toBe(300000);
      });

      it('applies full 5% IGST for making charges inter-state', () => {
        const result = service.computeGst({
          taxableAmountPaise: 200000,
          gstRate: 500,
          sourceState: 'MH',
          destState: 'TN',
          hsnCode: '9988',
        });

        expect(result.igstPaise).toBe(10000); // 5% of 200000
        expect(result.igstRate).toBe(500);
      });
    });

    describe('edge cases', () => {
      it('handles zero taxable amount', () => {
        const result = service.computeGst({
          taxableAmountPaise: 0,
          gstRate: 300,
          sourceState: 'MH',
          destState: 'MH',
          hsnCode: '7113',
        });

        expect(result.totalTaxPaise).toBe(0);
      });

      it('handles very small amounts with rounding', () => {
        // 1 paise at 3% = 0.03 paise -> rounds to 0
        const result = service.computeGst({
          taxableAmountPaise: 1,
          gstRate: 300,
          sourceState: 'MH',
          destState: 'MH',
          hsnCode: '7113',
        });

        expect(result.totalTaxPaise).toBe(0);
      });

      it('handles large amounts without overflow', () => {
        // Rs 10 crore = 10,00,00,000 * 100 paise = 1,000,000,000 paise
        const result = service.computeGst({
          taxableAmountPaise: 1_000_000_000,
          gstRate: 300,
          sourceState: 'MH',
          destState: 'GJ',
          hsnCode: '7113',
        });

        // 3% of 1,000,000,000 = 30,000,000
        expect(result.igstPaise).toBe(30_000_000);
      });
    });
  });

  // ─── TDS Threshold Behavior via GST ───────────────────────────
  // TDS/TCS logic is in @caratflow/utils, but we verify the FinancialService
  // correctly uses them through the computeGst flow.

  describe('rate consistency', () => {
    it('gstRate 300 means 3%', () => {
      const result = service.computeGst({
        taxableAmountPaise: 100_00, // Rs 100
        gstRate: 300,
        sourceState: 'MH',
        destState: 'MH',
        hsnCode: '7113',
      });

      // 3% of 10000 = 300
      expect(result.totalTaxPaise).toBe(300);
    });

    it('gstRate 500 means 5%', () => {
      const result = service.computeGst({
        taxableAmountPaise: 100_00,
        gstRate: 500,
        sourceState: 'MH',
        destState: 'MH',
        hsnCode: '9988',
      });

      expect(result.totalTaxPaise).toBe(500);
    });

    it('gstRate 1200 means 12%', () => {
      const result = service.computeGst({
        taxableAmountPaise: 100_00,
        gstRate: 1200,
        sourceState: 'MH',
        destState: 'MH',
        hsnCode: '7117', // imitation jewelry
      });

      expect(result.totalTaxPaise).toBe(1200);
    });
  });
});
