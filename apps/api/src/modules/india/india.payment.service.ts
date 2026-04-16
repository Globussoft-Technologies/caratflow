// ─── India Payment Service ─────────────────────────────────────
// UPI QR generation, bank transfer templates, and real Razorpay
// integration (orders, signature verify, capture, refund).
//
// Razorpay credentials are loaded per-tenant from the Setting
// table (keys: razorpay_key_id, razorpay_key_secret,
// razorpay_webhook_secret) with env-var fallback
// (RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET).

import { BadRequestException, Injectable, Logger, Optional } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import Razorpay from 'razorpay';
import type {
  UpiPaymentInput,
  UpiQrData,
  BankTransferTemplateInput,
  BankTransferTemplate,
} from '@caratflow/shared-types';
import { PrismaService } from '../../common/prisma.service';

export interface RazorpayOrderResult {
  orderId: string;
  keyId: string;
  amount: number;
  currency: string;
}

export interface RazorpayTenantCredentials {
  keyId: string;
  keySecret: string;
  webhookSecret: string | null;
}

@Injectable()
export class IndiaPaymentService {
  private readonly logger = new Logger(IndiaPaymentService.name);
  private readonly clientCache = new Map<string, Razorpay>();

  constructor(@Optional() private readonly prisma?: PrismaService) {}

  // ─── UPI Payment ─────────────────────────────────────────────

  /**
   * Generate UPI deep link / QR code data.
   * Format: upi://pay?pa=VPA&pn=NAME&am=AMOUNT&tn=NOTE&tr=REF
   */
  generateUpiQrData(input: UpiPaymentInput): UpiQrData {
    const amountRupees = (input.amountPaise / 100).toFixed(2);
    const transactionNote = input.transactionNote ?? 'Payment to CaratFlow';
    const referenceId = input.referenceId ?? `CF${Date.now()}`;

    const params = new URLSearchParams({
      pa: input.payeeVpa,
      pn: input.payeeName,
      am: amountRupees,
      tn: transactionNote,
      tr: referenceId,
      cu: 'INR',
    });

    const upiUrl = `upi://pay?${params.toString()}`;

    return {
      upiUrl,
      payeeVpa: input.payeeVpa,
      payeeName: input.payeeName,
      amountRupees,
      transactionNote,
      referenceId,
    };
  }

  /**
   * Record a UPI payment callback.
   * In production, this would validate the callback from the UPI PSP
   * and update the payment status in the database.
   */
  async recordUpiCallback(transactionId: string, status: string, upiRefId: string): Promise<void> {
    this.logger.log(
      `UPI callback: txn=${transactionId}, status=${status}, upiRef=${upiRefId}`,
    );
  }

  // ─── Bank Transfer Templates ─────────────────────────────────

  /**
   * Generate bank transfer template with proper reference format.
   * NEFT: up to Rs. 50 lakh, 2-hour settlement
   * RTGS: above Rs. 2 lakh, real-time
   * IMPS: up to Rs. 5 lakh, instant
   */
  generateBankTransferTemplate(input: BankTransferTemplateInput): BankTransferTemplate {
    const amountRupees = (input.amountPaise / 100).toFixed(2);
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');

    let referenceFormat: string;
    switch (input.transferType) {
      case 'NEFT':
        referenceFormat = `NEFT/CF/${timestamp}/${Date.now().toString(36).toUpperCase()}`;
        break;
      case 'RTGS':
        referenceFormat = `RTGS/CF/${timestamp}/${Date.now().toString(36).toUpperCase()}`;
        break;
      case 'IMPS':
        referenceFormat = `IMPS/CF/${Date.now()}`;
        break;
      default:
        referenceFormat = `CF/${timestamp}/${Date.now()}`;
    }

    return {
      transferType: input.transferType,
      beneficiaryName: input.beneficiaryName,
      accountNumber: input.accountNumber,
      ifscCode: input.ifscCode,
      amountRupees,
      referenceFormat,
      remarks: input.remarks ?? `CaratFlow payment ${referenceFormat}`,
    };
  }

  /**
   * Validate IFSC code format.
   * Format: 4 alpha + 0 + 6 alphanumeric
   */
  validateIfsc(ifscCode: string): boolean {
    return /^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode);
  }

  // ─── Razorpay: Credential Resolution ─────────────────────────

  /**
   * Resolve Razorpay credentials for a tenant. Reads from the
   * Setting table first, falls back to env vars, throws if none
   * are configured.
   */
  async getRazorpayCredentials(tenantId: string): Promise<RazorpayTenantCredentials> {
    let tenantKeyId: string | null = null;
    let tenantKeySecret: string | null = null;
    let tenantWebhookSecret: string | null = null;

    if (this.prisma) {
      const settings = await this.prisma.setting.findMany({
        where: {
          tenantId,
          settingKey: {
            in: ['razorpay_key_id', 'razorpay_key_secret', 'razorpay_webhook_secret'],
          },
        },
      });
      for (const s of settings) {
        const val = typeof s.settingValue === 'string' ? s.settingValue : null;
        if (!val) continue;
        if (s.settingKey === 'razorpay_key_id') tenantKeyId = val;
        if (s.settingKey === 'razorpay_key_secret') tenantKeySecret = val;
        if (s.settingKey === 'razorpay_webhook_secret') tenantWebhookSecret = val;
      }
    }

    const keyId = tenantKeyId ?? process.env.RAZORPAY_KEY_ID ?? null;
    const keySecret = tenantKeySecret ?? process.env.RAZORPAY_KEY_SECRET ?? null;
    const webhookSecret = tenantWebhookSecret ?? process.env.RAZORPAY_WEBHOOK_SECRET ?? null;

    if (!keyId || !keySecret) {
      throw new BadRequestException(`Razorpay not configured for tenant ${tenantId}`);
    }

    return { keyId, keySecret, webhookSecret };
  }

  private async getClient(tenantId: string): Promise<{ client: Razorpay; keyId: string; keySecret: string; webhookSecret: string | null }> {
    const creds = await this.getRazorpayCredentials(tenantId);
    const cacheKey = `${tenantId}:${creds.keyId}`;
    let client = this.clientCache.get(cacheKey);
    if (!client) {
      client = new Razorpay({ key_id: creds.keyId, key_secret: creds.keySecret });
      this.clientCache.set(cacheKey, client);
    }
    return { client, keyId: creds.keyId, keySecret: creds.keySecret, webhookSecret: creds.webhookSecret };
  }

  /**
   * Clear cached Razorpay client for a tenant. Call after a tenant
   * rotates their credentials so the next request picks up fresh values.
   */
  invalidateCredentialCache(tenantId?: string): void {
    if (!tenantId) {
      this.clientCache.clear();
      return;
    }
    for (const key of Array.from(this.clientCache.keys())) {
      if (key.startsWith(`${tenantId}:`)) this.clientCache.delete(key);
    }
  }

  // ─── Razorpay: Orders ────────────────────────────────────────

  /**
   * Create a Razorpay order. `amountPaise` is amount in the smallest
   * unit (paise for INR). Returns the order id + keyId for the
   * client-side checkout.js handoff.
   *
   * Backwards-compatible signature: callers may pass `(amountPaise,
   * currency, receipt)` or `(tenantId, amountPaise, currency, receipt,
   * notes)`. When the first arg is a UUID/non-numeric we treat it as
   * the tenant id.
   */
  async createRazorpayOrder(
    tenantIdOrAmount: string | number,
    amountPaiseOrCurrency: number | string,
    currencyOrReceipt?: string,
    receipt?: string,
    notes?: Record<string, string>,
  ): Promise<RazorpayOrderResult> {
    const { tenantId, amountPaise, currency, receiptStr, notesObj } =
      this.normaliseCreateOrderArgs(
        tenantIdOrAmount,
        amountPaiseOrCurrency,
        currencyOrReceipt,
        receipt,
        notes,
      );

    const { client, keyId } = await this.getClient(tenantId);

    const order = await client.orders.create({
      amount: amountPaise,
      currency,
      receipt: receiptStr,
      notes: notesObj,
    });

    this.logger.log(`Razorpay order created: ${order.id} (tenant=${tenantId}, receipt=${receiptStr})`);

    return {
      orderId: order.id,
      keyId,
      amount: Number(order.amount),
      currency: order.currency,
    };
  }

  private normaliseCreateOrderArgs(
    a: string | number,
    b: number | string,
    c: string | undefined,
    d: string | undefined,
    e: Record<string, string> | undefined,
  ): { tenantId: string; amountPaise: number; currency: string; receiptStr: string; notesObj: Record<string, string> } {
    if (typeof a === 'string') {
      return {
        tenantId: a,
        amountPaise: Number(b),
        currency: (c ?? 'INR').toUpperCase(),
        receiptStr: d ?? `CF-${Date.now()}`,
        notesObj: e ?? {},
      };
    }
    // Legacy signature: (amountPaise, currency, receipt)
    const envTenant = process.env.RAZORPAY_DEFAULT_TENANT_ID;
    if (!envTenant) {
      throw new Error('Razorpay: tenantId is required (or set RAZORPAY_DEFAULT_TENANT_ID for legacy calls)');
    }
    return {
      tenantId: envTenant,
      amountPaise: Number(a),
      currency: (typeof b === 'string' ? b : 'INR').toUpperCase(),
      receiptStr: (c ?? `CF-${Date.now()}`),
      notesObj: {},
    };
  }

  // ─── Razorpay: Signature Verification ────────────────────────

  /**
   * Verify the checkout-side HMAC signature returned by Razorpay
   * after payment success. The signature is HMAC-SHA256 of
   * `${orderId}|${paymentId}` using the tenant's key_secret.
   */
  async verifySignature(
    orderId: string,
    paymentId: string,
    signature: string,
    tenantId?: string,
  ): Promise<boolean> {
    let keySecret: string | null = null;
    if (tenantId) {
      try {
        const creds = await this.getRazorpayCredentials(tenantId);
        keySecret = creds.keySecret;
      } catch {
        keySecret = null;
      }
    }
    if (!keySecret) keySecret = process.env.RAZORPAY_KEY_SECRET ?? null;
    if (!keySecret) return false;

    const expected = createHmac('sha256', keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    return this.safeCompareHex(expected, signature);
  }

  /**
   * Legacy alias kept so older callers compile. Returns the shape
   * `{ verified, message }` that the placeholder used to produce.
   */
  async verifyRazorpayPayment(
    orderId: string,
    paymentId: string,
    signature: string,
    tenantId?: string,
  ): Promise<{ verified: boolean; message: string }> {
    const verified = await this.verifySignature(orderId, paymentId, signature, tenantId);
    return {
      verified,
      message: verified ? 'Signature verified' : 'Signature mismatch',
    };
  }

  /**
   * Verify a Razorpay webhook signature. Webhook signatures are
   * HMAC-SHA256 of the raw request body using the webhook_secret.
   */
  verifyWebhookSignature(rawBody: string, signature: string | undefined, webhookSecret: string): boolean {
    if (!signature || !webhookSecret) return false;
    const expected = createHmac('sha256', webhookSecret)
      .update(rawBody, 'utf8')
      .digest('hex');
    return this.safeCompareHex(expected, signature);
  }

  private safeCompareHex(expectedHex: string, receivedHex: string): boolean {
    try {
      const a = Buffer.from(expectedHex, 'hex');
      const b = Buffer.from(receivedHex, 'hex');
      if (a.length === 0 || a.length !== b.length) return false;
      return timingSafeEqual(a, b);
    } catch {
      return false;
    }
  }

  // ─── Razorpay: Capture & Refund ──────────────────────────────

  /**
   * Manually capture an authorized payment. Razorpay auto-captures
   * orders created with `payment_capture: 1` (the SDK default), but
   * this is available for two-step flows.
   */
  async capturePayment(
    tenantId: string,
    paymentId: string,
    amountPaise: number,
    currency = 'INR',
  ): Promise<unknown> {
    const { client } = await this.getClient(tenantId);
    const captured = await client.payments.capture(paymentId, amountPaise, currency);
    this.logger.log(`Razorpay payment captured: ${paymentId} (tenant=${tenantId}, ${amountPaise} ${currency})`);
    return captured;
  }

  /**
   * Refund a captured payment. Pass `amountPaise` for a partial
   * refund; omit to refund the full captured amount.
   */
  async refundPayment(
    tenantId: string,
    paymentId: string,
    amountPaise?: number,
  ): Promise<unknown> {
    const { client } = await this.getClient(tenantId);
    const refund = amountPaise !== undefined
      ? await client.payments.refund(paymentId, { amount: amountPaise })
      : await client.payments.refund(paymentId, {});
    this.logger.log(`Razorpay payment refunded: ${paymentId} (tenant=${tenantId}, amount=${amountPaise ?? 'full'})`);
    return refund;
  }

  /**
   * Fetch a payment by id (used by the webhook controller to
   * reconcile captured amounts).
   */
  async fetchPayment(tenantId: string, paymentId: string): Promise<unknown> {
    const { client } = await this.getClient(tenantId);
    return client.payments.fetch(paymentId);
  }
}
