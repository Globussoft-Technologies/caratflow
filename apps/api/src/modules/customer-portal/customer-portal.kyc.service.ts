// ─── Customer Portal KYC Service ──────────────────────────────
// Customer-facing KYC status checks, document uploads, and
// requirement lookups for B2C regulatory compliance.

import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { TenantAwareService } from '../../common/base.service';
import { PrismaService } from '../../common/prisma.service';
import type {
  CustomerPortalKycStatusResponse,
  KycUploadInput,
  KycRequirementsResponse,
  KycDocumentStatus,
} from '@caratflow/shared-types';

/** KYC requirements per purpose */
const KYC_REQUIREMENTS: Record<
  string,
  Array<{ type: string; description: string; isMandatory: boolean }>
> = {
  digital_gold: [
    { type: 'PAN', description: 'PAN Card for tax compliance', isMandatory: true },
    { type: 'AADHAAR', description: 'Aadhaar for identity verification', isMandatory: true },
  ],
  high_value_purchase: [
    { type: 'PAN', description: 'PAN Card (mandatory for purchases above Rs. 2 lakh)', isMandatory: true },
    { type: 'AADHAAR', description: 'Aadhaar for identity verification', isMandatory: false },
  ],
  scheme_enrollment: [
    { type: 'PAN', description: 'PAN Card for savings scheme', isMandatory: true },
    { type: 'AADHAAR', description: 'Aadhaar for identity verification', isMandatory: true },
  ],
  general: [
    { type: 'PAN', description: 'PAN Card', isMandatory: false },
    { type: 'AADHAAR', description: 'Aadhaar Card', isMandatory: false },
    { type: 'VOTER_ID', description: 'Voter ID', isMandatory: false },
    { type: 'PASSPORT', description: 'Passport', isMandatory: false },
    { type: 'DRIVING_LICENSE', description: 'Driving License', isMandatory: false },
  ],
};

@Injectable()
export class CustomerPortalKycService extends TenantAwareService {
  private readonly logger = new Logger(CustomerPortalKycService.name);

  constructor(prisma: PrismaService) {
    super(prisma);
  }

  // ─── Get KYC Status ─────────────────────────────────────────────

  async getKycStatus(
    tenantId: string,
    customerId: string,
  ): Promise<CustomerPortalKycStatusResponse> {
    const verifications = await this.prisma.kycVerification.findMany({
      where: { tenantId, customerId },
      orderBy: { createdAt: 'desc' },
    });

    // Deduplicate: keep latest per document type
    const latestByType = new Map<string, typeof verifications[number]>();
    for (const v of verifications) {
      if (!latestByType.has(v.verificationType)) {
        latestByType.set(v.verificationType, v);
      }
    }

    const documents: KycDocumentStatus[] = Array.from(latestByType.values()).map((v) => ({
      id: v.id,
      type: v.verificationType as KycDocumentStatus['type'],
      documentNumber: this.maskDocumentNumber(v.verificationType, v.documentNumber),
      status: v.verificationStatus as KycDocumentStatus['status'],
      verifiedAt: v.verifiedAt,
      validUntil: v.validUntil,
    }));

    const verified = documents.filter((d) => d.status === 'VERIFIED');
    const isAadhaarVerified = verified.some((d) => d.type === 'AADHAAR');
    const isPanVerified = verified.some((d) => d.type === 'PAN');
    const isKycComplete = isAadhaarVerified && isPanVerified;

    let overallStatus: CustomerPortalKycStatusResponse['overallStatus'];
    if (documents.length === 0) {
      overallStatus = 'NOT_STARTED';
    } else if (isKycComplete) {
      overallStatus = 'COMPLETE';
    } else if (documents.some((d) => d.status === 'PENDING')) {
      overallStatus = 'PENDING_REVIEW';
    } else {
      overallStatus = 'PARTIAL';
    }

    return {
      documents,
      isAadhaarVerified,
      isPanVerified,
      isKycComplete,
      overallStatus,
    };
  }

  // ─── Upload Document ────────────────────────────────────────────

  async uploadDocument(
    tenantId: string,
    customerId: string,
    input: KycUploadInput,
  ): Promise<KycDocumentStatus> {
    // Validate document number format
    this.validateDocumentFormat(input.documentType, input.documentNumber);

    // Check for existing verification of same type
    const existing = await this.prisma.kycVerification.findFirst({
      where: {
        tenantId,
        customerId,
        verificationType: input.documentType,
        verificationStatus: { in: ['PENDING', 'VERIFIED'] },
      },
    });

    if (existing?.verificationStatus === 'VERIFIED') {
      throw new BadRequestException(
        `${input.documentType} is already verified. Contact support if you need to update it.`,
      );
    }

    // Update existing pending or create new
    let verification;
    if (existing?.verificationStatus === 'PENDING') {
      verification = await this.prisma.kycVerification.update({
        where: { id: existing.id },
        data: {
          documentNumber: input.documentNumber,
          documentUrl: input.fileUrl,
          updatedBy: customerId,
        },
      });
    } else {
      verification = await this.prisma.kycVerification.create({
        data: {
          tenantId,
          customerId,
          verificationType: input.documentType,
          documentNumber: input.documentNumber,
          verificationStatus: 'PENDING',
          documentUrl: input.fileUrl,
          createdBy: customerId,
          updatedBy: customerId,
        },
      });
    }

    this.logger.log(
      `Customer ${customerId} uploaded ${input.documentType} document for verification`,
    );

    return {
      id: verification.id,
      type: verification.verificationType as KycDocumentStatus['type'],
      documentNumber: this.maskDocumentNumber(
        verification.verificationType,
        verification.documentNumber,
      ),
      status: verification.verificationStatus as KycDocumentStatus['status'],
      verifiedAt: verification.verifiedAt,
      validUntil: verification.validUntil,
    };
  }

  // ─── KYC Requirements ──────────────────────────────────────────

  async getKycRequirements(
    tenantId: string,
    customerId: string,
    purpose: string,
  ): Promise<KycRequirementsResponse> {
    const requirements = KYC_REQUIREMENTS[purpose] ?? KYC_REQUIREMENTS['general'] ?? [];

    // Get current verification status
    const verifications = await this.prisma.kycVerification.findMany({
      where: { tenantId, customerId, verificationStatus: 'VERIFIED' },
    });
    const verifiedTypes = new Set(verifications.map((v) => v.verificationType));

    const requiredDocuments = requirements.map((req) => ({
      type: req.type as KycRequirementsResponse['requiredDocuments'][number]['type'],
      description: req.description,
      isMandatory: req.isMandatory,
      isVerified: (verifiedTypes as Set<string>).has(req.type),
    }));

    const isComplete = requiredDocuments
      .filter((d) => d.isMandatory)
      .every((d) => d.isVerified);

    return {
      purpose,
      requiredDocuments,
      isComplete,
    };
  }

  // ─── Helpers ────────────────────────────────────────────────────

  private validateDocumentFormat(type: string, documentNumber: string): void {
    switch (type) {
      case 'AADHAAR':
        if (!/^\d{12}$/.test(documentNumber)) {
          throw new BadRequestException('Invalid Aadhaar number -- must be 12 digits');
        }
        break;
      case 'PAN':
        if (!/^[A-Z]{5}\d{4}[A-Z]$/.test(documentNumber)) {
          throw new BadRequestException('Invalid PAN format -- must be ABCDE1234F');
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
        if (documentNumber.length < 10 || documentNumber.length > 20) {
          throw new BadRequestException('Invalid driving license number format');
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
    if (number.length > 6) {
      return `${number.slice(0, 3)}${'X'.repeat(number.length - 6)}${number.slice(-3)}`;
    }
    return number;
  }
}
