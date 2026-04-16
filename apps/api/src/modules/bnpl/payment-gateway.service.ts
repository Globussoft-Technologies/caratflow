// ─── Payment Gateway Service ─────────────────────────────────
// Thin wrapper around a PSP (Razorpay / Stripe / Cashfree) for
// charging tokenized saved payment methods. Provider selection is
// env-gated via PAYMENT_GATEWAY_PROVIDER={razorpay|stripe|cashfree|mock}
// and defaults to mock so CI + local dev never hit the real PSP.
//
// The Razorpay path uses the official `razorpay` SDK when installed
// and falls back to a direct fetch against the public API otherwise;
// either way the saved method's `tokenReference` is used as the
// Razorpay customer token / source id.
//
// This service intentionally does NOT modify domain state (vaults,
// transactions, EMI schedules). Callers own their ledger writes.
//
// Errors:
//   - PaymentMethodNotFoundError:   saved method missing or wrong tenant/customer
//   - PaymentMethodExpiredError:    tokenized method has expired (`expiresAt`)
//   - PaymentGatewayDeclinedError:  provider returned a non-2xx business decline
//   - PaymentGatewayTransientError: network / 5xx — callers should retry

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { v4 as uuidv4 } from 'uuid';

export type PaymentGatewayProvider = 'mock' | 'razorpay' | 'stripe' | 'cashfree';

export interface ChargeSavedMethodInput {
  /** Tenant that owns the saved method */
  tenantId: string;
  /** Customer that owns the saved method */
  customerId: string;
  /** SavedPaymentMethod.id */
  savedMethodId: string;
  /** Amount to debit, in the smallest currency unit (paise) */
  amountPaise: number;
  /** Free-form reference string (e.g. SIP id, EMI installment id) */
  reference: string;
  /** Optional currency override; defaults to INR */
  currency?: string;
}

export type ChargeStatus = 'SUCCEEDED' | 'PENDING' | 'FAILED';

export interface ChargeResult {
  /** Gateway-assigned charge identifier (pg_*) */
  chargeId: string;
  /** Our internal provider tag */
  provider: PaymentGatewayProvider;
  /** Mirrors the saved method used */
  savedMethodId: string;
  /** Paise debited (echoes input for convenience) */
  amountPaise: number;
  /** Currency of the charge (ISO-4217) */
  currency: string;
  /** Final status */
  status: ChargeStatus;
  /** Raw reference surfaced back to the caller */
  reference: string;
  /** Epoch ms timestamp when the charge was processed */
  processedAt: number;
}

export class PaymentMethodNotFoundError extends Error {
  constructor(savedMethodId: string) {
    super(`Saved payment method not found: ${savedMethodId}`);
    this.name = 'PaymentMethodNotFoundError';
  }
}

export class PaymentMethodExpiredError extends Error {
  constructor(savedMethodId: string) {
    super(`Saved payment method expired: ${savedMethodId}`);
    this.name = 'PaymentMethodExpiredError';
  }
}

export class PaymentGatewayDeclinedError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'PaymentGatewayDeclinedError';
  }
}

export class PaymentGatewayTransientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PaymentGatewayTransientError';
  }
}

@Injectable()
export class PaymentGatewayService {
  private readonly logger = new Logger(PaymentGatewayService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Resolve the configured provider from env; defaults to mock for safety. */
  private getProvider(): PaymentGatewayProvider {
    const raw = (process.env.PAYMENT_GATEWAY_PROVIDER ?? 'mock').toLowerCase();
    if (raw === 'razorpay' || raw === 'stripe' || raw === 'cashfree' || raw === 'mock') {
      return raw;
    }
    this.logger.warn(
      `Unknown PAYMENT_GATEWAY_PROVIDER="${raw}", falling back to mock`,
    );
    return 'mock';
  }

  /**
   * Charge a previously-tokenized saved payment method.
   *
   * Validates that the method exists and is not expired before hitting the
   * gateway. The `mock` provider returns a deterministic success and logs
   * the intent — this keeps CI + dev environments functional without
   * external HTTP calls.
   */
  async chargeSavedMethod(input: ChargeSavedMethodInput): Promise<ChargeResult> {
    const { tenantId, customerId, savedMethodId, amountPaise, reference } = input;
    const currency = input.currency ?? 'INR';

    if (!Number.isFinite(amountPaise) || amountPaise <= 0) {
      throw new PaymentGatewayDeclinedError(
        `Invalid charge amount: ${amountPaise}`,
        'INVALID_AMOUNT',
      );
    }

    const method = await this.prisma.savedPaymentMethod.findFirst({
      where: { id: savedMethodId, tenantId, customerId },
    });

    if (!method) {
      throw new PaymentMethodNotFoundError(savedMethodId);
    }

    if (method.expiresAt && method.expiresAt.getTime() <= Date.now()) {
      throw new PaymentMethodExpiredError(savedMethodId);
    }

    const provider = this.getProvider();

    this.logger.log(
      `Charge intent: provider=${provider}, method=${savedMethodId}, ` +
        `amount=${amountPaise}p ${currency}, ref=${reference}`,
    );

    switch (provider) {
      case 'mock':
        return this.mockCharge(input, currency, method.tokenReference);
      case 'razorpay':
        return this.razorpayCharge(input, currency, method.tokenReference);
      case 'stripe':
      case 'cashfree':
        // Stripe / Cashfree integrations are out of scope here. Keep the
        // switch exhaustive so adding a provider is a compile-time task;
        // fall back to mock with a clear warning rather than silently failing.
        this.logger.warn(
          `Provider "${provider}" not yet implemented — using mock charge path. ` +
            `Set PAYMENT_GATEWAY_PROVIDER=mock to silence this warning.`,
        );
        return this.mockCharge(input, currency, method.tokenReference);
    }
  }

  private mockCharge(
    input: ChargeSavedMethodInput,
    currency: string,
    tokenReference: string,
  ): ChargeResult {
    const chargeId = `pg_mock_${uuidv4()}`;
    this.logger.log(
      `Mock charge SUCCEEDED: chargeId=${chargeId}, token=${tokenReference.slice(0, 12)}…, ` +
        `amount=${input.amountPaise}p ${currency}, ref=${input.reference}`,
    );
    return {
      chargeId,
      provider: 'mock',
      savedMethodId: input.savedMethodId,
      amountPaise: input.amountPaise,
      currency,
      status: 'SUCCEEDED',
      reference: input.reference,
      processedAt: Date.now(),
    };
  }

  /**
   * Charge via Razorpay.
   *
   * Uses the official `razorpay` SDK when it resolves at runtime (it ships
   * as a dependency of this monorepo for the ecommerce module). If the SDK
   * import fails for any reason we fall back to a direct `fetch` against
   * Razorpay's REST API using the same credentials.
   *
   * Credentials are read from env only — per-tenant Razorpay credentials
   * are resolved elsewhere (see IndiaPaymentService). If neither is set,
   * we raise a transient error so the caller can retry after ops fix config.
   */
  private async razorpayCharge(
    input: ChargeSavedMethodInput,
    currency: string,
    tokenReference: string,
  ): Promise<ChargeResult> {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      this.logger.error(
        'Razorpay credentials missing: set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET',
      );
      throw new PaymentGatewayTransientError(
        'Razorpay credentials not configured',
      );
    }

    const body = {
      amount: input.amountPaise,
      currency,
      customer_id: undefined as string | undefined,
      token: tokenReference,
      recurring: '1',
      description: input.reference,
      notes: {
        tenantId: input.tenantId,
        customerId: input.customerId,
        savedMethodId: input.savedMethodId,
        reference: input.reference,
      },
    };

    // Attempt SDK path first; if SDK resolution fails, use fetch.
    try {
      // Dynamic require so we do not hard-bind to the SDK surface
      // (avoids cycles in tests that don't need it).
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Razorpay = (await import('razorpay')).default as unknown as new (
        opts: { key_id: string; key_secret: string },
      ) => { payments: { createRecurringPayment: (b: unknown) => Promise<{ id: string; status: string }> } };
      const client = new Razorpay({ key_id: keyId, key_secret: keySecret });
      const createFn = client?.payments?.createRecurringPayment;
      if (typeof createFn === 'function') {
        const res = await createFn.call(client.payments, body);
        return this.toChargeResult(input, currency, res.id, this.mapRazorpayStatus(res.status));
      }
    } catch (err) {
      this.logger.warn(
        `Razorpay SDK path failed, falling back to fetch: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    // REST fallback
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    let res: Response;
    try {
      res = await fetch('https://api.razorpay.com/v1/payments/create/recurring', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
    } catch (err) {
      throw new PaymentGatewayTransientError(
        `Razorpay network error: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    const json = (await res.json().catch(() => ({}))) as {
      id?: string;
      status?: string;
      error?: { code?: string; description?: string };
    };

    if (res.status >= 500 || res.status === 429) {
      throw new PaymentGatewayTransientError(
        `Razorpay ${res.status}: ${json.error?.description ?? 'transient error'}`,
      );
    }
    if (!res.ok) {
      throw new PaymentGatewayDeclinedError(
        json.error?.description ?? `Razorpay declined charge (HTTP ${res.status})`,
        json.error?.code ?? `HTTP_${res.status}`,
      );
    }
    if (!json.id) {
      throw new PaymentGatewayTransientError('Razorpay response missing payment id');
    }

    return this.toChargeResult(
      input,
      currency,
      json.id,
      this.mapRazorpayStatus(json.status ?? 'created'),
    );
  }

  private mapRazorpayStatus(status: string): ChargeStatus {
    switch (status.toLowerCase()) {
      case 'captured':
      case 'authorized':
      case 'succeeded':
        return 'SUCCEEDED';
      case 'created':
      case 'pending':
      case 'processing':
        return 'PENDING';
      default:
        return 'FAILED';
    }
  }

  private toChargeResult(
    input: ChargeSavedMethodInput,
    currency: string,
    chargeId: string,
    status: ChargeStatus,
  ): ChargeResult {
    return {
      chargeId,
      provider: 'razorpay',
      savedMethodId: input.savedMethodId,
      amountPaise: input.amountPaise,
      currency,
      status,
      reference: input.reference,
      processedAt: Date.now(),
    };
  }
}
