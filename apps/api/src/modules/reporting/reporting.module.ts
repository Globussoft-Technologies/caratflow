// ─── Reporting Module ──────────────────────────────────────────
// Reports, analytics, dashboards, forecasting, custom reports, exports.

import { Module } from '@nestjs/common';
import { ReportingSalesService } from './reporting.sales.service';
import { ReportingInventoryService } from './reporting.inventory.service';
import { ReportingManufacturingService } from './reporting.manufacturing.service';
import { ReportingCrmService } from './reporting.crm.service';
import { ReportingForecastService } from './reporting.forecast.service';
import { ReportingCustomService } from './reporting.custom.service';
import { ReportingSchedulerService } from './reporting.scheduler.service';
import { ReportingDashboardService } from './reporting.dashboard.service';
import { ReportingTrpcRouter } from './reporting.trpc';
import { ReportingEventHandler } from './reporting.event-handler';

@Module({
  controllers: [],
  providers: [
    ReportingSalesService,
    ReportingInventoryService,
    ReportingManufacturingService,
    ReportingCrmService,
    ReportingForecastService,
    ReportingCustomService,
    ReportingSchedulerService,
    ReportingDashboardService,
    ReportingTrpcRouter,
    ReportingEventHandler,
  ],
  exports: [
    ReportingSalesService,
    ReportingInventoryService,
    ReportingManufacturingService,
    ReportingCrmService,
    ReportingForecastService,
    ReportingCustomService,
    ReportingDashboardService,
    ReportingTrpcRouter,
  ],
})
export class ReportingModule {}
