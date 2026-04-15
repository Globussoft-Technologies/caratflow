import { Injectable } from '@nestjs/common';
import { TrpcService } from './trpc.service';
import { InventoryTrpcRouter } from '../modules/inventory/inventory.trpc';
import { CmsTrpcRouter } from '../modules/cms/cms.trpc';
import { ReferralTrpcRouter } from '../modules/referral/referral.trpc';
import { AmlTrpcRouter } from '../modules/aml/aml.trpc';
import { PreOrderTrpcRouter } from '../modules/preorder/preorder.trpc';
import { SearchTrpcRouter } from '../modules/search/search.trpc';
import { ManufacturingTrpc } from '../modules/manufacturing/manufacturing.trpc';
import { FinancialTrpcRouter } from '../modules/financial/financial.trpc';
import { RetailTrpcRouter } from '../modules/retail/retail.trpc';
import { CrmTrpcRouter } from '../modules/crm/crm.trpc';
import { WholesaleTrpcRouter } from '../modules/wholesale/wholesale.trpc';
import { EcommerceTrpcRouter } from '../modules/ecommerce/ecommerce.trpc';
import { ComplianceTrpcRouter } from '../modules/compliance/compliance.trpc';
import { ReportingTrpcRouter } from '../modules/reporting/reporting.trpc';
import { PlatformTrpc } from '../modules/platform/platform.trpc';
import { ChatbotTrpcRouter } from '../modules/chatbot/chatbot.trpc';
import { BnplTrpcRouter } from '../modules/bnpl/bnpl.trpc';
import { DigitalGoldTrpcRouter } from '../modules/digital-gold/digital-gold.trpc';
import { StorefrontTrpcRouter } from '../modules/storefront/storefront.trpc';
import { CustomerPortalTrpcRouter } from '../modules/customer-portal/customer-portal.trpc';
import { RecommendationsTrpcRouter } from '../modules/recommendations/recommendations.trpc';
import { ArTrpcRouter } from '../modules/ar/ar.trpc';
import { B2cFeaturesTrpcRouter } from '../modules/b2c-features/b2c-features.trpc';
import { ExportTrpcRouter } from '../modules/export/export.trpc';
import { HardwareTrpcRouter } from '../modules/hardware/hardware.trpc';
import { IndiaTrpcRouter } from '../modules/india/india.trpc';
import { PayrollTrpcRouter } from '../modules/payroll/payroll.trpc';

@Injectable()
export class TrpcRouter {
  constructor(
    private readonly trpc: TrpcService,
    private readonly inventoryTrpc: InventoryTrpcRouter,
    private readonly cmsTrpc: CmsTrpcRouter,
    private readonly referralTrpc: ReferralTrpcRouter,
    private readonly amlTrpc: AmlTrpcRouter,
    private readonly preOrderTrpc: PreOrderTrpcRouter,
    private readonly searchTrpc: SearchTrpcRouter,
    private readonly manufacturingTrpc: ManufacturingTrpc,
    private readonly financialTrpc: FinancialTrpcRouter,
    private readonly retailTrpc: RetailTrpcRouter,
    private readonly crmTrpc: CrmTrpcRouter,
    private readonly wholesaleTrpc: WholesaleTrpcRouter,
    private readonly ecommerceTrpc: EcommerceTrpcRouter,
    private readonly complianceTrpc: ComplianceTrpcRouter,
    private readonly reportingTrpc: ReportingTrpcRouter,
    private readonly platformTrpc: PlatformTrpc,
    private readonly chatbotTrpc: ChatbotTrpcRouter,
    private readonly bnplTrpc: BnplTrpcRouter,
    private readonly digitalGoldTrpc: DigitalGoldTrpcRouter,
    private readonly storefrontTrpc: StorefrontTrpcRouter,
    private readonly customerPortalTrpc: CustomerPortalTrpcRouter,
    private readonly recommendationsTrpc: RecommendationsTrpcRouter,
    private readonly arTrpc: ArTrpcRouter,
    private readonly b2cFeaturesTrpc: B2cFeaturesTrpcRouter,
    private readonly exportTrpc: ExportTrpcRouter,
    private readonly hardwareTrpc: HardwareTrpcRouter,
    private readonly indiaTrpc: IndiaTrpcRouter,
    private readonly payrollTrpc: PayrollTrpcRouter,
  ) {}

  get appRouter() {
    return this.trpc.router({
      // Health check
      health: this.trpc.procedure.query(() => ({
        status: 'ok',
        timestamp: new Date().toISOString(),
      })),

      // Domain modules
      inventory: this.inventoryTrpc.router,
      cms: this.cmsTrpc.router,
      referral: this.referralTrpc.router,
      aml: this.amlTrpc.router,
      preorder: this.preOrderTrpc.router,
      search: this.searchTrpc.router,
      manufacturing: this.manufacturingTrpc.router,
      financial: this.financialTrpc.router,
      retail: this.retailTrpc.router,
      crm: this.crmTrpc.router,
      wholesale: this.wholesaleTrpc.router,
      ecommerce: this.ecommerceTrpc.router,
      compliance: this.complianceTrpc.router,
      reporting: this.reportingTrpc.router,
      platform: this.platformTrpc.router,
      chatbot: this.chatbotTrpc.router,
      bnpl: this.bnplTrpc.router,
      digitalGold: this.digitalGoldTrpc.router,
      storefront: this.storefrontTrpc.router,
      customerPortal: this.customerPortalTrpc.router,
      recommendations: this.recommendationsTrpc.router,
      ar: this.arTrpc.router,
      b2cFeatures: this.b2cFeaturesTrpc.router,
      export: this.exportTrpc.router,
      hardware: this.hardwareTrpc.router,
      india: this.indiaTrpc.router,
      payroll: this.payrollTrpc.router,
    });
  }
}

export type AppRouter = TrpcRouter['appRouter'];
