// ─── Digital Gold Module ───────────────────────────────────────
// Fractional gold ownership: buy/sell, SIP, redemption, price alerts.

import { Module } from '@nestjs/common';
import { IndiaModule } from '../india/india.module';
import { DigitalGoldService } from './digital-gold.service';
import { DigitalGoldSipService } from './digital-gold.sip.service';
import { DigitalGoldRedemptionService } from './digital-gold.redemption.service';
import { DigitalGoldAlertService } from './digital-gold.alert.service';
import { DigitalGoldController } from './digital-gold.controller';
import { DigitalGoldEventHandler } from './digital-gold.event-handler';

@Module({
  imports: [IndiaModule],
  controllers: [DigitalGoldController],
  providers: [
    DigitalGoldService,
    DigitalGoldSipService,
    DigitalGoldRedemptionService,
    DigitalGoldAlertService,
    DigitalGoldEventHandler,
  ],
  exports: [
    DigitalGoldService,
    DigitalGoldSipService,
    DigitalGoldRedemptionService,
    DigitalGoldAlertService,
  ],
})
export class DigitalGoldModule {}
