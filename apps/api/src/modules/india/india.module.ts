// ─── India Features Module ────────────────────────────────────
// Girvi (mortgage lending), Kitty/Chit schemes, Gold Savings,
// MCX/IBJA rate feed, KYC verification, and India payment methods.

import { Module } from '@nestjs/common';
import { IndiaGirviService } from './india.girvi.service';
import { IndiaSchemeService } from './india.scheme.service';
import { IndiaRatesService } from './india.rates.service';
import { IndiaKycService } from './india.kyc.service';
import { IndiaPaymentService } from './india.payment.service';
import { IndiaTrpcRouter } from './india.trpc';
import { IndiaEventHandler } from './india.event-handler';

@Module({
  controllers: [],
  providers: [
    IndiaGirviService,
    IndiaSchemeService,
    IndiaRatesService,
    IndiaKycService,
    IndiaPaymentService,
    IndiaTrpcRouter,
    IndiaEventHandler,
  ],
  exports: [
    IndiaGirviService,
    IndiaSchemeService,
    IndiaRatesService,
    IndiaKycService,
    IndiaPaymentService,
    IndiaTrpcRouter,
  ],
})
export class IndiaModule {}
