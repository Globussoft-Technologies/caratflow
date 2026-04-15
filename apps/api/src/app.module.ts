import { Module, MiddlewareConsumer, NestModule, RequestMethod } from '@nestjs/common';
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
import { PdfModule } from './modules/platform/pdf.module';
import { CmsModule } from './modules/cms/cms.module';
import { DigitalGoldModule } from './modules/digital-gold/digital-gold.module';
import { ReferralModule } from './modules/referral/referral.module';
import { AmlModule } from './modules/aml/aml.module';
import { StorefrontModule } from './modules/storefront/storefront.module';
import { CustomerPortalModule } from './modules/customer-portal/customer-portal.module';
import { BnplModule } from './modules/bnpl/bnpl.module';
import { PreOrderModule } from './modules/preorder/preorder.module';
import { SearchModule } from './modules/search/search.module';
import { ChatbotModule } from './modules/chatbot/chatbot.module';
import { ArModule } from './modules/ar/ar.module';
import { B2cFeaturesModule } from './modules/b2c-features/b2c-features.module';
import { ExportModule } from './modules/export/export.module';
import { HardwareModule } from './modules/hardware/hardware.module';
import { IndiaModule } from './modules/india/india.module';
import { RecommendationsModule } from './modules/recommendations/recommendations.module';
import { PayrollModule } from './modules/payroll/payroll.module';

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
    PdfModule,
    CmsModule,
    DigitalGoldModule,
    ReferralModule,
    AmlModule,
    StorefrontModule,
    CustomerPortalModule,
    BnplModule,
    PreOrderModule,
    SearchModule,
    ChatbotModule,
    ArModule,
    B2cFeaturesModule,
    ExportModule,
    HardwareModule,
    IndiaModule,
    RecommendationsModule,
    PayrollModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Match every sub-path under /api/v1 (including multi-segment routes
    // like /api/v1/trpc/inventory.stockItems.list). A single-segment
    // wildcard pattern ('api/v1/*') does NOT match deep routes in Nest 11
    // because path-to-regexp v6 treats '*' as a single segment.
    consumer
      .apply(TenantMiddleware)
      .forRoutes(
        { path: 'api/v1/(.*)', method: RequestMethod.ALL },
      );
  }
}
