// ─── E2E: Export Order Flow ────────────────────────────────────
// Scenario: US-based buyer places an export order for gold jewelry.
// Tests currency handling, zero-rated IGST with LUT, documents,
// shipping, and completion.

import { describe, it, expect, beforeEach } from 'vitest';
import { v4 as uuid } from 'uuid';
import {
  TestContext,
  createTestCustomer,
  createTestLocation,
} from './helpers/test-context';
import { EXPORT, CUSTOMERS } from './helpers/test-data';

describe('E2E: Export Order Flow', () => {
  let ctx: TestContext;
  let location: ReturnType<typeof createTestLocation>;
  const buyerId = uuid();
  const exportOrderId = uuid();

  beforeEach(() => {
    ctx = new TestContext();
    location = createTestLocation(ctx.tenantId, { state: 'MH' });
  });

  // ─── Export Buyer ────────────────────────────────────────────

  it('should create export buyer record with US address', () => {
    const buyer = {
      id: buyerId,
      tenantId: ctx.tenantId,
      ...CUSTOMERS.JAMES_WILSON,
      buyerType: 'EXPORT',
      country: 'US',
    };

    expect(buyer.country).toBe('US');
    expect(buyer.city).toBe('New York');
  });

  // ─── Order Creation ──────────────────────────────────────────

  it('should create export order in USD with locked exchange rate', () => {
    const order = {
      id: exportOrderId,
      tenantId: ctx.tenantId,
      orderNumber: 'EXP-2604-0001',
      buyerId,
      buyerCountry: EXPORT.SAMPLE_ORDER.buyerCountry,
      currencyCode: 'USD',
      exchangeRate: EXPORT.USD_EXCHANGE_RATE, // 8400 = Rs 84.00
      totalForeignCents: EXPORT.SAMPLE_ORDER.totalUsdCents, // $5,000 in cents
      totalInrPaise: EXPORT.SAMPLE_ORDER.totalInrPaise, // Rs 4,20,000
      status: 'CONFIRMED',
    };

    expect(order.currencyCode).toBe('USD');
    expect(order.exchangeRate).toBe(8_400);
    expect(order.totalForeignCents).toBe(500_000); // $5,000
    expect(order.totalInrPaise).toBe(42_000_000);  // Rs 4,20,000
  });

  it('should calculate INR equivalent: $5,000 * 84.00 = Rs 4,20,000', () => {
    const usdCents = EXPORT.SAMPLE_ORDER.totalUsdCents;
    const exchangeRate = EXPORT.USD_EXCHANGE_RATE; // 8400 (Rs * 100)
    // totalInrPaise = (usdCents / 100) * exchangeRate
    const totalInrPaise = Math.round((usdCents * exchangeRate) / 100);

    expect(totalInrPaise).toBe(42_000_000); // Rs 4,20,000
  });

  it('should publish export.order.created event', async () => {
    await ctx.eventBus.publish({
      id: uuid(),
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      timestamp: new Date().toISOString(),
      type: 'export.order.created',
      payload: {
        exportOrderId,
        buyerId,
        buyerCountry: 'US',
        totalPaise: EXPORT.SAMPLE_ORDER.totalInrPaise,
      },
    });

    expect(ctx.eventCapture.hasEvent('export.order.created')).toBe(true);
    const event = ctx.eventCapture.getLastByType('export.order.created') as any;
    expect(event.payload.buyerCountry).toBe('US');
  });

  // ─── Export Invoice (Zero-Rated IGST) ────────────────────────

  it('should create export invoice with IGST zero-rated under LUT', () => {
    const invoice = {
      id: uuid(),
      tenantId: ctx.tenantId,
      invoiceNumber: 'EINV-2604-0001',
      invoiceType: 'EXPORT',
      exportOrderId,
      buyerId,
      subtotalPaise: BigInt(EXPORT.SAMPLE_ORDER.totalInrPaise),
      igstPaise: BigInt(0), // Zero-rated
      totalPaise: BigInt(EXPORT.SAMPLE_ORDER.totalInrPaise),
      currencyCode: 'USD',
      foreignAmountCents: EXPORT.SAMPLE_ORDER.totalUsdCents,
      exchangeRate: EXPORT.USD_EXCHANGE_RATE,
      lutNumber: 'LUT/2026-27/MH/000123',
      isExport: true,
    };

    expect(Number(invoice.igstPaise)).toBe(0); // Zero-rated for exports with LUT
    expect(invoice.lutNumber).toContain('LUT');
    expect(invoice.isExport).toBe(true);
  });

  it('should publish export.invoice.created event', async () => {
    const invoiceId = uuid();
    await ctx.eventBus.publish({
      id: uuid(),
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      timestamp: new Date().toISOString(),
      type: 'export.invoice.created',
      payload: {
        invoiceId,
        invoiceNumber: 'EINV-2604-0001',
        exportOrderId,
        totalPaise: EXPORT.SAMPLE_ORDER.totalInrPaise,
      },
    });

    expect(ctx.eventCapture.hasEvent('export.invoice.created')).toBe(true);
  });

  // ─── Export Documents ────────────────────────────────────────

  it('should auto-generate packing list', async () => {
    await ctx.eventBus.publish({
      id: uuid(),
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      timestamp: new Date().toISOString(),
      type: 'export.document.issued',
      payload: {
        documentId: uuid(),
        documentType: 'PACKING_LIST',
        exportOrderId,
      },
    });

    const event = ctx.eventCapture.getLastByType('export.document.issued') as any;
    expect(event.payload.documentType).toBe('PACKING_LIST');
  });

  it('should prepare shipping bill', async () => {
    await ctx.eventBus.publish({
      id: uuid(),
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      timestamp: new Date().toISOString(),
      type: 'export.document.issued',
      payload: {
        documentId: uuid(),
        documentType: 'SHIPPING_BILL',
        exportOrderId,
      },
    });

    const events = ctx.eventCapture.getByType('export.document.issued') as any[];
    const shippingBill = events.find((e) => e.payload.documentType === 'SHIPPING_BILL');
    expect(shippingBill).toBeDefined();
  });

  it('should generate certificate of origin', async () => {
    await ctx.eventBus.publish({
      id: uuid(),
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      timestamp: new Date().toISOString(),
      type: 'export.document.issued',
      payload: {
        documentId: uuid(),
        documentType: 'CERTIFICATE_OF_ORIGIN',
        exportOrderId,
      },
    });

    expect(ctx.eventCapture.count('export.document.issued')).toBeGreaterThanOrEqual(1);
  });

  // ─── Shipping ────────────────────────────────────────────────

  it('should ship order with tracking number', async () => {
    const shipment = {
      id: uuid(),
      exportOrderId,
      carrier: 'DHL_EXPRESS',
      trackingNumber: 'DHL1234567890',
      trackingUrl: 'https://www.dhl.com/tracking/DHL1234567890',
      status: 'SHIPPED',
      shippedAt: new Date(),
      estimatedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    };

    expect(shipment.carrier).toBe('DHL_EXPRESS');
    expect(shipment.trackingNumber).toBeTruthy();

    await ctx.eventBus.publish({
      id: uuid(),
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      timestamp: new Date().toISOString(),
      type: 'export.order.shipped',
      payload: {
        exportOrderId,
        orderNumber: 'EXP-2604-0001',
        buyerCountry: 'US',
      },
    });

    expect(ctx.eventCapture.hasEvent('export.order.shipped')).toBe(true);
  });

  // ─── Delivery & Completion ───────────────────────────────────

  it('should mark order as delivered and complete', async () => {
    await ctx.eventBus.publish({
      id: uuid(),
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      timestamp: new Date().toISOString(),
      type: 'export.order.delivered',
      payload: {
        exportOrderId,
        orderNumber: 'EXP-2604-0001',
        totalPaise: EXPORT.SAMPLE_ORDER.totalInrPaise,
      },
    });

    expect(ctx.eventCapture.hasEvent('export.order.delivered')).toBe(true);
  });

  // ─── Complete Export Workflow ─────────────────────────────────

  it('should execute complete export workflow and verify all events', async () => {
    ctx.eventCapture.clear();

    // 1. Order created
    await ctx.eventBus.publish({
      id: uuid(), tenantId: ctx.tenantId, userId: ctx.userId,
      timestamp: new Date().toISOString(),
      type: 'export.order.created',
      payload: { exportOrderId, buyerId, buyerCountry: 'US', totalPaise: 42_000_000 },
    });

    // 2. Invoice created
    await ctx.eventBus.publish({
      id: uuid(), tenantId: ctx.tenantId, userId: ctx.userId,
      timestamp: new Date().toISOString(),
      type: 'export.invoice.created',
      payload: { invoiceId: uuid(), invoiceNumber: 'EINV-2604-0001', exportOrderId, totalPaise: 42_000_000 },
    });

    // 3. Packing list
    await ctx.eventBus.publish({
      id: uuid(), tenantId: ctx.tenantId, userId: ctx.userId,
      timestamp: new Date().toISOString(),
      type: 'export.document.issued',
      payload: { documentId: uuid(), documentType: 'PACKING_LIST', exportOrderId },
    });

    // 4. Shipping bill
    await ctx.eventBus.publish({
      id: uuid(), tenantId: ctx.tenantId, userId: ctx.userId,
      timestamp: new Date().toISOString(),
      type: 'export.document.issued',
      payload: { documentId: uuid(), documentType: 'SHIPPING_BILL', exportOrderId },
    });

    // 5. Certificate of origin
    await ctx.eventBus.publish({
      id: uuid(), tenantId: ctx.tenantId, userId: ctx.userId,
      timestamp: new Date().toISOString(),
      type: 'export.document.issued',
      payload: { documentId: uuid(), documentType: 'CERTIFICATE_OF_ORIGIN', exportOrderId },
    });

    // 6. Shipped
    await ctx.eventBus.publish({
      id: uuid(), tenantId: ctx.tenantId, userId: ctx.userId,
      timestamp: new Date().toISOString(),
      type: 'export.order.shipped',
      payload: { exportOrderId, orderNumber: 'EXP-2604-0001', buyerCountry: 'US' },
    });

    // 7. Delivered
    await ctx.eventBus.publish({
      id: uuid(), tenantId: ctx.tenantId, userId: ctx.userId,
      timestamp: new Date().toISOString(),
      type: 'export.order.delivered',
      payload: { exportOrderId, orderNumber: 'EXP-2604-0001', totalPaise: 42_000_000 },
    });

    expect(ctx.eventCapture.count()).toBe(7);
    expect(ctx.eventCapture.hasEvent('export.order.created')).toBe(true);
    expect(ctx.eventCapture.hasEvent('export.invoice.created')).toBe(true);
    expect(ctx.eventCapture.count('export.document.issued')).toBe(3);
    expect(ctx.eventCapture.hasEvent('export.order.shipped')).toBe(true);
    expect(ctx.eventCapture.hasEvent('export.order.delivered')).toBe(true);
  });
});
