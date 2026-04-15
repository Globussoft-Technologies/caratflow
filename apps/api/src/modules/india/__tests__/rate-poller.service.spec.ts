import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RatePollerService } from '../rate-poller.service';
import type { IRateProvider } from '../rate-providers/rate-provider.interface';
import { createMockPrismaService, resetAllMocks } from '../../../__tests__/setup';

function makeProvider(overrides: Partial<IRateProvider> = {}): IRateProvider {
  return {
    name: 'test-provider',
    fetchGoldRate: vi.fn().mockResolvedValue(null),
    fetchSilverRate: vi.fn().mockResolvedValue(null),
    ...overrides,
  };
}

describe('RatePollerService (Unit)', () => {
  let prisma: ReturnType<typeof createMockPrismaService>;

  beforeEach(() => {
    prisma = createMockPrismaService();
    (prisma as any).metalRateHistory = {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'row-1' }),
    };
    resetAllMocks(prisma);
    (prisma as any).metalRateHistory.findFirst.mockResolvedValue(null);
    (prisma as any).metalRateHistory.create.mockResolvedValue({ id: 'row-1' });
  });

  // ─── buildRow conversion ──────────────────────────────────────

  it('buildRow converts INR/g into all four paise-denominated columns', () => {
    const svc = new RatePollerService(prisma as any, makeProvider());
    const row = svc.buildRow('GOLD', {
      pricePerGramInr: 7500,
      source: 'metals.dev',
      fetchedAt: new Date('2026-04-15T10:00:00Z'),
    });

    expect(row.metalType).toBe('GOLD');
    expect(row.purity).toBe(999);
    expect(row.source).toBe('metals.dev');
    expect(row.ratePerGramPaise).toBe(750000n); // 7500 INR * 100
    expect(row.ratePer10gPaise).toBe(7500000n);
    // 7500 * 11.664 * 100 = 8748000
    expect(row.ratePerTolaPaise).toBe(8748000n);
    // 7500 * 31.1035 * 100 = 23327625
    expect(row.ratePerTroyOzPaise).toBe(23327625n);
  });

  // ─── runPoll happy path ──────────────────────────────────────

  it('runPoll writes one row each for gold + silver', async () => {
    const provider = makeProvider({
      fetchGoldRate: vi.fn().mockResolvedValue({
        pricePerGramInr: 7000,
        source: 'metals.dev',
        fetchedAt: new Date(),
      }),
      fetchSilverRate: vi.fn().mockResolvedValue({
        pricePerGramInr: 90,
        source: 'metals.dev',
        fetchedAt: new Date(),
      }),
    });

    const svc = new RatePollerService(prisma as any, provider);
    const result = await svc.runPoll();

    expect(result).toEqual({ gold: true, silver: true });
    expect((prisma as any).metalRateHistory.create).toHaveBeenCalledTimes(2);

    const calls = (prisma as any).metalRateHistory.create.mock.calls;
    const types = calls.map((c: any) => c[0].data.metalType).sort();
    expect(types).toEqual(['GOLD', 'SILVER']);
  });

  // ─── idempotency ─────────────────────────────────────────────

  it('runPoll skips writes when a row already exists for today', async () => {
    (prisma as any).metalRateHistory.findFirst.mockResolvedValue({ id: 'existing' });
    const provider = makeProvider({
      fetchGoldRate: vi.fn().mockResolvedValue({
        pricePerGramInr: 7000,
        source: 'metals.dev',
        fetchedAt: new Date(),
      }),
      fetchSilverRate: vi.fn().mockResolvedValue({
        pricePerGramInr: 90,
        source: 'metals.dev',
        fetchedAt: new Date(),
      }),
    });

    const svc = new RatePollerService(prisma as any, provider);
    const result = await svc.runPoll();

    expect(result).toEqual({ gold: false, silver: false });
    expect((prisma as any).metalRateHistory.create).not.toHaveBeenCalled();
  });

  // ─── skip when provider returns null ─────────────────────────

  it('runPoll skips writes when provider returns null (manual mode)', async () => {
    const svc = new RatePollerService(prisma as any, makeProvider());
    const result = await svc.runPoll();
    expect(result).toEqual({ gold: false, silver: false });
    expect((prisma as any).metalRateHistory.create).not.toHaveBeenCalled();
  });

  // ─── error handling ──────────────────────────────────────────

  it('runPoll does not throw when the provider throws', async () => {
    const provider = makeProvider({
      fetchGoldRate: vi.fn().mockRejectedValue(new Error('boom')),
      fetchSilverRate: vi.fn().mockResolvedValue(null),
    });
    const svc = new RatePollerService(prisma as any, provider);

    await expect(svc.runPoll()).resolves.toEqual({ gold: false, silver: false });
    expect((prisma as any).metalRateHistory.create).not.toHaveBeenCalled();
  });

  it('runPoll isolates silver failure from gold success', async () => {
    const provider = makeProvider({
      fetchGoldRate: vi.fn().mockResolvedValue({
        pricePerGramInr: 7000,
        source: 'metals.dev',
        fetchedAt: new Date(),
      }),
      fetchSilverRate: vi.fn().mockRejectedValue(new Error('silver down')),
    });
    const svc = new RatePollerService(prisma as any, provider);

    const result = await svc.runPoll();
    expect(result).toEqual({ gold: true, silver: false });
    expect((prisma as any).metalRateHistory.create).toHaveBeenCalledTimes(1);
  });

  // ─── refreshNow ──────────────────────────────────────────────

  it('refreshNow(GOLD) only polls gold', async () => {
    const provider = makeProvider({
      fetchGoldRate: vi.fn().mockResolvedValue({
        pricePerGramInr: 7000,
        source: 'metals.dev',
        fetchedAt: new Date(),
      }),
      fetchSilverRate: vi.fn().mockResolvedValue({
        pricePerGramInr: 90,
        source: 'metals.dev',
        fetchedAt: new Date(),
      }),
    });
    const svc = new RatePollerService(prisma as any, provider);

    const result = await svc.refreshNow('GOLD');
    expect(result).toEqual({ gold: true });
    expect(provider.fetchGoldRate).toHaveBeenCalledOnce();
    expect(provider.fetchSilverRate).not.toHaveBeenCalled();
  });

  it('refreshNow() with no metal polls both', async () => {
    const provider = makeProvider({
      fetchGoldRate: vi.fn().mockResolvedValue({
        pricePerGramInr: 7000,
        source: 'metals.dev',
        fetchedAt: new Date(),
      }),
      fetchSilverRate: vi.fn().mockResolvedValue({
        pricePerGramInr: 90,
        source: 'metals.dev',
        fetchedAt: new Date(),
      }),
    });
    const svc = new RatePollerService(prisma as any, provider);

    const result = await svc.refreshNow();
    expect(result).toEqual({ gold: true, silver: true });
  });

  // ─── idempotency query shape ─────────────────────────────────

  it('idempotency check queries by metalType, purity=999, source, and same-day window', async () => {
    const provider = makeProvider({
      fetchGoldRate: vi.fn().mockResolvedValue({
        pricePerGramInr: 7000,
        source: 'metals.dev',
        fetchedAt: new Date('2026-04-15T12:34:56Z'),
      }),
    });
    const svc = new RatePollerService(prisma as any, provider);
    await svc.refreshNow('GOLD');

    const where = (prisma as any).metalRateHistory.findFirst.mock.calls[0][0].where;
    expect(where.metalType).toBe('GOLD');
    expect(where.purity).toBe(999);
    expect(where.source).toBe('metals.dev');
    expect(where.recordedAt.gte).toBeInstanceOf(Date);
    expect(where.recordedAt.lt).toBeInstanceOf(Date);
    expect(where.recordedAt.lt.getTime() - where.recordedAt.gte.getTime()).toBe(
      24 * 60 * 60 * 1000,
    );
  });
});
