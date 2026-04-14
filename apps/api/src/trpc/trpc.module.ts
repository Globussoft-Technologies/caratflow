import { Global, Module, forwardRef } from '@nestjs/common';
import { TrpcService } from './trpc.service';
import { TrpcRouter } from './trpc.router';
import { TrpcController } from './trpc.controller';
import { InventoryModule } from '../modules/inventory/inventory.module';
import { CmsModule } from '../modules/cms/cms.module';
import { ReferralModule } from '../modules/referral/referral.module';
import { AmlModule } from '../modules/aml/aml.module';
import { PreOrderModule } from '../modules/preorder/preorder.module';
import { SearchModule } from '../modules/search/search.module';
import { ManufacturingModule } from '../modules/manufacturing/manufacturing.module';
import { FinancialModule } from '../modules/financial/financial.module';
import { RetailModule } from '../modules/retail/retail.module';
import { CrmModule } from '../modules/crm/crm.module';
import { WholesaleModule } from '../modules/wholesale/wholesale.module';
import { EcommerceModule } from '../modules/ecommerce/ecommerce.module';
import { ComplianceModule } from '../modules/compliance/compliance.module';
import { ReportingModule } from '../modules/reporting/reporting.module';
import { PlatformModule } from '../modules/platform/platform.module';
import { ChatbotModule } from '../modules/chatbot/chatbot.module';
import { BnplModule } from '../modules/bnpl/bnpl.module';
import { DigitalGoldModule } from '../modules/digital-gold/digital-gold.module';
import { StorefrontModule } from '../modules/storefront/storefront.module';
import { CustomerPortalModule } from '../modules/customer-portal/customer-portal.module';
import { RecommendationsModule } from '../modules/recommendations/recommendations.module';
import { ArModule } from '../modules/ar/ar.module';
import { B2cFeaturesModule } from '../modules/b2c-features/b2c-features.module';
import { ExportModule } from '../modules/export/export.module';
import { HardwareModule } from '../modules/hardware/hardware.module';
import { IndiaModule } from '../modules/india/india.module';

@Global()
@Module({
  imports: [
    forwardRef(() => InventoryModule),
    forwardRef(() => CmsModule),
    forwardRef(() => ReferralModule),
    forwardRef(() => AmlModule),
    forwardRef(() => PreOrderModule),
    forwardRef(() => SearchModule),
    forwardRef(() => ManufacturingModule),
    forwardRef(() => FinancialModule),
    forwardRef(() => RetailModule),
    forwardRef(() => CrmModule),
    forwardRef(() => WholesaleModule),
    forwardRef(() => EcommerceModule),
    forwardRef(() => ComplianceModule),
    forwardRef(() => ReportingModule),
    forwardRef(() => PlatformModule),
    forwardRef(() => ChatbotModule),
    forwardRef(() => BnplModule),
    forwardRef(() => DigitalGoldModule),
    forwardRef(() => StorefrontModule),
    forwardRef(() => CustomerPortalModule),
    forwardRef(() => RecommendationsModule),
    forwardRef(() => ArModule),
    forwardRef(() => B2cFeaturesModule),
    forwardRef(() => ExportModule),
    forwardRef(() => HardwareModule),
    forwardRef(() => IndiaModule),
  ],
  controllers: [TrpcController],
  providers: [TrpcService, TrpcRouter],
  exports: [TrpcService],
})
export class TrpcModule {}
