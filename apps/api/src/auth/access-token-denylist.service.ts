import { Injectable, OnModuleDestroy } from '@nestjs/common';

/**
 * Tracks access-token `jti`s that have been revoked before their natural
 * expiry — e.g. on logout or refresh-rotation (D-037).
 *
 * **In-memory.** This is intentionally simple for a single-process deployment.
 * For multi-instance / horizontally-scaled prod, swap the backing Map for
 * Redis (the project already runs Redis for BullMQ). Keep the public API
 * (`revoke` / `isRevoked`) stable so the swap is a drop-in.
 */
@Injectable()
export class AccessTokenDenylistService implements OnModuleDestroy {
  // jti -> unix-seconds the original token expires (we can stop tracking after that).
  private readonly revoked = new Map<string, number>();
  private readonly sweep: NodeJS.Timeout;

  constructor() {
    // Sweep stale entries every 5 minutes — bounded memory for long uptime.
    this.sweep = setInterval(() => this.purgeExpired(), 5 * 60_000);
    // Don't keep the event loop alive just for this timer.
    this.sweep.unref?.();
  }

  /**
   * Mark a token's `jti` as revoked until its original `exp` (unix seconds).
   * Past-`exp` entries are ignored — guards reject expired tokens anyway.
   */
  revoke(jti: string | undefined, expUnixSec: number | undefined): void {
    if (!jti || !expUnixSec) return;
    const nowSec = Math.floor(Date.now() / 1000);
    if (expUnixSec <= nowSec) return;
    this.revoked.set(jti, expUnixSec);
  }

  isRevoked(jti: string | undefined): boolean {
    if (!jti) return false;
    const exp = this.revoked.get(jti);
    if (exp === undefined) return false;
    if (exp <= Math.floor(Date.now() / 1000)) {
      this.revoked.delete(jti);
      return false;
    }
    return true;
  }

  private purgeExpired(): void {
    const nowSec = Math.floor(Date.now() / 1000);
    for (const [jti, exp] of this.revoked) {
      if (exp <= nowSec) this.revoked.delete(jti);
    }
  }

  onModuleDestroy(): void {
    clearInterval(this.sweep);
  }
}
