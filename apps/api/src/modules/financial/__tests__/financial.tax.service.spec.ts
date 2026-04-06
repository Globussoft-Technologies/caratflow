import { describe, it, expect, beforeEach } from 'vitest';
import { FinancialTaxService } from '../financial.tax.service';
import { createMockPrismaService, TEST_TENANT_ID, resetAllMocks } from '../../../__tests__/setup';

describe('FinancialTaxService (Unit)', () => {
  let service: FinancialTaxService;
  let mockPrisma: ReturnType<typeof createMockPrismaService>;

  beforeEach(() => {
    mockPrisma = createMockPrismaService();
    service = new FinancialTaxService(mockPrisma as any);
    resetAllMocks(mockPrisma);
  });

  // ─── GST Computation ─────────────────────────────────────────

  describe('computeGst', () => {
    it('intra-state 3% jewelry: splits into 1.5% CGST + 1.5% SGST', () => {
      const result = service.computeGst({
        taxableAmountPaise: 10000000, // Rs 1,00,000
        gstRate: 300,
        sourceState: 'MH',
        destState: 'MH',
        hsnCode: '7113',
      });

      expect(result.isInterState).toBe(false);
      expect(result.cgstRate).toBe(150);
      expect(result.sgstRate).toBe(150);
      expect(result.cgstPaise).toBe(150000);
      expect(result.sgstPaise).toBe(150000);
      expect(result.igstPaise).toBe(0);
      expect(result.totalTaxPaise).toBe(300000);
    });

    it('inter-state 3% jewelry: applies full 3% IGST', () => {
      const result = service.computeGst({
        taxableAmountPaise: 10000000,
        gstRate: 300,
        sourceState: 'MH',
        destState: 'GJ',
        hsnCode: '7113',
      });

      expect(result.isInterState).toBe(true);
      expect(result.igstRate).toBe(300);
      expect(result.igstPaise).toBe(300000);
      expect(result.cgstPaise).toBe(0);
      expect(result.sgstPaise).toBe(0);
      expect(result.totalTaxPaise).toBe(300000);
    });

    it('making charges at 5% GST (different from jewelry rate)', () => {
      const result = service.computeGst({
        taxableAmountPaise: 200000,
        gstRate: 500,
        sourceState: 'KA',
        destState: 'KA',
        hsnCode: '9988',
      });

      expect(result.cgstPaise).toBe(5000);
      expect(result.sgstPaise).toBe(5000);
      expect(result.totalTaxPaise).toBe(10000);
    });

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
      const result = service.computeGst({
        taxableAmountPaise: 1,
        gstRate: 300,
        sourceState: 'MH',
        destState: 'MH',
        hsnCode: '7113',
      });

      expect(result.totalTaxPaise).toBe(0);
    });

    it('handles large amounts (Rs 10 crore)', () => {
      const result = service.computeGst({
        taxableAmountPaise: 1_000_000_000,
        gstRate: 300,
        sourceState: 'MH',
        destState: 'GJ',
        hsnCode: '7113',
      });

      expect(result.igstPaise).toBe(30_000_000);
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

    it('12% GST for imitation jewelry', () => {
      const result = service.computeGst({
        taxableAmountPaise: 100_00,
        gstRate: 1200,
        sourceState: 'MH',
        destState: 'MH',
        hsnCode: '7117',
      });

      expect(result.totalTaxPaise).toBe(1200);
    });
  });

  // ─── TDS Computation (Section 194Q) ───────────────────────────

  describe('computeTds', () => {
    const fyStart = new Date('2025-04-01');
    const fyEnd = new Date('2026-03-31');

    it('returns not applicable when cumulative below Rs 50 lakh threshold', async () => {
      mockPrisma.invoice.aggregate.mockResolvedValue({
        _sum: { totalPaise: BigInt(3_000_000_00) }, // Rs 30 lakh
      });

      const result = await service.computeTds(
        TEST_TENANT_ID,
        'supplier-1',
        1_000_000_00, // Rs 10 lakh
        fyStart,
        fyEnd,
        true,
      );

      expect(result.isApplicable).toBe(false);
      expect(result.tdsAmountPaise).toBe(0);
    });

    it('applies 0.1% TDS with PAN when cumulative exceeds Rs 50 lakh', async () => {
      mockPrisma.invoice.aggregate.mockResolvedValue({
        _sum: { totalPaise: BigInt(4_500_000_00) }, // Rs 45 lakh
      });

      const result = await service.computeTds(
        TEST_TENANT_ID,
        'supplier-1',
        1_000_000_00, // Rs 10 lakh -> cumulative 55 lakh > 50 lakh
        fyStart,
        fyEnd,
        true,
      );

      expect(result.isApplicable).toBe(true);
      // 0.1% of 10 lakh (1000000 paise) = 10000 paise => but amount is 1_000_000_00
      // 0.1% of 1_000_000_00 = 100000
      expect(result.tdsAmountPaise).toBe(100000);
    });

    it('applies 5% TDS without PAN', async () => {
      mockPrisma.invoice.aggregate.mockResolvedValue({
        _sum: { totalPaise: BigInt(5_000_000_00) }, // Rs 50 lakh
      });

      const result = await service.computeTds(
        TEST_TENANT_ID,
        'supplier-1',
        500_000_00, // Rs 5 lakh
        fyStart,
        fyEnd,
        false,
      );

      expect(result.isApplicable).toBe(true);
      // 5% of 500_000_00 = 25_000_00
      expect(result.tdsAmountPaise).toBe(25_000_00);
    });

    it('returns not applicable at exactly threshold', async () => {
      mockPrisma.invoice.aggregate.mockResolvedValue({
        _sum: { totalPaise: BigInt(4_900_000_00) }, // Rs 49 lakh
      });

      const result = await service.computeTds(
        TEST_TENANT_ID,
        'supplier-1',
        100_000_00, // Rs 1 lakh -> cumulative exactly 50 lakh
        fyStart,
        fyEnd,
        true,
      );

      // 4_900_000_00 + 100_000_00 = 5_000_000_00 which is <= 5_000_000_00
      expect(result.isApplicable).toBe(false);
    });

    it('handles zero cumulative purchases', async () => {
      mockPrisma.invoice.aggregate.mockResolvedValue({
        _sum: { totalPaise: null },
      });

      const result = await service.computeTds(
        TEST_TENANT_ID,
        'supplier-1',
        100_000_00,
        fyStart,
        fyEnd,
        true,
      );

      expect(result.isApplicable).toBe(false);
      expect(result.cumulativePurchasePaise).toBe(0);
    });
  });

  // ─── TCS Computation (Section 206C) ───────────────────────────

  describe('computeTcs', () => {
    const fyStart = new Date('2025-04-01');
    const fyEnd = new Date('2026-03-31');

    it('returns not applicable when cumulative below Rs 50 lakh', async () => {
      mockPrisma.invoice.aggregate.mockResolvedValue({
        _sum: { totalPaise: BigInt(2_000_000_00) },
      });

      const result = await service.computeTcs(
        TEST_TENANT_ID,
        'customer-1',
        500_000_00,
        fyStart,
        fyEnd,
        true,
      );

      expect(result.isApplicable).toBe(false);
      expect(result.tcsAmountPaise).toBe(0);
    });

    it('applies 0.1% TCS with PAN above threshold', async () => {
      mockPrisma.invoice.aggregate.mockResolvedValue({
        _sum: { totalPaise: BigInt(5_000_000_00) },
      });

      const result = await service.computeTcs(
        TEST_TENANT_ID,
        'customer-1',
        500_000_00,
        fyStart,
        fyEnd,
        true,
      );

      expect(result.isApplicable).toBe(true);
      // 0.1% of 500_000_00 = 500_00
      expect(result.tcsAmountPaise).toBe(500_00);
    });

    it('applies 1% TCS without PAN above threshold', async () => {
      mockPrisma.invoice.aggregate.mockResolvedValue({
        _sum: { totalPaise: BigInt(5_100_000_00) },
      });

      const result = await service.computeTcs(
        TEST_TENANT_ID,
        'customer-1',
        200_000_00,
        fyStart,
        fyEnd,
        false,
      );

      expect(result.isApplicable).toBe(true);
      // 1% of 200_000_00 = 2_000_00
      expect(result.tcsAmountPaise).toBe(2_000_00);
    });

    it('not applicable at exactly threshold', async () => {
      mockPrisma.invoice.aggregate.mockResolvedValue({
        _sum: { totalPaise: BigInt(4_500_000_00) },
      });

      const result = await service.computeTcs(
        TEST_TENANT_ID,
        'customer-1',
        500_000_00, // exactly 50 lakh total
        fyStart,
        fyEnd,
        true,
      );

      expect(result.isApplicable).toBe(false);
    });

    it('tracks cumulative per customer per FY', async () => {
      mockPrisma.invoice.aggregate.mockResolvedValue({
        _sum: { totalPaise: BigInt(4_800_000_00) },
      });

      const result = await service.computeTcs(
        TEST_TENANT_ID,
        'customer-1',
        300_000_00,
        fyStart,
        fyEnd,
        true,
      );

      expect(result.isApplicable).toBe(true);
      expect(result.cumulativeSalePaise).toBe(4_800_000_00);
    });
  });
});
