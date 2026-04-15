// ─── Rate Poller Service ──────────────────────────────────────
// Hourly BullMQ cron that fetches live gold/silver rates via the
// configured IRateProvider and writes them to MetalRateHistory.
//
// MetalRateHistory is a GLOBAL (non-tenant-scoped) table, so we
// write one row per metal+purity per poll. Idempotency: if a row
// already exists for the same UTC day + metal + purity + source,
// the write is skipped.
//
// Provider selection: RATE_PROVIDER=metals-dev|manual (default manual).

import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Queue, Worker, type Job } from 'bullmq';
import { PrismaService } from '../../common/prisma.service';
import {
  RATE_PROVIDER,
  type IRateProvider,
  type FetchedRate,
} from './rate-providers/rate-provider.interface';

const QUEUE_NAME = 'caratflow-rate-poller';
const JOB_NAME = 'poll-metal-rates';
const HOURLY_CRON = '0 * * * *';

const TROY_OUNCE_GRAMS = 31.1035;
const TOLA_GRAMS = 11.664;

type MetalType = 'GOLD' | 'SILVER';

interface RateRow {
  metalType: MetalType;
  /** Purity stored as an int: 999 for pure gold/silver. */
  purity: number;
  ratePerGramPaise: bigint;
  ratePer10gPaise: bigint;
  ratePerTolaPaise: bigint;
  ratePerTroyOzPaise: bigint;
  source: string;
  recordedAt: Date;
}

@Injectable()
export class RatePollerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RatePollerService.name);
  private queue: Queue | null = null;
  private worker: Worker | null = null;

  private readonly redisConnection: { host: string; port: number; password?: string } = {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
    password: process.env.REDIS_PASSWORD ?? undefined,
  };

  constructor(
    private readonly prisma: PrismaService,
    @Inject(RATE_PROVIDER) private readonly provider: IRateProvider,
  ) {}

  async onModuleInit() {
    // Skip worker/queue bootstrap in tests or when explicitly disabled.
    if (process.env.NODE_ENV === 'test' || process.env.RATE_POLLER_DISABLED === '1') {
      this.logger.log('RatePollerService disabled (test/env opt-out)');
      return;
    }
    try {
      this.queue = new Queue(QUEUE_NAME, { connection: this.redisConnection });

      this.worker = new Worker(
        QUEUE_NAME,
        async (job: Job) => {
          if (job.name === JOB_NAME) {
            await this.runPoll();
          }
        },
        { connection: this.redisConnection, concurrency: 1 },
      );

      this.worker.on('failed', (job, err) => {
        this.logger.error(`Rate poll job ${job?.id} failed: ${err.message}`);
      });

      await this.queue.add(
        JOB_NAME,
        {},
        {
          repeat: { pattern: HOURLY_CRON },
          removeOnComplete: 24,
          removeOnFail: 24,
        },
      );

      this.logger.log(
        `RatePollerService scheduled hourly (${HOURLY_CRON}) using provider=${this.provider.name}`,
      );
    } catch (err) {
      this.logger.warn(
        `RatePollerService init failed (non-fatal): ${(err as Error).message}`,
      );
    }
  }

  async onModuleDestroy() {
    if (this.worker) await this.worker.close();
    if (this.queue) await this.queue.close();
  }

  // ─── Core poll (exposed for tests + manual refresh) ──────────

  /**
   * Run a full poll cycle: fetch gold + silver, persist each.
   * Errors are swallowed per-metal so one failure does not block the other.
   */
  async runPoll(): Promise<{ gold: boolean; silver: boolean }> {
    const gold = await this.pollMetal('GOLD');
    const silver = await this.pollMetal('SILVER');
    return { gold, silver };
  }

  /** Force refresh a specific metal. Returns true if a row was written. */
  async refreshNow(metalType?: MetalType): Promise<{ gold?: boolean; silver?: boolean }> {
    if (metalType === 'GOLD') return { gold: await this.pollMetal('GOLD') };
    if (metalType === 'SILVER') return { silver: await this.pollMetal('SILVER') };
    const gold = await this.pollMetal('GOLD');
    const silver = await this.pollMetal('SILVER');
    return { gold, silver };
  }

  private async pollMetal(metalType: MetalType): Promise<boolean> {
    try {
      const fetched =
        metalType === 'GOLD'
          ? await this.provider.fetchGoldRate()
          : await this.provider.fetchSilverRate();

      if (!fetched) {
        this.logger.debug(`${metalType} fetch returned null (provider=${this.provider.name})`);
        return false;
      }

      if (await this.existsForToday(metalType, fetched.source)) {
        this.logger.log(
          `${metalType} rate already recorded today for source=${fetched.source}; skipping`,
        );
        return false;
      }

      const row = this.buildRow(metalType, fetched);

      await this.prisma.metalRateHistory.create({
        data: {
          metalType: row.metalType,
          purity: row.purity,
          ratePerGramPaise: row.ratePerGramPaise,
          ratePer10gPaise: row.ratePer10gPaise,
          ratePerTolaPaise: row.ratePerTolaPaise,
          ratePerTroyOzPaise: row.ratePerTroyOzPaise,
          source: row.source,
          recordedAt: row.recordedAt,
          currencyCode: 'INR',
        },
      });

      this.logger.log(
        `Recorded ${metalType} rate: ${row.ratePerGramPaise} paise/g (source=${row.source})`,
      );
      return true;
    } catch (err) {
      this.logger.error(
        `Failed to poll ${metalType} rate: ${(err as Error).message}`,
      );
      return false;
    }
  }

  private async existsForToday(metalType: MetalType, source: string): Promise<boolean> {
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);

    const existing = await this.prisma.metalRateHistory.findFirst({
      where: {
        metalType,
        purity: 999,
        source,
        recordedAt: { gte: start, lt: end },
      },
      select: { id: true },
    });
    return existing !== null;
  }

  /** Visible to tests — converts a provider result into a persistable row. */
  buildRow(metalType: MetalType, fetched: FetchedRate): RateRow {
    const perGramPaise = Math.round(fetched.pricePerGramInr * 100);
    const per10gPaise = perGramPaise * 10;
    const perTolaPaise = Math.round(fetched.pricePerGramInr * TOLA_GRAMS * 100);
    const perTroyOzPaise = Math.round(fetched.pricePerGramInr * TROY_OUNCE_GRAMS * 100);

    return {
      metalType,
      purity: 999,
      ratePerGramPaise: BigInt(perGramPaise),
      ratePer10gPaise: BigInt(per10gPaise),
      ratePerTolaPaise: BigInt(perTolaPaise),
      ratePerTroyOzPaise: BigInt(perTroyOzPaise),
      source: fetched.source,
      recordedAt: fetched.fetchedAt,
    };
  }
}
