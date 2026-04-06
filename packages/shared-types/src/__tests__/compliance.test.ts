import { describe, it, expect } from 'vitest';
import {
  HuidRecordInputSchema,
  HallmarkSubmissionInputSchema,
  GemstoneCertificateInputSchema,
  HallmarkCenterInputSchema,
  ChainOfCustodyInputSchema,
  ComplianceDocumentInputSchema,
  InsurancePolicyInputSchema,
  ComplianceAuditInputSchema,
  HuidVerificationInputSchema,
} from '../compliance';

const validUuid = '550e8400-e29b-41d4-a716-446655440000';

describe('HuidRecordInputSchema', () => {
  it('should parse valid HUID record', () => {
    const result = HuidRecordInputSchema.safeParse({
      productId: validUuid,
      huidNumber: 'AB1234',
      articleType: 'Ring',
      metalType: 'GOLD',
      purityFineness: 916,
      weightMg: 5000,
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid HUID format', () => {
    const result = HuidRecordInputSchema.safeParse({
      productId: validUuid,
      huidNumber: 'ab1234',
      articleType: 'Ring',
      metalType: 'GOLD',
      purityFineness: 916,
      weightMg: 5000,
    });
    expect(result.success).toBe(false);
  });

  it('should reject HUID with wrong length', () => {
    const result = HuidRecordInputSchema.safeParse({
      productId: validUuid,
      huidNumber: 'AB12345',
      articleType: 'Ring',
      metalType: 'GOLD',
      purityFineness: 916,
      weightMg: 5000,
    });
    expect(result.success).toBe(false);
  });

  it('should reject zero weight', () => {
    const result = HuidRecordInputSchema.safeParse({
      productId: validUuid,
      huidNumber: 'AB1234',
      articleType: 'Ring',
      metalType: 'GOLD',
      purityFineness: 916,
      weightMg: 0,
    });
    expect(result.success).toBe(false);
  });
});

describe('HuidVerificationInputSchema', () => {
  it('should parse valid HUID verification', () => {
    const result = HuidVerificationInputSchema.safeParse({
      huidNumber: 'XY9876',
    });
    expect(result.success).toBe(true);
  });
});

describe('HallmarkSubmissionInputSchema', () => {
  it('should parse valid hallmark submission', () => {
    const result = HallmarkSubmissionInputSchema.safeParse({
      hallmarkCenterId: validUuid,
      locationId: validUuid,
      items: [{ productId: validUuid, declaredPurity: 916 }],
    });
    expect(result.success).toBe(true);
  });

  it('should reject empty items', () => {
    const result = HallmarkSubmissionInputSchema.safeParse({
      hallmarkCenterId: validUuid,
      locationId: validUuid,
      items: [],
    });
    expect(result.success).toBe(false);
  });

  it('should reject purity above 999', () => {
    const result = HallmarkSubmissionInputSchema.safeParse({
      hallmarkCenterId: validUuid,
      locationId: validUuid,
      items: [{ productId: validUuid, declaredPurity: 1000 }],
    });
    expect(result.success).toBe(false);
  });
});

describe('GemstoneCertificateInputSchema', () => {
  it('should parse valid gemstone certificate', () => {
    const result = GemstoneCertificateInputSchema.safeParse({
      productId: validUuid,
      certificateNumber: 'GIA-12345',
      issuingLab: 'GIA',
      stoneType: 'Diamond',
      caratWeight: 100,
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid issuing lab', () => {
    const result = GemstoneCertificateInputSchema.safeParse({
      productId: validUuid,
      certificateNumber: 'TEST-001',
      issuingLab: 'INVALID_LAB',
      stoneType: 'Ruby',
      caratWeight: 50,
    });
    expect(result.success).toBe(false);
  });

  it('should accept optional fields', () => {
    const result = GemstoneCertificateInputSchema.safeParse({
      productId: validUuid,
      certificateNumber: 'IGI-001',
      issuingLab: 'IGI',
      stoneType: 'Sapphire',
      caratWeight: 200,
      color: 'Blue',
      clarity: 'VS1',
      cut: 'Excellent',
      certificateUrl: 'https://igi.org/cert/001',
    });
    expect(result.success).toBe(true);
  });
});

describe('HallmarkCenterInputSchema', () => {
  it('should parse valid hallmark center', () => {
    const result = HallmarkCenterInputSchema.safeParse({
      centerCode: 'HC001',
      name: 'BIS Hallmark Center Mumbai',
    });
    expect(result.success).toBe(true);
  });
});

describe('ChainOfCustodyInputSchema', () => {
  it('should parse valid custody event', () => {
    const result = ChainOfCustodyInputSchema.safeParse({
      productId: validUuid,
      eventType: 'SOURCED',
    });
    expect(result.success).toBe(true);
  });
});

describe('ComplianceDocumentInputSchema', () => {
  it('should parse valid compliance document', () => {
    const result = ComplianceDocumentInputSchema.safeParse({
      documentType: 'KIMBERLEY_CERTIFICATE',
      documentNumber: 'KC-2026-001',
    });
    expect(result.success).toBe(true);
  });
});

describe('InsurancePolicyInputSchema', () => {
  it('should parse valid insurance policy', () => {
    const result = InsurancePolicyInputSchema.safeParse({
      policyNumber: 'POL-001',
      provider: 'New India Assurance',
      coverageType: 'ALL_RISK',
      coveredValuePaise: 100000000,
      premiumPaise: 500000,
      startDate: '2026-01-01',
      endDate: '2027-01-01',
    });
    expect(result.success).toBe(true);
  });
});

describe('ComplianceAuditInputSchema', () => {
  it('should parse valid compliance audit', () => {
    const result = ComplianceAuditInputSchema.safeParse({
      auditType: 'INTERNAL',
      auditDate: '2026-06-15',
      auditorName: 'Audit Firm LLP',
    });
    expect(result.success).toBe(true);
  });
});
