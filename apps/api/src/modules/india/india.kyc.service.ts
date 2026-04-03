// ─── India KYC Service ─────────────────────────────────────────
// KYC document recording, verification, validation, expiry tracking.
// Placeholders for Aadhaar eKYC and PAN verification API integration.

import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { TenantAwareService } from '../../common/base.service';
import { PrismaService } from '../../common/prisma.service';
import { isValidAadhaar, isValidPan } from '@caratflow/utils';
import type { Prisma } from '@caratflow/db';
import type {
  KycVerificationInput,
  KycVerifyInput,
  KycStatusResponse,
  KycVerificationType,
  KycVerificationStatus,
} from '@caratflow/shared-types';

@Injectable()
export class IndiaKycService extends TenantAwareService {
  private readonly logger = new Logger(IndiaKycService.name);

  constructor(prisma: PrismaService) {
    super(prisma);
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

  // ─── Aadhaar eKYC API (placeholder) ──────────────────────────

  /**
   * Placeholder for Aadhaar eKYC API integration (UIDAI).
   * In production, this would:
   * 1. Send OTP to customer's Aadhaar-linked mobile
   * 2. Customer provides OTP
   * 3. Verify OTP with UIDAI API
   * 4. Receive demographic data
   * 5. Auto-verify the KYC record
   */
  async initiateAadhaarEkyc(_aadhaarNumber: string): Promise<{ transactionId: string; message: string }> {
    this.logger.log('Aadhaar eKYC: placeholder - integrate with UIDAI API');
    return {
      transactionId: `EKYC-${Date.now()}`,
      message: 'Aadhaar eKYC API integration pending. Use manual verification.',
    };
  }

  // ─── PAN Verification API (placeholder) ──────────────────────

  /**
   * Placeholder for PAN verification API integration.
   * In production, this would verify PAN against Income Tax database.
   */
  async verifyPanOnline(_panNumber: string): Promise<{ verified: boolean; name: string | null; message: string }> {
    this.logger.log('PAN verification: placeholder - integrate with IT API');
    return {
      verified: false,
      name: null,
      message: 'PAN verification API integration pending. Use manual verification.',
    };
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
