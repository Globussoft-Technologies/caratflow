// ─── Customer Portal Module ───────────────────────────────────
// B2C self-service portal: profile, orders, loyalty, schemes,
// KYC, and aggregated dashboard.

import { Module } from '@nestjs/common';
import { CustomerPortalController } from './customer-portal.controller';
import { CustomerPortalProfileService } from './customer-portal.profile.service';
import { CustomerPortalOrdersService } from './customer-portal.orders.service';
import { CustomerPortalLoyaltyService } from './customer-portal.loyalty.service';
import { CustomerPortalSchemesService } from './customer-portal.schemes.service';
import { CustomerPortalKycService } from './customer-portal.kyc.service';
import { CustomerPortalDashboardService } from './customer-portal.dashboard.service';

@Module({
  controllers: [CustomerPortalController],
  providers: [
    CustomerPortalProfileService,
    CustomerPortalOrdersService,
    CustomerPortalLoyaltyService,
    CustomerPortalSchemesService,
    CustomerPortalKycService,
    CustomerPortalDashboardService,
  ],
  exports: [
    CustomerPortalProfileService,
    CustomerPortalOrdersService,
    CustomerPortalLoyaltyService,
    CustomerPortalSchemesService,
    CustomerPortalKycService,
    CustomerPortalDashboardService,
  ],
})
export class CustomerPortalModule {}
