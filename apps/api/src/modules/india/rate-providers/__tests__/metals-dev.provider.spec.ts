import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MetalsDevRateProvider } from '../metals-dev.provider';

describe('MetalsDevRateProvider (Unit)', () => {
  let provider: MetalsDevRateProvider;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    provider = new MetalsDevRateProvider();
    fetchMock = vi.fn();
    (globalThis as any).fetch = fetchMock;
    process.env.METALS_DEV_API_KEY = 'test-key';
    process.env.METALS_DEV_USD_INR = '80';
  });

  afterEach(() => {
    delete process.env.METALS_DEV_USD_INR;
  });

  it('converts USD/oz to INR/g using env FX rate', async () => {
    // 2000 USD/oz * 80 INR/USD / 31.1035 g/oz = ~5144.76 INR/g
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ metals: { gold: 2000 } }),
    });

    const result = await provider.fetchGoldRate();
    expect(result).not.toBeNull();
    expect(result!.source).toBe('metals.dev');
    expect(result!.pricePerGramInr).toBeCloseTo((2000 * 80) / 31.1035, 2);
    expect(result!.fetchedAt).toBeInstanceOf(Date);
  });

  it('reads the silver price from the metals bag', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ metals: { silver: 25 } }),
    });

    const result = await provider.fetchSilverRate();
    expect(result).not.toBeNull();
    expect(result!.pricePerGramInr).toBeCloseTo((25 * 80) / 31.1035, 4);
  });

  it('supports alternate response shape with `rates` key', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ rates: { gold: 1800 } }),
    });

    const result = await provider.fetchGoldRate();
    expect(result).not.toBeNull();
    expect(result!.pricePerGramInr).toBeCloseTo((1800 * 80) / 31.1035, 2);
  });

  it('falls back to default USD/INR when env var is unset', async () => {
    delete process.env.METALS_DEV_USD_INR;
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ metals: { gold: 2000 } }),
    });

    const result = await provider.fetchGoldRate();
    expect(result).not.toBeNull();
    // Default is 83.5
    expect(result!.pricePerGramInr).toBeCloseTo((2000 * 83.5) / 31.1035, 2);
  });

  it('returns null on non-ok HTTP response', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 429, json: async () => ({}) });
    expect(await provider.fetchGoldRate()).toBeNull();
  });

  it('returns null when fetch throws (network error)', async () => {
    fetchMock.mockRejectedValue(new Error('ENETUNREACH'));
    expect(await provider.fetchGoldRate()).toBeNull();
  });

  it('returns null when price is missing or zero', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ metals: { gold: 0 } }),
    });
    expect(await provider.fetchGoldRate()).toBeNull();

    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ metals: {} }),
    });
    expect(await provider.fetchSilverRate()).toBeNull();
  });

  it('getUsdInrRate honors env override and ignores bad values', () => {
    process.env.METALS_DEV_USD_INR = '90';
    expect(provider.getUsdInrRate()).toBe(90);

    process.env.METALS_DEV_USD_INR = 'not-a-number';
    expect(provider.getUsdInrRate()).toBe(83.5);

    process.env.METALS_DEV_USD_INR = '-5';
    expect(provider.getUsdInrRate()).toBe(83.5);
  });
});
