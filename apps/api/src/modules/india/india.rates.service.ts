// ─── India Rates Service ───────────────────────────────────────
// MCX/IBJA metal rate feed: manual entry, polling placeholder,
// current & historical rate queries, in-memory cache.

import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import type { Prisma } from '@caratflow/db';
import type {
  MetalRateInput,
  MetalRateQuery,
  MetalRateResponse,
  LiveRateResponse,
} from '@caratflow/shared-types';
import { MetalRateSource } from '@caratflow/shared-types';

/** Simple in-memory rate cache. In production, use Redis via CacheModule. */
interface CachedRate {
  rate: LiveRateResponse;
  cachedAt: number;
}

@Injectable()
export class IndiaRatesService {
  private readonly logger = new Logger(IndiaRatesService.name);
  private readonly rateCache = new Map<string, CachedRate>();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  constructor(private readonly prisma: PrismaService) {}

  // ─── Manual Rate Entry ───────────────────────────────────────

  async recordRate(input: MetalRateInput): Promise<MetalRateResponse> {
    const record = await this.prisma.metalRateHistory.create({
      data: {
        metalType: input.metalType.toUpperCase(),
        purity: input.purity,
        ratePerGramPaise: BigInt(input.ratePerGramPaise),
        ratePer10gPaise: BigInt(input.ratePer10gPaise),
        ratePerTolaPaise: BigInt(input.ratePerTolaPaise),
        ratePerTroyOzPaise: BigInt(input.ratePerTroyOzPaise),
        source: input.source,
        recordedAt: input.recordedAt,
        currencyCode: input.currencyCode ?? 'INR',
      },
    });

    // Invalidate cache for this metal+purity
    const cacheKey = `${input.metalType.toUpperCase()}:${input.purity}`;
    this.rateCache.delete(cacheKey);

    this.logger.log(`Rate recorded: ${input.metalType} ${input.purity} = ${input.ratePer10gPaise} per 10g`);

    return this.toResponse(record);
  }

  // ─── Current Rate Query ──────────────────────────────────────

  async getCurrentRate(metalType: string, purity: number): Promise<LiveRateResponse> {
    const cacheKey = `${metalType.toUpperCase()}:${purity}`;

    // Check cache
    const cached = this.rateCache.get(cacheKey);
    if (cached && Date.now() - cached.cachedAt < this.CACHE_TTL_MS) {
      return cached.rate;
    }

    // Fetch latest two rates for change calculation
    const rates = await this.prisma.metalRateHistory.findMany({
      where: { metalType: metalType.toUpperCase(), purity },
      orderBy: { recordedAt: 'desc' },
      take: 2,
    });

    if (rates.length === 0) {
      throw new NotFoundException(`No rate found for ${metalType} purity ${purity}`);
    }

    const current = rates[0]!;
    const previous = rates.length > 1 ? rates[1] : null;

    let changePercent: number | null = null;
    if (previous) {
      const prevRate = Number(previous.ratePer10gPaise);
      const currRate = Number(current.ratePer10gPaise);
      if (prevRate > 0) {
        changePercent = Math.round(((currRate - prevRate) / prevRate) * 10000) / 100;
      }
    }

    const liveRate: LiveRateResponse = {
      metalType: current.metalType,
      purity: current.purity,
      ratePerGramPaise: Number(current.ratePerGramPaise),
      ratePer10gPaise: Number(current.ratePer10gPaise),
      ratePerTolaPaise: Number(current.ratePerTolaPaise),
      ratePerTroyOzPaise: Number(current.ratePerTroyOzPaise),
      source: current.source,
      updatedAt: current.recordedAt.toISOString(),
      currencyCode: current.currencyCode,
      changePercent,
    };

    // Update cache
    this.rateCache.set(cacheKey, { rate: liveRate, cachedAt: Date.now() });

    return liveRate;
  }

  // ─── Historical Rates ────────────────────────────────────────

  async getHistoricalRates(query: MetalRateQuery): Promise<MetalRateResponse[]> {
    const where: Prisma.MetalRateHistoryWhereInput = {
      metalType: query.metalType.toUpperCase(),
      purity: query.purity,
    };

    if (query.dateRange) {
      where.recordedAt = { gte: query.dateRange.from, lte: query.dateRange.to };
    }

    const rates = await this.prisma.metalRateHistory.findMany({
      where,
      orderBy: { recordedAt: 'desc' },
      take: 365, // max 1 year of daily data
    });

    return rates.map(this.toResponse);
  }

  // ─── All Current Rates (dashboard) ───────────────────────────

  async getAllCurrentRates(): Promise<LiveRateResponse[]> {
    // Get distinct metal+purity combinations from recent records
    const recentRates = await this.prisma.metalRateHistory.findMany({
      orderBy: { recordedAt: 'desc' },
      take: 50,
    });

    // Deduplicate by metal+purity, keeping latest
    const latestByKey = new Map<string, typeof recentRates[0]>();
    for (const rate of recentRates) {
      const key = `${rate.metalType}:${rate.purity}`;
      if (!latestByKey.has(key)) {
        latestByKey.set(key, rate);
      }
    }

    const results: LiveRateResponse[] = [];
    for (const [, rate] of latestByKey) {
      try {
        const liveRate = await this.getCurrentRate(rate.metalType, rate.purity);
        results.push(liveRate);
      } catch {
        // Skip if rate not found
      }
    }

    return results;
  }

  // ─── MCX / IBJA API Polling ──────────────────────────────────

  /**
   * Poll MCX/IBJA feed for live gold + silver rates.
   *
   * Real polling path activates when MCX credentials are present
   * (MCX_API_URL + MCX_API_KEY). When unset, falls back to a log-only
   * no-op so dev/demo environments don't hammer a non-existent
   * endpoint. The BullMQ-driven `RatePollerService` is the primary
   * hourly poller (uses metals.dev provider by default); this method
   * is retained for manual admin refresh and for tenants on their own
   * MCX subscription.
   */
  async pollMcxRates(): Promise<{ gold: boolean; silver: boolean }> {
    const apiUrl = process.env.MCX_API_URL;
    const apiKey = process.env.MCX_API_KEY;

    if (!apiUrl || !apiKey) {
      this.logger.debug(
        'MCX rate polling skipped: set MCX_API_URL and MCX_API_KEY to enable',
      );
      return { gold: false, silver: false };
    }

    try {
      const res = await fetch(apiUrl, {
        method: 'GET',
        headers: { 'x-api-key': apiKey, Accept: 'application/json' },
      });
      if (!res.ok) {
        this.logger.warn(`MCX poll HTTP ${res.status}`);
        return { gold: false, silver: false };
      }
      const body = (await res.json()) as {
        gold999_per10g?: number;
        silver999_per1kg?: number;
        timestamp?: string;
      };

      const recordedAt = body.timestamp ? new Date(body.timestamp) : new Date();
      const results = { gold: false, silver: false };

      if (typeof body.gold999_per10g === 'number' && body.gold999_per10g > 0) {
        const perGramPaise = Math.round((body.gold999_per10g / 10) * 100);
        await this.recordRate({
          metalType: 'GOLD',
          purity: 999,
          ratePerGramPaise: perGramPaise,
          ratePer10gPaise: perGramPaise * 10,
          ratePerTolaPaise: Math.round(perGramPaise * 11.664),
          ratePerTroyOzPaise: Math.round(perGramPaise * 31.1035),
          source: MetalRateSource.MCX,
          recordedAt,
          currencyCode: 'INR',
        });
        results.gold = true;
      }
      if (typeof body.silver999_per1kg === 'number' && body.silver999_per1kg > 0) {
        const perGramPaise = Math.round((body.silver999_per1kg / 1000) * 100);
        await this.recordRate({
          metalType: 'SILVER',
          purity: 999,
          ratePerGramPaise: perGramPaise,
          ratePer10gPaise: perGramPaise * 10,
          ratePerTolaPaise: Math.round(perGramPaise * 11.664),
          ratePerTroyOzPaise: Math.round(perGramPaise * 31.1035),
          source: MetalRateSource.MCX,
          recordedAt,
          currencyCode: 'INR',
        });
        results.silver = true;
      }

      this.logger.log(
        `MCX poll complete: gold=${results.gold} silver=${results.silver}`,
      );
      return results;
    } catch (err) {
      this.logger.error(`MCX poll failed: ${(err as Error).message}`);
      return { gold: false, silver: false };
    }
  }

  /**
   * Rate change notification logic (called after rate recording).
   * In production, this would trigger notifications to relevant
   * users/customers based on their alert preferences.
   */
  async notifyRateChange(metalType: string, purity: number, ratePer10gPaise: number): Promise<void> {
    this.logger.log(
      `Rate change notification: ${metalType} purity ${purity} = ${ratePer10gPaise} paise per 10g`,
    );
    // Implementation would:
    // 1. Query alert subscriptions for this metal+purity
    // 2. Check if rate change exceeds threshold
    // 3. Publish notification events via EventBus
  }

  // ─── Helpers ─────────────────────────────────────────────────

  private toResponse(record: {
    id: string;
    metalType: string;
    purity: number;
    ratePerGramPaise: bigint;
    ratePer10gPaise: bigint;
    ratePerTolaPaise: bigint;
    ratePerTroyOzPaise: bigint;
    source: string;
    recordedAt: Date;
    currencyCode: string;
  }): MetalRateResponse {
    return {
      id: record.id,
      metalType: record.metalType,
      purity: record.purity,
      ratePerGramPaise: Number(record.ratePerGramPaise),
      ratePer10gPaise: Number(record.ratePer10gPaise),
      ratePerTolaPaise: Number(record.ratePerTolaPaise),
      ratePerTroyOzPaise: Number(record.ratePerTroyOzPaise),
      source: record.source,
      recordedAt: record.recordedAt.toISOString(),
      currencyCode: record.currencyCode,
    };
  }
}
