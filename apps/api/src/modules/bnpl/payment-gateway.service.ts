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
        return this.stripeCharge(input, currency, method.tokenReference);
      case 'cashfree':
        return this.cashfreeCharge(input, currency, method.tokenReference);
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
    provider: PaymentGatewayProvider = 'razorpay',
  ): ChargeResult {
    return {
      chargeId,
      provider,
      savedMethodId: input.savedMethodId,
      amountPaise: input.amountPaise,
      currency,
      status,
      reference: input.reference,
      processedAt: Date.now(),
    };
  }

  // ─── Stripe ──────────────────────────────────────────────────

  /**
   * Charge via Stripe off-session using a saved payment method.
   *
   * Expects `tokenReference` to be either:
   *   - A Stripe PaymentMethod id (e.g. `pm_xxx`), requiring a separately
   *     resolvable Stripe customer id. In that case we expect a pipe-
   *     delimited form `pm_xxx|cus_yyy` so we can call `paymentIntents.create`
   *     with both `payment_method` and `customer`.
   *   - A pipe-delimited `pm_xxx|cus_yyy` directly.
   *
   * Credentials are resolved per-tenant from Setting (`stripe_secret_key`),
   * falling back to env `STRIPE_SECRET_KEY`. If none configured we throw a
   * transient error so the SIP executor retries after ops fix config —
   * never silently fall back to mock.
   */
  private async stripeCharge(
    input: ChargeSavedMethodInput,
    currency: string,
    tokenReference: string,
  ): Promise<ChargeResult> {
    const secretKey = await this.resolveTenantSetting(
      input.tenantId,
      'stripe_secret_key',
      'STRIPE_SECRET_KEY',
    );
    if (!secretKey) {
      this.logger.error(
        `Stripe credentials missing for tenant ${input.tenantId}: set Setting.stripe_secret_key or env STRIPE_SECRET_KEY`,
      );
      throw new PaymentGatewayTransientError(
        'Provider stripe not configured: missing env STRIPE_SECRET_KEY',
      );
    }

    const [paymentMethodId, stripeCustomerId] = this.parseStripeToken(tokenReference);
    if (!paymentMethodId || !stripeCustomerId) {
      throw new PaymentGatewayDeclinedError(
        `Stripe tokenReference must be in the form "pm_xxx|cus_yyy" (got "${tokenReference.slice(0, 20)}…")`,
        'INVALID_TOKEN_FORMAT',
      );
    }

    // Attempt SDK path; fall back to fetch if SDK is not installed.
    let StripeCtor: unknown;
    try {
      StripeCtor = (await import('stripe')).default;
    } catch {
      StripeCtor = null;
    }

    interface StripeIntent {
      id: string;
      status: string;
    }
    interface StripeError {
      type?: string;
      code?: string;
      decline_code?: string;
      message?: string;
      statusCode?: number;
    }

    if (StripeCtor && typeof StripeCtor === 'function') {
      try {
        const Stripe = StripeCtor as new (
          key: string,
          opts?: { apiVersion?: string },
        ) => {
          paymentIntents: {
            create: (b: Record<string, unknown>) => Promise<StripeIntent>;
          };
        };
        const client = new Stripe(secretKey);
        const intent = await client.paymentIntents.create({
          amount: input.amountPaise,
          currency: currency.toLowerCase(),
          payment_method: paymentMethodId,
          customer: stripeCustomerId,
          off_session: true,
          confirm: true,
          description: input.reference,
          metadata: {
            tenantId: input.tenantId,
            customerId: input.customerId,
            savedMethodId: input.savedMethodId,
            reference: input.reference,
          },
        });
        return this.toChargeResult(
          input,
          currency,
          intent.id,
          this.mapStripeStatus(intent.status),
          'stripe',
        );
      } catch (err) {
        this.handleStripeError(err as StripeError);
        // handleStripeError always throws; the throw below is unreachable
        // but keeps TypeScript satisfied.
        throw err;
      }
    }

    // REST fallback — Stripe accepts form-urlencoded bodies.
    const params = new URLSearchParams();
    params.set('amount', String(input.amountPaise));
    params.set('currency', currency.toLowerCase());
    params.set('payment_method', paymentMethodId);
    params.set('customer', stripeCustomerId);
    params.set('off_session', 'true');
    params.set('confirm', 'true');
    params.set('description', input.reference);
    params.set('metadata[tenantId]', input.tenantId);
    params.set('metadata[customerId]', input.customerId);
    params.set('metadata[savedMethodId]', input.savedMethodId);
    params.set('metadata[reference]', input.reference);

    let res: Response;
    try {
      res = await fetch('https://api.stripe.com/v1/payment_intents', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${secretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });
    } catch (err) {
      throw new PaymentGatewayTransientError(
        `Stripe network error: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    const json = (await res.json().catch(() => ({}))) as {
      id?: string;
      status?: string;
      error?: { type?: string; code?: string; decline_code?: string; message?: string };
    };

    if (res.status >= 500 || res.status === 429) {
      throw new PaymentGatewayTransientError(
        `Stripe ${res.status}: ${json.error?.message ?? 'transient error'}`,
      );
    }
    if (!res.ok) {
      this.handleStripeError({
        type: json.error?.type,
        code: json.error?.code,
        decline_code: json.error?.decline_code,
        message: json.error?.message,
        statusCode: res.status,
      });
    }
    if (!json.id || !json.status) {
      throw new PaymentGatewayTransientError('Stripe response missing payment intent id/status');
    }

    return this.toChargeResult(
      input,
      currency,
      json.id,
      this.mapStripeStatus(json.status),
      'stripe',
    );
  }

  private parseStripeToken(tokenReference: string): [string | null, string | null] {
    // Accept "pm_xxx|cus_yyy" (preferred) or legacy single-token form.
    const parts = tokenReference.split('|');
    if (parts.length === 2 && parts[0] && parts[1]) {
      return [parts[0].trim(), parts[1].trim()];
    }
    return [null, null];
  }

  private mapStripeStatus(status: string): ChargeStatus {
    switch (status.toLowerCase()) {
      case 'succeeded':
        return 'SUCCEEDED';
      case 'processing':
      case 'requires_capture':
        return 'PENDING';
      default:
        return 'FAILED';
    }
  }

  /**
   * Translate a Stripe error (thrown by SDK or parsed from REST) into our
   * typed error hierarchy. Always throws — never returns.
   */
  private handleStripeError(err: {
    type?: string;
    code?: string;
    decline_code?: string;
    message?: string;
    statusCode?: number;
  }): never {
    const statusCode = err.statusCode ?? 0;
    const code = err.code ?? err.type ?? 'unknown';
    const message = err.message ?? 'Stripe charge failed';

    // Transient: 5xx, rate-limit, network
    if (statusCode >= 500 || statusCode === 429) {
      throw new PaymentGatewayTransientError(`Stripe ${statusCode}: ${message}`);
    }

    // Authentication required (3DS) or method unusable → method expired/invalid
    if (
      code === 'authentication_required' ||
      code === 'requires_action' ||
      code === 'requires_payment_method' ||
      err.type === 'StripeCardError' && code === 'expired_card'
    ) {
      throw new PaymentMethodExpiredError(message);
    }

    // Hard card decline
    if (code === 'card_declined' || err.type === 'card_error' || err.type === 'StripeCardError') {
      throw new PaymentGatewayDeclinedError(message, err.decline_code ?? code);
    }

    // Generic decline
    throw new PaymentGatewayDeclinedError(message, code);
  }

  // ─── Cashfree ────────────────────────────────────────────────

  /**
   * Charge via Cashfree Recurring Payments API.
   *
   * Expects `tokenReference` to be the Cashfree `subscription_id` (mandate
   * id). Environment switch via `CASHFREE_ENV=sandbox` (defaults to prod).
   *
   * Per-tenant credentials (`cashfree_client_id`, `cashfree_client_secret`)
   * resolved from Setting with env fallback (`CASHFREE_CLIENT_ID`,
   * `CASHFREE_CLIENT_SECRET`). Missing credentials throw a transient error
   * so the SIP executor retries.
   */
  private async cashfreeCharge(
    input: ChargeSavedMethodInput,
    currency: string,
    tokenReference: string,
  ): Promise<ChargeResult> {
    const clientId = await this.resolveTenantSetting(
      input.tenantId,
      'cashfree_client_id',
      'CASHFREE_CLIENT_ID',
    );
    const clientSecret = await this.resolveTenantSetting(
      input.tenantId,
      'cashfree_client_secret',
      'CASHFREE_CLIENT_SECRET',
    );

    if (!clientId || !clientSecret) {
      this.logger.error(
        `Cashfree credentials missing for tenant ${input.tenantId}: set Setting.cashfree_client_id/secret or env CASHFREE_CLIENT_ID/SECRET`,
      );
      const missing = !clientId ? 'CASHFREE_CLIENT_ID' : 'CASHFREE_CLIENT_SECRET';
      throw new PaymentGatewayTransientError(
        `Provider cashfree not configured: missing env ${missing}`,
      );
    }

    const isSandbox = (process.env.CASHFREE_ENV ?? 'production').toLowerCase() === 'sandbox';
    const baseUrl = isSandbox
      ? 'https://sandbox.cashfree.com/pg/recurring/charge'
      : 'https://api.cashfree.com/pg/recurring/charge';

    // Cashfree expects amount in major currency units (rupees), not paise.
    const amountMajor = (input.amountPaise / 100).toFixed(2);

    const body = {
      subscription_id: tokenReference,
      amount: amountMajor,
      currency: currency.toUpperCase(),
      subReferenceId: input.reference.slice(0, 50),
      remarks: `Charge for ${input.reference}`,
    };

    let res: Response;
    try {
      res = await fetch(baseUrl, {
        method: 'POST',
        headers: {
          'x-client-id': clientId,
          'x-client-secret': clientSecret,
          'x-api-version': '2022-09-01',
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(body),
      });
    } catch (err) {
      throw new PaymentGatewayTransientError(
        `Cashfree network error: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    const json = (await res.json().catch(() => ({}))) as {
      payment_id?: string | number;
      cf_payment_id?: string | number;
      payment_status?: string;
      status?: string;
      message?: string;
      code?: string;
      type?: string;
    };

    if (res.status >= 500 || res.status === 429) {
      throw new PaymentGatewayTransientError(
        `Cashfree ${res.status}: ${json.message ?? 'transient error'}`,
      );
    }
    if (!res.ok) {
      // Cashfree-specific: authentication_failed / invalid_subscription → method unusable
      const errCode = json.code ?? json.type ?? `HTTP_${res.status}`;
      if (
        errCode === 'subscription_not_found' ||
        errCode === 'subscription_expired' ||
        errCode === 'subscription_cancelled' ||
        errCode === 'mandate_expired'
      ) {
        throw new PaymentMethodExpiredError(
          json.message ?? `Cashfree subscription unusable: ${errCode}`,
        );
      }
      throw new PaymentGatewayDeclinedError(
        json.message ?? `Cashfree declined charge (HTTP ${res.status})`,
        errCode,
      );
    }

    const chargeId = String(json.payment_id ?? json.cf_payment_id ?? '');
    if (!chargeId) {
      throw new PaymentGatewayTransientError('Cashfree response missing payment_id');
    }

    return this.toChargeResult(
      input,
      currency,
      chargeId,
      this.mapCashfreeStatus(json.payment_status ?? json.status ?? 'PENDING'),
      'cashfree',
    );
  }

  private mapCashfreeStatus(status: string): ChargeStatus {
    switch (status.toUpperCase()) {
      case 'SUCCESS':
      case 'SUCCEEDED':
      case 'PAID':
        return 'SUCCEEDED';
      case 'PENDING':
      case 'INITIATED':
      case 'PROCESSING':
        return 'PENDING';
      default:
        return 'FAILED';
    }
  }

  // ─── Per-tenant Setting resolver ─────────────────────────────

  /**
   * Resolve a credential from the Setting table for the tenant, falling
   * back to the named env var. Returns `null` if neither is set.
   */
  private async resolveTenantSetting(
    tenantId: string,
    settingKey: string,
    envVar: string,
  ): Promise<string | null> {
    try {
      const row = await this.prisma.setting.findFirst({
        where: { tenantId, settingKey },
      });
      if (row) {
        const val = row.settingValue;
        if (typeof val === 'string' && val.length > 0) return val;
        // settingValue is JSON; accept either a raw string or { value: string }
        if (val && typeof val === 'object' && 'value' in (val as Record<string, unknown>)) {
          const inner = (val as Record<string, unknown>).value;
          if (typeof inner === 'string' && inner.length > 0) return inner;
        }
      }
    } catch (err) {
      this.logger.warn(
        `Failed to read Setting ${settingKey} for tenant ${tenantId}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    const envVal = process.env[envVar];
    return envVal && envVal.length > 0 ? envVal : null;
  }
}
