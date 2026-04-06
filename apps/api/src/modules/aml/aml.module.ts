// ─── AML Module ────────────────────────────────────────────────
// Anti-Money Laundering compliance monitoring module.

import { Module } from '@nestjs/common';
import { AmlService } from './aml.service';
import { AmlAlertService } from './aml.alert.service';
import { AmlRiskService } from './aml.risk.service';
import { AmlMonitoringService } from './aml.monitoring.service';
import { AmlTrpcRouter } from './aml.trpc';
import { AmlEventHandler } from './aml.event-handler';

@Module({
  controllers: [],
  providers: [
    AmlService,
    AmlAlertService,
    AmlRiskService,
    AmlMonitoringService,
    AmlTrpcRouter,
    AmlEventHandler,
  ],
  exports: [
    AmlService,
    AmlAlertService,
    AmlRiskService,
    AmlMonitoringService,
    AmlTrpcRouter,
  ],
})
export class AmlModule {}
