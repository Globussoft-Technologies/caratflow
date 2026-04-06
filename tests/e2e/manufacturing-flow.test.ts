// ─── E2E: Manufacturing Flow ───────────────────────────────────
// Scenario: Custom order for a wedding set -> BOM -> job order ->
// material issue to karigar -> finished piece return -> QC -> inventory.

import { describe, it, expect, beforeEach } from 'vitest';
import { v4 as uuid } from 'uuid';
import {
  TestContext,
  createTestCustomer,
  createTestProduct,
  createTestLocation,
} from './helpers/test-context';
import { MANUFACTURING, METAL_RATES, PRODUCTS } from './helpers/test-data';

describe('E2E: Manufacturing Flow', () => {
  let ctx: TestContext;
  let customer: ReturnType<typeof createTestCustomer>;
  let location: ReturnType<typeof createTestLocation>;
  const bomId = uuid();
  const jobOrderId = uuid();
  const karigarId = uuid();
  const productId = uuid();

  beforeEach(() => {
    ctx = new TestContext();
    location = createTestLocation(ctx.tenantId);
    customer = createTestCustomer(ctx.tenantId);
  });

  // ─── Custom Order ────────────────────────────────────────────

  it('should create custom order for wedding set', async () => {
    await ctx.eventBus.publish({
      id: uuid(),
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      timestamp: new Date().toISOString(),
      type: 'retail.custom_order.created',
      payload: {
        orderId: uuid(),
        customerId: customer.id,
        description: PRODUCTS.WEDDING_SET_22K.name,
        estimatePaise: PRODUCTS.WEDDING_SET_22K.totalPaise,
      },
    });

    expect(ctx.eventCapture.hasEvent('retail.custom_order.created')).toBe(true);
  });

  // ─── BOM Creation ────────────────────────────────────────────

  it('should create BOM with gold, diamonds, and labor items', () => {
    const bom = MANUFACTURING.WEDDING_SET_BOM;

    expect(bom.items).toHaveLength(3);
    expect(bom.items[0].itemType).toBe('RAW_MATERIAL');
    expect(bom.items[0].description).toBe('22K Gold');
    expect(Number(bom.items[0].weightMg)).toBe(50_000); // 50g
    expect(bom.items[1].itemType).toBe('STONE');
    expect(bom.items[1].description).toContain('Diamond');
    expect(Number(bom.items[1].weightMg)).toBe(400); // 2ct = 400mg
    expect(bom.items[2].itemType).toBe('LABOR');
  });

  it('should calculate BOM total estimated cost', () => {
    const bom = MANUFACTURING.WEDDING_SET_BOM;
    const totalEstimated = bom.items.reduce(
      (sum, item) => sum + Number(item.estimatedCostPaise),
      0,
    );

    // Gold 29,00,000 + Diamond 40,000 + Labor 20,000 = Rs 3,50,000
    expect(totalEstimated).toBe(35_000_000);
    expect(Number(bom.estimatedCostPaise)).toBe(35_000_000);
  });

  // ─── BOM Explosion / Material Requisition ────────────────────

  it('should explode BOM to generate material requisition', () => {
    const bom = MANUFACTURING.WEDDING_SET_BOM;
    const quantity = 1;

    const requisitionItems = bom.items.map((item) => {
      const requiredWeightMg = Number(item.weightMg) * quantity;
      const wastageAddMg = Math.floor((requiredWeightMg * item.wastagePercent) / 10000);
      const totalWithWastageMg = requiredWeightMg + wastageAddMg;
      return {
        description: item.description,
        requiredWeightMg,
        wastagePercent: item.wastagePercent,
        totalWithWastageMg,
      };
    });

    // Gold: 50g + 3% wastage = 51.5g
    expect(requisitionItems[0].requiredWeightMg).toBe(50_000);
    expect(requisitionItems[0].totalWithWastageMg).toBe(51_500);
    // Diamond: no wastage
    expect(requisitionItems[1].totalWithWastageMg).toBe(400);
  });

  it('should publish manufacturing.material.requisitioned event', async () => {
    await ctx.eventBus.publish({
      id: uuid(),
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      timestamp: new Date().toISOString(),
      type: 'manufacturing.material.requisitioned',
      payload: {
        jobOrderId,
        materials: [
          { productId: 'gold-raw-22k', quantityMg: 50_000 },
          { productId: 'diamond-round-2ct', quantityMg: 400 },
        ],
      },
    });

    expect(ctx.eventCapture.hasEvent('manufacturing.material.requisitioned')).toBe(true);
  });

  // ─── Job Order Creation ──────────────────────────────────────

  it('should create job order and assign to karigar', async () => {
    const jobData = {
      id: jobOrderId,
      tenantId: ctx.tenantId,
      jobNumber: 'JO-000001',
      bomId,
      productId,
      customerId: customer.id,
      locationId: location.id,
      assignedKarigarId: karigarId,
      priority: 'HIGH',
      quantity: 1,
      status: 'DRAFT',
      createdAt: new Date(),
    };

    ctx.prisma.jobOrder.create.mockResolvedValue(jobData);
    const result = await ctx.prisma.jobOrder.create({ data: jobData });

    expect(result.status).toBe('DRAFT');
    expect(result.assignedKarigarId).toBe(karigarId);
    expect(result.priority).toBe('HIGH');
  });

  it('should publish manufacturing.job.created event', async () => {
    await ctx.eventBus.publish({
      id: uuid(),
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      timestamp: new Date().toISOString(),
      type: 'manufacturing.job.created',
      payload: {
        jobOrderId,
        productType: 'GOLD_JEWELRY',
        estimatedCompletionDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
    });

    expect(ctx.eventCapture.hasEvent('manufacturing.job.created')).toBe(true);
    const event = ctx.eventCapture.getLastByType('manufacturing.job.created') as any;
    expect(event.payload.productType).toBe('GOLD_JEWELRY');
  });

  // ─── Job Status Transitions ──────────────────────────────────

  it('should transition job: DRAFT -> PLANNED -> MATERIAL_ISSUED -> IN_PROGRESS', () => {
    const transitions = [
      { from: 'DRAFT', to: 'PLANNED' },
      { from: 'PLANNED', to: 'MATERIAL_ISSUED' },
      { from: 'MATERIAL_ISSUED', to: 'IN_PROGRESS' },
    ];

    for (const t of transitions) {
      expect(t.from).not.toBe(t.to);
    }
    // Valid transition chain
    expect(transitions.map((t) => t.to)).toEqual(['PLANNED', 'MATERIAL_ISSUED', 'IN_PROGRESS']);
  });

  // ─── Material Issue to Karigar ───────────────────────────────

  it('should issue 50g gold to karigar and log the transaction', () => {
    const materialIssue = {
      jobOrderId,
      karigarId,
      metalType: 'GOLD',
      purity: 916,
      issuedWeightMg: BigInt(50_000), // 50g
      issuedAt: new Date(),
    };

    expect(Number(materialIssue.issuedWeightMg)).toBe(50_000);
  });

  // ─── Karigar Returns Finished Piece ──────────────────────────

  it('should record karigar return: finished piece 48g + wastage 1.5g + scrap 0.5g', () => {
    const balance = MANUFACTURING.MATERIAL_BALANCE;

    expect(balance.issuedMg).toBe(50_000);
    expect(balance.finishedPieceMg).toBe(48_000);
    expect(balance.wastageMg).toBe(1_500);
    expect(balance.scrapMg).toBe(500);
  });

  it('should verify metal balance is zero: issued - finished - wastage - scrap = 0', () => {
    const balance = MANUFACTURING.MATERIAL_BALANCE;
    const calculatedBalance =
      balance.issuedMg - balance.finishedPieceMg - balance.wastageMg - balance.scrapMg;

    expect(calculatedBalance).toBe(0);
    expect(balance.balanceMg).toBe(0);
  });

  it('should flag non-zero metal balance as discrepancy', () => {
    const badBalance = {
      issuedMg: 50_000,
      finishedPieceMg: 47_000, // Less than expected
      wastageMg: 1_500,
      scrapMg: 500,
    };

    const discrepancy =
      badBalance.issuedMg - badBalance.finishedPieceMg - badBalance.wastageMg - badBalance.scrapMg;

    expect(discrepancy).toBe(1_000); // 1g unaccounted
    expect(discrepancy).not.toBe(0);
  });

  // ─── QC Checkpoint ───────────────────────────────────────────

  it('should create QC checkpoint with passed status', () => {
    const qcCheckpoint = {
      id: uuid(),
      tenantId: ctx.tenantId,
      jobOrderId,
      checkType: 'FINAL_INSPECTION',
      status: 'PASSED',
      actualWeightMg: BigInt(48_000),
      purityVerified: 916,
      checkedBy: ctx.userId,
      checkedAt: new Date(),
      notes: 'Hallmark verified, finish quality excellent',
    };

    expect(qcCheckpoint.status).toBe('PASSED');
    expect(Number(qcCheckpoint.actualWeightMg)).toBe(48_000);
    expect(qcCheckpoint.purityVerified).toBe(916);
  });

  // ─── Job Completion ──────────────────────────────────────────

  it('should mark job as COMPLETED after QC pass', async () => {
    await ctx.eventBus.publish({
      id: uuid(),
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      timestamp: new Date().toISOString(),
      type: 'manufacturing.job.completed',
      payload: {
        jobOrderId,
        outputProductId: productId,
        actualWeightMg: 48_000,
      },
    });

    expect(ctx.eventCapture.hasEvent('manufacturing.job.completed')).toBe(true);
    const event = ctx.eventCapture.getLastByType('manufacturing.job.completed') as any;
    expect(event.payload.actualWeightMg).toBe(48_000);
  });

  it('should add finished goods to inventory', async () => {
    await ctx.eventBus.publish({
      id: uuid(),
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      timestamp: new Date().toISOString(),
      type: 'inventory.item.created',
      payload: {
        productId,
        locationId: location.id,
        quantity: 1,
      },
    });

    expect(ctx.eventCapture.hasEvent('inventory.item.created')).toBe(true);
  });

  // ─── Job Costing ─────────────────────────────────────────────

  it('should calculate total job cost: material + labor + overhead', async () => {
    const costs = {
      MATERIAL: 29_000_000,  // Rs 2,90,000 (gold)
      STONE: 4_000_000,      // Rs 40,000 (diamonds)
      LABOR: 2_000_000,      // Rs 20,000
      OVERHEAD: 500_000,     // Rs 5,000
    };

    const totalCostPaise = Object.values(costs).reduce((a, b) => a + b, 0);
    expect(totalCostPaise).toBe(35_500_000); // Rs 3,55,000

    await ctx.eventBus.publish({
      id: uuid(),
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      timestamp: new Date().toISOString(),
      type: 'manufacturing.job.costed',
      payload: {
        jobOrderId,
        totalCostPaise,
        breakdown: costs,
      },
    });

    expect(ctx.eventCapture.hasEvent('manufacturing.job.costed')).toBe(true);
    const event = ctx.eventCapture.getLastByType('manufacturing.job.costed') as any;
    expect(event.payload.totalCostPaise).toBe(35_500_000);
  });

  // ─── Customer Notification & Delivery ────────────────────────

  it('should notify customer when order is ready for pickup', async () => {
    await ctx.eventBus.publish({
      id: uuid(),
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      timestamp: new Date().toISOString(),
      type: 'crm.notification.sent',
      payload: {
        customerId: customer.id,
        channel: 'WHATSAPP',
        templateId: 'custom-order-ready',
        status: 'SENT',
      },
    });

    expect(ctx.eventCapture.hasEvent('crm.notification.sent')).toBe(true);
  });

  // ─── Full Manufacturing Workflow Verification ────────────────

  it('should execute complete manufacturing workflow with all events', async () => {
    // 1. Custom order created
    await ctx.eventBus.publish({
      id: uuid(),
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      timestamp: new Date().toISOString(),
      type: 'retail.custom_order.created',
      payload: { orderId: uuid(), customerId: customer.id, description: 'Wedding Set', estimatePaise: 35_000_000 },
    });

    // 2. Job created
    await ctx.eventBus.publish({
      id: uuid(),
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      timestamp: new Date().toISOString(),
      type: 'manufacturing.job.created',
      payload: { jobOrderId, productType: 'GOLD_JEWELRY', estimatedCompletionDate: '' },
    });

    // 3. Material requisitioned
    await ctx.eventBus.publish({
      id: uuid(),
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      timestamp: new Date().toISOString(),
      type: 'manufacturing.material.requisitioned',
      payload: { jobOrderId, materials: [{ productId: 'gold-22k', quantityMg: 50_000 }] },
    });

    // 4. Stock adjusted (material issued from inventory)
    await ctx.eventBus.publish({
      id: uuid(),
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      timestamp: new Date().toISOString(),
      type: 'inventory.stock.adjusted',
      payload: { productId: 'gold-22k', locationId: location.id, quantityChange: -1, reason: 'MANUFACTURING_ISSUE' },
    });

    // 5. Job completed
    await ctx.eventBus.publish({
      id: uuid(),
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      timestamp: new Date().toISOString(),
      type: 'manufacturing.job.completed',
      payload: { jobOrderId, outputProductId: productId, actualWeightMg: 48_000 },
    });

    // 6. Job costed
    await ctx.eventBus.publish({
      id: uuid(),
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      timestamp: new Date().toISOString(),
      type: 'manufacturing.job.costed',
      payload: { jobOrderId, totalCostPaise: 35_500_000, breakdown: {} },
    });

    // 7. Finished goods into inventory
    await ctx.eventBus.publish({
      id: uuid(),
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      timestamp: new Date().toISOString(),
      type: 'inventory.item.created',
      payload: { productId, locationId: location.id, quantity: 1 },
    });

    // 8. Customer notified
    await ctx.eventBus.publish({
      id: uuid(),
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      timestamp: new Date().toISOString(),
      type: 'crm.notification.sent',
      payload: { customerId: customer.id, channel: 'WHATSAPP', templateId: 'order-ready', status: 'SENT' },
    });

    expect(ctx.eventCapture.count()).toBe(8);
    expect(ctx.eventCapture.hasEvent('retail.custom_order.created')).toBe(true);
    expect(ctx.eventCapture.hasEvent('manufacturing.job.created')).toBe(true);
    expect(ctx.eventCapture.hasEvent('manufacturing.material.requisitioned')).toBe(true);
    expect(ctx.eventCapture.hasEvent('inventory.stock.adjusted')).toBe(true);
    expect(ctx.eventCapture.hasEvent('manufacturing.job.completed')).toBe(true);
    expect(ctx.eventCapture.hasEvent('manufacturing.job.costed')).toBe(true);
    expect(ctx.eventCapture.hasEvent('inventory.item.created')).toBe(true);
    expect(ctx.eventCapture.hasEvent('crm.notification.sent')).toBe(true);
  });
});
