import { describe, it, expect, beforeEach } from 'vitest';
import { BnplEmiService } from '../bnpl.emi.service';
import { createMockPrismaService, resetAllMocks } from '../../../__tests__/setup';

describe('BnplEmiService', () => {
  let service: BnplEmiService;
  let mockPrisma: ReturnType<typeof createMockPrismaService>;

  beforeEach(() => {
    mockPrisma = createMockPrismaService();
    service = new BnplEmiService(mockPrisma as any);
    resetAllMocks(mockPrisma);
  });

  // ─── calculateEmi ──────────────────────────────────────────

  describe('calculateEmi', () => {
    it('standard formula: Rs 1,00,000 at 12% for 12 months -> EMI ~= Rs 8,885', () => {
      // interestRatePct = 1200 (12% * 100)
      const result = service.calculateEmi(10000000, 12, 1200);

      // Expected EMI with standard formula: ~8884.88 -> ceil to 888488 paise -> Rs 8884.88
      // The exact value depends on rounding; EMI should be approximately 888500 paise
      expect(result.monthlyEmiPaise).toBeGreaterThan(880000);
      expect(result.monthlyEmiPaise).toBeLessThan(900000);
      expect(result.totalInterestPaise).toBeGreaterThan(0);
      expect(result.totalPayablePaise).toBe(result.monthlyEmiPaise * 12);
    });

    it('no-cost EMI: 0% interest -> Rs 1,00,000 / 12', () => {
      const result = service.calculateEmi(10000000, 12, 0);

      // ceil(10000000 / 12) = ceil(833333.33) = 833334
      expect(result.monthlyEmiPaise).toBe(833334);
      expect(result.totalInterestPaise).toBe(0);
      // totalPayable should be the original amount for 0% interest
      expect(result.totalPayablePaise).toBe(10000000);
    });

    it('no-cost EMI: Rs 1,00,000 / 3 months', () => {
      const result = service.calculateEmi(10000000, 3, 0);

      // ceil(10000000 / 3) = ceil(3333333.33) = 3333334
      expect(result.monthlyEmiPaise).toBe(3333334);
      expect(result.totalInterestPaise).toBe(0);
      expect(result.totalPayablePaise).toBe(10000000);
    });

    it('sum of all installments = total payable (with interest)', () => {
      const result = service.calculateEmi(5000000, 6, 1500); // 15%
      expect(result.totalPayablePaise).toBe(result.monthlyEmiPaise * 6);
      expect(result.totalPayablePaise).toBeGreaterThan(5000000);
    });

    it('total interest = totalPayable - principal', () => {
      const result = service.calculateEmi(5000000, 6, 1500);
      expect(result.totalInterestPaise).toBe(result.totalPayablePaise - 5000000);
    });

    it('handles tenure of 1 month', () => {
      const result = service.calculateEmi(1000000, 1, 1200);
      // 1 month => EMI = principal + 1 month interest
      expect(result.monthlyEmiPaise).toBeGreaterThanOrEqual(1000000);
      expect(result.totalPayablePaise).toBe(result.monthlyEmiPaise);
    });

    it('handles tenure of 0 months (returns principal as-is)', () => {
      const result = service.calculateEmi(1000000, 0, 1200);
      expect(result.monthlyEmiPaise).toBe(1000000);
      expect(result.totalInterestPaise).toBe(0);
    });

    it('produces integer paise values (no floating point)', () => {
      const result = service.calculateEmi(7777777, 9, 1350);
      expect(Number.isInteger(result.monthlyEmiPaise)).toBe(true);
      expect(Number.isInteger(result.totalInterestPaise)).toBe(true);
      expect(Number.isInteger(result.totalPayablePaise)).toBe(true);
    });

    it('higher interest rate means higher EMI', () => {
      const low = service.calculateEmi(5000000, 12, 800);
      const high = service.calculateEmi(5000000, 12, 2400);
      expect(high.monthlyEmiPaise).toBeGreaterThan(low.monthlyEmiPaise);
    });

    it('longer tenure means lower EMI but higher total interest', () => {
      const short = service.calculateEmi(5000000, 6, 1200);
      const long = service.calculateEmi(5000000, 24, 1200);
      expect(long.monthlyEmiPaise).toBeLessThan(short.monthlyEmiPaise);
      expect(long.totalInterestPaise).toBeGreaterThan(short.totalInterestPaise);
    });
  });

  // ─── generateEmiSchedule ───────────────────────────────────

  describe('generateEmiSchedule', () => {
    it('generates correct number of installments', () => {
      const schedule = service.generateEmiSchedule(
        10000000, 12, 1200, new Date('2025-01-01'),
      );
      expect(schedule).toHaveLength(12);
    });

    it('principal + interest breakdown per installment', () => {
      const schedule = service.generateEmiSchedule(
        10000000, 12, 1200, new Date('2025-01-01'),
      );

      for (const item of schedule) {
        expect(item.principalPaise).toBeGreaterThanOrEqual(0);
        expect(item.interestPaise).toBeGreaterThanOrEqual(0);
        // Each installment: amount = principal + interest
        expect(item.amountPaise).toBe(item.principalPaise + item.interestPaise);
      }
    });

    it('outstanding reaches 0 after last installment', () => {
      const schedule = service.generateEmiSchedule(
        10000000, 12, 1200, new Date('2025-01-01'),
      );
      const lastItem = schedule[schedule.length - 1];
      expect(lastItem.outstandingPaise).toBe(0);
    });

    it('total principal across all installments equals original amount', () => {
      const schedule = service.generateEmiSchedule(
        5000000, 6, 1500, new Date('2025-01-01'),
      );
      const totalPrincipal = schedule.reduce((sum, item) => sum + item.principalPaise, 0);
      expect(totalPrincipal).toBe(5000000);
    });

    it('zero interest schedule has equal principal payments', () => {
      const schedule = service.generateEmiSchedule(
        10000000, 10, 0, new Date('2025-01-01'),
      );
      for (const item of schedule) {
        expect(item.interestPaise).toBe(0);
      }
      // First 9 should have equal amounts, last may differ
      for (let i = 0; i < 9; i++) {
        expect(schedule[i].principalPaise).toBe(schedule[0].principalPaise);
      }
    });

    it('installment numbers are sequential from 1', () => {
      const schedule = service.generateEmiSchedule(
        10000000, 6, 1200, new Date('2025-01-01'),
      );
      schedule.forEach((item, idx) => {
        expect(item.installmentNumber).toBe(idx + 1);
      });
    });

    it('due dates are monthly from start date', () => {
      const startDate = new Date('2025-01-15');
      const schedule = service.generateEmiSchedule(10000000, 3, 1200, startDate);
      expect(schedule[0].dueDate).toBe('2025-02-15');
      expect(schedule[1].dueDate).toBe('2025-03-15');
      expect(schedule[2].dueDate).toBe('2025-04-15');
    });
  });

  // ─── calculateEmiWithSchedule ──────────────────────────────

  describe('calculateEmiWithSchedule', () => {
    it('includes processing fee in result', () => {
      const result = service.calculateEmiWithSchedule(
        10000000, 12, 1200, 50000, // Rs 500 processing fee
      );
      expect(result.processingFeePaise).toBe(50000);
      expect(result.schedule).toHaveLength(12);
      expect(result.monthlyEmiPaise).toBeGreaterThan(0);
    });
  });
});
