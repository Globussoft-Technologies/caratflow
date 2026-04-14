// ─── Retail Module ─────────────────────────────────────────────
// Sales, POS, returns, custom orders, repairs, layaway,
// old gold purchases, appraisals, discounts.

import { Module } from '@nestjs/common';
import { IndiaModule } from '../india/india.module';
import { RetailService } from './retail.service';
import { RetailPricingService } from './retail.pricing.service';
import { RetailReturnService } from './retail.return.service';
import { RetailRepairService } from './retail.repair.service';
import { RetailCustomOrderService } from './retail.custom-order.service';
import { RetailLayawayService } from './retail.layaway.service';
import { RetailOldGoldService } from './retail.old-gold.service';
import { RetailAppraisalService } from './retail.appraisal.service';
import { RetailDiscountService } from './retail.discount.service';
import { RetailTrpcRouter } from './retail.trpc';
import { RetailEventHandler } from './retail.event-handler';

@Module({
  imports: [IndiaModule],
  controllers: [],
  providers: [
    RetailService,
    RetailPricingService,
    RetailReturnService,
    RetailRepairService,
    RetailCustomOrderService,
    RetailLayawayService,
    RetailOldGoldService,
    RetailAppraisalService,
    RetailDiscountService,
    RetailTrpcRouter,
    RetailEventHandler,
  ],
  exports: [
    RetailService,
    RetailPricingService,
    RetailReturnService,
    RetailRepairService,
    RetailCustomOrderService,
    RetailLayawayService,
    RetailOldGoldService,
    RetailAppraisalService,
    RetailDiscountService,
    RetailTrpcRouter,
  ],
})
export class RetailModule {}
