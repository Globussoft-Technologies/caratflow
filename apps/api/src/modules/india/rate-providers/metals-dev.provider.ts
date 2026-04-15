// ─── Metals.dev Rate Provider ─────────────────────────────────
// Fetches live gold/silver spot rates from metals.dev (free tier:
// USD per troy ounce). Converts to INR per gram using a USD->INR
// rate sourced from env (METALS_DEV_USD_INR) with a safe fallback.
//
// Free-tier limitations:
//   - Rate-limited (roughly 50 req/month on the free plan as of
//     2026-04); we only poll 2 metals/hour = ~1440 req/month, so
//     METALS_DEV_API_KEY must point at a paid/standard plan in prod.
//   - No intraday INR conversion; we rely on env / cached FX.

import { Injectable, Logger } from '@nestjs/common';
import type { IRateProvider, FetchedRate } from './rate-provider.interface';

const TROY_OUNCE_GRAMS = 31.1035;
const DEFAULT_USD_INR = 83.5;
const METALS_DEV_BASE = 'https://api.metals.dev/v1/latest';

interface MetalsDevResponse {
  status?: string;
  currency?: string;
  unit?: string;
  metals?: {
    gold?: number;
    silver?: number;
  };
  // Some metals.dev responses nest under `rates`
  rates?: {
    gold?: number;
    silver?: number;
  };
}

@Injectable()
export class MetalsDevRateProvider implements IRateProvider {
  readonly name = 'metals.dev';
  private readonly logger = new Logger(MetalsDevRateProvider.name);

  async fetchGoldRate(): Promise<FetchedRate | null> {
    return this.fetchMetal('gold');
  }

  async fetchSilverRate(): Promise<FetchedRate | null> {
    return this.fetchMetal('silver');
  }

  private async fetchMetal(metal: 'gold' | 'silver'): Promise<FetchedRate | null> {
    const apiKey = process.env.METALS_DEV_API_KEY ?? '';
    const url = `${METALS_DEV_BASE}?api_key=${encodeURIComponent(apiKey)}&currency=USD&unit=toz`;

    let res: Response;
    try {
      res = await fetch(url, { method: 'GET' });
    } catch (err) {
      this.logger.error(`metals.dev fetch failed: ${(err as Error).message}`);
      return null;
    }

    if (!res.ok) {
      this.logger.error(`metals.dev returned HTTP ${res.status}`);
      return null;
    }

    let body: MetalsDevResponse;
    try {
      body = (await res.json()) as MetalsDevResponse;
    } catch (err) {
      this.logger.error(`metals.dev body parse failed: ${(err as Error).message}`);
      return null;
    }

    const usdPerOz = body.metals?.[metal] ?? body.rates?.[metal];
    if (typeof usdPerOz !== 'number' || !Number.isFinite(usdPerOz) || usdPerOz <= 0) {
      this.logger.warn(`metals.dev response missing ${metal} price`);
      return null;
    }

    const usdInr = this.getUsdInrRate();
    const pricePerGramInr = (usdPerOz * usdInr) / TROY_OUNCE_GRAMS;

    return {
      pricePerGramInr,
      source: this.name,
      fetchedAt: new Date(),
    };
  }

  /** Resolve USD→INR: env override -> default. Exposed for tests. */
  getUsdInrRate(): number {
    const raw = process.env.METALS_DEV_USD_INR;
    if (raw) {
      const parsed = Number(raw);
      if (Number.isFinite(parsed) && parsed > 0) return parsed;
    }
    return DEFAULT_USD_INR;
  }
}
