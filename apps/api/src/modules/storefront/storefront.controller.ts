// ─── Storefront REST Controller ────────────────────────────────
// Public-facing B2C API at /api/v1/store/*
// Consumed by the storefront website and customer mobile app.
// No tRPC -- this is pure REST with Swagger docs.

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  Req,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import type { ApiResponse, Pagination } from '@caratflow/shared-types';
import type {
  CatalogProductResponse,
  CartResponse,
  WishlistResponse,
  AddressResponse,
  OrderResponse,
  ReviewResponse,
  StorefrontHomeResponse,
  ProductCompareResponse,
  CouponValidationResult,
  CouponCodeResponse,
} from '@caratflow/shared-types';
import type { PaginatedResult } from '@caratflow/shared-types';
import { StorefrontCatalogService } from './storefront.catalog.service';
import { StorefrontCartService } from './storefront.cart.service';
import { StorefrontWishlistService } from './storefront.wishlist.service';
import { StorefrontCheckoutService } from './storefront.checkout.service';
import { StorefrontOrderService } from './storefront.order.service';
import { StorefrontAddressService } from './storefront.address.service';
import { StorefrontReviewService } from './storefront.review.service';
import { StorefrontHomeService } from './storefront.home.service';
import { StorefrontCouponService } from './storefront.coupon.service';

/**
 * Extract tenant/customer context from request headers.
 * In production, a middleware or guard would validate JWT and inject these.
 */
interface StorefrontContext {
  tenantId: string;
  customerId: string | null;
  sessionId: string;
}

function extractContext(headers: Record<string, string | undefined>): StorefrontContext {
  const tenantId = headers['x-tenant-id'];
  if (!tenantId) throw new BadRequestException('Missing x-tenant-id header');

  return {
    tenantId,
    customerId: headers['x-customer-id'] ?? null,
    sessionId: headers['x-session-id'] ?? `sess-${Date.now()}`,
  };
}

function success<T>(data: T): ApiResponse<T> {
  return { success: true, data };
}

@Controller('api/v1/store')
export class StorefrontController {
  constructor(
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

  // ─── Home ───────────────────────────────────────────────────────

  @Get('home')
  async getHome(
    @Headers() headers: Record<string, string | undefined>,
  ): Promise<ApiResponse<StorefrontHomeResponse>> {
    const ctx = extractContext(headers);
    const data = await this.homeService.getHomepageData(ctx.tenantId);
    return success(data);
  }

  // ─── Products / Catalog ─────────────────────────────────────────

  @Get('products')
  async getProducts(
    @Headers() headers: Record<string, string | undefined>,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
    @Query('categoryId') categoryId?: string,
    @Query('productType') productType?: string,
    @Query('metalPurity') metalPurity?: string,
    @Query('priceMinPaise') priceMinPaise?: string,
    @Query('priceMaxPaise') priceMaxPaise?: string,
    @Query('weightMinMg') weightMinMg?: string,
    @Query('weightMaxMg') weightMaxMg?: string,
    @Query('search') search?: string,
  ): Promise<ApiResponse<PaginatedResult<CatalogProductResponse>>> {
    const ctx = extractContext(headers);
    const data = await this.catalogService.getProducts(ctx.tenantId, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      sortBy: sortBy ?? 'createdAt',
      sortOrder: (sortOrder as 'asc' | 'desc') ?? 'desc',
      categoryId,
      productType: productType as 'GOLD' | 'SILVER' | 'PLATINUM' | 'DIAMOND' | 'GEMSTONE' | 'KUNDAN' | 'OTHER' | undefined,
      metalPurity: metalPurity ? parseInt(metalPurity, 10) : undefined,
      priceMinPaise: priceMinPaise ? parseInt(priceMinPaise, 10) : undefined,
      priceMaxPaise: priceMaxPaise ? parseInt(priceMaxPaise, 10) : undefined,
      weightMinMg: weightMinMg ? parseInt(weightMinMg, 10) : undefined,
      weightMaxMg: weightMaxMg ? parseInt(weightMaxMg, 10) : undefined,
      search,
    });
    return success(data);
  }

  @Get('products/:id')
  async getProductById(
    @Headers() headers: Record<string, string | undefined>,
    @Param('id') id: string,
  ): Promise<ApiResponse<CatalogProductResponse>> {
    const ctx = extractContext(headers);
    const data = await this.catalogService.getProductById(ctx.tenantId, id);
    return success(data);
  }

  @Get('products/search')
  async searchProducts(
    @Headers() headers: Record<string, string | undefined>,
    @Query('q') query: string,
    @Query('limit') limit?: string,
  ): Promise<ApiResponse<CatalogProductResponse[]>> {
    const ctx = extractContext(headers);
    if (!query) throw new BadRequestException('Search query is required');
    const data = await this.catalogService.searchProducts(
      ctx.tenantId,
      query,
      ctx.customerId,
      limit ? parseInt(limit, 10) : 20,
    );
    return success(data);
  }

  @Get('categories')
  async getCategories(
    @Headers() headers: Record<string, string | undefined>,
  ): Promise<ApiResponse<unknown>> {
    const ctx = extractContext(headers);
    const data = await this.catalogService.getCategories(ctx.tenantId);
    return success(data);
  }

  @Get('compare')
  async compareProducts(
    @Headers() headers: Record<string, string | undefined>,
    @Query('ids') ids: string,
  ): Promise<ApiResponse<ProductCompareResponse>> {
    const ctx = extractContext(headers);
    if (!ids) throw new BadRequestException('Product ids are required');
    const productIds = ids.split(',').map((id) => id.trim());
    if (productIds.length < 2 || productIds.length > 4) {
      throw new BadRequestException('Provide 2 to 4 product IDs');
    }
    const data = await this.catalogService.compareProducts(ctx.tenantId, productIds);
    return success(data);
  }

  // ─── Cart ───────────────────────────────────────────────────────

  @Get('cart')
  async getCart(
    @Headers() headers: Record<string, string | undefined>,
  ): Promise<ApiResponse<CartResponse>> {
    const ctx = extractContext(headers);
    const data = await this.cartService.getOrCreateCart(
      ctx.tenantId,
      ctx.customerId,
      ctx.sessionId,
    );
    return success(data);
  }

  @Post('cart/items')
  async addCartItem(
    @Headers() headers: Record<string, string | undefined>,
    @Body() body: { productId: string; quantity?: number },
  ): Promise<ApiResponse<CartResponse>> {
    const ctx = extractContext(headers);
    const cart = await this.cartService.getOrCreateCart(
      ctx.tenantId,
      ctx.customerId,
      ctx.sessionId,
    );
    const data = await this.cartService.addItem(
      ctx.tenantId,
      cart.id,
      body.productId,
      body.quantity ?? 1,
    );
    return success(data);
  }

  @Put('cart/items/:itemId')
  async updateCartItem(
    @Headers() headers: Record<string, string | undefined>,
    @Param('itemId') itemId: string,
    @Body() body: { quantity: number },
  ): Promise<ApiResponse<CartResponse>> {
    const ctx = extractContext(headers);
    const cart = await this.cartService.getOrCreateCart(
      ctx.tenantId,
      ctx.customerId,
      ctx.sessionId,
    );
    const data = await this.cartService.updateItemQuantity(
      ctx.tenantId,
      cart.id,
      itemId,
      body.quantity,
    );
    return success(data);
  }

  @Delete('cart/items/:itemId')
  async removeCartItem(
    @Headers() headers: Record<string, string | undefined>,
    @Param('itemId') itemId: string,
  ): Promise<ApiResponse<CartResponse>> {
    const ctx = extractContext(headers);
    const cart = await this.cartService.getOrCreateCart(
      ctx.tenantId,
      ctx.customerId,
      ctx.sessionId,
    );
    const data = await this.cartService.removeItem(ctx.tenantId, cart.id, itemId);
    return success(data);
  }

  @Delete('cart')
  async clearCart(
    @Headers() headers: Record<string, string | undefined>,
  ): Promise<ApiResponse<CartResponse>> {
    const ctx = extractContext(headers);
    const cart = await this.cartService.getOrCreateCart(
      ctx.tenantId,
      ctx.customerId,
      ctx.sessionId,
    );
    const data = await this.cartService.clearCart(ctx.tenantId, cart.id);
    return success(data);
  }

  @Post('cart/merge')
  async mergeGuestCart(
    @Headers() headers: Record<string, string | undefined>,
  ): Promise<ApiResponse<CartResponse>> {
    const ctx = extractContext(headers);
    if (!ctx.customerId) throw new BadRequestException('Customer login required');
    const data = await this.cartService.mergeGuestCart(
      ctx.tenantId,
      ctx.sessionId,
      ctx.customerId,
    );
    return success(data);
  }

  @Post('cart/coupon')
  async applyCoupon(
    @Headers() headers: Record<string, string | undefined>,
    @Body() body: { couponCode: string },
  ): Promise<ApiResponse<CartResponse>> {
    const ctx = extractContext(headers);
    const cart = await this.cartService.getOrCreateCart(
      ctx.tenantId,
      ctx.customerId,
      ctx.sessionId,
    );
    const data = await this.cartService.applyCoupon(
      ctx.tenantId,
      cart.id,
      body.couponCode,
      ctx.customerId,
    );
    return success(data);
  }

  // ─── Wishlist ───────────────────────────────────────────────────

  @Post('wishlist')
  @HttpCode(HttpStatus.CREATED)
  async addToWishlist(
    @Headers() headers: Record<string, string | undefined>,
    @Body() body: { productId: string },
  ): Promise<ApiResponse<null>> {
    const ctx = extractContext(headers);
    if (!ctx.customerId) throw new BadRequestException('Customer login required');
    await this.wishlistService.add(ctx.tenantId, ctx.customerId, body.productId);
    return success(null);
  }

  @Get('wishlist')
  async getWishlist(
    @Headers() headers: Record<string, string | undefined>,
  ): Promise<ApiResponse<WishlistResponse>> {
    const ctx = extractContext(headers);
    if (!ctx.customerId) throw new BadRequestException('Customer login required');
    const data = await this.wishlistService.getWishlist(ctx.tenantId, ctx.customerId);
    return success(data);
  }

  @Delete('wishlist/:productId')
  async removeFromWishlist(
    @Headers() headers: Record<string, string | undefined>,
    @Param('productId') productId: string,
  ): Promise<ApiResponse<null>> {
    const ctx = extractContext(headers);
    if (!ctx.customerId) throw new BadRequestException('Customer login required');
    await this.wishlistService.remove(ctx.tenantId, ctx.customerId, productId);
    return success(null);
  }

  @Post('wishlist/:productId/price-alert')
  async enablePriceAlert(
    @Headers() headers: Record<string, string | undefined>,
    @Param('productId') productId: string,
    @Body() body: { targetPricePaise: number },
  ): Promise<ApiResponse<null>> {
    const ctx = extractContext(headers);
    if (!ctx.customerId) throw new BadRequestException('Customer login required');
    await this.wishlistService.enablePriceAlert(
      ctx.tenantId,
      ctx.customerId,
      productId,
      body.targetPricePaise,
    );
    return success(null);
  }

  // ─── Checkout ───────────────────────────────────────────────────

  @Post('checkout')
  async initiateCheckout(
    @Headers() headers: Record<string, string | undefined>,
    @Body() body: { cartId: string; addressId: string; paymentMethod: string; couponCode?: string },
  ): Promise<ApiResponse<OrderResponse>> {
    const ctx = extractContext(headers);
    if (!ctx.customerId) throw new BadRequestException('Customer login required');
    const data = await this.checkoutService.initiateCheckout(ctx.tenantId, ctx.customerId, {
      cartId: body.cartId,
      addressId: body.addressId,
      paymentMethod: body.paymentMethod,
      couponCode: body.couponCode,
    });
    return success(data);
  }

  @Post('checkout/:orderId/complete')
  async completeCheckout(
    @Headers() headers: Record<string, string | undefined>,
    @Param('orderId') orderId: string,
    @Body() body: { externalPaymentId: string; gatewayResponse?: Record<string, unknown> },
  ): Promise<ApiResponse<OrderResponse>> {
    const ctx = extractContext(headers);
    if (!ctx.customerId) throw new BadRequestException('Customer login required');
    const data = await this.checkoutService.completeCheckout(
      ctx.tenantId,
      ctx.customerId,
      orderId,
      body,
    );
    return success(data);
  }

  // ─── Orders ─────────────────────────────────────────────────────

  @Get('orders')
  async getMyOrders(
    @Headers() headers: Record<string, string | undefined>,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<ApiResponse<PaginatedResult<OrderResponse>>> {
    const ctx = extractContext(headers);
    if (!ctx.customerId) throw new BadRequestException('Customer login required');
    const pagination: Pagination = {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      sortOrder: 'desc',
    };
    const data = await this.orderService.getMyOrders(ctx.tenantId, ctx.customerId, pagination);
    return success(data);
  }

  @Get('orders/:id')
  async getOrderById(
    @Headers() headers: Record<string, string | undefined>,
    @Param('id') id: string,
  ): Promise<ApiResponse<OrderResponse>> {
    const ctx = extractContext(headers);
    if (!ctx.customerId) throw new BadRequestException('Customer login required');
    const data = await this.orderService.getOrderById(ctx.tenantId, ctx.customerId, id);
    return success(data);
  }

  @Post('orders/:id/return')
  async requestReturn(
    @Headers() headers: Record<string, string | undefined>,
    @Param('id') id: string,
    @Body() body: {
      items: Array<{ orderItemId: string; quantity: number; reason: string }>;
      reason: string;
    },
  ): Promise<ApiResponse<null>> {
    const ctx = extractContext(headers);
    if (!ctx.customerId) throw new BadRequestException('Customer login required');
    await this.orderService.requestReturn(
      ctx.tenantId,
      ctx.customerId,
      id,
      body.items,
      body.reason,
    );
    return success(null);
  }

  @Post('orders/:id/cancel')
  async cancelOrder(
    @Headers() headers: Record<string, string | undefined>,
    @Param('id') id: string,
    @Body() body: { reason: string },
  ): Promise<ApiResponse<OrderResponse>> {
    const ctx = extractContext(headers);
    if (!ctx.customerId) throw new BadRequestException('Customer login required');
    const data = await this.checkoutService.cancelOrder(
      ctx.tenantId,
      ctx.customerId,
      id,
      body.reason,
    );
    return success(data);
  }

  @Post('orders/:id/reorder')
  async reorder(
    @Headers() headers: Record<string, string | undefined>,
    @Param('id') id: string,
  ): Promise<ApiResponse<{ cartId: string }>> {
    const ctx = extractContext(headers);
    if (!ctx.customerId) throw new BadRequestException('Customer login required');
    const cartId = await this.orderService.reorder(ctx.tenantId, ctx.customerId, id);
    return success({ cartId });
  }

  // ─── Reviews ────────────────────────────────────────────────────

  @Post('reviews')
  @HttpCode(HttpStatus.CREATED)
  async submitReview(
    @Headers() headers: Record<string, string | undefined>,
    @Body() body: { productId: string; rating: number; title?: string; body?: string; images?: string[] },
  ): Promise<ApiResponse<ReviewResponse>> {
    const ctx = extractContext(headers);
    if (!ctx.customerId) throw new BadRequestException('Customer login required');
    const data = await this.reviewService.submitReview(ctx.tenantId, ctx.customerId, {
      productId: body.productId,
      rating: body.rating,
      title: body.title,
      body: body.body,
      images: body.images,
    });
    return success(data);
  }

  @Get('reviews/:productId')
  async getReviews(
    @Headers() headers: Record<string, string | undefined>,
    @Param('productId') productId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
  ): Promise<ApiResponse<PaginatedResult<ReviewResponse>>> {
    const ctx = extractContext(headers);
    const data = await this.reviewService.getReviews(ctx.tenantId, {
      productId,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      sortBy: (sortBy as 'createdAt' | 'rating' | 'helpfulCount') ?? 'createdAt',
      sortOrder: (sortOrder as 'asc' | 'desc') ?? 'desc',
    });
    return success(data);
  }

  @Post('reviews/:reviewId/helpful')
  @HttpCode(HttpStatus.NO_CONTENT)
  async markReviewHelpful(
    @Headers() headers: Record<string, string | undefined>,
    @Param('reviewId') reviewId: string,
  ): Promise<void> {
    const ctx = extractContext(headers);
    await this.reviewService.markHelpful(ctx.tenantId, reviewId);
  }

  // ─── Addresses ──────────────────────────────────────────────────

  @Get('addresses')
  async listAddresses(
    @Headers() headers: Record<string, string | undefined>,
  ): Promise<ApiResponse<AddressResponse[]>> {
    const ctx = extractContext(headers);
    if (!ctx.customerId) throw new BadRequestException('Customer login required');
    const data = await this.addressService.listAddresses(ctx.tenantId, ctx.customerId);
    return success(data);
  }

  @Get('addresses/:id')
  async getAddress(
    @Headers() headers: Record<string, string | undefined>,
    @Param('id') id: string,
  ): Promise<ApiResponse<AddressResponse>> {
    const ctx = extractContext(headers);
    if (!ctx.customerId) throw new BadRequestException('Customer login required');
    const data = await this.addressService.getAddress(ctx.tenantId, ctx.customerId, id);
    return success(data);
  }

  @Post('addresses')
  @HttpCode(HttpStatus.CREATED)
  async createAddress(
    @Headers() headers: Record<string, string | undefined>,
    @Body() body: {
      label?: string;
      firstName: string;
      lastName: string;
      phone: string;
      addressLine1: string;
      addressLine2?: string;
      city: string;
      state: string;
      country: string;
      postalCode: string;
      isDefault?: boolean;
    },
  ): Promise<ApiResponse<AddressResponse>> {
    const ctx = extractContext(headers);
    if (!ctx.customerId) throw new BadRequestException('Customer login required');
    const data = await this.addressService.createAddress(ctx.tenantId, ctx.customerId, {
      ...body,
      label: body.label ?? '',
      isDefault: body.isDefault ?? false,
    });
    return success(data);
  }

  @Put('addresses/:id')
  async updateAddress(
    @Headers() headers: Record<string, string | undefined>,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ): Promise<ApiResponse<AddressResponse>> {
    const ctx = extractContext(headers);
    if (!ctx.customerId) throw new BadRequestException('Customer login required');
    const data = await this.addressService.updateAddress(
      ctx.tenantId,
      ctx.customerId,
      id,
      body as Record<string, unknown>,
    );
    return success(data);
  }

  @Delete('addresses/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAddress(
    @Headers() headers: Record<string, string | undefined>,
    @Param('id') id: string,
  ): Promise<void> {
    const ctx = extractContext(headers);
    if (!ctx.customerId) throw new BadRequestException('Customer login required');
    await this.addressService.deleteAddress(ctx.tenantId, ctx.customerId, id);
  }

  // ─── Coupons ────────────────────────────────────────────────────

  @Post('coupons/validate')
  async validateCoupon(
    @Headers() headers: Record<string, string | undefined>,
    @Body() body: { code: string; cartTotalPaise: number },
  ): Promise<ApiResponse<CouponValidationResult>> {
    const ctx = extractContext(headers);
    const data = await this.couponService.validateCoupon(
      ctx.tenantId,
      body.code,
      body.cartTotalPaise,
      ctx.customerId,
    );
    return success(data);
  }
}
