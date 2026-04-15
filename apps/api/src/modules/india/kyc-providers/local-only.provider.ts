// ─── Local-Only KYC Provider ───────────────────────────────────
// Fallback used when no aggregator credentials are configured.
// Never claims a document is verified - upstream service must treat
// the response as LOCAL_ONLY and mark the KycVerification PENDING.

import { Injectable } from '@nestjs/common';
import type { IKycProvider, AadhaarOtpHandle, KycResult } from './kyc-provider.interface';

@Injectable()
export class LocalOnlyKycProvider implements IKycProvider {
  readonly name = 'local';

  private unverified(): KycResult {
    return {
      verified: false,
      source: 'local',
      errorCode: 'NO_PROVIDER',
      errorMessage:
        'No eKYC provider configured. Set CASHFREE_VERIFY_CLIENT_ID/SECRET (or another supported aggregator) to enable real verification.',
    };
  }

  async verifyAadhaar(): Promise<KycResult> {
    return this.unverified();
  }

  async verifyPan(): Promise<KycResult> {
    return this.unverified();
  }

  async generateAadhaarOtp(): Promise<AadhaarOtpHandle> {
    return {
      refId: `LOCAL-${Date.now()}`,
      message: 'No eKYC provider configured; OTP flow unavailable.',
    };
  }

  async confirmAadhaarOtp(): Promise<KycResult> {
    return this.unverified();
  }
}
