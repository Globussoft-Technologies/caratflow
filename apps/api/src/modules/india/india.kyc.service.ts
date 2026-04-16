// ─── India KYC Service ─────────────────────────────────────────
// KYC document recording, verification, validation, expiry tracking.
// Aadhaar eKYC and PAN verification are delegated to the
// IKycProvider injected via KycProviderFactory. When Cashfree
// credentials are present the real Cashfree Verification API is
// called; otherwise the LocalOnly provider persists as PENDING.

import { Injectable, BadRequestException, NotFoundException, Logger, Inject, Optional } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { TenantAwareService } from '../../common/base.service';
import { PrismaService } from '../../common/prisma.service';
import { EventBusService } from '../../event-bus/event-bus.service';
import { isValidAadhaar, isValidPan } from '@caratflow/utils';
import type { Prisma } from '@caratflow/db';
import type {
  KycVerificationInput,
  KycVerifyInput,
  KycStatusResponse,
  KycVerificationType,
  KycVerificationStatus,
  KycResult,
  KycListInput,
} from '@caratflow/shared-types';
import { KYC_PROVIDER_TOKEN } from './kyc-providers/kyc-provider.factory';
import type { IKycProvider, AadhaarOtpHandle } from './kyc-providers/kyc-provider.interface';

// In-memory store of Aadhaar OTP refId -> {tenantId, aadhaarNumber, customerId?}
// so that confirmAadhaarOtp can persist the verification under the right
// tenant/customer. A short TTL prevents leaks.
interface OtpContext {
  tenantId: string;
  userId: string;
  aadhaarNumber: string;
  customerId?: string;
  expiresAt: number;
}

@Injectable()
export class IndiaKycService extends TenantAwareService {
  private readonly logger = new Logger(IndiaKycService.name);
  private readonly otpContexts = new Map<string, OtpContext>();
  private readonly OTP_TTL_MS = 10 * 60 * 1000; // 10 min

  constructor(
    prisma: PrismaService,
    @Inject(KYC_PROVIDER_TOKEN) private readonly kycProvider: IKycProvider,
    @Optional() private readonly eventBus?: EventBusService,
  ) {
    super(prisma);
  }

  /** Exposed for diagnostics / tests. */
  get providerName(): string {
    return this.kycProvider.name;
  }

  // ─── Record KYC Document ─────────────────────────────────────

  async recordDocument(tenantId: string, userId: string, input: KycVerificationInput) {
    // Validate document format
    this.validateDocumentFormat(input.verificationType, input.documentNumber);

    // Check for existing verification of same type for this customer
    const existing = await this.prisma.kycVerification.findFirst({
      where: {
        tenantId,
        customerId: input.customerId,
        verificationType: input.verificationType,
        verificationStatus: { in: ['PENDING', 'VERIFIED'] },
      },
    });

    if (existing && existing.verificationStatus === 'VERIFIED') {
      throw new BadRequestException(
        `${input.verificationType} is already verified for this customer`,
      );
    }

    // If there's a pending one, update it instead of creating new
    if (existing && existing.verificationStatus === 'PENDING') {
      return this.prisma.kycVerification.update({
        where: { id: existing.id },
        data: {
          documentNumber: input.documentNumber,
          documentUrl: input.documentUrl ?? null,
          notes: input.notes ?? null,
          updatedBy: userId,
        },
        include: { customer: true },
      });
    }

    return this.prisma.kycVerification.create({
      data: {
        tenantId,
        customerId: input.customerId,
        verificationType: input.verificationType,
        documentNumber: input.documentNumber,
        verificationStatus: 'PENDING',
        documentUrl: input.documentUrl ?? null,
        notes: input.notes ?? null,
        createdBy: userId,
        updatedBy: userId,
      },
      include: { customer: true },
    });
  }

  // ─── Verify Document ─────────────────────────────────────────

  async verifyDocument(tenantId: string, userId: string, input: KycVerifyInput) {
    const verification = await this.prisma.kycVerification.findFirst({
      where: this.tenantWhere(tenantId, {
        id: input.verificationId,
        verificationStatus: 'PENDING',
      }) as Prisma.KycVerificationWhereInput,
    });
    if (!verification) throw new NotFoundException('Pending verification not found');

    const status = input.status as KycVerificationStatus;

    // Set validity period (Aadhaar: lifetime, PAN: lifetime, others: 10 years)
    let validUntil: Date | null = null;
    if (status === 'VERIFIED' && ['VOTER_ID', 'PASSPORT', 'DRIVING_LICENSE'].includes(verification.verificationType)) {
      validUntil = new Date();
      validUntil.setFullYear(validUntil.getFullYear() + 10);
    }

    return this.prisma.kycVerification.update({
      where: { id: input.verificationId },
      data: {
        verificationStatus: status,
        verifiedAt: status === 'VERIFIED' ? new Date() : null,
        verifiedBy: userId,
        validUntil,
        notes: input.notes ?? null,
        updatedBy: userId,
      },
      include: { customer: true },
    });
  }

  // ─── Get KYC Status ──────────────────────────────────────────

  async getCustomerKycStatus(tenantId: string, customerId: string): Promise<KycStatusResponse> {
    const verifications = await this.prisma.kycVerification.findMany({
      where: { tenantId, customerId },
      orderBy: { createdAt: 'desc' },
    });

    const verified = verifications.filter((v) => v.verificationStatus === 'VERIFIED');
    const isAadhaarVerified = verified.some((v) => v.verificationType === 'AADHAAR');
    const isPanVerified = verified.some((v) => v.verificationType === 'PAN');

    return {
      customerId,
      verifications: verifications.map((v) => ({
        id: v.id,
        type: v.verificationType as KycVerificationType,
        documentNumber: this.maskDocumentNumber(v.verificationType, v.documentNumber),
        status: v.verificationStatus as KycVerificationStatus,
        verifiedAt: v.verifiedAt?.toISOString() ?? null,
        validUntil: v.validUntil?.toISOString() ?? null,
      })),
      isAadhaarVerified,
      isPanVerified,
      isKycComplete: isAadhaarVerified && isPanVerified,
    };
  }

  // ─── Check KYC Complete ──────────────────────────────────────

  async isKycComplete(tenantId: string, customerId: string): Promise<boolean> {
    const status = await this.getCustomerKycStatus(tenantId, customerId);
    return status.isKycComplete;
  }

  // ─── KYC Expiry Tracking ─────────────────────────────────────

  async getExpiringVerifications(tenantId: string, daysAhead: number = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() + daysAhead);

    return this.prisma.kycVerification.findMany({
      where: {
        tenantId,
        verificationStatus: 'VERIFIED',
        validUntil: { lte: cutoffDate, gt: new Date() },
      },
      include: { customer: true },
      orderBy: { validUntil: 'asc' },
    });
  }

  async markExpiredVerifications(tenantId: string): Promise<number> {
    const result = await this.prisma.kycVerification.updateMany({
      where: {
        tenantId,
        verificationStatus: 'VERIFIED',
        validUntil: { lt: new Date() },
      },
      data: { verificationStatus: 'EXPIRED' },
    });

    if (result.count > 0) {
      this.logger.log(`Marked ${result.count} KYC verifications as expired for tenant ${tenantId}`);
    }
    return result.count;
  }

  // ─── Pending KYC Count ───────────────────────────────────────

  async getPendingCount(tenantId: string): Promise<number> {
    return this.prisma.kycVerification.count({
      where: { tenantId, verificationStatus: 'PENDING' },
    });
  }

  // ─── Real Aadhaar / PAN eKYC via pluggable provider ──────────

  /**
   * Verify an Aadhaar number via the configured eKYC provider.
   * Persists a KycVerification row with the result and publishes an
   * audit event. When the provider is `local` the verification is
   * stored as PENDING with a LOCAL_ONLY note rather than VERIFIED.
   */
  async verifyAadhaar(
    tenantId: string,
    userId: string,
    input: { customerId?: string; aadhaarNumber: string; name?: string; dob?: string },
  ) {
    if (!isValidAadhaar(input.aadhaarNumber)) {
      throw new BadRequestException('Invalid Aadhaar number format');
    }
    const result = await this.kycProvider.verifyAadhaar(input.aadhaarNumber, input.name, input.dob);
    return this.persistVerification(tenantId, userId, 'AADHAAR', input.aadhaarNumber, input.customerId, result);
  }

  /**
   * Verify a PAN number via the configured eKYC provider.
   */
  async verifyPan(
    tenantId: string,
    userId: string,
    input: { customerId?: string; panNumber: string; name?: string },
  ) {
    if (!isValidPan(input.panNumber)) {
      throw new BadRequestException('Invalid PAN format');
    }
    const result = await this.kycProvider.verifyPan(input.panNumber, input.name);
    return this.persistVerification(tenantId, userId, 'PAN', input.panNumber, input.customerId, result);
  }

  /**
   * Step 1 of Aadhaar OTP flow: generate OTP at the provider. Returns
   * a refId that the caller uses in `confirmAadhaarOtp`.
   */
  async requestAadhaarOtp(
    tenantId: string,
    userId: string,
    input: { aadhaarNumber: string; customerId?: string },
  ): Promise<AadhaarOtpHandle> {
    if (!isValidAadhaar(input.aadhaarNumber)) {
      throw new BadRequestException('Invalid Aadhaar number format');
    }
    const handle = await this.kycProvider.generateAadhaarOtp(input.aadhaarNumber);
    this.otpContexts.set(handle.refId, {
      tenantId,
      userId,
      aadhaarNumber: input.aadhaarNumber,
      customerId: input.customerId,
      expiresAt: Date.now() + this.OTP_TTL_MS,
    });
    this.pruneOtpContexts();
    return handle;
  }

  /**
   * Step 2 of Aadhaar OTP flow: verify OTP and persist.
   */
  async confirmAadhaarOtp(refId: string, otp: string) {
    const ctx = this.otpContexts.get(refId);
    if (!ctx) {
      throw new NotFoundException('Unknown or expired OTP refId');
    }
    if (ctx.expiresAt < Date.now()) {
      this.otpContexts.delete(refId);
      throw new BadRequestException('OTP refId expired');
    }
    const result = await this.kycProvider.confirmAadhaarOtp(refId, otp);
    const persisted = await this.persistVerification(
      ctx.tenantId,
      ctx.userId,
      'AADHAAR',
      ctx.aadhaarNumber,
      ctx.customerId,
      result,
    );
    if (result.verified) {
      this.otpContexts.delete(refId);
    }
    return persisted;
  }

  /**
   * List KYC verifications with optional filters (admin use).
   */
  async listVerifications(tenantId: string, input: KycListInput) {
    return this.prisma.kycVerification.findMany({
      where: {
        tenantId,
        ...(input.status ? { verificationStatus: input.status } : {}),
        ...(input.customerId ? { customerId: input.customerId } : {}),
      },
      include: { customer: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  // ─── Persistence helper ──────────────────────────────────────

  private async persistVerification(
    tenantId: string,
    userId: string,
    type: 'AADHAAR' | 'PAN',
    documentNumber: string,
    customerId: string | undefined,
    result: KycResult,
  ) {
    const isLocal = result.source === 'local';
    // VERIFIED only when provider successfully verified; local fallback
    // is always PENDING so staff can clear it manually.
    const status = (result.verified
      ? 'VERIFIED'
      : isLocal
        ? 'PENDING'
        : 'FAILED') as KycVerificationStatus;

    // customerId is required by the DB model. If caller did not supply
    // one (direct admin verification), we skip persistence and return
    // the raw provider result keyed by a synthetic id.
    if (!customerId) {
      await this.emitAuditEvent(tenantId, userId, type, result, null);
      return {
        id: `ephemeral-${uuidv4()}`,
        verificationType: type,
        verificationStatus: status,
        documentNumber,
        provider: result.source,
        verified: result.verified,
        result,
        persisted: false,
      };
    }

    const notes = isLocal
      ? 'LOCAL_ONLY: no eKYC provider configured; pending manual review'
      : result.errorMessage ?? (result.verified ? 'Verified via provider' : 'Rejected by provider');

    const record = await this.prisma.kycVerification.create({
      data: {
        tenantId,
        customerId,
        verificationType: type,
        documentNumber,
        verificationStatus: status,
        verifiedAt: result.verified ? new Date() : null,
        verifiedBy: result.verified ? userId : null,
        ocrData: (result.raw ?? result) as Prisma.InputJsonValue,
        notes,
        createdBy: userId,
        updatedBy: userId,
      },
    });

    await this.emitAuditEvent(tenantId, userId, type, result, record.id);

    return {
      ...record,
      provider: result.source,
      verified: result.verified,
      result,
      persisted: true,
    };
  }

  private async emitAuditEvent(
    tenantId: string,
    userId: string,
    type: 'AADHAAR' | 'PAN',
    result: KycResult,
    verificationId: string | null,
  ) {
    if (!this.eventBus) return;
    try {
      await this.eventBus.publish({
        id: uuidv4(),
        tenantId,
        userId,
        timestamp: new Date().toISOString(),
        type: result.verified ? 'india.kyc.verified' : 'india.kyc.failed',
        payload: {
          verificationType: type,
          provider: result.source,
          verificationId,
          errorCode: result.errorCode,
          errorMessage: result.errorMessage,
        },
      });
    } catch (err) {
      this.logger.warn(`Failed to publish KYC audit event: ${(err as Error).message}`);
    }
  }

  private pruneOtpContexts() {
    const now = Date.now();
    for (const [key, ctx] of this.otpContexts.entries()) {
      if (ctx.expiresAt < now) this.otpContexts.delete(key);
    }
  }

  // ─── Helpers ─────────────────────────────────────────────────

  private validateDocumentFormat(type: string, documentNumber: string): void {
    switch (type) {
      case 'AADHAAR':
        if (!isValidAadhaar(documentNumber)) {
          throw new BadRequestException('Invalid Aadhaar number format');
        }
        break;
      case 'PAN':
        if (!isValidPan(documentNumber)) {
          throw new BadRequestException('Invalid PAN format');
        }
        break;
      case 'PASSPORT':
        if (!/^[A-Z]\d{7}$/.test(documentNumber)) {
          throw new BadRequestException('Invalid passport number format');
        }
        break;
      case 'VOTER_ID':
        if (!/^[A-Z]{3}\d{7}$/.test(documentNumber)) {
          throw new BadRequestException('Invalid voter ID format');
        }
        break;
      case 'DRIVING_LICENSE':
        if (!/^[A-Z]{2}\d{2}\s?\d{11}$/.test(documentNumber.replace(/\s/g, ' '))) {
          // DL format varies by state, be lenient
          if (documentNumber.length < 10 || documentNumber.length > 20) {
            throw new BadRequestException('Invalid driving license number format');
          }
        }
        break;
    }
  }

  private maskDocumentNumber(type: string, number: string): string {
    if (type === 'AADHAAR') {
      return `XXXX-XXXX-${number.slice(-4)}`;
    }
    if (type === 'PAN') {
      return `${number.slice(0, 2)}XXXXX${number.slice(-3)}`;
    }
    // Mask middle portion for other documents
    if (number.length > 6) {
      return `${number.slice(0, 3)}${'X'.repeat(number.length - 6)}${number.slice(-3)}`;
    }
    return number;
  }
}
