// ─── eKYC Provider Interface ───────────────────────────────────
// Pluggable adapter contract for Aadhaar/PAN verification aggregators
// (Cashfree, Setu, Karza, DigiLocker). Implementations are swapped via
// env vars; a local-only fallback is used when no credentials are set.

import type { KycResult } from '@caratflow/shared-types';

export { KycResult };

export interface AadhaarOtpHandle {
  refId: string;
  message?: string;
}

export interface IKycProvider {
  /** Provider name used for logging / audit trails. */
  readonly name: string;

  /**
   * Direct Aadhaar demographic verification (name/DOB match).
   * Some providers require OTP flow instead; this is a "best effort"
   * demographic check.
   */
  verifyAadhaar(aadhaar: string, name?: string, dob?: string): Promise<KycResult>;

  /** PAN verification against NSDL / Income Tax database via aggregator. */
  verifyPan(pan: string, name?: string): Promise<KycResult>;

  /** Generate an OTP to the Aadhaar-linked mobile. Returns a refId. */
  generateAadhaarOtp(aadhaar: string): Promise<AadhaarOtpHandle>;

  /** Confirm OTP and receive demographic payload. */
  confirmAadhaarOtp(refId: string, otp: string): Promise<KycResult>;
}
