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
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes('api/v1/*');
  }
}
