import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReportingForecastService } from '../reporting.forecast.service';
import { createMockPrismaService, TEST_TENANT_ID } from '../../../__tests__/setup';

function extendPrisma(base: ReturnType<typeof createMockPrismaService>) {
  return {
    ...base,
    saleLineItem: { findMany: vi.fn() },
  };
}

describe('ReportingForecastService (Unit)', () => {
  let service: ReportingForecastService;
  let mockPrisma: ReturnType<typeof extendPrisma>;

  beforeEach(() => {
    mockPrisma = extendPrisma(createMockPrismaService());
    service = new ReportingForecastService(mockPrisma as any);
  });

  describe('demandForecast', () => {
    it('returns predictions using blended SMA + ES method', async () => {
      // Generate 12 months of data
      const items = [];
      for (let m = 0; m < 12; m++) {
        const date = new Date(2024, m, 15);
        for (let i = 0; i < 10 + m; i++) {
          items.push({ quantity: 1, sale: { createdAt: date } });
        }
      }
      mockPrisma.saleLineItem.findMany.mockResolvedValue(items);

      const result = await service.demandForecast(TEST_TENANT_ID, {
        periods: 3,
      });

      expect(result.method).toBe('blended_sma_es');
      expect(result.predictions.length).toBeGreaterThan(3);
      expect(result.accuracy).toBeGreaterThan(0);
    });

    it('returns insufficient_data for less than 3 months', async () => {
      mockPrisma.saleLineItem.findMany.mockResolvedValue([
        { quantity: 5, sale: { createdAt: new Date('2025-01-15') } },
      ]);

      const result = await service.demandForecast(TEST_TENANT_ID, { periods: 3 });

      expect(result.method).toBe('insufficient_data');
      expect(result.predictions).toHaveLength(0);
    });

    it('scopes forecast to productId', async () => {
      mockPrisma.saleLineItem.findMany.mockResolvedValue([]);

      await service.demandForecast(TEST_TENANT_ID, {
        productId: 'p-1', periods: 3,
      });

      expect(mockPrisma.saleLineItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ productId: 'p-1' }),
        }),
      );
    });

    it('returns confidence that decreases further out', async () => {
      const items = [];
      for (let m = 0; m < 6; m++) {
        for (let i = 0; i < 10; i++) {
          items.push({ quantity: 1, sale: { createdAt: new Date(2024, m, 15) } });
        }
      }
      mockPrisma.saleLineItem.findMany.mockResolvedValue(items);

      const result = await service.demandForecast(TEST_TENANT_ID, { periods: 3 });

      const forecasts = result.predictions.filter((p) => p.actual === null);
      expect(forecasts[0].confidence).toBeGreaterThan(forecasts[2].confidence);
    });
  });

  describe('reorderPointCalculation', () => {
    it('calculates reorder point with safety stock', async () => {
      const items = [];
      for (let d = 0; d < 90; d++) {
        const date = new Date();
        date.setDate(date.getDate() - d);
        if (d % 3 === 0) {
          items.push({ quantity: 2, sale: { createdAt: date } });
        }
      }
      mockPrisma.saleLineItem.findMany.mockResolvedValue(items);

      const result = await service.reorderPointCalculation(TEST_TENANT_ID, 'p-1', 7, 0.95);

      expect(result.reorderPoint).toBeGreaterThan(0);
      expect(result.safetyStock).toBeGreaterThanOrEqual(0);
      expect(result.avgDailyDemand).toBeGreaterThan(0);
    });

    it('returns zero for products with no sales', async () => {
      mockPrisma.saleLineItem.findMany.mockResolvedValue([]);

      const result = await service.reorderPointCalculation(TEST_TENANT_ID, 'p-1', 7);

      expect(result.avgDailyDemand).toBe(0);
      expect(result.reorderPoint).toBe(0);
    });
  });

  describe('seasonalityAnalysis', () => {
    it('returns seasonal indices for 12 months', async () => {
      const items = [];
      // Simulate higher demand in Nov-Dec (wedding season)
      for (let m = 0; m < 12; m++) {
        const qty = m >= 10 ? 50 : 10;
        for (let i = 0; i < qty; i++) {
          items.push({
            quantity: 1, lineTotalPaise: 100000n,
            sale: { createdAt: new Date(2024, m, 15) },
          });
        }
      }
      mockPrisma.saleLineItem.findMany.mockResolvedValue(items);

      const result = await service.seasonalityAnalysis(TEST_TENANT_ID);

      expect(result).toHaveLength(12);
      expect(result[10].monthName).toBe('November');
      expect(result[10].seasonalIndex).toBeGreaterThan(1); // above average
    });

    it('handles no sales data', async () => {
      mockPrisma.saleLineItem.findMany.mockResolvedValue([]);

      const result = await service.seasonalityAnalysis(TEST_TENANT_ID);
      expect(result).toHaveLength(12);
      expect(result[0].seasonalIndex).toBe(0);
    });
  });
});
