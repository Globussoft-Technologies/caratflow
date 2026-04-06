// ─── B2C Features Module ────────────────────────────────────────
// Wishlist, Product Comparison, Coupon Codes, Abandoned Cart Recovery,
// Back-in-Stock Alerts.

import { Module } from '@nestjs/common';
import { WishlistService } from './wishlist.service';
import { CompareService } from './compare.service';
import { CouponService } from './coupon.service';
import { AbandonedCartService } from './abandoned-cart.service';
import { BackInStockService } from './back-in-stock.service';
import { B2cFeaturesController } from './b2c-features.controller';
import { B2cFeaturesTrpcRouter } from './b2c-features.trpc';
import { B2cFeaturesEventHandler } from './b2c-features.event-handler';

@Module({
  controllers: [B2cFeaturesController],
  providers: [
    WishlistService,
    CompareService,
    CouponService,
    AbandonedCartService,
    BackInStockService,
    B2cFeaturesTrpcRouter,
    B2cFeaturesEventHandler,
  ],
  exports: [
    WishlistService,
    CompareService,
    CouponService,
    AbandonedCartService,
    BackInStockService,
    B2cFeaturesTrpcRouter,
  ],
})
export class B2cFeaturesModule {}
