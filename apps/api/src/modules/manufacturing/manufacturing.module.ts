// ─── Manufacturing Module ──────────────────────────────────────
// Job orders, BOM, artisan management, quality checks, costing,
// production planning, and material requisition.

import { Module } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { EventBusService } from '../../event-bus/event-bus.service';
import { ManufacturingService } from './manufacturing.service';
import { ManufacturingKarigarService } from './manufacturing.karigar.service';
import { ManufacturingQcService } from './manufacturing.qc.service';
import { ManufacturingPlanningService } from './manufacturing.planning.service';
import { ManufacturingTrpc } from './manufacturing.trpc';
import { ManufacturingEventHandler } from './manufacturing.event-handler';

@Module({
  controllers: [],
  providers: [
    PrismaService,
    EventBusService,
    ManufacturingService,
    ManufacturingKarigarService,
    ManufacturingQcService,
    ManufacturingPlanningService,
    ManufacturingTrpc,
    ManufacturingEventHandler,
  ],
  exports: [
    ManufacturingService,
    ManufacturingKarigarService,
    ManufacturingQcService,
    ManufacturingPlanningService,
    ManufacturingTrpc,
  ],
})
export class ManufacturingModule {}
