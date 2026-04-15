// ─── India Features Module ────────────────────────────────────
// Girvi (mortgage lending), Kitty/Chit schemes, Gold Savings,
// MCX/IBJA rate feed, KYC verification, and India payment methods.

import { Module, type Provider } from '@nestjs/common';
import { IndiaGirviService } from './india.girvi.service';
import { IndiaSchemeService } from './india.scheme.service';
import { IndiaRatesService } from './india.rates.service';
import { IndiaKycService } from './india.kyc.service';
import { IndiaPaymentService } from './india.payment.service';
import { IndiaTrpcRouter } from './india.trpc';
import { IndiaEventHandler } from './india.event-handler';
import { RatePollerService } from './rate-poller.service';
import { RATE_PROVIDER } from './rate-providers/rate-provider.interface';
import { ManualRateProvider } from './rate-providers/manual.provider';
import { MetalsDevRateProvider } from './rate-providers/metals-dev.provider';
import { KycProviderNestProvider } from './kyc-providers/kyc-provider.factory';

const rateProviderProvider: Provider = {
  provide: RATE_PROVIDER,
  useFactory: (manual: ManualRateProvider, metalsDev: MetalsDevRateProvider) => {
    const selected = (process.env.RATE_PROVIDER ?? 'manual').toLowerCase();
    if (selected === 'metals-dev' || selected === 'metals.dev') return metalsDev;
    return manual;
  },
  inject: [ManualRateProvider, MetalsDevRateProvider],
};

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
    ManualRateProvider,
    MetalsDevRateProvider,
    rateProviderProvider,
    RatePollerService,
    KycProviderNestProvider,
  ],
  exports: [
    IndiaGirviService,
    IndiaSchemeService,
    IndiaRatesService,
    IndiaKycService,
    IndiaPaymentService,
    IndiaTrpcRouter,
    RatePollerService,
  ],
})
export class IndiaModule {}
