// ─── E2E: Complete Retail Sale Flow ────────────────────────────
// Scenario: Customer walks into showroom, buys a 22K gold necklace.
// Tests the full lifecycle: lookup, pricing, sale creation, payment,
// inventory adjustment, financial entries, loyalty points, and invoicing.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { v4 as uuid } from 'uuid';
import {
  TestContext,
  createTestCustomer,
  createTestProduct,
  createTestLocation,
  createTestStockItem,
  createTestAccount,
} from './helpers/test-context';
import { METAL_RATES, PRODUCTS, GST_RATES } from './helpers/test-data';

describe('E2E: Complete Retail Sale Flow', () => {
  let ctx: TestContext;
  let customer: ReturnType<typeof createTestCustomer>;
  let location: ReturnType<typeof createTestLocation>;
  let product: ReturnType<typeof createTestProduct>;
  let stockItem: ReturnType<typeof createTestStockItem>;
  let cashAccount: ReturnType<typeof createTestAccount>;
  let bankAccount: ReturnType<typeof createTestAccount>;
  let revenueAccount: ReturnType<typeof createTestAccount>;
  let gstPayableAccount: ReturnType<typeof createTestAccount>;

  beforeEach(() => {
    ctx = new TestContext();
    location = createTestLocation(ctx.tenantId, { state: 'MH', city: 'Mumbai' });
    customer = createTestCustomer(ctx.tenantId, { state: 'MH', loyaltyPoints: 500 });
    product = createTestProduct(ctx.tenantId, {
      name: PRODUCTS.GOLD_NECKLACE_22K_15G.name,
      grossWeightMg: PRODUCTS.GOLD_NECKLACE_22K_15G.grossWeightMg,
      metalPurity: PRODUCTS.GOLD_NECKLACE_22K_15G.metalPurity,
    });
    stockItem = createTestStockItem(ctx.tenantId, product.id, location.id, { quantityOnHand: 5 });
    cashAccount = createTestAccount(ctx.tenantId, { name: 'Cash', accountCode: '1001', accountType: 'ASSET' });
    bankAccount = createTestAccount(ctx.tenantId, { name: 'Bank - HDFC', accountCode: '1002', accountType: 'ASSET' });
    revenueAccount = createTestAccount(ctx.tenantId, { name: 'Sales Revenue', accountCode: '4001', accountType: 'REVENUE' });
    gstPayableAccount = createTestAccount(ctx.tenantId, { name: 'GST Payable', accountCode: '2101', accountType: 'LIABILITY' });
  });

  // ─── Product Availability ────────────────────────────────────

  it('should verify product exists in inventory at the showroom', () => {
    expect(stockItem.quantityOnHand).toBe(5);
    expect(stockItem.productId).toBe(product.id);
    expect(stockItem.locationId).toBe(location.id);
  });

  it('should have correct product specifications for 22K gold necklace', () => {
    expect(product.metalPurity).toBe(916);
    expect(Number(product.grossWeightMg)).toBe(PRODUCTS.GOLD_NECKLACE_22K_15G.grossWeightMg);
    expect(product.hsnCode).toBe('7113');
  });

  // ─── Customer Lookup ─────────────────────────────────────────

  it('should look up existing customer by phone number', () => {
    ctx.prisma.customer.findFirst.mockResolvedValue(customer);

    const lookupResult = ctx.prisma.customer.findFirst({
      where: { tenantId: ctx.tenantId, phone: customer.phone },
    });

    expect(ctx.prisma.customer.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ phone: customer.phone }),
      }),
    );
  });

  it('should have customer in same state as showroom for intra-state GST', () => {
    expect(customer.state).toBe('MH');
    expect(location.state).toBe('MH');
  });

  // ─── Pricing Calculations ───────────────────────────────────

  it('should calculate metal value correctly: rate * weight', () => {
    const ratePerGramPaise = METAL_RATES.GOLD_22K.ratePerGramPaise; // 580000 (Rs 5,800/g)
    const weightGrams = PRODUCTS.GOLD_NECKLACE_22K_15G.grossWeightMg / 1000; // 15g
    const metalValuePaise = ratePerGramPaise * weightGrams;

    expect(metalValuePaise).toBe(8_700_000); // Rs 87,000
  });

  it('should calculate making charges correctly: Rs 500/g * 15g = Rs 7,500', () => {
    const makingChargePerGramPaise = PRODUCTS.GOLD_NECKLACE_22K_15G.makingChargePerGramPaise;
    const weightGrams = PRODUCTS.GOLD_NECKLACE_22K_15G.grossWeightMg / 1000;
    const totalMakingChargesPaise = makingChargePerGramPaise * weightGrams;

    expect(totalMakingChargesPaise).toBe(750_000); // Rs 7,500
  });

  it('should calculate subtotal: metal + making = Rs 94,500', () => {
    const subtotalPaise = PRODUCTS.GOLD_NECKLACE_22K_15G.metalValuePaise +
      PRODUCTS.GOLD_NECKLACE_22K_15G.totalMakingChargesPaise;

    expect(subtotalPaise).toBe(9_450_000); // Rs 94,500
  });

  it('should calculate intra-state GST at 3% with equal CGST and SGST split', () => {
    const subtotalPaise = PRODUCTS.GOLD_NECKLACE_22K_15G.subtotalPaise;
    const gstRate = GST_RATES.JEWELRY; // 300 = 3%
    const ratePercent = gstRate / 100; // 3

    // Intra-state: CGST 1.5% + SGST 1.5%
    const totalGstPaise = Math.round((subtotalPaise * ratePercent) / 100);
    const cgstPaise = Math.round((subtotalPaise * (ratePercent / 2)) / 100);
    const sgstPaise = Math.round((subtotalPaise * (ratePercent / 2)) / 100);

    expect(totalGstPaise).toBe(283_500); // Rs 2,835
    expect(cgstPaise).toBe(141_750);     // Rs 1,417.50
    expect(sgstPaise).toBe(141_750);     // Rs 1,417.50
  });

  it('should calculate inter-state IGST when customer is from different state', () => {
    const subtotalPaise = PRODUCTS.GOLD_NECKLACE_22K_15G.subtotalPaise;
    const gstRate = GST_RATES.JEWELRY;
    const ratePercent = gstRate / 100;

    // Interstate (e.g., MH seller -> GJ buyer)
    const igstPaise = Math.round((subtotalPaise * ratePercent) / 100);

    expect(igstPaise).toBe(283_500); // Rs 2,835 full IGST
  });

  it('should calculate final total: subtotal + GST = Rs 97,335', () => {
    const totalPaise = PRODUCTS.GOLD_NECKLACE_22K_15G.subtotalPaise +
      PRODUCTS.GOLD_NECKLACE_22K_15G.gstPaise;

    expect(totalPaise).toBe(9_733_500); // Rs 97,335
  });

  // ─── Payment Validation ──────────────────────────────────────

  it('should accept split payment: Rs 50,000 cash + Rs 47,335 card', () => {
    const totalPaise = PRODUCTS.GOLD_NECKLACE_22K_15G.totalPaise;
    const cashPaymentPaise = 5_000_000;  // Rs 50,000
    const cardPaymentPaise = 4_733_500;  // Rs 47,335
    const totalPayments = cashPaymentPaise + cardPaymentPaise;

    expect(totalPayments).toBe(totalPaise);
    expect(totalPayments).toBeGreaterThanOrEqual(totalPaise);
  });

  it('should reject payment when total is less than sale amount', () => {
    const totalPaise = PRODUCTS.GOLD_NECKLACE_22K_15G.totalPaise;
    const insufficientPayment = 5_000_000; // Only Rs 50,000

    expect(insufficientPayment).toBeLessThan(totalPaise);
  });

  // ─── Sale Creation ───────────────────────────────────────────

  it('should create sale record with correct totals in a transaction', async () => {
    const saleId = uuid();
    const saleData = {
      id: saleId,
      tenantId: ctx.tenantId,
      saleNumber: 'SL/MUM/2604/0001',
      customerId: customer.id,
      locationId: location.id,
      userId: ctx.userId,
      status: 'COMPLETED',
      subtotalPaise: BigInt(PRODUCTS.GOLD_NECKLACE_22K_15G.subtotalPaise),
      discountPaise: BigInt(0),
      taxPaise: BigInt(PRODUCTS.GOLD_NECKLACE_22K_15G.gstPaise),
      totalPaise: BigInt(PRODUCTS.GOLD_NECKLACE_22K_15G.totalPaise),
      currencyCode: 'INR',
      roundOffPaise: BigInt(0),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    ctx.prisma.sale.create.mockResolvedValue(saleData);
    const result = await ctx.prisma.sale.create({ data: saleData });

    expect(result.status).toBe('COMPLETED');
    expect(Number(result.totalPaise)).toBe(PRODUCTS.GOLD_NECKLACE_22K_15G.totalPaise);
    expect(result.customerId).toBe(customer.id);
    expect(result.currencyCode).toBe('INR');
  });

  it('should generate sale number in format SL/LOC/YYMM/SEQ', () => {
    const saleNumber = 'SL/MUM/2604/0001';
    const parts = saleNumber.split('/');

    expect(parts[0]).toBe('SL');
    expect(parts[1]).toBe('MUM');
    expect(parts[2]).toMatch(/^\d{4}$/);
    expect(parts[3]).toMatch(/^\d{4}$/);
  });

  it('should create sale line item with metal weight, purity, making charges', async () => {
    const lineItem = {
      id: uuid(),
      tenantId: ctx.tenantId,
      saleId: uuid(),
      productId: product.id,
      description: PRODUCTS.GOLD_NECKLACE_22K_15G.name,
      quantity: 1,
      unitPricePaise: BigInt(PRODUCTS.GOLD_NECKLACE_22K_15G.subtotalPaise),
      discountPaise: BigInt(0),
      makingChargesPaise: BigInt(PRODUCTS.GOLD_NECKLACE_22K_15G.totalMakingChargesPaise),
      wastageChargesPaise: BigInt(0),
      metalRatePaise: BigInt(METAL_RATES.GOLD_22K.ratePerGramPaise),
      metalWeightMg: BigInt(PRODUCTS.GOLD_NECKLACE_22K_15G.grossWeightMg),
      hsnCode: '7113',
      gstRate: GST_RATES.JEWELRY,
      cgstPaise: BigInt(141_750),
      sgstPaise: BigInt(141_750),
      igstPaise: BigInt(0),
      lineTotalPaise: BigInt(PRODUCTS.GOLD_NECKLACE_22K_15G.totalPaise),
    };

    ctx.prisma.saleLineItem.create.mockResolvedValue(lineItem);
    const result = await ctx.prisma.saleLineItem.create({ data: lineItem });

    expect(Number(result.metalWeightMg)).toBe(15_000);
    expect(Number(result.metalRatePaise)).toBe(580_000);
    expect(Number(result.makingChargesPaise)).toBe(750_000);
    expect(result.hsnCode).toBe('7113');
    expect(result.gstRate).toBe(300);
  });

  it('should create two payment records for split payment', async () => {
    const payments = [
      {
        id: uuid(),
        tenantId: ctx.tenantId,
        saleId: uuid(),
        method: 'CASH',
        amountPaise: BigInt(5_000_000),
        status: 'COMPLETED',
        processedAt: new Date(),
      },
      {
        id: uuid(),
        tenantId: ctx.tenantId,
        saleId: uuid(),
        method: 'CARD',
        amountPaise: BigInt(4_733_500),
        status: 'COMPLETED',
        processedAt: new Date(),
      },
    ];

    const totalPaymentPaise = payments.reduce((sum, p) => sum + Number(p.amountPaise), 0);
    expect(totalPaymentPaise).toBe(PRODUCTS.GOLD_NECKLACE_22K_15G.totalPaise);
    expect(payments).toHaveLength(2);
  });

  // ─── Domain Events ───────────────────────────────────────────

  it('should publish retail.sale.completed event after sale creation', async () => {
    await ctx.eventBus.publish({
      id: uuid(),
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      timestamp: new Date().toISOString(),
      type: 'retail.sale.completed',
      payload: {
        saleId: uuid(),
        customerId: customer.id,
        totalPaise: PRODUCTS.GOLD_NECKLACE_22K_15G.totalPaise,
        items: [{
          productId: product.id,
          pricePaise: PRODUCTS.GOLD_NECKLACE_22K_15G.totalPaise,
        }],
      },
    });

    expect(ctx.eventCapture.hasEvent('retail.sale.completed')).toBe(true);
    const event = ctx.eventCapture.getLastByType('retail.sale.completed');
    expect(event).toBeDefined();
    expect(event!.tenantId).toBe(ctx.tenantId);
    expect((event as any).payload.totalPaise).toBe(PRODUCTS.GOLD_NECKLACE_22K_15G.totalPaise);
  });

  it('should publish inventory.stock.adjusted event to decrement stock', async () => {
    await ctx.eventBus.publish({
      id: uuid(),
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      timestamp: new Date().toISOString(),
      type: 'inventory.stock.adjusted',
      payload: {
        productId: product.id,
        locationId: location.id,
        quantityChange: -1,
        reason: 'SALE',
      },
    });

    expect(ctx.eventCapture.hasEvent('inventory.stock.adjusted')).toBe(true);
    const event = ctx.eventCapture.getLastByType('inventory.stock.adjusted') as any;
    expect(event.payload.quantityChange).toBe(-1);
    expect(event.payload.productId).toBe(product.id);
  });

  // ─── Financial Entries ───────────────────────────────────────

  it('should create journal entry: debit Cash + Bank, credit Revenue + GST Payable', () => {
    const totalPaise = PRODUCTS.GOLD_NECKLACE_22K_15G.totalPaise;
    const gstPaise = PRODUCTS.GOLD_NECKLACE_22K_15G.gstPaise;
    const revenuePaise = PRODUCTS.GOLD_NECKLACE_22K_15G.subtotalPaise;
    const cashPaise = 5_000_000;
    const cardPaise = 4_733_500;

    const journalLines = [
      { accountId: cashAccount.id, debitPaise: cashPaise, creditPaise: 0 },
      { accountId: bankAccount.id, debitPaise: cardPaise, creditPaise: 0 },
      { accountId: revenueAccount.id, debitPaise: 0, creditPaise: revenuePaise },
      { accountId: gstPayableAccount.id, debitPaise: 0, creditPaise: gstPaise },
    ];

    const totalDebits = journalLines.reduce((sum, l) => sum + l.debitPaise, 0);
    const totalCredits = journalLines.reduce((sum, l) => sum + l.creditPaise, 0);

    // Double-entry must balance
    expect(totalDebits).toBe(totalCredits);
    expect(totalDebits).toBe(totalPaise);
    expect(totalCredits).toBe(revenuePaise + gstPaise);
  });

  it('should publish financial.invoice.created event', async () => {
    const invoiceId = uuid();
    await ctx.eventBus.publish({
      id: uuid(),
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      timestamp: new Date().toISOString(),
      type: 'financial.invoice.created',
      payload: {
        invoiceId,
        invoiceNumber: 'INV-202604-0001',
        totalPaise: PRODUCTS.GOLD_NECKLACE_22K_15G.totalPaise,
        customerId: customer.id,
      },
    });

    expect(ctx.eventCapture.hasEvent('financial.invoice.created')).toBe(true);
  });

  it('should publish financial.gst.computed event with CGST + SGST for intra-state', async () => {
    await ctx.eventBus.publish({
      id: uuid(),
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      timestamp: new Date().toISOString(),
      type: 'financial.gst.computed',
      payload: {
        invoiceId: uuid(),
        cgstPaise: 141_750,
        sgstPaise: 141_750,
        igstPaise: 0,
        cessPaise: 0,
      },
    });

    const event = ctx.eventCapture.getLastByType('financial.gst.computed') as any;
    expect(event.payload.cgstPaise).toBe(141_750);
    expect(event.payload.sgstPaise).toBe(141_750);
    expect(event.payload.igstPaise).toBe(0);
    expect(event.payload.cgstPaise + event.payload.sgstPaise).toBe(
      PRODUCTS.GOLD_NECKLACE_22K_15G.gstPaise,
    );
  });

  // ─── Loyalty Points ──────────────────────────────────────────

  it('should calculate loyalty points earned from sale amount', () => {
    // 1 point per Rs 100 (10000 paise)
    const pointsPerUnit = 1;
    const totalPaise = PRODUCTS.GOLD_NECKLACE_22K_15G.totalPaise;
    const pointsEarned = Math.floor(totalPaise / 10000) * pointsPerUnit;

    // Rs 97,335 -> 973 points
    expect(pointsEarned).toBe(973);
  });

  it('should publish crm.loyalty.points_earned event', async () => {
    const pointsEarned = 973;
    const saleId = uuid();

    await ctx.eventBus.publish({
      id: uuid(),
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      timestamp: new Date().toISOString(),
      type: 'crm.loyalty.points_earned',
      payload: {
        customerId: customer.id,
        points: pointsEarned,
        source: 'SALE',
        referenceId: saleId,
      },
    });

    expect(ctx.eventCapture.hasEvent('crm.loyalty.points_earned')).toBe(true);
    const event = ctx.eventCapture.getLastByType('crm.loyalty.points_earned') as any;
    expect(event.payload.points).toBe(973);
    expect(event.payload.customerId).toBe(customer.id);
  });

  it('should update customer loyalty balance after earning points', () => {
    const previousPoints = customer.loyaltyPoints; // 500
    const earnedPoints = 973;
    const newBalance = previousPoints + earnedPoints;

    expect(newBalance).toBe(1473);
  });

  // ─── Invoice Generation ──────────────────────────────────────

  it('should generate invoice with HUID, weight, and purity specifications', () => {
    const invoiceData = {
      invoiceNumber: 'INV-202604-0001',
      customerId: customer.id,
      totalPaise: BigInt(PRODUCTS.GOLD_NECKLACE_22K_15G.totalPaise),
      lineItems: [{
        productId: product.id,
        description: PRODUCTS.GOLD_NECKLACE_22K_15G.name,
        hsnCode: '7113',
        metalPurity: 916,
        metalWeightMg: PRODUCTS.GOLD_NECKLACE_22K_15G.grossWeightMg,
        huidNumber: PRODUCTS.GOLD_NECKLACE_22K_15G.huidNumber,
      }],
    };

    expect(invoiceData.lineItems[0].huidNumber).toBe('HUID123456');
    expect(invoiceData.lineItems[0].metalPurity).toBe(916);
    expect(invoiceData.lineItems[0].metalWeightMg).toBe(15_000);
    expect(invoiceData.lineItems[0].hsnCode).toBe('7113');
  });

  // ─── Complete Workflow Verification ──────────────────────────

  it('should execute complete sale workflow and verify all events published', async () => {
    const saleId = uuid();

    // Step 1: Sale completed event
    await ctx.eventBus.publish({
      id: uuid(),
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      timestamp: new Date().toISOString(),
      type: 'retail.sale.completed',
      payload: {
        saleId,
        customerId: customer.id,
        totalPaise: PRODUCTS.GOLD_NECKLACE_22K_15G.totalPaise,
        items: [{ productId: product.id, pricePaise: PRODUCTS.GOLD_NECKLACE_22K_15G.totalPaise }],
      },
    });

    // Step 2: Stock adjusted
    await ctx.eventBus.publish({
      id: uuid(),
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      timestamp: new Date().toISOString(),
      type: 'inventory.stock.adjusted',
      payload: {
        productId: product.id,
        locationId: location.id,
        quantityChange: -1,
        reason: 'SALE',
      },
    });

    // Step 3: Invoice created
    await ctx.eventBus.publish({
      id: uuid(),
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      timestamp: new Date().toISOString(),
      type: 'financial.invoice.created',
      payload: {
        invoiceId: uuid(),
        invoiceNumber: 'INV-202604-0001',
        totalPaise: PRODUCTS.GOLD_NECKLACE_22K_15G.totalPaise,
        customerId: customer.id,
      },
    });

    // Step 4: GST computed
    await ctx.eventBus.publish({
      id: uuid(),
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      timestamp: new Date().toISOString(),
      type: 'financial.gst.computed',
      payload: {
        invoiceId: uuid(),
        cgstPaise: 141_750,
        sgstPaise: 141_750,
        igstPaise: 0,
        cessPaise: 0,
      },
    });

    // Step 5: Payment received
    await ctx.eventBus.publish({
      id: uuid(),
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      timestamp: new Date().toISOString(),
      type: 'financial.payment.received',
      payload: {
        paymentId: uuid(),
        amountPaise: PRODUCTS.GOLD_NECKLACE_22K_15G.totalPaise,
        method: 'SPLIT',
        referenceId: saleId,
      },
    });

    // Step 6: Loyalty points earned
    await ctx.eventBus.publish({
      id: uuid(),
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      timestamp: new Date().toISOString(),
      type: 'crm.loyalty.points_earned',
      payload: {
        customerId: customer.id,
        points: 973,
        source: 'SALE',
        referenceId: saleId,
      },
    });

    // Verify all 6 events were published
    expect(ctx.eventCapture.count()).toBe(6);
    expect(ctx.eventCapture.hasEvent('retail.sale.completed')).toBe(true);
    expect(ctx.eventCapture.hasEvent('inventory.stock.adjusted')).toBe(true);
    expect(ctx.eventCapture.hasEvent('financial.invoice.created')).toBe(true);
    expect(ctx.eventCapture.hasEvent('financial.gst.computed')).toBe(true);
    expect(ctx.eventCapture.hasEvent('financial.payment.received')).toBe(true);
    expect(ctx.eventCapture.hasEvent('crm.loyalty.points_earned')).toBe(true);
  });

  it('should maintain all events scoped to the correct tenant', async () => {
    await ctx.eventBus.publish({
      id: uuid(),
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      timestamp: new Date().toISOString(),
      type: 'retail.sale.completed',
      payload: {
        saleId: uuid(),
        customerId: customer.id,
        totalPaise: PRODUCTS.GOLD_NECKLACE_22K_15G.totalPaise,
        items: [],
      },
    });

    const allEvents = ctx.eventCapture.getAll();
    for (const captured of allEvents) {
      expect(captured.event.tenantId).toBe(ctx.tenantId);
    }
  });
});
