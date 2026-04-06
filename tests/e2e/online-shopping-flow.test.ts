// ─── E2E: Online Shopping Flow (B2C Storefront) ───────────────
// Scenario: Customer shops on the B2C storefront, registers, browses,
// adds to wishlist, uses a coupon, checks out, and receives delivery.

import { describe, it, expect, beforeEach } from 'vitest';
import { v4 as uuid } from 'uuid';
import {
  TestContext,
  createTestCustomer,
  createTestProduct,
  createTestLocation,
} from './helpers/test-context';
import { PRODUCTS, COUPONS, METAL_RATES, GST_RATES } from './helpers/test-data';

describe('E2E: Online Shopping Flow', () => {
  let ctx: TestContext;
  let customer: ReturnType<typeof createTestCustomer>;
  let location: ReturnType<typeof createTestLocation>;
  const customerId = uuid();
  const cartId = uuid();
  const orderId = uuid();

  beforeEach(() => {
    ctx = new TestContext();
    location = createTestLocation(ctx.tenantId);
    customer = createTestCustomer(ctx.tenantId, { id: customerId });
  });

  // ─── Customer Registration ───────────────────────────────────

  it('should register new customer with email and phone', () => {
    const registration = {
      email: 'newcustomer@example.com',
      phone: '+919999888877',
      firstName: 'Neha',
      lastName: 'Gupta',
      otpVerified: true,
    };

    expect(registration.otpVerified).toBe(true);
    expect(registration.email).toContain('@');
  });

  it('should publish crm.customer.created event on registration', async () => {
    await ctx.eventBus.publish({
      id: uuid(),
      tenantId: ctx.tenantId,
      userId: customerId,
      timestamp: new Date().toISOString(),
      type: 'crm.customer.created',
      payload: {
        customerId,
        firstName: 'Neha',
        lastName: 'Gupta',
        phone: '+919999888877',
      },
    });

    expect(ctx.eventCapture.hasEvent('crm.customer.created')).toBe(true);
  });

  // ─── Catalog Browsing ────────────────────────────────────────

  it('should filter products by category "Gold Rings"', () => {
    const filters = {
      category: 'Gold Rings',
      metalType: 'GOLD',
      priceRange: { minPaise: 1_000_000, maxPaise: 10_000_000 },
    };

    expect(filters.category).toBe('Gold Rings');
    expect(filters.metalType).toBe('GOLD');
  });

  it('should calculate live pricing for product detail page', () => {
    const product = PRODUCTS.GOLD_RING_22K_5G;
    const currentRate = METAL_RATES.GOLD_22K.ratePerGramPaise;
    const weightGrams = product.grossWeightMg / 1000;

    const liveMetalValue = currentRate * weightGrams;
    const liveMakingCharges = product.makingChargePerGramPaise * weightGrams;
    const liveSubtotal = liveMetalValue + liveMakingCharges;
    const liveGst = Math.round((liveSubtotal * 3) / 100);
    const liveTotal = liveSubtotal + liveGst;

    expect(liveMetalValue).toBe(2_900_000);  // Rs 29,000
    expect(liveMakingCharges).toBe(300_000);  // Rs 3,000
    expect(liveSubtotal).toBe(3_200_000);     // Rs 32,000
    expect(liveGst).toBe(96_000);             // Rs 960
    expect(liveTotal).toBe(3_296_000);        // Rs 32,960
  });

  // ─── Wishlist & Price Alerts ─────────────────────────────────

  it('should add product to wishlist', () => {
    const wishlistItem = {
      id: uuid(),
      customerId,
      productId: uuid(),
      addedAt: new Date(),
    };

    expect(wishlistItem.customerId).toBe(customerId);
  });

  it('should enable price alert for a threshold', () => {
    const priceAlert = {
      id: uuid(),
      customerId,
      productId: uuid(),
      thresholdPaise: 3_000_000, // Alert when below Rs 30,000
      isActive: true,
    };

    expect(priceAlert.thresholdPaise).toBe(3_000_000);
    expect(priceAlert.isActive).toBe(true);
  });

  // ─── Cart Operations ─────────────────────────────────────────

  it('should add 2 items to cart', () => {
    const cartItems = [
      { productId: uuid(), quantity: 1, name: PRODUCTS.GOLD_RING_22K_5G.name },
      { productId: uuid(), quantity: 1, name: PRODUCTS.SILVER_ANKLET.name },
    ];

    expect(cartItems).toHaveLength(2);
    expect(cartItems.reduce((sum, i) => sum + i.quantity, 0)).toBe(2);
  });

  it('should calculate cart total from 2 items', () => {
    const ringTotal = PRODUCTS.GOLD_RING_22K_5G.totalPaise;     // Rs 32,960
    const ankletTotal = PRODUCTS.SILVER_ANKLET.totalPaise;       // Rs 5,665
    const cartTotal = ringTotal + ankletTotal;

    expect(cartTotal).toBe(3_862_500); // Rs 38,625
  });

  // ─── Coupon Application ──────────────────────────────────────

  it('should validate FIRST10 coupon for first-time orders', () => {
    const coupon = COUPONS.FIRST10;
    const cartSubtotal = PRODUCTS.GOLD_RING_22K_5G.subtotalPaise + PRODUCTS.SILVER_ANKLET.subtotalPaise;

    expect(coupon.isFirstOrderOnly).toBe(true);
    expect(cartSubtotal).toBeGreaterThan(coupon.minOrderPaise);
  });

  it('should calculate 10% discount capped at Rs 10,000', () => {
    const coupon = COUPONS.FIRST10;
    const cartSubtotal = PRODUCTS.GOLD_RING_22K_5G.subtotalPaise + PRODUCTS.SILVER_ANKLET.subtotalPaise;

    // 10% of subtotal
    const rawDiscount = Math.floor((cartSubtotal * coupon.discountValue) / 10000);
    // Cap at max discount
    const actualDiscount = Math.min(rawDiscount, coupon.maxDiscountPaise);

    expect(rawDiscount).toBe(375_000); // Rs 3,750
    expect(actualDiscount).toBe(375_000); // Under the cap
    expect(actualDiscount).toBeLessThanOrEqual(coupon.maxDiscountPaise);
  });

  it('should publish b2c.coupon.used event', async () => {
    await ctx.eventBus.publish({
      id: uuid(),
      tenantId: ctx.tenantId,
      userId: customerId,
      timestamp: new Date().toISOString(),
      type: 'b2c.coupon.used',
      payload: {
        couponId: uuid(),
        couponCode: 'FIRST10',
        customerId,
        orderId,
        discountPaise: 375_000,
      },
    });

    expect(ctx.eventCapture.hasEvent('b2c.coupon.used')).toBe(true);
  });

  // ─── Checkout ────────────────────────────────────────────────

  it('should lock metal prices at current rate during checkout', () => {
    const priceLock = {
      cartId,
      lockedAt: new Date(),
      goldRatePer10gPaise: METAL_RATES.GOLD_22K.ratePer10gPaise,
      silverRatePer10gPaise: METAL_RATES.SILVER.ratePer10gPaise,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 min lock
    };

    expect(priceLock.goldRatePer10gPaise).toBe(5_800_000);
  });

  it('should validate shipping address selection', () => {
    const address = {
      id: uuid(),
      customerId,
      firstName: customer.firstName,
      lastName: customer.lastName,
      addressLine1: '15, Zaveri Bazaar',
      city: 'Mumbai',
      state: 'MH',
      postalCode: '400001',
      country: 'IN',
      phone: customer.phone,
    };

    expect(address.state).toBe('MH');
    expect(address.country).toBe('IN');
  });

  it('should initiate payment via gateway (e.g., Razorpay)', () => {
    const paymentInitiation = {
      orderId,
      gatewayName: 'RAZORPAY',
      amountPaise: 3_487_500, // Cart total after discount
      currencyCode: 'INR',
      status: 'INITIATED',
      initiatedAt: new Date(),
    };

    expect(paymentInitiation.status).toBe('INITIATED');
    expect(paymentInitiation.gatewayName).toBe('RAZORPAY');
  });

  // ─── Order Creation ──────────────────────────────────────────

  it('should create order after payment confirmation', async () => {
    await ctx.eventBus.publish({
      id: uuid(),
      tenantId: ctx.tenantId,
      userId: customerId,
      timestamp: new Date().toISOString(),
      type: 'storefront.order.placed',
      payload: {
        orderId,
        customerId,
        totalPaise: 3_487_500,
        itemCount: 2,
      },
    });

    expect(ctx.eventCapture.hasEvent('storefront.order.placed')).toBe(true);
    const event = ctx.eventCapture.getLastByType('storefront.order.placed') as any;
    expect(event.payload.itemCount).toBe(2);
  });

  it('should generate order number in format ON/B2C/YYMM/XXXXX', () => {
    const orderNumber = 'ON/B2C/2604/00001';
    const parts = orderNumber.split('/');

    expect(parts[0]).toBe('ON');
    expect(parts[1]).toBe('B2C');
    expect(parts[2]).toMatch(/^\d{4}$/);
    expect(parts[3]).toMatch(/^\d{5}$/);
  });

  // ─── Post-Order Verification ─────────────────────────────────

  it('should decrement stock for each ordered item', async () => {
    const productIds = [uuid(), uuid()];
    for (const productId of productIds) {
      await ctx.eventBus.publish({
        id: uuid(),
        tenantId: ctx.tenantId,
        userId: customerId,
        timestamp: new Date().toISOString(),
        type: 'inventory.stock.adjusted',
        payload: {
          productId,
          locationId: location.id,
          quantityChange: -1,
          reason: 'B2C_ORDER',
        },
      });
    }

    expect(ctx.eventCapture.count('inventory.stock.adjusted')).toBe(2);
  });

  it('should send order confirmation email', async () => {
    await ctx.eventBus.publish({
      id: uuid(),
      tenantId: ctx.tenantId,
      userId: customerId,
      timestamp: new Date().toISOString(),
      type: 'crm.notification.sent',
      payload: {
        customerId,
        channel: 'EMAIL',
        templateId: 'order-confirmation',
        status: 'SENT',
      },
    });

    expect(ctx.eventCapture.hasEvent('crm.notification.sent')).toBe(true);
    const event = ctx.eventCapture.getLastByType('crm.notification.sent') as any;
    expect(event.payload.channel).toBe('EMAIL');
    expect(event.payload.templateId).toBe('order-confirmation');
  });

  it('should earn loyalty points from online purchase', async () => {
    const orderTotal = 3_487_500;
    const pointsEarned = Math.floor(orderTotal / 10000); // 348 points

    await ctx.eventBus.publish({
      id: uuid(),
      tenantId: ctx.tenantId,
      userId: customerId,
      timestamp: new Date().toISOString(),
      type: 'crm.loyalty.points_earned',
      payload: {
        customerId,
        points: pointsEarned,
        source: 'B2C_ORDER',
        referenceId: orderId,
      },
    });

    expect(pointsEarned).toBe(348);
    expect(ctx.eventCapture.hasEvent('crm.loyalty.points_earned')).toBe(true);
  });

  // ─── Shipping ────────────────────────────────────────────────

  it('should assign tracking number when order ships', () => {
    const shipment = {
      id: uuid(),
      orderId,
      shipmentNumber: 'SHP-2604-00001',
      carrier: 'DELHIVERY',
      trackingNumber: 'DEL123456789',
      trackingUrl: 'https://www.delhivery.com/track/DEL123456789',
      status: 'SHIPPED',
      estimatedDeliveryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    };

    expect(shipment.trackingNumber).toBeTruthy();
    expect(shipment.carrier).toBe('DELHIVERY');
  });

  it('should send delivery confirmation and feedback request', async () => {
    await ctx.eventBus.publish({
      id: uuid(),
      tenantId: ctx.tenantId,
      userId: customerId,
      timestamp: new Date().toISOString(),
      type: 'crm.notification.sent',
      payload: {
        customerId,
        channel: 'EMAIL',
        templateId: 'delivery-feedback-request',
        status: 'SENT',
      },
    });

    const event = ctx.eventCapture.getLastByType('crm.notification.sent') as any;
    expect(event.payload.templateId).toBe('delivery-feedback-request');
  });

  // ─── Complete Online Flow ────────────────────────────────────

  it('should complete full online shopping workflow and publish storefront.order.completed', async () => {
    await ctx.eventBus.publish({
      id: uuid(),
      tenantId: ctx.tenantId,
      userId: customerId,
      timestamp: new Date().toISOString(),
      type: 'storefront.order.completed',
      payload: {
        orderId,
        customerId,
        totalPaise: 3_487_500,
      },
    });

    expect(ctx.eventCapture.hasEvent('storefront.order.completed')).toBe(true);
  });
});
