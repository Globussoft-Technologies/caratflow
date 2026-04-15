// ─── Financial Module ──────────────────────────────────────────
// Journal entries, invoices, payments, GST, TDS/TCS, reconciliation.

import { Module } from '@nestjs/common';
import { FinancialService } from './financial.service';
import { FinancialTaxService } from './financial.tax.service';
import { FinancialReportingService } from './financial.reporting.service';
import { FinancialBankService } from './financial.bank.service';
import { FinancialTrpcRouter } from './financial.trpc';
import { FinancialEventHandler } from './financial.event-handler';
import { EInvoiceService } from './einvoice.service';
import { FinancialController } from './financial.controller';

@Module({
  controllers: [FinancialController],
  providers: [
    FinancialService,
    FinancialTaxService,
    FinancialReportingService,
    FinancialBankService,
    FinancialTrpcRouter,
    FinancialEventHandler,
    EInvoiceService,
  ],
  exports: [
    FinancialService,
    FinancialTaxService,
    FinancialReportingService,
    FinancialBankService,
    FinancialTrpcRouter,
    EInvoiceService,
  ],
})
export class FinancialModule {}
