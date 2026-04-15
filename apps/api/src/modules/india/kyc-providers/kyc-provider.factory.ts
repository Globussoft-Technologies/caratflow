// ─── eKYC Provider Factory ─────────────────────────────────────
// Resolves the concrete IKycProvider at module bootstrap based on
// environment variables. Defaults to LocalOnly if no creds present.

import { Logger } from '@nestjs/common';
import type { Provider } from '@nestjs/common';
import { CashfreeKycProvider, loadCashfreeConfigFromEnv } from './cashfree.provider';
import { LocalOnlyKycProvider } from './local-only.provider';
import type { IKycProvider } from './kyc-provider.interface';

export const KYC_PROVIDER_TOKEN = Symbol('KYC_PROVIDER');

export function resolveKycProvider(): IKycProvider {
  const logger = new Logger('KycProviderFactory');

  const cashfree = loadCashfreeConfigFromEnv();
  if (cashfree) {
    logger.log(`eKYC provider: cashfree (${cashfree.baseUrl})`);
    return new CashfreeKycProvider(cashfree);
  }

  logger.warn('eKYC provider: local-only (no aggregator credentials configured)');
  return new LocalOnlyKycProvider();
}

export const KycProviderNestProvider: Provider = {
  provide: KYC_PROVIDER_TOKEN,
  useFactory: resolveKycProvider,
};
