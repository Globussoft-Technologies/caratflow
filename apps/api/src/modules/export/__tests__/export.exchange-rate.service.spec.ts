import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExportExchangeRateService } from '../export.exchange-rate.service';
import { createMockPrismaService, TEST_TENANT_ID, TEST_USER_ID, resetAllMocks } from '../../../__tests__/setup';

describe('ExportExchangeRateService (Unit)', () => {
  let service: ExportExchangeRateService;
  let mockPrisma: ReturnType<typeof createMockPrismaService>;

  beforeEach(() => {
    mockPrisma = createMockPrismaService();
    (mockPrisma as any).exchangeRateHistory = {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
    };
    service = new ExportExchangeRateService(mockPrisma as any);
    resetAllMocks(mockPrisma);
  });

  const mockRate = {
    id: 'rate-1',
    fromCurrency: 'USD',
    toCurrency: 'INR',
    rate: 830000,
    source: 'RBI',
    recordedDate: new Date(),
    effectiveDate: new Date(),
  };

  // ─── recordRate ─────────────────────────────────────────────────

  describe('recordRate', () => {
    it('records a new exchange rate', async () => {
      (mockPrisma as any).exchangeRateHistory.create.mockResolvedValue({});
      (mockPrisma as any).exchangeRateHistory.findFirst.mockResolvedValue(mockRate);

      const result = await service.recordRate(TEST_TENANT_ID, TEST_USER_ID, {
        fromCurrency: 'usd',
        toCurrency: 'inr',
        rate: 830000,
        source: 'RBI',
        effectiveDate: new Date(),
      } as any);

      expect(result.fromCurrency).toBe('USD');
      expect(result.toCurrency).toBe('INR');
      expect(result.rate).toBe(830000);
    });

    it('uppercases currency codes', async () => {
      (mockPrisma as any).exchangeRateHistory.create.mockResolvedValue({});
      (mockPrisma as any).exchangeRateHistory.findFirst.mockResolvedValue(mockRate);

      await service.recordRate(TEST_TENANT_ID, TEST_USER_ID, {
        fromCurrency: 'eur',
        toCurrency: 'inr',
        rate: 900000,
        source: 'MANUAL',
        effectiveDate: new Date(),
      } as any);

      expect((mockPrisma as any).exchangeRateHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            fromCurrency: 'EUR',
            toCurrency: 'INR',
          }),
        }),
      );
    });
  });

  // ─── getCurrentRate ─────────────────────────────────────────────

  describe('getCurrentRate', () => {
    it('returns current rate for currency pair', async () => {
      (mockPrisma as any).exchangeRateHistory.findFirst.mockResolvedValue(mockRate);

      const result = await service.getCurrentRate(TEST_TENANT_ID, 'USD', 'INR');
      expect(result).not.toBeNull();
      expect(result!.rate).toBe(830000);
      expect(result!.rateDecimal).toBe(83);
    });

    it('returns null when no rate found', async () => {
      (mockPrisma as any).exchangeRateHistory.findFirst.mockResolvedValue(null);

      const result = await service.getCurrentRate(TEST_TENANT_ID, 'XYZ', 'INR');
      expect(result).toBeNull();
    });
  });

  // ─── lockRateForInvoice ─────────────────────────────────────────

  describe('lockRateForInvoice', () => {
    it('returns rate for locking', async () => {
      (mockPrisma as any).exchangeRateHistory.findFirst.mockResolvedValue(mockRate);

      const rate = await service.lockRateForInvoice(TEST_TENANT_ID, 'USD', 'INR');
      expect(rate).toBe(830000);
    });

    it('throws NotFoundException when no rate exists for pair', async () => {
      (mockPrisma as any).exchangeRateHistory.findFirst.mockResolvedValue(null);

      await expect(
        service.lockRateForInvoice(TEST_TENANT_ID, 'GBP', 'INR'),
      ).rejects.toThrow('No exchange rate found');
    });
  });

  // ─── getHistoricalRates ─────────────────────────────────────────

  describe('getHistoricalRates', () => {
    it('returns paginated historical rates', async () => {
      (mockPrisma as any).exchangeRateHistory.findMany.mockResolvedValue([
        { ...mockRate, rate: 830000, effectiveDate: new Date('2025-04-01'), recordedDate: new Date('2025-04-01') },
        { ...mockRate, rate: 825000, effectiveDate: new Date('2025-03-01'), recordedDate: new Date('2025-03-01') },
      ]);
      (mockPrisma as any).exchangeRateHistory.count.mockResolvedValue(2);

      const result = await service.getHistoricalRates(
        TEST_TENANT_ID,
        'USD',
        'INR',
        { page: 1, limit: 10 },
      );

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
    });
  });

  // ─── listRates ──────────────────────────────────────────────────

  describe('listRates', () => {
    it('lists all rates for the tenant', async () => {
      (mockPrisma as any).exchangeRateHistory.findMany.mockResolvedValue([mockRate]);
      (mockPrisma as any).exchangeRateHistory.count.mockResolvedValue(1);

      const result = await service.listRates(TEST_TENANT_ID, { page: 1, limit: 10 });
      expect(result.items).toHaveLength(1);
    });
  });

  // ─── different currency pairs ───────────────────────────────────

  describe('different currency pairs', () => {
    it('handles EUR/INR pair', async () => {
      const eurRate = { ...mockRate, fromCurrency: 'EUR', rate: 900000 };
      (mockPrisma as any).exchangeRateHistory.findFirst.mockResolvedValue(eurRate);

      const result = await service.getCurrentRate(TEST_TENANT_ID, 'EUR', 'INR');
      expect(result!.fromCurrency).toBe('EUR');
      expect(result!.rate).toBe(900000);
    });

    it('handles GBP/INR pair', async () => {
      const gbpRate = { ...mockRate, fromCurrency: 'GBP', rate: 1050000 };
      (mockPrisma as any).exchangeRateHistory.findFirst.mockResolvedValue(gbpRate);

      const result = await service.getCurrentRate(TEST_TENANT_ID, 'GBP', 'INR');
      expect(result!.fromCurrency).toBe('GBP');
    });
  });
});
