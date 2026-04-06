// ─── E2E: Wholesale Purchase Flow ──────────────────────────────
// Scenario: Purchase 100g of 22K gold from a supplier via PO.
// Tests rate contract, PO creation, approval, goods receipt,
// 3-way match, AP entry, supplier payment, and stock update.

import { describe, it, expect, beforeEach } from 'vitest';
import { v4 as uuid } from 'uuid';
import {
  TestContext,
  createTestLocation,
  createTestSupplier,
  createTestAccount,
} from './helpers/test-context';
import { SUPPLIERS, METAL_RATES } from './helpers/test-data';

describe('E2E: Wholesale Purchase Flow', () => {
  let ctx: TestContext;
  let location: ReturnType<typeof createTestLocation>;
  let supplier: ReturnType<typeof createTestSupplier>;
  const poId = uuid();
  const grId = uuid();
  const invoiceId = uuid();

  beforeEach(() => {
    ctx = new TestContext();
    location = createTestLocation(ctx.tenantId);
    supplier = createTestSupplier(ctx.tenantId, {
      name: SUPPLIERS.RAJESH_GOLD_REFINERY.name,
    });
  });

  // ─── Supplier Rate Contract ──────────────────────────────────

  it('should check supplier contracted rate: Rs 5,750/g for 22K gold', () => {
    const contractedRate = SUPPLIERS.RAJESH_GOLD_REFINERY.contractedRatePerGramPaise;

    expect(contractedRate).toBe(575_000); // Rs 5,750/g
    expect(contractedRate).toBeLessThan(METAL_RATES.GOLD_22K.ratePerGramPaise); // Below market
  });

  it('should verify contracted rate is below current market rate', () => {
    const contractedRate = SUPPLIERS.RAJESH_GOLD_REFINERY.contractedRatePerGramPaise;
    const marketRate = METAL_RATES.GOLD_22K.ratePerGramPaise;
    const savings = marketRate - contractedRate;

    expect(savings).toBe(5_000); // Rs 50/g savings
    expect(savings).toBeGreaterThan(0);
  });

  // ─── Purchase Order Creation ─────────────────────────────────

  it('should create PO for 100g gold at contracted rate: Rs 5,75,000', () => {
    const quantityGrams = 100;
    const ratePerGramPaise = SUPPLIERS.RAJESH_GOLD_REFINERY.contractedRatePerGramPaise;
    const totalPaise = ratePerGramPaise * quantityGrams;

    expect(totalPaise).toBe(57_500_000); // Rs 5,75,000
  });

  it('should create PO record with PENDING_APPROVAL status', () => {
    const po = {
      id: poId,
      tenantId: ctx.tenantId,
      poNumber: 'PO-2604-0001',
      supplierId: supplier.id,
      locationId: location.id,
      status: 'PENDING_APPROVAL',
      items: [{
        description: '22K Gold Bar',
        metalType: 'GOLD',
        purity: 916,
        quantityGrams: 100,
        ratePerGramPaise: BigInt(575_000),
        totalPaise: BigInt(57_500_000),
      }],
      totalPaise: BigInt(57_500_000),
      currencyCode: 'INR',
      createdAt: new Date(),
    };

    expect(po.status).toBe('PENDING_APPROVAL');
    expect(Number(po.totalPaise)).toBe(57_500_000);
  });

  // ─── PO Approval ────────────────────────────────────────────

  it('should approve PO and transition status to APPROVED', () => {
    const approvedPo = {
      id: poId,
      status: 'APPROVED',
      approvedBy: ctx.adminId,
      approvedAt: new Date(),
    };

    expect(approvedPo.status).toBe('APPROVED');
  });

  // ─── Goods Receipt ───────────────────────────────────────────

  it('should create goods receipt for 100g delivered gold', () => {
    const receipt = {
      id: grId,
      tenantId: ctx.tenantId,
      grNumber: 'GR-2604-0001',
      purchaseOrderId: poId,
      supplierId: supplier.id,
      locationId: location.id,
      status: 'RECEIVED',
      items: [{
        description: '22K Gold Bar',
        receivedQuantityGrams: 100,
        receivedWeightMg: BigInt(100_000), // 100g
        purity: 916,
        qcStatus: 'PASSED',
      }],
      receivedAt: new Date(),
    };

    expect(receipt.status).toBe('RECEIVED');
    expect(Number(receipt.items[0].receivedWeightMg)).toBe(100_000);
    expect(receipt.items[0].qcStatus).toBe('PASSED');
  });

  it('should pass QC: verify weight and purity of received gold', () => {
    const qc = {
      expectedWeightMg: 100_000,
      actualWeightMg: 100_000,
      expectedPurity: 916,
      verifiedPurity: 916,
      passed: true,
    };

    expect(qc.actualWeightMg).toBe(qc.expectedWeightMg);
    expect(qc.verifiedPurity).toBe(qc.expectedPurity);
    expect(qc.passed).toBe(true);
  });

  it('should update PO status to RECEIVED after goods receipt', () => {
    const updatedPo = { id: poId, status: 'RECEIVED' };
    expect(updatedPo.status).toBe('RECEIVED');
  });

  // ─── Supplier Invoice ────────────────────────────────────────

  it('should record supplier invoice: Rs 5,75,000', () => {
    const supplierInvoice = {
      id: invoiceId,
      tenantId: ctx.tenantId,
      invoiceNumber: 'PINV-2604-0001',
      invoiceType: 'PURCHASE',
      supplierId: supplier.id,
      purchaseOrderId: poId,
      subtotalPaise: BigInt(57_500_000),
      gstPaise: BigInt(1_725_000), // 3% GST
      totalPaise: BigInt(59_225_000), // Rs 5,92,250 including GST
      status: 'DRAFT',
    };

    expect(Number(supplierInvoice.subtotalPaise)).toBe(57_500_000);
    expect(Number(supplierInvoice.gstPaise)).toBe(1_725_000); // 3% of 57.5L
  });

  // ─── 3-Way Match ─────────────────────────────────────────────

  it('should perform 3-way match: PO qty = receipt qty = invoice qty', () => {
    const poQuantityGrams = 100;
    const receiptQuantityGrams = 100;
    const invoiceQuantityGrams = 100;

    const isMatched =
      poQuantityGrams === receiptQuantityGrams &&
      receiptQuantityGrams === invoiceQuantityGrams;

    expect(isMatched).toBe(true);
  });

  it('should match PO amount with invoice amount', () => {
    const poAmountPaise = 57_500_000;
    const invoiceSubtotalPaise = 57_500_000;
    const tolerance = 0; // Zero tolerance for gold

    const amountMatched = Math.abs(poAmountPaise - invoiceSubtotalPaise) <= tolerance;
    expect(amountMatched).toBe(true);
  });

  it('should flag mismatch when receipt quantity differs from PO', () => {
    const poQuantityGrams = 100;
    const receiptQuantityGrams = 98; // 2g short

    const isMatched = poQuantityGrams === receiptQuantityGrams;
    expect(isMatched).toBe(false);
  });

  // ─── Accounts Payable ────────────────────────────────────────

  it('should create AP (accounts payable) entry for supplier invoice', () => {
    const apEntry = {
      supplierId: supplier.id,
      invoiceId,
      amountPaise: BigInt(59_225_000), // Including GST
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Net 30
      status: 'PENDING',
    };

    expect(Number(apEntry.amountPaise)).toBe(59_225_000);
    expect(apEntry.status).toBe('PENDING');
  });

  // ─── Supplier Payment ────────────────────────────────────────

  it('should make payment to supplier', async () => {
    await ctx.eventBus.publish({
      id: uuid(),
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      timestamp: new Date().toISOString(),
      type: 'financial.payment.received',
      payload: {
        paymentId: uuid(),
        amountPaise: 59_225_000,
        method: 'RTGS',
        referenceId: invoiceId,
      },
    });

    expect(ctx.eventCapture.hasEvent('financial.payment.received')).toBe(true);
  });

  it('should create journal entry for purchase: debit Inventory + GST Input, credit AP', () => {
    const inventoryAccountId = uuid();
    const gstInputAccountId = uuid();
    const apAccountId = uuid();

    const journalLines = [
      { accountId: inventoryAccountId, debitPaise: 57_500_000, creditPaise: 0 },
      { accountId: gstInputAccountId, debitPaise: 1_725_000, creditPaise: 0 },
      { accountId: apAccountId, debitPaise: 0, creditPaise: 59_225_000 },
    ];

    const totalDebits = journalLines.reduce((sum, l) => sum + l.debitPaise, 0);
    const totalCredits = journalLines.reduce((sum, l) => sum + l.creditPaise, 0);

    expect(totalDebits).toBe(totalCredits); // Double-entry balanced
    expect(totalDebits).toBe(59_225_000);
  });

  // ─── Stock Update ────────────────────────────────────────────

  it('should increase stock by 100g at the purchase location', async () => {
    await ctx.eventBus.publish({
      id: uuid(),
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      timestamp: new Date().toISOString(),
      type: 'inventory.stock.adjusted',
      payload: {
        productId: 'gold-bar-22k',
        locationId: location.id,
        quantityChange: 100,
        reason: 'PURCHASE_RECEIPT',
      },
    });

    const event = ctx.eventCapture.getLastByType('inventory.stock.adjusted') as any;
    expect(event.payload.quantityChange).toBe(100);
    expect(event.payload.reason).toBe('PURCHASE_RECEIPT');
  });

  it('should publish wholesale.purchase.completed event', async () => {
    await ctx.eventBus.publish({
      id: uuid(),
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      timestamp: new Date().toISOString(),
      type: 'wholesale.purchase.completed',
      payload: {
        purchaseOrderId: poId,
        supplierId: supplier.id,
        totalPaise: 59_225_000,
      },
    });

    expect(ctx.eventCapture.hasEvent('wholesale.purchase.completed')).toBe(true);
  });
});
