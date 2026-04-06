// ─── Storefront Pricing Service ────────────────────────────────
// Live pricing engine for B2C: calculates product prices from
// current metal rates, making charges, wastage, and GST.

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { TenantAwareService } from '../../common/base.service';

/** GST rate for jewelry (HSN 7113) = 3%, stored as basis points (300) */
const JEWELRY_GST_RATE_BPS = 300;
/** Basis-points divisor: 10000 bps = 100% */
const BPS_DIVISOR = 10_000;
/** Wastage percent divisor: stored as integer percent * 100 internally */
const WASTAGE_DIVISOR = 100;

interface MetalRate {
  metalType: string;
  purity: number;
  ratePaisePer10g: number;
}

export interface ProductPriceBreakdown {
  metalValuePaise: number;
  makingValuePaise: number;
  wastageValuePaise: number;
  subtotalPaise: number;
  gstPaise: number;
  totalPricePaise: number;
}

export interface CartPricingSummary {
  subtotalPaise: number;
  discountPaise: number;
  taxPaise: number;
  totalPaise: number;
  itemPrices: Array<{
    cartItemId: string;
    productId: string;
    unitPricePaise: number;
    lineTotalPaise: number;
  }>;
}

@Injectable()
export class StorefrontPricingService extends TenantAwareService {
  private readonly logger = new Logger(StorefrontPricingService.name);

  /** In-memory rate cache; refreshed by event handler on india.rates.updated */
  private rateCache = new Map<string, { rate: MetalRate; fetchedAt: number }>();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  constructor(prisma: PrismaService) {
    super(prisma);
  }

  /**
   * Get current metal rate for a given metal type and purity.
   * Falls back to database if cache is stale.
   */
  async getMetalRate(tenantId: string, metalType: string, purity: number): Promise<number> {
    const cacheKey = `${tenantId}:${metalType}:${purity}`;
    const cached = this.rateCache.get(cacheKey);
    if (cached && Date.now() - cached.fetchedAt < this.CACHE_TTL_MS) {
      return cached.rate.ratePaisePer10g;
    }

    // Look up from metal_rates or tenant settings
    // In production this would query a rates table; for now use a sensible approach
    const tenantSettings = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { settings: true },
    });

    const settings = (tenantSettings?.settings ?? {}) as Record<string, unknown>;
    const ratesMap = (settings.metalRates ?? {}) as Record<string, number>;
    const rateKey = `${metalType}_${purity}`;
    const ratePaisePer10g = ratesMap[rateKey] ?? 0;

    this.rateCache.set(cacheKey, {
      rate: { metalType, purity, ratePaisePer10g },
      fetchedAt: Date.now(),
    });

    return ratePaisePer10g;
  }

  /**
   * Invalidate rate cache (called on rate update events).
   */
  invalidateRateCache(tenantId?: string): void {
    if (tenantId) {
      for (const key of this.rateCache.keys()) {
        if (key.startsWith(`${tenantId}:`)) {
          this.rateCache.delete(key);
        }
      }
    } else {
      this.rateCache.clear();
    }
  }

  /**
   * Calculate the live price for a product given a metal rate.
   *
   * Formula:
   *   metalValue = (ratePaisePer10g / 10_000) * metalWeightMg
   *              = (ratePaisePer10g * metalWeightMg) / 10_000
   *   wastageValue = metalValue * (wastagePercent / 100)
   *   subtotal = metalValue + makingCharges + wastageValue
   *   gst = subtotal * 3 / 100  (= subtotal * 300 / 10_000)
   *   total = subtotal + gst
   *
   * Rate is per 10 grams (10_000 mg), so ratePaisePer10g / 10_000 = paise per mg.
   */
  calculateProductPrice(
    metalWeightMg: number,
    makingChargesPaise: number,
    wastagePercent: number,
    ratePaisePer10g: number,
  ): ProductPriceBreakdown {
    // metalValue in paise: rate per 10g * weight in mg / 10_000 mg
    const metalValuePaise = Math.round((ratePaisePer10g * metalWeightMg) / 10_000);
    const wastageValuePaise = Math.round((metalValuePaise * wastagePercent) / WASTAGE_DIVISOR);
    const makingValuePaise = makingChargesPaise;
    const subtotalPaise = metalValuePaise + makingValuePaise + wastageValuePaise;
    const gstPaise = Math.round((subtotalPaise * JEWELRY_GST_RATE_BPS) / BPS_DIVISOR);
    const totalPricePaise = subtotalPaise + gstPaise;

    return {
      metalValuePaise,
      makingValuePaise,
      wastageValuePaise,
      subtotalPaise,
      gstPaise,
      totalPricePaise,
    };
  }

  /**
   * Calculate the full price for a product fetched from DB,
   * using the current live metal rate.
   */
  async calculateLiveProductPrice(
    tenantId: string,
    product: {
      productType: string;
      metalPurity: number | null;
      metalWeightMg: bigint | null;
      makingCharges: bigint | null;
      wastagePercent: number | null;
      sellingPricePaise: bigint | null;
    },
  ): Promise<ProductPriceBreakdown> {
    // Non-metal products use the fixed selling price
    const metalTypes = ['GOLD', 'SILVER', 'PLATINUM'];
    if (!metalTypes.includes(product.productType) || !product.metalPurity || !product.metalWeightMg) {
      const fixedPrice = Number(product.sellingPricePaise ?? 0);
      const gst = Math.round((fixedPrice * JEWELRY_GST_RATE_BPS) / BPS_DIVISOR);
      return {
        metalValuePaise: 0,
        makingValuePaise: 0,
        wastageValuePaise: 0,
        subtotalPaise: fixedPrice,
        gstPaise: gst,
        totalPricePaise: fixedPrice + gst,
      };
    }

    const ratePaisePer10g = await this.getMetalRate(
      tenantId,
      product.productType,
      product.metalPurity,
    );

    return this.calculateProductPrice(
      Number(product.metalWeightMg),
      Number(product.makingCharges ?? 0n),
      product.wastagePercent ?? 0,
      ratePaisePer10g,
    );
  }

  /**
   * Calculate the total price for all items in a cart using live rates.
   * Optionally apply a coupon discount.
   */
  async calculateCartTotal(
    tenantId: string,
    cartItems: Array<{
      id: string;
      productId: string;
      quantity: number;
      metalRatePaiseLocked: bigint | null;
      product: {
        productType: string;
        metalPurity: number | null;
        metalWeightMg: bigint | null;
        makingCharges: bigint | null;
        wastagePercent: number | null;
        sellingPricePaise: bigint | null;
      };
    }>,
    couponDiscountPaise: number = 0,
  ): Promise<CartPricingSummary> {
    let subtotalPaise = 0;
    const itemPrices: CartPricingSummary['itemPrices'] = [];

    for (const item of cartItems) {
      let unitPrice: number;

      // If metal rate is locked (checkout phase), use the locked rate
      if (item.metalRatePaiseLocked) {
        const breakdown = this.calculateProductPrice(
          Number(item.product.metalWeightMg ?? 0n),
          Number(item.product.makingCharges ?? 0n),
          item.product.wastagePercent ?? 0,
          Number(item.metalRatePaiseLocked),
        );
        unitPrice = breakdown.totalPricePaise;
      } else {
        const breakdown = await this.calculateLiveProductPrice(tenantId, item.product);
        unitPrice = breakdown.totalPricePaise;
      }

      const lineTotalPaise = unitPrice * item.quantity;
      subtotalPaise += lineTotalPaise;

      itemPrices.push({
        cartItemId: item.id,
        productId: item.productId,
        unitPricePaise: unitPrice,
        lineTotalPaise,
      });
    }

    const discountPaise = Math.min(couponDiscountPaise, subtotalPaise);
    const afterDiscount = subtotalPaise - discountPaise;
    // Tax is already included in unit price (GST baked in), so tax = 0 at cart level
    // unless we need to separate it for invoice purposes
    const taxPaise = 0;
    const totalPaise = afterDiscount + taxPaise;

    return {
      subtotalPaise,
      discountPaise,
      taxPaise,
      totalPaise,
      itemPrices,
    };
  }

  /**
   * Lock the current metal rates into each cart item for checkout.
   * This snapshots the price so it doesn't change during payment.
   */
  async lockPriceForCheckout(tenantId: string, cartId: string): Promise<void> {
    const items = await this.prisma.cartItem.findMany({
      where: { tenantId, cartId },
      include: {
        cart: { select: { tenantId: true } },
      },
    });

    // Fetch products for these cart items
    const productIds = items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, tenantId },
      select: {
        id: true,
        productType: true,
        metalPurity: true,
        metalWeightMg: true,
      },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    for (const item of items) {
      const product = productMap.get(item.productId);
      if (!product) continue;

      const metalTypes = ['GOLD', 'SILVER', 'PLATINUM'];
      if (metalTypes.includes(product.productType) && product.metalPurity) {
        const rate = await this.getMetalRate(tenantId, product.productType, product.metalPurity);
        await this.prisma.cartItem.update({
          where: { id: item.id },
          data: { metalRatePaiseLocked: BigInt(rate) },
        });
      }
    }
  }
}
