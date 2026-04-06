// ─── B2C Features REST Controller ───────────────────────────────
// Storefront-facing REST endpoints for wishlist, compare, coupon validation,
// and back-in-stock subscriptions.

import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Req,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { WishlistService } from './wishlist.service';
import { CompareService } from './compare.service';
import { CouponService } from './coupon.service';
import { BackInStockService } from './back-in-stock.service';

/**
 * Request with tenant and customer context from middleware.
 * In production, these are populated by TenantMiddleware + CustomerAuthGuard.
 */
interface StoreRequest {
  tenantId: string;
  customerId?: string;
  headers: Record<string, string | undefined>;
}

@Controller('api/v1/store')
export class B2cFeaturesController {
  constructor(
    private readonly wishlistService: WishlistService,
    private readonly compareService: CompareService,
    private readonly couponService: CouponService,
    private readonly backInStockService: BackInStockService,
  ) {}

  // ─── Wishlist ─────────────────────────────────────────────────

  @Get('wishlist')
  async getWishlist(@Req() req: StoreRequest) {
    this.requireCustomer(req);
    const items = await this.wishlistService.getWishlist(req.tenantId, req.customerId!);
    return { success: true, data: items };
  }

  @Get('wishlist/count')
  async getWishlistCount(@Req() req: StoreRequest) {
    this.requireCustomer(req);
    const count = await this.wishlistService.getWishlistCount(req.tenantId, req.customerId!);
    return { success: true, data: { count } };
  }

  @Post('wishlist')
  @HttpCode(HttpStatus.CREATED)
  async addToWishlist(
    @Req() req: StoreRequest,
    @Body() body: { productId: string },
  ) {
    this.requireCustomer(req);
    const item = await this.wishlistService.addToWishlist(
      req.tenantId,
      req.customerId!,
      body.productId,
    );
    return { success: true, data: item };
  }

  @Delete('wishlist/:productId')
  async removeFromWishlist(
    @Req() req: StoreRequest,
    @Param('productId') productId: string,
  ) {
    this.requireCustomer(req);
    await this.wishlistService.removeFromWishlist(req.tenantId, req.customerId!, productId);
    return { success: true };
  }

  @Post('wishlist/:productId/price-alert')
  async enablePriceAlert(
    @Req() req: StoreRequest,
    @Param('productId') productId: string,
    @Body() body: { thresholdPaise: number },
  ) {
    this.requireCustomer(req);
    const result = await this.wishlistService.enablePriceAlert(
      req.tenantId,
      req.customerId!,
      productId,
      body.thresholdPaise,
    );
    return { success: true, data: result };
  }

  @Delete('wishlist/:productId/price-alert')
  async disablePriceAlert(
    @Req() req: StoreRequest,
    @Param('productId') productId: string,
  ) {
    this.requireCustomer(req);
    await this.wishlistService.disablePriceAlert(req.tenantId, req.customerId!, productId);
    return { success: true };
  }

  // ─── Compare ──────────────────────────────────────────────────

  @Get('compare')
  async getCompareList(
    @Req() req: StoreRequest,
    @Query('sessionId') sessionId?: string,
  ) {
    const list = await this.compareService.getCompareList(
      req.tenantId,
      req.customerId,
      sessionId,
    );
    return { success: true, data: list };
  }

  @Post('compare')
  @HttpCode(HttpStatus.CREATED)
  async addToCompare(
    @Req() req: StoreRequest,
    @Body() body: { productId: string; sessionId?: string },
  ) {
    const result = await this.compareService.addToCompare(
      req.tenantId,
      body.productId,
      req.customerId,
      body.sessionId,
    );
    return { success: true, data: result };
  }

  @Delete('compare/:productId')
  async removeFromCompare(
    @Req() req: StoreRequest,
    @Param('productId') productId: string,
    @Query('sessionId') sessionId?: string,
  ) {
    const result = await this.compareService.removeFromCompare(
      req.tenantId,
      productId,
      req.customerId,
      sessionId,
    );
    return { success: true, data: result };
  }

  @Delete('compare')
  async clearCompare(
    @Req() req: StoreRequest,
    @Query('sessionId') sessionId?: string,
  ) {
    await this.compareService.clearCompare(req.tenantId, req.customerId, sessionId);
    return { success: true };
  }

  // ─── Coupons ──────────────────────────────────────────────────

  @Post('coupons/validate')
  async validateCoupon(
    @Req() req: StoreRequest,
    @Body() body: {
      code: string;
      cartTotalPaise: number;
      cartItems: Array<{
        productId: string;
        categoryId?: string;
        pricePaise: number;
        quantity: number;
      }>;
    },
  ) {
    this.requireCustomer(req);
    const result = await this.couponService.validateCoupon(
      req.tenantId,
      req.customerId!,
      {
        code: body.code.toUpperCase(),
        cartTotalPaise: body.cartTotalPaise,
        cartItems: body.cartItems,
      },
    );
    return { success: true, data: result };
  }

  @Post('coupons/auto-apply')
  async getAutoApplyCoupon(
    @Req() req: StoreRequest,
    @Body() body: {
      cartTotalPaise: number;
      cartItems: Array<{
        productId: string;
        categoryId?: string;
        pricePaise: number;
        quantity: number;
      }>;
    },
  ) {
    this.requireCustomer(req);
    const result = await this.couponService.getAutoApplyCoupons(
      req.tenantId,
      req.customerId!,
      body.cartTotalPaise,
      body.cartItems,
    );
    return { success: true, data: result };
  }

  // ─── Back In Stock ────────────────────────────────────────────

  @Post('back-in-stock/subscribe')
  @HttpCode(HttpStatus.CREATED)
  async subscribeBackInStock(
    @Req() req: StoreRequest,
    @Body() body: { productId: string; email: string },
  ) {
    const result = await this.backInStockService.subscribe(
      req.tenantId,
      body.productId,
      body.email,
      req.customerId,
    );
    return { success: true, data: result };
  }

  @Delete('back-in-stock/:alertId')
  async unsubscribeBackInStock(
    @Req() req: StoreRequest,
    @Param('alertId') alertId: string,
  ) {
    await this.backInStockService.unsubscribe(req.tenantId, alertId);
    return { success: true };
  }

  @Get('back-in-stock')
  async getBackInStockSubscriptions(@Req() req: StoreRequest) {
    this.requireCustomer(req);
    const items = await this.backInStockService.getSubscriptions(
      req.tenantId,
      req.customerId!,
    );
    return { success: true, data: items };
  }

  // ─── Helpers ──────────────────────────────────────────────────

  private requireCustomer(req: StoreRequest): asserts req is StoreRequest & { customerId: string } {
    if (!req.customerId) {
      throw new BadRequestException('Customer authentication required');
    }
  }
}
