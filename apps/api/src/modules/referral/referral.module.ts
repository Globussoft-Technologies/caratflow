// ─── Referral Module ───────────────────────────────────────────
// Referral rewards program module registration.

import { Module } from '@nestjs/common';
import { ReferralService } from './referral.service';
import { ReferralController } from './referral.controller';
import { ReferralTrpcRouter } from './referral.trpc';

@Module({
  controllers: [ReferralController],
  providers: [
    ReferralService,
    ReferralTrpcRouter,
  ],
  exports: [
    ReferralService,
    ReferralTrpcRouter,
  ],
})
export class ReferralModule {}
