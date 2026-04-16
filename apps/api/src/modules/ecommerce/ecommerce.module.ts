// ─── E-Commerce Module ─────────────────────────────────────────
// Online orders, product catalog sync, sales channels, shipping,
// payment gateways, webhooks, reviews, click & collect.

import { Module } from '@nestjs/common';
import { EcommerceService } from './ecommerce.service';
import { EcommerceCatalogService } from './ecommerce.catalog.service';
import { EcommerceShopifyService } from './ecommerce.shopify.service';
import { EcommercePaymentService } from './ecommerce.payment.service';
import { EcommerceShippingService } from './ecommerce.shipping.service';
import { EcommerceWebhookService } from './ecommerce.webhook.service';
import { EcommerceClickCollectService } from './ecommerce.click-collect.service';
import { EcommerceTrpcRouter } from './ecommerce.trpc';
import { EcommerceEventHandler } from './ecommerce.event-handler';
import { RazorpayWebhookController } from './razorpay.webhook.controller';
import { IndiaModule } from '../india/india.module';

@Module({
  imports: [IndiaModule],
  controllers: [RazorpayWebhookController],
  providers: [
    EcommerceService,
    EcommerceCatalogService,
    EcommerceShopifyService,
    EcommercePaymentService,
    EcommerceShippingService,
    EcommerceWebhookService,
    EcommerceClickCollectService,
    EcommerceTrpcRouter,
    EcommerceEventHandler,
  ],
  exports: [
    EcommerceService,
    EcommerceCatalogService,
    EcommerceShopifyService,
    EcommercePaymentService,
    EcommerceShippingService,
    EcommerceWebhookService,
    EcommerceClickCollectService,
    EcommerceTrpcRouter,
  ],
})
export class EcommerceModule {}
