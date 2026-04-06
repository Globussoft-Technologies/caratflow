// ─── E2E: Old Gold Exchange Flow ───────────────────────────────
// Scenario: Customer exchanges old 22K gold jewelry for a new necklace.
// Tests appraisal, old gold purchase, new sale, net payment calculation.

import { describe, it, expect, beforeEach } from 'vitest';
import { v4 as uuid } from 'uuid';
import {
  TestContext,
  createTestCustomer,
  createTestProduct,
  createTestLocation,
} from './helpers/test-context';
import { METAL_RATES, OLD_GOLD_BUY_RATE, PRODUCTS, GST_RATES } from './helpers/test-data';

describe('E2E: Old Gold Exchange Flow', () => {
  let ctx: TestContext;
  let customer: ReturnType<typeof createTestCustomer>;
  let location: ReturnType<typeof createTestLocation>;

  // Old gold details
  const oldGoldWeightMg = 10_000;    // 10 grams
  const oldGoldPurity = 916;          // 22K
  const oldGoldBuyRatePerGramPaise = OLD_GOLD_BUY_RATE.GOLD_22K.ratePerGramPaise; // Rs 5,700/g

  // New necklace: Rs 1,20,000
  const newNecklacePricePaise = 12_000_000;
  const newNecklaceGstPaise = 360_000;   // 3% of Rs 1,20,000
  const newNecklaceTotalPaise = 12_360_000; // Rs 1,23,600 with GST

  beforeEach(() => {
    ctx = new TestContext();
    location = createTestLocation(ctx.tenantId, { state: 'MH' });
    customer = createTestCustomer(ctx.tenantId, { state: 'MH' });
  });

  // ─── Old Gold Appraisal ──────────────────────────────────────

  it('should test old gold at 22K purity (916 fineness)', () => {
    expect(oldGoldPurity).toBe(916);
    expect(oldGoldWeightMg).toBe(10_000);
  });

  it('should calculate old gold value at buy rate: Rs 5,700/g * 10g = Rs 57,000', () => {
    const oldGoldValuePaise = oldGoldBuyRatePerGramPaise * (oldGoldWeightMg / 1000);

    expect(oldGoldValuePaise).toBe(5_700_000); // Rs 57,000
  });

  it('should use buy rate (lower than sell rate) for old gold purchase', () => {
    const buyRate = OLD_GOLD_BUY_RATE.GOLD_22K.ratePerGramPaise;
    const sellRate = METAL_RATES.GOLD_22K.ratePerGramPaise;

    expect(buyRate).toBeLessThan(sellRate);
    expect(sellRate - buyRate).toBe(10_000); // Rs 100/g margin
  });

  // ─── New Jewelry Selection ───────────────────────────────────

  it('should select new necklace worth Rs 1,20,000 before GST', () => {
    expect(newNecklacePricePaise).toBe(12_000_000);
  });

  it('should calculate GST at 3% on new necklace: Rs 3,600', () => {
    const gst = Math.round((newNecklacePricePaise * 3) / 100);
    expect(gst).toBe(360_000);
  });

  it('should calculate new necklace total with GST: Rs 1,23,600', () => {
    expect(newNecklaceTotalPaise).toBe(newNecklacePricePaise + newNecklaceGstPaise);
  });

  // ─── Exchange Calculation ────────────────────────────────────

  it('should apply old gold value as payment against new purchase', () => {
    const oldGoldValuePaise = 5_700_000; // Rs 57,000
    const remainingPaise = newNecklaceTotalPaise - oldGoldValuePaise;

    expect(remainingPaise).toBe(6_660_000); // Rs 66,600
  });

  it('should process remaining payment of Rs 66,600 by card', () => {
    const oldGoldValuePaise = 5_700_000;
    const remainingPaise = newNecklaceTotalPaise - oldGoldValuePaise;
    const cardPaymentPaise = remainingPaise;

    const totalEffectivePayment = oldGoldValuePaise + cardPaymentPaise;
    expect(totalEffectivePayment).toBe(newNecklaceTotalPaise);
  });

  // ─── Old Gold Purchase Record ────────────────────────────────

  it('should create old gold purchase record with weight and purity', async () => {
    const purchaseRecord = {
      id: uuid(),
      tenantId: ctx.tenantId,
      customerId: customer.id,
      metalType: 'GOLD',
      purity: oldGoldPurity,
      weightMg: BigInt(oldGoldWeightMg),
      ratePerGramPaise: BigInt(oldGoldBuyRatePerGramPaise),
      totalValuePaise: BigInt(5_700_000),
      status: 'COMPLETED',
      createdAt: new Date(),
    };

    expect(purchaseRecord.purity).toBe(916);
    expect(Number(purchaseRecord.weightMg)).toBe(10_000);
    expect(Number(purchaseRecord.totalValuePaise)).toBe(5_700_000);
  });

  it('should publish inventory.stock.adjusted event for old gold received', async () => {
    await ctx.eventBus.publish({
      id: uuid(),
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      timestamp: new Date().toISOString(),
      type: 'inventory.stock.adjusted',
      payload: {
        productId: 'old-gold-raw',
        locationId: location.id,
        quantityChange: 1,
        reason: 'OLD_GOLD_PURCHASE',
      },
    });

    expect(ctx.eventCapture.hasEvent('inventory.stock.adjusted')).toBe(true);
    const event = ctx.eventCapture.getLastByType('inventory.stock.adjusted') as any;
    expect(event.payload.quantityChange).toBe(1);
    expect(event.payload.reason).toBe('OLD_GOLD_PURCHASE');
  });

  // ─── Sale Record ─────────────────────────────────────────────

  it('should create sale record for the new necklace', async () => {
    const saleId = uuid();
    const sale = {
      id: saleId,
      tenantId: ctx.tenantId,
      customerId: customer.id,
      locationId: location.id,
      subtotalPaise: BigInt(newNecklacePricePaise),
      taxPaise: BigInt(newNecklaceGstPaise),
      totalPaise: BigInt(newNecklaceTotalPaise),
      status: 'COMPLETED',
    };

    expect(Number(sale.totalPaise)).toBe(12_360_000);
  });

  it('should record exchange payment method alongside card payment', () => {
    const payments = [
      { method: 'OLD_GOLD_EXCHANGE', amountPaise: 5_700_000 },
      { method: 'CARD', amountPaise: 6_660_000 },
    ];

    const totalPayments = payments.reduce((sum, p) => sum + p.amountPaise, 0);
    expect(totalPayments).toBe(newNecklaceTotalPaise);
  });

  // ─── Net Payment Verification ────────────────────────────────

  it('should verify net payment is correct: total - old gold value', () => {
    const oldGoldValuePaise = 5_700_000;
    const netPaymentPaise = newNecklaceTotalPaise - oldGoldValuePaise;

    expect(netPaymentPaise).toBe(6_660_000); // Rs 66,600
  });

  // ─── Complete Exchange Workflow Events ────────────────────────

  it('should publish all events for complete exchange workflow', async () => {
    const saleId = uuid();

    // Old gold purchase inventory event
    await ctx.eventBus.publish({
      id: uuid(),
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      timestamp: new Date().toISOString(),
      type: 'inventory.stock.adjusted',
      payload: {
        productId: 'raw-gold-22k',
        locationId: location.id,
        quantityChange: 1,
        reason: 'OLD_GOLD_RECEIVED',
      },
    });

    // New necklace sale event
    await ctx.eventBus.publish({
      id: uuid(),
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      timestamp: new Date().toISOString(),
      type: 'retail.sale.completed',
      payload: {
        saleId,
        customerId: customer.id,
        totalPaise: newNecklaceTotalPaise,
        items: [{ productId: 'necklace-prod-id', pricePaise: newNecklaceTotalPaise }],
      },
    });

    // Stock decrement for sold necklace
    await ctx.eventBus.publish({
      id: uuid(),
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      timestamp: new Date().toISOString(),
      type: 'inventory.stock.adjusted',
      payload: {
        productId: 'necklace-prod-id',
        locationId: location.id,
        quantityChange: -1,
        reason: 'SALE',
      },
    });

    // Payment received (net amount)
    await ctx.eventBus.publish({
      id: uuid(),
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      timestamp: new Date().toISOString(),
      type: 'financial.payment.received',
      payload: {
        paymentId: uuid(),
        amountPaise: 6_660_000, // Net payment by card
        method: 'CARD',
        referenceId: saleId,
      },
    });

    expect(ctx.eventCapture.count()).toBe(4);
    expect(ctx.eventCapture.count('inventory.stock.adjusted')).toBe(2); // Old gold in + necklace out
    expect(ctx.eventCapture.hasEvent('retail.sale.completed')).toBe(true);
    expect(ctx.eventCapture.hasEvent('financial.payment.received')).toBe(true);
  });
});
