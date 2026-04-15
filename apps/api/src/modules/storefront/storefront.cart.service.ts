// ─── Storefront Cart Service ───────────────────────────────────
// Shopping cart: guest + customer carts, merge on login,
// add/remove/update items, live pricing, coupon application.

import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import type { CartResponse, CartItemResponse } from '@caratflow/shared-types';
import { PrismaService } from '../../common/prisma.service';
import { TenantAwareService } from '../../common/base.service';
import { StorefrontPricingService } from './storefront.pricing.service';
import { StorefrontCouponService } from './storefront.coupon.service';
import { v4 as uuidv4 } from 'uuid';

/** Cart expiry: 30 days from creation/update */
const CART_EXPIRY_DAYS = 30;

@Injectable()
export class StorefrontCartService extends TenantAwareService {
  private readonly logger = new Logger(StorefrontCartService.name);

  constructor(
    prisma: PrismaService,
    private readonly pricingService: StorefrontPricingService,
    private readonly couponService: StorefrontCouponService,
  ) {
    super(prisma);
  }

  /**
   * Get or create a cart for a customer or session.
   */
  async getOrCreateCart(
    tenantId: string,
    customerId: string | null,
    sessionId: string,
  ): Promise<CartResponse> {
    // Try to find existing cart
    let cart = await this.findExistingCart(tenantId, customerId, sessionId);

    if (!cart) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + CART_EXPIRY_DAYS);

      cart = await this.prisma.cart.create({
        data: {
          id: uuidv4(),
          tenantId,
          customerId: customerId ?? null,
          sessionId,
          currencyCode: 'INR',
          expiresAt,
        },
        include: {
          items: true,
        },
      });
    }

    return this.buildCartResponse(tenantId, cart);
  }

  /**
   * Add an item to the cart. If the product is already in the cart, increment quantity.
   */
  async addItem(
    tenantId: string,
    cartId: string,
    productId: string,
    quantity: number,
  ): Promise<CartResponse> {
    const cart = await this.getCartOrThrow(tenantId, cartId);

    // Validate product exists and is active
    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId, isActive: true },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Check stock
    const stockAgg = await this.prisma.stockItem.aggregate({
      where: { tenantId, productId },
      _sum: { quantityOnHand: true, quantityReserved: true },
    });
    const available = (stockAgg._sum.quantityOnHand ?? 0) - (stockAgg._sum.quantityReserved ?? 0);

    // Check if item already in cart
    const existingItem = await this.prisma.cartItem.findFirst({
      where: { cartId, productId, tenantId },
    });

    const desiredQty = existingItem ? existingItem.quantity + quantity : quantity;
    if (desiredQty > available) {
      throw new BadRequestException(
        `Insufficient stock. Available: ${available}, requested: ${desiredQty}`,
      );
    }

    if (existingItem) {
      await this.prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: desiredQty },
      });
    } else {
      await this.prisma.cartItem.create({
        data: {
          id: uuidv4(),
          tenantId,
          cartId,
          productId,
          quantity,
        },
      });
    }

    // Extend cart expiry
    await this.extendCartExpiry(cartId);

    return this.getCart(tenantId, cartId);
  }

  /**
   * Update the quantity of a specific cart item.
   */
  async updateItemQuantity(
    tenantId: string,
    cartId: string,
    itemId: string,
    quantity: number,
  ): Promise<CartResponse> {
    const item = await this.prisma.cartItem.findFirst({
      where: { id: itemId, cartId, tenantId },
    });
    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    // Check stock
    const stockAgg = await this.prisma.stockItem.aggregate({
      where: { tenantId, productId: item.productId },
      _sum: { quantityOnHand: true, quantityReserved: true },
    });
    const available = (stockAgg._sum.quantityOnHand ?? 0) - (stockAgg._sum.quantityReserved ?? 0);
    if (quantity > available) {
      throw new BadRequestException(
        `Insufficient stock. Available: ${available}, requested: ${quantity}`,
      );
    }

    await this.prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity },
    });

    return this.getCart(tenantId, cartId);
  }

  /**
   * Remove an item from the cart.
   */
  async removeItem(tenantId: string, cartId: string, itemId: string): Promise<CartResponse> {
    const item = await this.prisma.cartItem.findFirst({
      where: { id: itemId, cartId, tenantId },
    });
    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    await this.prisma.cartItem.delete({ where: { id: itemId } });

    return this.getCart(tenantId, cartId);
  }

  /**
   * Get cart with live pricing.
   */
  async getCart(tenantId: string, cartId: string): Promise<CartResponse> {
    const cart = await this.prisma.cart.findFirst({
      where: { id: cartId, tenantId },
      include: { items: true },
    });

    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    return this.buildCartResponse(tenantId, cart);
  }

  /**
   * Merge a guest cart into the customer's cart when they log in.
   */
  async mergeGuestCart(tenantId: string, sessionId: string, customerId: string): Promise<CartResponse> {
    const guestCart = await this.prisma.cart.findFirst({
      where: { tenantId, sessionId, customerId: null },
      include: { items: true },
    });

    if (!guestCart || guestCart.items.length === 0) {
      // No guest cart to merge, return existing customer cart or create new
      return this.getOrCreateCart(tenantId, customerId, sessionId);
    }

    // Find or create customer cart
    let customerCart = await this.prisma.cart.findFirst({
      where: { tenantId, customerId },
      include: { items: true },
    });

    if (!customerCart) {
      // Convert guest cart to customer cart
      await this.prisma.cart.update({
        where: { id: guestCart.id },
        data: { customerId },
      });
      return this.getCart(tenantId, guestCart.id);
    }

    // Merge: add guest items to customer cart
    for (const guestItem of guestCart.items) {
      const existing = customerCart.items.find((i) => i.productId === guestItem.productId);
      if (existing) {
        await this.prisma.cartItem.update({
          where: { id: existing.id },
          data: { quantity: existing.quantity + guestItem.quantity },
        });
      } else {
        await this.prisma.cartItem.create({
          data: {
            id: uuidv4(),
            tenantId,
            cartId: customerCart.id,
            productId: guestItem.productId,
            quantity: guestItem.quantity,
          },
        });
      }
    }

    // Delete guest cart
    await this.prisma.cart.delete({ where: { id: guestCart.id } });

    return this.getCart(tenantId, customerCart.id);
  }

  /**
   * Clear all items from a cart.
   */
  async clearCart(tenantId: string, cartId: string): Promise<CartResponse> {
    await this.getCartOrThrow(tenantId, cartId);

    await this.prisma.cartItem.deleteMany({ where: { cartId, tenantId } });

    // Also clear coupon
    await this.prisma.cart.update({
      where: { id: cartId },
      data: { couponCode: null },
    });

    return this.getCart(tenantId, cartId);
  }

  /**
   * Apply a coupon code to the cart.
   */
  async applyCoupon(
    tenantId: string,
    cartId: string,
    couponCode: string,
    customerId: string | null,
  ): Promise<CartResponse> {
    const cart = await this.prisma.cart.findFirst({
      where: { id: cartId, tenantId },
      include: { items: true },
    });
    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    // Build a rough total for coupon validation
    const products = await this.prisma.product.findMany({
      where: {
        id: { in: cart.items.map((i) => i.productId) },
        tenantId,
      },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));
    let estimatedTotal = 0;
    for (const item of cart.items) {
      const product = productMap.get(item.productId);
      if (product) {
        const breakdown = await this.pricingService.calculateLiveProductPrice(tenantId, {
          productType: product.productType,
          metalPurity: product.metalPurity,
          metalWeightMg: product.metalWeightMg,
          makingCharges: product.makingCharges,
          wastagePercent: product.wastagePercent,
          sellingPricePaise: product.sellingPricePaise,
        });
        estimatedTotal += breakdown.totalPricePaise * item.quantity;
      }
    }

    // Validate coupon
    const validation = await this.couponService.validateCoupon(
      tenantId,
      couponCode,
      estimatedTotal,
      customerId,
    );

    if (!validation.valid) {
      throw new BadRequestException(validation.errorMessage ?? 'Invalid coupon code');
    }

    // Store coupon on cart
    await this.prisma.cart.update({
      where: { id: cartId },
      data: { couponCode },
    });

    return this.getCart(tenantId, cartId);
  }

  // ─── Private Helpers ──────────────────────────────────────────

  private async findExistingCart(
    tenantId: string,
    customerId: string | null,
    sessionId: string,
  ): Promise<Record<string, unknown> | null> {
    if (customerId) {
      const cart = await this.prisma.cart.findFirst({
        where: { tenantId, customerId, expiresAt: { gt: new Date() } },
        include: { items: true },
      });
      if (cart) return cart as unknown as Record<string, unknown>;
    }

    const cart = await this.prisma.cart.findFirst({
      where: { tenantId, sessionId, expiresAt: { gt: new Date() } },
      include: { items: true },
    });
    return cart as unknown as Record<string, unknown> | null;
  }

  private async getCartOrThrow(tenantId: string, cartId: string): Promise<Record<string, unknown>> {
    const cart = await this.prisma.cart.findFirst({
      where: { id: cartId, tenantId },
    });
    if (!cart) {
      throw new NotFoundException('Cart not found');
    }
    return cart as unknown as Record<string, unknown>;
  }

  private async extendCartExpiry(cartId: string): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + CART_EXPIRY_DAYS);
    await this.prisma.cart.update({
      where: { id: cartId },
      data: { expiresAt },
    });
  }

  private async buildCartResponse(
    tenantId: string,
    cart: Record<string, unknown>,
  ): Promise<CartResponse> {
    const c = cart as Record<string, unknown>;
    const items = ((c.items ?? []) as Array<Record<string, unknown>>);

    if (items.length === 0) {
      return {
        id: c.id as string,
        customerId: (c.customerId as string) ?? null,
        sessionId: c.sessionId as string,
        currencyCode: (c.currencyCode as string) ?? 'INR',
        couponCode: (c.couponCode as string) ?? null,
        items: [],
        subtotalPaise: 0,
        discountPaise: 0,
        taxPaise: 0,
        totalPaise: 0,
        itemCount: 0,
        expiresAt: new Date(c.expiresAt as string),
      };
    }

    // Fetch products for all cart items
    const productIds = items.map((i) => i.productId as string);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, tenantId },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    const cartItems: CartItemResponse[] = [];
    let subtotalPaise = 0;

    for (const item of items) {
      const product = productMap.get(item.productId as string);
      if (!product) continue;

      const breakdown = await this.pricingService.calculateLiveProductPrice(tenantId, {
        productType: product.productType,
        metalPurity: product.metalPurity,
        metalWeightMg: product.metalWeightMg,
        makingCharges: product.makingCharges,
        wastagePercent: product.wastagePercent,
        sellingPricePaise: product.sellingPricePaise,
      });

      const qty = item.quantity as number;
      const unitPrice = breakdown.totalPricePaise;
      const lineTotal = unitPrice * qty;
      subtotalPaise += lineTotal;

      const images = product.images as unknown;
      const firstImage = Array.isArray(images) && images.length > 0 ? (images[0] as string) : null;

      cartItems.push({
        id: item.id as string,
        productId: product.id,
        productName: product.name,
        productSku: product.sku,
        productImage: firstImage,
        productType: product.productType,
        metalPurity: product.metalPurity,
        metalWeightMg: product.metalWeightMg ? Number(product.metalWeightMg) : null,
        quantity: qty,
        unitPricePaise: unitPrice,
        lineTotalPaise: lineTotal,
        metalRatePaiseLocked: item.metalRatePaiseLocked
          ? Number(item.metalRatePaiseLocked)
          : null,
        addedAt: new Date(item.addedAt as string),
      });
    }

    // Apply coupon discount if any
    let discountPaise = 0;
    const couponCode = c.couponCode as string | null;
    if (couponCode) {
      const couponResult = await this.couponService.applyCoupon(tenantId, couponCode, subtotalPaise);
      discountPaise = couponResult.discountPaise;
    }

    const taxPaise = 0; // GST already included in item prices
    const totalPaise = subtotalPaise - discountPaise + taxPaise;

    return {
      id: c.id as string,
      customerId: (c.customerId as string) ?? null,
      sessionId: c.sessionId as string,
      currencyCode: (c.currencyCode as string) ?? 'INR',
      couponCode,
      items: cartItems,
      subtotalPaise,
      discountPaise,
      taxPaise,
      totalPaise: Math.max(0, totalPaise),
      itemCount: cartItems.reduce((sum, i) => sum + i.quantity, 0),
      expiresAt: new Date(c.expiresAt as string),
    };
  }
}
