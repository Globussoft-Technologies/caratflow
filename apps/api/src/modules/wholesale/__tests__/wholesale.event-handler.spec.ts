import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WholesaleEventHandler } from '../wholesale.event-handler';
import { createMockPrismaService, createMockEventBus, TEST_TENANT_ID, TEST_USER_ID } from '../../../__tests__/setup';

describe('WholesaleEventHandler', () => {
  let handler: WholesaleEventHandler;
  let mockEventBus: ReturnType<typeof createMockEventBus>;
  let mockPrisma: ReturnType<typeof createMockPrismaService>;
  let subscribedHandlers: Map<string, Function>;

  beforeEach(() => {
    mockEventBus = createMockEventBus();
    mockPrisma = createMockPrismaService();

    subscribedHandlers = new Map();
    mockEventBus.subscribe.mockImplementation((eventType: string, handlerFn: Function) => {
      subscribedHandlers.set(eventType, handlerFn);
    });

    handler = new WholesaleEventHandler(mockEventBus as any, mockPrisma as any);
    handler.onModuleInit();
  });

  it('subscribes to the correct event types', () => {
    expect(mockEventBus.subscribe).toHaveBeenCalledTimes(2);
    expect(subscribedHandlers.has('inventory.stock.adjusted')).toBe(true);
    expect(subscribedHandlers.has('financial.payment.received')).toBe(true);
  });

  it('handles inventory.stock.adjusted and checks reorder level when stock decreases', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    mockPrisma.stockItem.findFirst.mockResolvedValue({
      id: 'stock-1',
      tenantId: TEST_TENANT_ID,
      productId: 'prod-1',
      locationId: 'loc-1',
      quantityOnHand: 3,
      reorderLevel: 5,
    });

    const event = {
      type: 'inventory.stock.adjusted',
      tenantId: TEST_TENANT_ID,
      userId: TEST_USER_ID,
      payload: {
        productId: 'prod-1',
        locationId: 'loc-1',
        quantityChange: -2,
        reason: 'sale',
      },
    };

    await subscribedHandlers.get('inventory.stock.adjusted')!(event);

    expect(mockPrisma.stockItem.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: TEST_TENANT_ID, productId: 'prod-1', locationId: 'loc-1' },
      }),
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Reorder alert'),
    );
    consoleSpy.mockRestore();
  });

  it('does not check reorder level when stock increases', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const event = {
      type: 'inventory.stock.adjusted',
      tenantId: TEST_TENANT_ID,
      userId: TEST_USER_ID,
      payload: {
        productId: 'prod-1',
        locationId: 'loc-1',
        quantityChange: 5,
        reason: 'receipt',
      },
    };

    await subscribedHandlers.get('inventory.stock.adjusted')!(event);

    expect(mockPrisma.stockItem.findFirst).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('handles financial.payment.received by updating outstanding balance', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    mockPrisma.outstandingBalance.findFirst.mockResolvedValue({
      id: 'ob-1',
      tenantId: TEST_TENANT_ID,
      invoiceId: 'inv-1',
      invoiceNumber: 'INV-001',
      entityType: 'SUPPLIER',
      entityId: 'sup-1',
      originalPaise: 1000000n,
      paidPaise: 500000n,
      balancePaise: 500000n,
      status: 'CURRENT',
    });
    mockPrisma.outstandingBalance.update.mockResolvedValue({});
    mockPrisma.outstandingBalance.aggregate.mockResolvedValue({
      _sum: { balancePaise: 200000n },
    });
    mockPrisma.creditLimit.findFirst.mockResolvedValue({
      id: 'cl-1',
      tenantId: TEST_TENANT_ID,
      entityType: 'SUPPLIER',
      entityId: 'sup-1',
      creditLimitPaise: 2000000n,
      usedPaise: 500000n,
      availablePaise: 1500000n,
    });
    mockPrisma.creditLimit.update.mockResolvedValue({});

    const event = {
      type: 'financial.payment.received',
      tenantId: TEST_TENANT_ID,
      userId: TEST_USER_ID,
      payload: {
        paymentId: 'pay-1',
        amountPaise: 300000,
        referenceId: 'inv-1',
      },
    };

    await subscribedHandlers.get('financial.payment.received')!(event);

    expect(mockPrisma.outstandingBalance.update).toHaveBeenCalled();
    expect(mockPrisma.creditLimit.update).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('skips outstanding balance update when no matching invoice found', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    mockPrisma.outstandingBalance.findFirst.mockResolvedValue(null);

    const event = {
      type: 'financial.payment.received',
      tenantId: TEST_TENANT_ID,
      userId: TEST_USER_ID,
      payload: {
        paymentId: 'pay-2',
        amountPaise: 300000,
        referenceId: 'nonexistent-inv',
      },
    };

    await subscribedHandlers.get('financial.payment.received')!(event);

    expect(mockPrisma.outstandingBalance.update).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('ignores events with mismatched type', async () => {
    const event = {
      type: 'some.other.event',
      tenantId: TEST_TENANT_ID,
      userId: TEST_USER_ID,
      payload: {
        productId: 'prod-1',
        locationId: 'loc-1',
        quantityChange: -2,
        reason: 'sale',
      },
    };

    await subscribedHandlers.get('inventory.stock.adjusted')!(event);

    expect(mockPrisma.stockItem.findFirst).not.toHaveBeenCalled();
  });
});
