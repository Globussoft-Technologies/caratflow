// ─── CaratFlow Compliance Types ────────────────────────────────
// Types for HUID, hallmarking, gemstone certification, chain of
// custody, compliance documents, insurance, and audit tracking.

import { z } from 'zod';
import { PaginationSchema } from './common';

// ─── Enums ────────────────────────────────────────────────────

export const HuidStatusEnum = z.enum(['ACTIVE', 'SOLD', 'RETURNED', 'TRANSFERRED']);
export type HuidStatus = z.infer<typeof HuidStatusEnum>;

export const HallmarkSubmissionStatusEnum = z.enum([
  'SUBMITTED', 'IN_PROGRESS', 'COMPLETED', 'PARTIAL_REJECT', 'REJECTED',
]);
export type HallmarkSubmissionStatus = z.infer<typeof HallmarkSubmissionStatusEnum>;

export const HallmarkItemStatusEnum = z.enum(['PENDING', 'PASSED', 'FAILED', 'REWORK']);
export type HallmarkItemStatus = z.infer<typeof HallmarkItemStatusEnum>;

export const CertificateIssuingLabEnum = z.enum(['GIA', 'IGI', 'HRD', 'AGS', 'EGL', 'SGL', 'OTHER']);
export type CertificateIssuingLab = z.infer<typeof CertificateIssuingLabEnum>;

export const CustodyEventTypeEnum = z.enum([
  'SOURCED', 'IMPORTED', 'MANUFACTURED', 'TRANSFERRED', 'SOLD', 'RETURNED',
]);
export type CustodyEventType = z.infer<typeof CustodyEventTypeEnum>;

export const ComplianceDocumentTypeEnum = z.enum([
  'KIMBERLEY_CERTIFICATE', 'CONFLICT_FREE_DECLARATION', 'CERTIFICATE_OF_ORIGIN',
  'IMPORT_LICENSE', 'EXPORT_LICENSE', 'BIS_CERTIFICATE', 'INSURANCE_POLICY', 'ASSAY_REPORT',
]);
export type ComplianceDocumentType = z.infer<typeof ComplianceDocumentTypeEnum>;

export const ComplianceDocumentStatusEnum = z.enum(['ACTIVE', 'EXPIRED', 'REVOKED']);
export type ComplianceDocumentStatus = z.infer<typeof ComplianceDocumentStatusEnum>;

export const InsuranceCoverageTypeEnum = z.enum(['ALL_RISK', 'TRANSIT', 'STORAGE', 'DISPLAY']);
export type InsuranceCoverageType = z.infer<typeof InsuranceCoverageTypeEnum>;

export const InsurancePolicyStatusEnum = z.enum(['ACTIVE', 'EXPIRED', 'CLAIMED', 'CANCELLED']);
export type InsurancePolicyStatus = z.infer<typeof InsurancePolicyStatusEnum>;

export const ComplianceAuditTypeEnum = z.enum(['INTERNAL', 'BIS', 'CUSTOMS', 'TAX']);
export type ComplianceAuditType = z.infer<typeof ComplianceAuditTypeEnum>;

export const ComplianceAuditStatusEnum = z.enum([
  'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'FINDINGS_OPEN', 'RESOLVED',
]);
export type ComplianceAuditStatus = z.infer<typeof ComplianceAuditStatusEnum>;

// ─── HUID ─────────────────────────────────────────────────────

export const HuidRecordInputSchema = z.object({
  productId: z.string().uuid(),
  huidNumber: z.string().length(6).regex(/^[A-Z0-9]{6}$/, 'HUID must be 6 alphanumeric characters'),
  articleType: z.string().min(1).max(100),
  metalType: z.string().min(1).max(50),
  purityFineness: z.number().int().min(0).max(999),
  weightMg: z.number().int().positive(),
  hallmarkCenterId: z.string().uuid().optional(),
  registeredAt: z.coerce.date().optional(),
});
export type HuidRecordInput = z.infer<typeof HuidRecordInputSchema>;

export const HuidVerificationInputSchema = z.object({
  huidNumber: z.string().length(6).regex(/^[A-Z0-9]{6}$/),
});
export type HuidVerificationInput = z.infer<typeof HuidVerificationInputSchema>;

export const BulkHuidRegisterSchema = z.object({
  items: z.array(HuidRecordInputSchema).min(1).max(500),
});
export type BulkHuidRegister = z.infer<typeof BulkHuidRegisterSchema>;

export const HuidRecordSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  productId: z.string().uuid(),
  huidNumber: z.string().length(6),
  articleType: z.string(),
  metalType: z.string(),
  purityFineness: z.number().int(),
  weightMg: z.number().int(),
  hallmarkCenterId: z.string().uuid().nullable(),
  registeredAt: z.coerce.date(),
  status: HuidStatusEnum,
  verifiedAt: z.coerce.date().nullable(),
  verifiedBy: z.string().uuid().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type HuidRecord = z.infer<typeof HuidRecordSchema>;

export const HuidResponseSchema = HuidRecordSchema.extend({
  product: z.object({
    id: z.string(),
    sku: z.string(),
    name: z.string(),
  }).optional(),
});
export type HuidResponse = z.infer<typeof HuidResponseSchema>;

export const HuidListInputSchema = PaginationSchema.extend({
  status: HuidStatusEnum.optional(),
  search: z.string().optional(),
});
export type HuidListInput = z.infer<typeof HuidListInputSchema>;

// ─── Hallmark Center ──────────────────────────────────────────

export const HallmarkCenterInputSchema = z.object({
  centerCode: z.string().min(1).max(50),
  name: z.string().min(1).max(255),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  phone: z.string().max(20).optional(),
  email: z.string().email().optional(),
  bisLicenseNumber: z.string().max(100).optional(),
  isActive: z.boolean().optional(),
});
export type HallmarkCenterInput = z.infer<typeof HallmarkCenterInputSchema>;

export const HallmarkCenterSchema = z.object({
  id: z.string().uuid(),
  centerCode: z.string(),
  name: z.string(),
  address: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  bisLicenseNumber: z.string().nullable(),
  isActive: z.boolean(),
});
export type HallmarkCenter = z.infer<typeof HallmarkCenterSchema>;

// ─── Hallmark Submission ──────────────────────────────────────

export const HallmarkSubmissionItemInputSchema = z.object({
  productId: z.string().uuid(),
  declaredPurity: z.number().int().min(0).max(999),
});
export type HallmarkSubmissionItemInput = z.infer<typeof HallmarkSubmissionItemInputSchema>;

export const HallmarkSubmissionInputSchema = z.object({
  hallmarkCenterId: z.string().uuid(),
  locationId: z.string().uuid(),
  submittedDate: z.coerce.date().optional(),
  expectedReturnDate: z.coerce.date().optional(),
  notes: z.string().optional(),
  items: z.array(HallmarkSubmissionItemInputSchema).min(1),
});
export type HallmarkSubmissionInput = z.infer<typeof HallmarkSubmissionInputSchema>;

export const HallmarkSubmissionItemResultSchema = z.object({
  itemId: z.string().uuid(),
  status: HallmarkItemStatusEnum,
  testedPurity: z.number().int().optional(),
  huidAssigned: z.string().length(6).regex(/^[A-Z0-9]{6}$/).optional(),
  failureReason: z.string().optional(),
  notes: z.string().optional(),
});
export type HallmarkSubmissionItemResult = z.infer<typeof HallmarkSubmissionItemResultSchema>;

export const RecordHallmarkResultsSchema = z.object({
  submissionId: z.string().uuid(),
  results: z.array(HallmarkSubmissionItemResultSchema).min(1),
});
export type RecordHallmarkResults = z.infer<typeof RecordHallmarkResultsSchema>;

export const HallmarkSubmissionResponseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  submissionNumber: z.string(),
  hallmarkCenterId: z.string().uuid(),
  locationId: z.string().uuid(),
  status: HallmarkSubmissionStatusEnum,
  submittedDate: z.coerce.date(),
  expectedReturnDate: z.coerce.date().nullable(),
  actualReturnDate: z.coerce.date().nullable(),
  totalItems: z.number().int(),
  passedItems: z.number().int(),
  failedItems: z.number().int(),
  notes: z.string().nullable(),
  createdAt: z.coerce.date(),
  items: z.array(z.object({
    id: z.string().uuid(),
    productId: z.string().uuid(),
    status: HallmarkItemStatusEnum,
    testedPurity: z.number().int().nullable(),
    declaredPurity: z.number().int(),
    huidAssigned: z.string().nullable(),
    failureReason: z.string().nullable(),
    notes: z.string().nullable(),
    product: z.object({
      id: z.string(),
      sku: z.string(),
      name: z.string(),
    }).optional(),
  })).optional(),
  hallmarkCenter: HallmarkCenterSchema.optional(),
});
export type HallmarkSubmissionResponse = z.infer<typeof HallmarkSubmissionResponseSchema>;

export const HallmarkSubmissionListInputSchema = PaginationSchema.extend({
  status: HallmarkSubmissionStatusEnum.optional(),
  hallmarkCenterId: z.string().uuid().optional(),
});
export type HallmarkSubmissionListInput = z.infer<typeof HallmarkSubmissionListInputSchema>;

// ─── Gemstone Certificate ─────────────────────────────────────

export const GemstoneCertificateInputSchema = z.object({
  productId: z.string().uuid(),
  certificateNumber: z.string().min(1).max(100),
  issuingLab: CertificateIssuingLabEnum,
  stoneType: z.string().min(1).max(100),
  caratWeight: z.number().int().positive(),
  color: z.string().max(50).optional(),
  clarity: z.string().max(50).optional(),
  cut: z.string().max(50).optional(),
  shape: z.string().max(50).optional(),
  dimensions: z.string().max(100).optional(),
  fluorescence: z.string().max(50).optional(),
  certificateDate: z.coerce.date().optional(),
  certificateUrl: z.string().url().optional(),
  imageUrl: z.string().url().optional(),
});
export type GemstoneCertificateInput = z.infer<typeof GemstoneCertificateInputSchema>;

export const CertificateVerificationResultSchema = z.object({
  certificateNumber: z.string(),
  isValid: z.boolean(),
  lab: CertificateIssuingLabEnum,
  verifiedAt: z.coerce.date().nullable(),
  details: z.record(z.unknown()).optional(),
});
export type CertificateVerificationResult = z.infer<typeof CertificateVerificationResultSchema>;

export const GemstoneCertificateSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  productId: z.string().uuid(),
  certificateNumber: z.string(),
  issuingLab: CertificateIssuingLabEnum,
  stoneType: z.string(),
  caratWeight: z.number().int(),
  color: z.string().nullable(),
  clarity: z.string().nullable(),
  cut: z.string().nullable(),
  shape: z.string().nullable(),
  dimensions: z.string().nullable(),
  fluorescence: z.string().nullable(),
  certificateDate: z.coerce.date().nullable(),
  certificateUrl: z.string().nullable(),
  imageUrl: z.string().nullable(),
  verifiedAt: z.coerce.date().nullable(),
  isVerified: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  product: z.object({
    id: z.string(),
    sku: z.string(),
    name: z.string(),
  }).optional(),
});
export type GemstoneCertificate = z.infer<typeof GemstoneCertificateSchema>;

export const GemstoneCertificateListInputSchema = PaginationSchema.extend({
  issuingLab: CertificateIssuingLabEnum.optional(),
  isVerified: z.boolean().optional(),
  search: z.string().optional(),
});
export type GemstoneCertificateListInput = z.infer<typeof GemstoneCertificateListInputSchema>;

// ─── Chain of Custody ─────────────────────────────────────────

export const ChainOfCustodyInputSchema = z.object({
  productId: z.string().uuid(),
  eventType: CustodyEventTypeEnum,
  fromEntityType: z.string().max(100).optional(),
  fromEntityId: z.string().uuid().optional(),
  toEntityType: z.string().max(100).optional(),
  toEntityId: z.string().uuid().optional(),
  eventDate: z.coerce.date().optional(),
  locationId: z.string().uuid().optional(),
  documentReference: z.string().max(200).optional(),
  notes: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});
export type ChainOfCustodyInput = z.infer<typeof ChainOfCustodyInputSchema>;

export const ChainOfCustodyEventSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  productId: z.string().uuid(),
  eventType: CustodyEventTypeEnum,
  fromEntityType: z.string().nullable(),
  fromEntityId: z.string().nullable(),
  toEntityType: z.string().nullable(),
  toEntityId: z.string().nullable(),
  eventDate: z.coerce.date(),
  locationId: z.string().uuid().nullable(),
  documentReference: z.string().nullable(),
  notes: z.string().nullable(),
  metadata: z.record(z.unknown()).nullable(),
  createdAt: z.coerce.date(),
});
export type ChainOfCustodyEvent = z.infer<typeof ChainOfCustodyEventSchema>;

export const TraceabilityChainResponseSchema = z.object({
  productId: z.string().uuid(),
  product: z.object({
    id: z.string(),
    sku: z.string(),
    name: z.string(),
  }),
  events: z.array(ChainOfCustodyEventSchema),
  huidRecord: HuidRecordSchema.nullable(),
  certificates: z.array(GemstoneCertificateSchema),
});
export type TraceabilityChainResponse = z.infer<typeof TraceabilityChainResponseSchema>;

// ─── Compliance Document ──────────────────────────────────────

export const ComplianceDocumentInputSchema = z.object({
  productId: z.string().uuid().optional(),
  supplierId: z.string().uuid().optional(),
  documentType: ComplianceDocumentTypeEnum,
  documentNumber: z.string().min(1).max(200),
  issuedBy: z.string().max(255).optional(),
  issuedDate: z.coerce.date().optional(),
  expiryDate: z.coerce.date().optional(),
  fileUrl: z.string().url().optional(),
  notes: z.string().optional(),
});
export type ComplianceDocumentInput = z.infer<typeof ComplianceDocumentInputSchema>;

export const ComplianceDocumentSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  productId: z.string().uuid().nullable(),
  supplierId: z.string().uuid().nullable(),
  documentType: ComplianceDocumentTypeEnum,
  documentNumber: z.string(),
  issuedBy: z.string().nullable(),
  issuedDate: z.coerce.date().nullable(),
  expiryDate: z.coerce.date().nullable(),
  fileUrl: z.string().nullable(),
  status: ComplianceDocumentStatusEnum,
  notes: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type ComplianceDocumentResponse = z.infer<typeof ComplianceDocumentSchema>;

export const ComplianceDocumentListInputSchema = PaginationSchema.extend({
  documentType: ComplianceDocumentTypeEnum.optional(),
  status: ComplianceDocumentStatusEnum.optional(),
  expiringWithinDays: z.number().int().positive().optional(),
});
export type ComplianceDocumentListInput = z.infer<typeof ComplianceDocumentListInputSchema>;

// ─── Insurance Policy ─────────────────────────────────────────

export const InsurancePolicyInputSchema = z.object({
  policyNumber: z.string().min(1).max(100),
  provider: z.string().min(1).max(255),
  locationId: z.string().uuid().optional(),
  coverageType: InsuranceCoverageTypeEnum,
  coveredValuePaise: z.number().int().positive(),
  premiumPaise: z.number().int().positive(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  claimHistory: z.record(z.unknown()).optional(),
  documentUrl: z.string().url().optional(),
});
export type InsurancePolicyInput = z.infer<typeof InsurancePolicyInputSchema>;

export const InsurancePolicySchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  policyNumber: z.string(),
  provider: z.string(),
  locationId: z.string().uuid().nullable(),
  coverageType: InsuranceCoverageTypeEnum,
  coveredValuePaise: z.number().int(),
  premiumPaise: z.number().int(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  status: InsurancePolicyStatusEnum,
  claimHistory: z.record(z.unknown()).nullable(),
  documentUrl: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type InsurancePolicyResponse = z.infer<typeof InsurancePolicySchema>;

export const InsurancePolicyListInputSchema = PaginationSchema.extend({
  status: InsurancePolicyStatusEnum.optional(),
  coverageType: InsuranceCoverageTypeEnum.optional(),
});
export type InsurancePolicyListInput = z.infer<typeof InsurancePolicyListInputSchema>;

// ─── Compliance Audit ─────────────────────────────────────────

export const ComplianceAuditInputSchema = z.object({
  auditType: ComplianceAuditTypeEnum,
  auditDate: z.coerce.date(),
  auditorName: z.string().min(1).max(255),
  locationId: z.string().uuid().optional(),
  findings: z.string().optional(),
  recommendations: z.string().optional(),
});
export type ComplianceAuditInput = z.infer<typeof ComplianceAuditInputSchema>;

export const ComplianceAuditSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  auditType: ComplianceAuditTypeEnum,
  auditDate: z.coerce.date(),
  auditorName: z.string(),
  locationId: z.string().uuid().nullable(),
  status: ComplianceAuditStatusEnum,
  findings: z.string().nullable(),
  recommendations: z.string().nullable(),
  resolvedAt: z.coerce.date().nullable(),
  resolvedBy: z.string().uuid().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type ComplianceAuditResponse = z.infer<typeof ComplianceAuditSchema>;

export const ComplianceAuditListInputSchema = PaginationSchema.extend({
  auditType: ComplianceAuditTypeEnum.optional(),
  status: ComplianceAuditStatusEnum.optional(),
});
export type ComplianceAuditListInput = z.infer<typeof ComplianceAuditListInputSchema>;

export const AuditResolveInputSchema = z.object({
  auditId: z.string().uuid(),
  findings: z.string().optional(),
  recommendations: z.string().optional(),
});
export type AuditResolveInput = z.infer<typeof AuditResolveInputSchema>;

// ─── Dashboard ────────────────────────────────────────────────

export const ComplianceDashboardResponseSchema = z.object({
  huidCoveragePercent: z.number(),
  pendingHallmarks: z.number().int(),
  expiringDocs: z.number().int(),
  certifiedStonesPercent: z.number(),
  insuranceCoverage: z.number(),
  upcomingAudits: z.array(ComplianceAuditSchema),
  recentHuids: z.array(HuidRecordSchema),
});
export type ComplianceDashboardResponse = z.infer<typeof ComplianceDashboardResponseSchema>;
