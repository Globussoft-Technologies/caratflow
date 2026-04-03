import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { TrpcModule } from './trpc/trpc.module';
import { EventBusModule } from './event-bus/event-bus.module';
import { CommonModule } from './common/common.module';
import { TenantMiddleware } from './common/tenant.middleware';
import { InventoryModule } from './modules/inventory/inventory.module';
import { ManufacturingModule } from './modules/manufacturing/manufacturing.module';
import { FinancialModule } from './modules/financial/financial.module';
import { RetailModule } from './modules/retail/retail.module';
import { CrmModule } from './modules/crm/crm.module';
import { WholesaleModule } from './modules/wholesale/wholesale.module';
import { EcommerceModule } from './modules/ecommerce/ecommerce.module';
import { ComplianceModule } from './modules/compliance/compliance.module';
import { ReportingModule } from './modules/reporting/reporting.module';
import { PlatformModule } from './modules/platform/platform.module';

@Module({
  imports: [
    CommonModule,
    AuthModule,
    HealthModule,
    TrpcModule,
    EventBusModule,
    InventoryModule,
    ManufacturingModule,
    FinancialModule,
    RetailModule,
    CrmModule,
    WholesaleModule,
    EcommerceModule,
    ComplianceModule,
    ReportingModule,
    PlatformModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes('api/v1/*');
  }
}
