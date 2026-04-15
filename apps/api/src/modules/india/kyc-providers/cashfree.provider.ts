// ─── Cashfree Verification KYC Provider ────────────────────────
// Integrates with Cashfree Verification API
// (https://docs.cashfree.com/docs/verification) for Aadhaar / PAN
// verification. Uses native fetch; credentials come from env vars.
//
// Endpoints used (v1 / v2):
//   POST {base}/verification/pan                        -> PAN verify
//   POST {base}/verification/offline-aadhaar/otp        -> generate OTP
//   POST {base}/verification/offline-aadhaar/verify     -> confirm OTP
//
// Sandbox base URL: https://sandbox.cashfree.com
// Production base URL: https://api.cashfree.com
//
// Cashfree does NOT expose a purely online demographic Aadhaar match
// on the free sandbox tier - real demographic match requires a paid
// plan. We therefore implement `verifyAadhaar` by delegating to the
// OTP flow (refId returned to caller) and clearly return an error
// code when callers try to use it synchronously without OTP.

import { Injectable, Logger } from '@nestjs/common';
import type { IKycProvider, AadhaarOtpHandle, KycResult } from './kyc-provider.interface';

export interface CashfreeProviderConfig {
  clientId: string;
  clientSecret: string;
  baseUrl: string;
}

export function loadCashfreeConfigFromEnv(): CashfreeProviderConfig | null {
  const clientId = process.env.CASHFREE_VERIFY_CLIENT_ID;
  const clientSecret = process.env.CASHFREE_VERIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  return {
    clientId,
    clientSecret,
    baseUrl: process.env.CASHFREE_VERIFY_BASE_URL ?? 'https://sandbox.cashfree.com',
  };
}

@Injectable()
export class CashfreeKycProvider implements IKycProvider {
  readonly name = 'cashfree';
  private readonly logger = new Logger(CashfreeKycProvider.name);

  constructor(private readonly config: CashfreeProviderConfig) {}

  // ─── HTTP Helper ─────────────────────────────────────────────

  private async call<T = unknown>(path: string, body: unknown): Promise<T> {
    const url = `${this.config.baseUrl.replace(/\/$/, '')}${path}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': this.config.clientId,
        'x-client-secret': this.config.clientSecret,
      },
      body: JSON.stringify(body),
    });

    const text = await res.text();
    let parsed: unknown;
    try {
      parsed = text ? JSON.parse(text) : {};
    } catch {
      parsed = { raw: text };
    }

    if (!res.ok) {
      this.logger.warn(`Cashfree ${path} failed: ${res.status}`);
      const err = new Error(`Cashfree HTTP ${res.status}`);
      (err as Error & { status?: number; body?: unknown }).status = res.status;
      (err as Error & { status?: number; body?: unknown }).body = parsed;
      throw err;
    }
    return parsed as T;
  }

  private mapError(err: unknown): KycResult {
    const e = err as { status?: number; body?: { code?: string; message?: string } };
    const status = e?.status;
    const code =
      e?.body?.code ??
      (status === 401
        ? 'UNAUTHORIZED'
        : status === 404
          ? 'NOT_FOUND'
          : status === 422
            ? 'INVALID_INPUT'
            : 'PROVIDER_ERROR');
    return {
      verified: false,
      source: 'cashfree',
      errorCode: code,
      errorMessage: e?.body?.message ?? (err instanceof Error ? err.message : 'Unknown error'),
      raw: e?.body,
    };
  }

  // ─── Aadhaar direct (demographic) ────────────────────────────

  async verifyAadhaar(aadhaar: string, name?: string, dob?: string): Promise<KycResult> {
    try {
      const body = await this.call<{
        status?: string;
        valid?: boolean;
        name?: string;
        dob?: string;
        gender?: string;
        address?: string;
        message?: string;
      }>('/verification/aadhaar', { aadhaar_number: aadhaar, name, dob });

      const verified = body?.valid === true || body?.status === 'VALID' || body?.status === 'SUCCESS';
      return {
        verified,
        name: body?.name,
        dob: body?.dob,
        gender: body?.gender,
        address: body?.address,
        source: 'cashfree',
        errorCode: verified ? undefined : 'NOT_VERIFIED',
        errorMessage: verified ? undefined : (body?.message ?? 'Aadhaar not verified'),
        raw: body,
      };
    } catch (err) {
      // If 404 - endpoint not available on free tier. Fall back to OTP hint.
      const status = (err as { status?: number })?.status;
      if (status === 404) {
        return {
          verified: false,
          source: 'cashfree',
          errorCode: 'DEMOGRAPHIC_NOT_AVAILABLE',
          errorMessage:
            'Cashfree demographic Aadhaar check unavailable on this plan. Use OTP flow (generateAadhaarOtp + confirmAadhaarOtp).',
        };
      }
      return this.mapError(err);
    }
  }

  // ─── PAN ──────────────────────────────────────────────────────

  async verifyPan(pan: string, name?: string): Promise<KycResult> {
    try {
      const body = await this.call<{
        status?: string;
        valid?: boolean;
        registered_name?: string;
        name_match?: boolean;
        message?: string;
      }>('/verification/pan', { pan, name });

      const verified = body?.valid === true || body?.status === 'VALID';
      return {
        verified,
        name: body?.registered_name,
        source: 'cashfree',
        errorCode: verified ? undefined : 'NOT_VERIFIED',
        errorMessage: verified ? undefined : (body?.message ?? 'PAN not verified'),
        raw: body,
      };
    } catch (err) {
      return this.mapError(err);
    }
  }

  // ─── Aadhaar OTP Flow ─────────────────────────────────────────

  async generateAadhaarOtp(aadhaar: string): Promise<AadhaarOtpHandle> {
    try {
      const body = await this.call<{ ref_id?: string | number; message?: string }>(
        '/verification/offline-aadhaar/otp',
        { aadhaar_number: aadhaar },
      );
      const refId = body?.ref_id != null ? String(body.ref_id) : `CF-${Date.now()}`;
      return { refId, message: body?.message };
    } catch (err) {
      const mapped = this.mapError(err);
      throw new Error(`Cashfree generateAadhaarOtp: ${mapped.errorCode} - ${mapped.errorMessage}`);
    }
  }

  async confirmAadhaarOtp(refId: string, otp: string): Promise<KycResult> {
    try {
      const body = await this.call<{
        status?: string;
        name?: string;
        dob?: string;
        gender?: string;
        address?: string;
        message?: string;
      }>('/verification/offline-aadhaar/verify', { ref_id: refId, otp });

      const verified = body?.status === 'VALID' || body?.status === 'SUCCESS';
      return {
        verified,
        name: body?.name,
        dob: body?.dob,
        gender: body?.gender,
        address: body?.address,
        source: 'cashfree',
        errorCode: verified ? undefined : 'OTP_REJECTED',
        errorMessage: verified ? undefined : (body?.message ?? 'Invalid OTP'),
        raw: body,
      };
    } catch (err) {
      return this.mapError(err);
    }
  }
}
