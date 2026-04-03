// ─── Export Module ────────────────────────────────────────────────
// Export orders, invoicing, shipping documents, customs duty,
// HS codes, exchange rates, DGFT licenses, and compliance.

import { Module } from '@nestjs/common';
import { ExportService } from './export.service';
import { ExportInvoiceService } from './export.invoice.service';
import { ExportDocumentService } from './export.document.service';
import { ExportDutyService } from './export.duty.service';
import { ExportComplianceService } from './export.compliance.service';
import { ExportExchangeRateService } from './export.exchange-rate.service';
import { ExportTrpcRouter } from './export.trpc';
import { ExportEventHandler } from './export.event-handler';

@Module({
  controllers: [],
  providers: [
    ExportService,
    ExportInvoiceService,
    ExportDocumentService,
    ExportDutyService,
    ExportComplianceService,
    ExportExchangeRateService,
    ExportTrpcRouter,
    ExportEventHandler,
  ],
  exports: [
    ExportService,
    ExportInvoiceService,
    ExportDocumentService,
    ExportDutyService,
    ExportComplianceService,
    ExportExchangeRateService,
    ExportTrpcRouter,
  ],
})
export class ExportModule {}
