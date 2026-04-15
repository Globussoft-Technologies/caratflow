// ─── Rate Provider Interface ──────────────────────────────────
// Abstraction over third-party metal rate feeds (metals.dev,
// IBJA scraper, MCX scraper, manual no-op, etc.).

export interface FetchedRate {
  /** Spot price per gram in INR (floating-point, converted before storage). */
  pricePerGramInr: number;
  /** Source identifier written to MetalRateHistory.source. */
  source: string;
  /** Timestamp at which the rate was fetched from upstream. */
  fetchedAt: Date;
}

export interface IRateProvider {
  /** Returns the provider name (for logging / source column). */
  readonly name: string;

  /**
   * Fetch the current spot gold rate.
   * Returns `null` when the provider is disabled / no-op (e.g. manual).
   */
  fetchGoldRate(): Promise<FetchedRate | null>;

  /**
   * Fetch the current spot silver rate.
   * Returns `null` when the provider is disabled / no-op (e.g. manual).
   */
  fetchSilverRate(): Promise<FetchedRate | null>;
}

/** DI token for the selected provider. */
export const RATE_PROVIDER = Symbol('RATE_PROVIDER');
