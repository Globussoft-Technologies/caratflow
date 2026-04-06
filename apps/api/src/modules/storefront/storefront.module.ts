// ─── Storefront Module ─────────────────────────────────────────
// B2C public-facing API: product catalog, cart, wishlist, checkout,
// orders, reviews, addresses, coupons, abandoned cart recovery.

import { Module } from '@nestjs/common';
import { StorefrontController } from './storefront.controller';
import { StorefrontCatalogService } from './storefront.catalog.service';
import { StorefrontPricingService } from './storefront.pricing.service';
import { StorefrontCartService } from './storefront.cart.service';
import { StorefrontWishlistService } from './storefront.wishlist.service';
import { StorefrontCheckoutService } from './storefront.checkout.service';
import { StorefrontOrderService } from './storefront.order.service';
import { StorefrontAddressService } from './storefront.address.service';
import { StorefrontReviewService } from './storefront.review.service';
import { StorefrontAbandonedCartService } from './storefront.abandoned-cart.service';
import { StorefrontHomeService } from './storefront.home.service';
import { StorefrontCouponService } from './storefront.coupon.service';
import { StorefrontEventHandler } from './storefront.event-handler';

@Module({
  controllers: [StorefrontController],
  providers: [
    StorefrontCatalogService,
    StorefrontPricingService,
    StorefrontCartService,
    StorefrontWishlistService,
    StorefrontCheckoutService,
    StorefrontOrderService,
    StorefrontAddressService,
    StorefrontReviewService,
    StorefrontAbandonedCartService,
    StorefrontHomeService,
    StorefrontCouponService,
    StorefrontEventHandler,
  ],
  exports: [
    StorefrontCatalogService,
    StorefrontPricingService,
    StorefrontCartService,
    StorefrontWishlistService,
    StorefrontCheckoutService,
    StorefrontOrderService,
    StorefrontAddressService,
    StorefrontReviewService,
    StorefrontAbandonedCartService,
    StorefrontHomeService,
    StorefrontCouponService,
  ],
})
export class StorefrontModule {}
