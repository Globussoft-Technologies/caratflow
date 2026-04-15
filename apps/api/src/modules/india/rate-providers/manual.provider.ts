// ─── Manual Rate Provider ─────────────────────────────────────
// No-op provider used when RATE_PROVIDER=manual (default).
// The cron will skip writes, preserving manual-entry behavior.

import { Injectable, Logger } from '@nestjs/common';
import type { IRateProvider, FetchedRate } from './rate-provider.interface';

@Injectable()
export class ManualRateProvider implements IRateProvider {
  readonly name = 'manual';
  private readonly logger = new Logger(ManualRateProvider.name);

  async fetchGoldRate(): Promise<FetchedRate | null> {
    this.logger.debug('ManualRateProvider: gold fetch is a no-op');
    return null;
  }

  async fetchSilverRate(): Promise<FetchedRate | null> {
    this.logger.debug('ManualRateProvider: silver fetch is a no-op');
    return null;
  }
}
