// ─── AR & Virtual Try-On Module ───────────────────────────────
// AR assets, virtual try-on sessions, 360-degree product views,
// and try-on analytics.

import { Module } from '@nestjs/common';
import { ArService } from './ar.service';
import { ArTryOnService } from './ar.tryon.service';
import { Ar360Service } from './ar.360.service';
import { ArController } from './ar.controller';
import { ArTrpcRouter } from './ar.trpc';

@Module({
  controllers: [ArController],
  providers: [
    ArService,
    ArTryOnService,
    Ar360Service,
    ArTrpcRouter,
  ],
  exports: [
    ArService,
    ArTryOnService,
    Ar360Service,
    ArTrpcRouter,
  ],
})
export class ArModule {}
