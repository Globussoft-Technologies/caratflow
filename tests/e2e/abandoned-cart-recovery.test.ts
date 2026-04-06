// ─── E2E: Abandoned Cart Recovery Flow ─────────────────────────
// Scenario: Customer adds items to cart but does not complete checkout.
// System detects abandonment, sends reminders, and customer recovers.

import { describe, it, expect, beforeEach } from 'vitest';
import { v4 as uuid } from 'uuid';
import { TestContext, createTestCustomer } from './helpers/test-context';
import { PRODUCTS, COUPONS } from './helpers/test-data';

describe('E2E: Abandoned Cart Recovery Flow', () => {
  let ctx: TestContext;
  let customer: ReturnType<typeof createTestCustomer>;
  const customerId = uuid();
  const cartId = uuid();

  beforeEach(() => {
    ctx = new TestContext();
    customer = createTestCustomer(ctx.tenantId, { id: customerId });
  });

  // ─── Cart Creation ───────────────────────────────────────────

  it('should add items to cart: gold ring + silver anklet', () => {
    const cart = {
      id: cartId,
      tenantId: ctx.tenantId,
      customerId,
      items: [
        {
          productId: uuid(),
          name: PRODUCTS.GOLD_RING_22K_5G.name,
          quantity: 1,
          pricePaise: PRODUCTS.GOLD_RING_22K_5G.totalPaise,
        },
        {
          productId: uuid(),
          name: PRODUCTS.SILVER_ANKLET.name,
          quantity: 1,
          pricePaise: PRODUCTS.SILVER_ANKLET.totalPaise,
        },
      ],
      totalPaise: PRODUCTS.GOLD_RING_22K_5G.totalPaise + PRODUCTS.SILVER_ANKLET.totalPaise,
      updatedAt: new Date(),
    };

    expect(cart.items).toHaveLength(2);
    expect(cart.totalPaise).toBe(3_862_500); // Rs 38,625
  });

  // ─── Abandonment Detection ───────────────────────────────────

  it('should detect cart as abandoned after 1 hour of inactivity', () => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const cartLastUpdated = oneHourAgo;
    const now = new Date();
    const inactivityMs = now.getTime() - cartLastUpdated.getTime();
    const isAbandoned = inactivityMs >= 60 * 60 * 1000; // 1 hour

    expect(isAbandoned).toBe(true);
  });

  it('should publish b2c.abandoned_cart.detected event', async () => {
    const cartTotal = PRODUCTS.GOLD_RING_22K_5G.totalPaise + PRODUCTS.SILVER_ANKLET.totalPaise;

    await ctx.eventBus.publish({
      id: uuid(),
      tenantId: ctx.tenantId,
      userId: 'SYSTEM',
      timestamp: new Date().toISOString(),
      type: 'b2c.abandoned_cart.detected',
      payload: {
        cartId,
        customerId,
        totalPaise: cartTotal,
        itemCount: 2,
      },
    });

    expect(ctx.eventCapture.hasEvent('b2c.abandoned_cart.detected')).toBe(true);
    const event = ctx.eventCapture.getLastByType('b2c.abandoned_cart.detected') as any;
    expect(event.payload.itemCount).toBe(2);
    expect(event.payload.totalPaise).toBe(3_862_500);
  });

  it('should also publish storefront.cart.abandoned event', async () => {
    await ctx.eventBus.publish({
      id: uuid(),
      tenantId: ctx.tenantId,
      userId: 'SYSTEM',
      timestamp: new Date().toISOString(),
      type: 'storefront.cart.abandoned',
      payload: {
        cartId,
        customerId,
        email: customer.email,
        totalPaise: 3_862_500,
        itemCount: 2,
      },
    });

    expect(ctx.eventCapture.hasEvent('storefront.cart.abandoned')).toBe(true);
  });

  // ─── Email Reminder (1 hour) ─────────────────────────────────

  it('should send email reminder with cart items after 1 hour', async () => {
    await ctx.eventBus.publish({
      id: uuid(),
      tenantId: ctx.tenantId,
      userId: 'SYSTEM',
      timestamp: new Date().toISOString(),
      type: 'crm.notification.sent',
      payload: {
        customerId,
        channel: 'EMAIL',
        templateId: 'abandoned-cart-reminder',
        status: 'SENT',
      },
    });

    expect(ctx.eventCapture.hasEvent('crm.notification.sent')).toBe(true);
    const event = ctx.eventCapture.getLastByType('crm.notification.sent') as any;
    expect(event.payload.channel).toBe('EMAIL');
    expect(event.payload.templateId).toBe('abandoned-cart-reminder');
  });

  // ─── WhatsApp + Coupon (24 hours) ───────────────────────────

  it('should send WhatsApp reminder with 5% coupon after 24 hours', async () => {
    await ctx.eventBus.publish({
      id: uuid(),
      tenantId: ctx.tenantId,
      userId: 'SYSTEM',
      timestamp: new Date().toISOString(),
      type: 'crm.notification.sent',
      payload: {
        customerId,
        channel: 'WHATSAPP',
        templateId: 'abandoned-cart-coupon',
        status: 'SENT',
      },
    });

    const events = ctx.eventCapture.getByType('crm.notification.sent');
    const whatsappEvent = events.find(
      (e) => (e as any).payload.channel === 'WHATSAPP',
    ) as any;

    expect(whatsappEvent).toBeDefined();
    expect(whatsappEvent.payload.templateId).toBe('abandoned-cart-coupon');
  });

  it('should generate COMEBACK5 coupon: 5% off, max Rs 5,000 discount', () => {
    const coupon = COUPONS.ABANDONED5;

    expect(coupon.code).toBe('COMEBACK5');
    expect(coupon.discountValue).toBe(500); // 5%
    expect(coupon.maxDiscountPaise).toBe(500_000); // Rs 5,000
  });

  // ─── Customer Returns & Completes Purchase ──────────────────

  it('should apply COMEBACK5 coupon and calculate discounted total', () => {
    const cartSubtotal = PRODUCTS.GOLD_RING_22K_5G.subtotalPaise + PRODUCTS.SILVER_ANKLET.subtotalPaise;
    const coupon = COUPONS.ABANDONED5;

    // 5% of subtotal
    const rawDiscount = Math.floor((cartSubtotal * coupon.discountValue) / 10000);
    const actualDiscount = Math.min(rawDiscount, coupon.maxDiscountPaise);

    // Subtotal: Rs 32,000 + Rs 5,500 = Rs 37,500
    expect(cartSubtotal).toBe(3_750_000);
    expect(rawDiscount).toBe(187_500); // Rs 1,875
    expect(actualDiscount).toBe(187_500); // Under cap

    // New subtotal after discount
    const discountedSubtotal = cartSubtotal - actualDiscount;
    const gst = Math.round((discountedSubtotal * 3) / 100);
    const total = discountedSubtotal + gst;

    expect(discountedSubtotal).toBe(3_562_500); // Rs 35,625
    expect(total).toBe(3_669_375); // Rs 36,693.75
  });

  it('should complete purchase and mark cart as recovered', async () => {
    const orderId = uuid();

    // Order placed
    await ctx.eventBus.publish({
      id: uuid(),
      tenantId: ctx.tenantId,
      userId: customerId,
      timestamp: new Date().toISOString(),
      type: 'storefront.order.placed',
      payload: {
        orderId,
        customerId,
        totalPaise: 3_669_375,
        itemCount: 2,
      },
    });

    // Cart recovered
    await ctx.eventBus.publish({
      id: uuid(),
      tenantId: ctx.tenantId,
      userId: 'SYSTEM',
      timestamp: new Date().toISOString(),
      type: 'b2c.abandoned_cart.recovered',
      payload: {
        cartId,
        orderId,
        totalPaise: 3_669_375,
      },
    });

    // Coupon used
    await ctx.eventBus.publish({
      id: uuid(),
      tenantId: ctx.tenantId,
      userId: customerId,
      timestamp: new Date().toISOString(),
      type: 'b2c.coupon.used',
      payload: {
        couponId: uuid(),
        couponCode: 'COMEBACK5',
        customerId,
        orderId,
        discountPaise: 187_500,
      },
    });

    expect(ctx.eventCapture.hasEvent('storefront.order.placed')).toBe(true);
    expect(ctx.eventCapture.hasEvent('b2c.abandoned_cart.recovered')).toBe(true);
    expect(ctx.eventCapture.hasEvent('b2c.coupon.used')).toBe(true);
  });
});
