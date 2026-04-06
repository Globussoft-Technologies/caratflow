import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IndiaRatesService } from '../india.rates.service';
import { createMockPrismaService, resetAllMocks } from '../../../__tests__/setup';

describe('IndiaRatesService (Unit)', () => {
  let service: IndiaRatesService;
  let mockPrisma: ReturnType<typeof createMockPrismaService>;

  beforeEach(() => {
    mockPrisma = createMockPrismaService();
    (mockPrisma as any).metalRateHistory = {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
    };
    service = new IndiaRatesService(mockPrisma as any);
    resetAllMocks(mockPrisma);
  });

  const mockGoldRate = {
    id: 'rate-1',
    metalType: 'GOLD',
    purity: 999,
    ratePerGramPaise: 750000n,
    ratePer10gPaise: 7500000n,
    ratePerTolaPaise: 8748600n,
    ratePerTroyOzPaise: 23327625n,
    source: 'MANUAL',
    recordedAt: new Date('2025-04-01'),
    currencyCode: 'INR',
  };

  // ─── recordRate ─────────────────────────────────────────────────

  describe('recordRate', () => {
    it('records a manual rate and returns response', async () => {
      (mockPrisma as any).metalRateHistory.create.mockResolvedValue(mockGoldRate);

      const result = await service.recordRate({
        metalType: 'gold',
        purity: 999,
        ratePerGramPaise: 750000,
        ratePer10gPaise: 7500000,
        ratePerTolaPaise: 8748600,
        ratePerTroyOzPaise: 23327625,
        source: 'MANUAL',
        recordedAt: new Date('2025-04-01'),
      } as any);

      expect(result.metalType).toBe('GOLD');
      expect(result.ratePer10gPaise).toBe(7500000);
    });

    it('uppercases metal type', async () => {
      (mockPrisma as any).metalRateHistory.create.mockResolvedValue(mockGoldRate);

      await service.recordRate({
        metalType: 'silver',
        purity: 999,
        ratePerGramPaise: 9000,
        ratePer10gPaise: 90000,
        ratePerTolaPaise: 104976,
        ratePerTroyOzPaise: 279932,
        source: 'MANUAL',
        recordedAt: new Date(),
      } as any);

      expect((mockPrisma as any).metalRateHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ metalType: 'SILVER' }),
        }),
      );
    });

    it('invalidates cache after recording', async () => {
      // First populate cache
      (mockPrisma as any).metalRateHistory.findMany.mockResolvedValue([mockGoldRate]);
      await service.getCurrentRate('GOLD', 999);

      // Record new rate
      const newRate = { ...mockGoldRate, ratePer10gPaise: 8000000n };
      (mockPrisma as any).metalRateHistory.create.mockResolvedValue(newRate);
      await service.recordRate({
        metalType: 'GOLD',
        purity: 999,
        ratePerGramPaise: 800000,
        ratePer10gPaise: 8000000,
        ratePerTolaPaise: 9331200,
        ratePerTroyOzPaise: 24882800,
        source: 'MANUAL',
        recordedAt: new Date(),
      } as any);

      // Next getCurrentRate should hit DB again (cache cleared)
      (mockPrisma as any).metalRateHistory.findMany.mockResolvedValue([newRate]);
      const result = await service.getCurrentRate('GOLD', 999);
      expect(result.ratePer10gPaise).toBe(8000000);
    });
  });

  // ─── getCurrentRate ─────────────────────────────────────────────

  describe('getCurrentRate', () => {
    it('returns current rate with all unit conversions', async () => {
      (mockPrisma as any).metalRateHistory.findMany.mockResolvedValue([mockGoldRate]);

      const result = await service.getCurrentRate('GOLD', 999);

      expect(result.metalType).toBe('GOLD');
      expect(result.purity).toBe(999);
      expect(result.ratePerGramPaise).toBe(750000);
      expect(result.ratePer10gPaise).toBe(7500000);
      expect(result.ratePerTolaPaise).toBe(8748600);
      expect(result.ratePerTroyOzPaise).toBe(23327625);
    });

    it('calculates change percent from previous rate', async () => {
      const previousRate = { ...mockGoldRate, id: 'rate-0', ratePer10gPaise: 7000000n, recordedAt: new Date('2025-03-01') };
      (mockPrisma as any).metalRateHistory.findMany.mockResolvedValue([mockGoldRate, previousRate]);

      const result = await service.getCurrentRate('GOLD', 999);

      // (7500000 - 7000000) / 7000000 * 100 = 7.14%
      expect(result.changePercent).toBeCloseTo(7.14, 1);
    });

    it('returns null changePercent when only one rate exists', async () => {
      (mockPrisma as any).metalRateHistory.findMany.mockResolvedValue([mockGoldRate]);

      const result = await service.getCurrentRate('GOLD', 999);
      expect(result.changePercent).toBeNull();
    });

    it('throws NotFoundException when no rate exists', async () => {
      (mockPrisma as any).metalRateHistory.findMany.mockResolvedValue([]);

      await expect(service.getCurrentRate('PLATINUM', 999)).rejects.toThrow('No rate found');
    });

    it('uses cache for repeated calls', async () => {
      (mockPrisma as any).metalRateHistory.findMany.mockResolvedValue([mockGoldRate]);

      await service.getCurrentRate('GOLD', 999);
      await service.getCurrentRate('GOLD', 999);

      // Should only call DB once (cached on second call)
      expect((mockPrisma as any).metalRateHistory.findMany).toHaveBeenCalledTimes(1);
    });
  });

  // ─── getHistoricalRates ─────────────────────────────────────────

  describe('getHistoricalRates', () => {
    it('returns historical rates sorted by date', async () => {
      (mockPrisma as any).metalRateHistory.findMany.mockResolvedValue([
        { ...mockGoldRate, recordedAt: new Date('2025-04-01') },
        { ...mockGoldRate, id: 'rate-2', recordedAt: new Date('2025-03-01') },
      ]);

      const result = await service.getHistoricalRates({
        metalType: 'GOLD',
        purity: 999,
      });

      expect(result).toHaveLength(2);
    });

    it('filters by date range', async () => {
      (mockPrisma as any).metalRateHistory.findMany.mockResolvedValue([]);

      await service.getHistoricalRates({
        metalType: 'GOLD',
        purity: 999,
        dateRange: {
          from: new Date('2025-01-01'),
          to: new Date('2025-03-31'),
        },
      });

      expect((mockPrisma as any).metalRateHistory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            recordedAt: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
        }),
      );
    });
  });

  // ─── different metal types ──────────────────────────────────────

  describe('different metal types', () => {
    it('handles SILVER rates', async () => {
      const silverRate = {
        ...mockGoldRate,
        metalType: 'SILVER',
        ratePerGramPaise: 9000n,
        ratePer10gPaise: 90000n,
      };
      (mockPrisma as any).metalRateHistory.findMany.mockResolvedValue([silverRate]);

      const result = await service.getCurrentRate('SILVER', 999);
      expect(result.metalType).toBe('SILVER');
      expect(result.ratePerGramPaise).toBe(9000);
    });

    it('handles PLATINUM rates', async () => {
      const platinumRate = {
        ...mockGoldRate,
        metalType: 'PLATINUM',
        purity: 950,
        ratePerGramPaise: 300000n,
      };
      (mockPrisma as any).metalRateHistory.findMany.mockResolvedValue([platinumRate]);

      const result = await service.getCurrentRate('PLATINUM', 950);
      expect(result.metalType).toBe('PLATINUM');
      expect(result.purity).toBe(950);
    });
  });

  // ─── getAllCurrentRates ─────────────────────────────────────────

  describe('getAllCurrentRates', () => {
    it('returns deduplicated current rates', async () => {
      (mockPrisma as any).metalRateHistory.findMany
        .mockResolvedValueOnce([
          { ...mockGoldRate, metalType: 'GOLD', purity: 999 },
          { ...mockGoldRate, metalType: 'GOLD', purity: 916 },
          { ...mockGoldRate, metalType: 'SILVER', purity: 999 },
        ])
        // For each getCurrentRate call:
        .mockResolvedValueOnce([{ ...mockGoldRate, metalType: 'GOLD', purity: 999 }])
        .mockResolvedValueOnce([{ ...mockGoldRate, metalType: 'GOLD', purity: 916 }])
        .mockResolvedValueOnce([{ ...mockGoldRate, metalType: 'SILVER', purity: 999 }]);

      const results = await service.getAllCurrentRates();
      expect(results).toHaveLength(3);
    });
  });
});
