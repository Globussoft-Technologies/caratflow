// ─── Compliance Module ─────────────────────────────────────────
// HUID, hallmarking, gemstone certification, chain of custody,
// compliance documents, insurance, and audit tracking.

import { Module } from '@nestjs/common';
import { TrpcService } from '../../trpc/trpc.service';
import { ComplianceHuidService } from './compliance.huid.service';
import { ComplianceHallmarkService } from './compliance.hallmark.service';
import { ComplianceCertificateService } from './compliance.certificate.service';
import { ComplianceTraceabilityService } from './compliance.traceability.service';
import { ComplianceDocumentService } from './compliance.document.service';
import { ComplianceInsuranceService } from './compliance.insurance.service';
import { ComplianceAuditService } from './compliance.audit.service';
import { ComplianceTrpcRouter } from './compliance.trpc';
import { ComplianceEventHandler } from './compliance.event-handler';

@Module({
  providers: [
    TrpcService,
    ComplianceHuidService,
    ComplianceHallmarkService,
    ComplianceCertificateService,
    ComplianceTraceabilityService,
    ComplianceDocumentService,
    ComplianceInsuranceService,
    ComplianceAuditService,
    ComplianceTrpcRouter,
    ComplianceEventHandler,
  ],
  exports: [
    ComplianceHuidService,
    ComplianceHallmarkService,
    ComplianceCertificateService,
    ComplianceTraceabilityService,
    ComplianceDocumentService,
    ComplianceInsuranceService,
    ComplianceAuditService,
    ComplianceTrpcRouter,
  ],
})
export class ComplianceModule {}
