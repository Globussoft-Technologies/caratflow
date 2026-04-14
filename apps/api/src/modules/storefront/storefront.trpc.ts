// ─── Storefront tRPC Router ────────────────────────────────────
// Internal tRPC procedures mirroring the public REST API. The
// authenticated user id (ctx.userId) is treated as the customer id.
// `sessionId` is required as input where the underlying service uses
// guest-cart sessions.

import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { TrpcService } from '../../trpc/trpc.service';
import { StorefrontCatalogService } from './storefront.catalog.service';
import { StorefrontCartService } from './storefront.cart.service';
import { StorefrontWishlistService } from './storefront.wishlist.service';
import { StorefrontCheckoutService } from './storefront.checkout.service';
import { StorefrontOrderService } from './storefront.order.service';
import { StorefrontAddressService } from './storefront.address.service';
import { StorefrontReviewService } from './storefront.review.service';
import { StorefrontHomeService } from './storefront.home.service';
import { StorefrontCouponService } from './storefront.coupon.service';
import {
  ProductListInputSchema,
  CartItemInputSchema,
  AddressInputSchema,
  CheckoutInputSchema,
  ReviewInputSchema,
  ReviewListInputSchema,
  CouponValidationInputSchema,
  PaginationSchema,
} from '@caratflow/shared-types';

@Injectable()
export class StorefrontTrpcRouter {
  constructor(
    private readonly trpc: TrpcService,
    private readonly catalogService: StorefrontCatalogService,
    private readonly cartService: StorefrontCartService,
    private readonly wishlistService: StorefrontWishlistService,
    private readonly checkoutService: StorefrontCheckoutService,
    private readonly orderService: StorefrontOrderService,
    private readonly addressService: StorefrontAddressService,
    private readonly reviewService: StorefrontReviewService,
    private readonly homeService: StorefrontHomeService,
    private readonly couponService: StorefrontCouponService,
  ) {}

  get router() {
    const authed = this.trpc.authedProcedure;

    return this.trpc.router({
      // ─── Home ────────────────────────────────────────────
      home: authed.query(({ ctx }) =>
        this.homeService.getHomepageData(ctx.tenantId),
      ),

      // ─── Catalog ─────────────────────────────────────────
      catalog: this.trpc.router({
        list: authed
          .input(ProductListInputSchema)
          .query(({ ctx, input }) =>
            this.catalogService.getProducts(ctx.tenantId, input),
          ),

        getById: authed
          .input(z.object({ id: z.string().uuid() }))
          .query(({ ctx, input }) =>
            this.catalogService.getProductById(ctx.tenantId, input.id),
          ),

        search: authed
          .input(z.object({ query: z.string().min(1), limit: z.number().int().min(1).max(100).default(20) }))
          .query(({ ctx, input }) =>
            this.catalogService.searchProducts(ctx.tenantId, input.query, ctx.userId, input.limit),
          ),

        categories: authed.query(({ ctx }) =>
          this.catalogService.getCategories(ctx.tenantId),
        ),

        compare: authed
          .input(z.object({ productIds: z.array(z.string().uuid()).min(2).max(4) }))
          .query(({ ctx, input }) =>
            this.catalogService.compareProducts(ctx.tenantId, input.productIds),
          ),
      }),

      // ─── Cart ────────────────────────────────────────────
      cart: this.trpc.router({
        get: authed
          .input(z.object({ sessionId: z.string().min(1) }))
          .query(({ ctx, input }) =>
            this.cartService.getOrCreateCart(ctx.tenantId, ctx.userId, input.sessionId),
          ),

        addItem: authed
          .input(z.object({ sessionId: z.string().min(1) }).merge(CartItemInputSchema))
          .mutation(async ({ ctx, input }) => {
            const cart = await this.cartService.getOrCreateCart(
              ctx.tenantId, ctx.userId, input.sessionId,
            );
            return this.cartService.addItem(
              ctx.tenantId, cart.id, input.productId, input.quantity ?? 1,
            );
          }),

        updateItem: authed
          .input(z.object({
            sessionId: z.string().min(1),
            itemId: z.string().uuid(),
            quantity: z.number().int().min(1),
          }))
          .mutation(async ({ ctx, input }) => {
            const cart = await this.cartService.getOrCreateCart(
              ctx.tenantId, ctx.userId, input.sessionId,
            );
            return this.cartService.updateItemQuantity(
              ctx.tenantId, cart.id, input.itemId, input.quantity,
            );
          }),

        removeItem: authed
          .input(z.object({ sessionId: z.string().min(1), itemId: z.string().uuid() }))
          .mutation(async ({ ctx, input }) => {
            const cart = await this.cartService.getOrCreateCart(
              ctx.tenantId, ctx.userId, input.sessionId,
            );
            return this.cartService.removeItem(ctx.tenantId, cart.id, input.itemId);
          }),

        clear: authed
          .input(z.object({ sessionId: z.string().min(1) }))
          .mutation(async ({ ctx, input }) => {
            const cart = await this.cartService.getOrCreateCart(
              ctx.tenantId, ctx.userId, input.sessionId,
            );
            return this.cartService.clearCart(ctx.tenantId, cart.id);
          }),

        merge: authed
          .input(z.object({ sessionId: z.string().min(1) }))
          .mutation(({ ctx, input }) =>
            this.cartService.mergeGuestCart(ctx.tenantId, input.sessionId, ctx.userId),
          ),

        applyCoupon: authed
          .input(z.object({ sessionId: z.string().min(1), couponCode: z.string().min(1) }))
          .mutation(async ({ ctx, input }) => {
            const cart = await this.cartService.getOrCreateCart(
              ctx.tenantId, ctx.userId, input.sessionId,
            );
            return this.cartService.applyCoupon(
              ctx.tenantId, cart.id, input.couponCode, ctx.userId,
            );
          }),
      }),

      // ─── Wishlist ────────────────────────────────────────
      wishlist: this.trpc.router({
        add: authed
          .input(z.object({ productId: z.string().uuid() }))
          .mutation(({ ctx, input }) =>
            this.wishlistService.add(ctx.tenantId, ctx.userId, input.productId),
          ),

        get: authed.query(({ ctx }) =>
          this.wishlistService.getWishlist(ctx.tenantId, ctx.userId),
        ),

        remove: authed
          .input(z.object({ productId: z.string().uuid() }))
          .mutation(({ ctx, input }) =>
            this.wishlistService.remove(ctx.tenantId, ctx.userId, input.productId),
          ),

        enablePriceAlert: authed
          .input(z.object({ productId: z.string().uuid(), targetPricePaise: z.number().int().nonnegative() }))
          .mutation(({ ctx, input }) =>
            this.wishlistService.enablePriceAlert(
              ctx.tenantId, ctx.userId, input.productId, input.targetPricePaise,
            ),
          ),
      }),

      // ─── Checkout ────────────────────────────────────────
      checkout: this.trpc.router({
        initiate: authed
          .input(CheckoutInputSchema)
          .mutation(({ ctx, input }) =>
            this.checkoutService.initiateCheckout(ctx.tenantId, ctx.userId, input),
          ),

        complete: authed
          .input(z.object({
            orderId: z.string().uuid(),
            externalPaymentId: z.string().min(1),
            gatewayResponse: z.record(z.unknown()).optional(),
          }))
          .mutation(({ ctx, input }) =>
            this.checkoutService.completeCheckout(
              ctx.tenantId,
              ctx.userId,
              input.orderId,
              {
                externalPaymentId: input.externalPaymentId,
                gatewayResponse: input.gatewayResponse,
              },
            ),
          ),
      }),

      // ─── Orders ──────────────────────────────────────────
      orders: this.trpc.router({
        list: authed
          .input(PaginationSchema)
          .query(({ ctx, input }) =>
            this.orderService.getMyOrders(ctx.tenantId, ctx.userId, input),
          ),

        getById: authed
          .input(z.object({ id: z.string().uuid() }))
          .query(({ ctx, input }) =>
            this.orderService.getOrderById(ctx.tenantId, ctx.userId, input.id),
          ),

        requestReturn: authed
          .input(z.object({
            id: z.string().uuid(),
            items: z.array(z.object({
              orderItemId: z.string().uuid(),
              quantity: z.number().int().min(1),
              reason: z.string().min(1),
            })),
            reason: z.string().min(1),
          }))
          .mutation(({ ctx, input }) =>
            this.orderService.requestReturn(
              ctx.tenantId, ctx.userId, input.id, input.items, input.reason,
            ),
          ),

        cancel: authed
          .input(z.object({ id: z.string().uuid(), reason: z.string().min(1) }))
          .mutation(({ ctx, input }) =>
            this.checkoutService.cancelOrder(ctx.tenantId, ctx.userId, input.id, input.reason),
          ),

        reorder: authed
          .input(z.object({ id: z.string().uuid() }))
          .mutation(({ ctx, input }) =>
            this.orderService.reorder(ctx.tenantId, ctx.userId, input.id),
          ),
      }),

      // ─── Reviews ─────────────────────────────────────────
      reviews: this.trpc.router({
        submit: authed
          .input(ReviewInputSchema)
          .mutation(({ ctx, input }) =>
            this.reviewService.submitReview(ctx.tenantId, ctx.userId, input),
          ),

        list: authed
          .input(ReviewListInputSchema)
          .query(({ ctx, input }) =>
            this.reviewService.getReviews(ctx.tenantId, input),
          ),

        markHelpful: authed
          .input(z.object({ reviewId: z.string().uuid() }))
          .mutation(({ ctx, input }) =>
            this.reviewService.markHelpful(ctx.tenantId, input.reviewId),
          ),
      }),

      // ─── Addresses ───────────────────────────────────────
      addresses: this.trpc.router({
        list: authed.query(({ ctx }) =>
          this.addressService.listAddresses(ctx.tenantId, ctx.userId),
        ),

        get: authed
          .input(z.object({ id: z.string().uuid() }))
          .query(({ ctx, input }) =>
            this.addressService.getAddress(ctx.tenantId, ctx.userId, input.id),
          ),

        create: authed
          .input(AddressInputSchema)
          .mutation(({ ctx, input }) =>
            this.addressService.createAddress(ctx.tenantId, ctx.userId, input),
          ),

        update: authed
          .input(z.object({ id: z.string().uuid(), data: AddressInputSchema.partial() }))
          .mutation(({ ctx, input }) =>
            this.addressService.updateAddress(
              ctx.tenantId, ctx.userId, input.id, input.data as Record<string, unknown>,
            ),
          ),

        delete: authed
          .input(z.object({ id: z.string().uuid() }))
          .mutation(({ ctx, input }) =>
            this.addressService.deleteAddress(ctx.tenantId, ctx.userId, input.id),
          ),
      }),

      // ─── Coupons ─────────────────────────────────────────
      coupons: this.trpc.router({
        validate: authed
          .input(CouponValidationInputSchema)
          .mutation(({ ctx, input }) =>
            this.couponService.validateCoupon(
              ctx.tenantId, input.code, input.cartTotalPaise, ctx.userId,
            ),
          ),
      }),
    });
  }
}
