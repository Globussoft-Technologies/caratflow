import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReportingEventHandler } from '../reporting.event-handler';
import { createMockEventBus, TEST_TENANT_ID } from '../../../__tests__/setup';

describe('ReportingEventHandler', () => {
  let handler: ReportingEventHandler;
  let mockEventBus: ReturnType<typeof createMockEventBus>;
  let subscribedHandlers: Map<string, Function>;

  const TENANT = TEST_TENANT_ID;

  beforeEach(() => {
    mockEventBus = createMockEventBus();
    subscribedHandlers = new Map();

    mockEventBus.subscribe.mockImplementation((eventType: string, fn: Function) => {
      subscribedHandlers.set(eventType, fn);
    });

    handler = new ReportingEventHandler(mockEventBus as any);
    handler.onModuleInit();
  });

  it('subscribes to all major domain event types for metrics tracking', () => {
    expect(subscribedHandlers.has('retail.sale.completed')).toBe(true);
    expect(subscribedHandlers.has('retail.return.processed')).toBe(true);
    expect(subscribedHandlers.has('inventory.stock.adjusted')).toBe(true);
    expect(subscribedHandlers.has('inventory.transfer.completed')).toBe(true);
    expect(subscribedHandlers.has('manufacturing.job.completed')).toBe(true);
    expect(subscribedHandlers.has('manufacturing.job.costed')).toBe(true);
    expect(subscribedHandlers.has('financial.payment.received')).toBe(true);
    expect(subscribedHandlers.has('financial.invoice.created')).toBe(true);
    expect(subscribedHandlers.has('crm.customer.created')).toBe(true);
    expect(subscribedHandlers.has('crm.loyalty.points_earned')).toBe(true);
  });

  it('processes retail.sale.completed events without error', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const event = {
      type: 'retail.sale.completed',
      tenantId: TENANT,
      payload: {
        saleId: 'sale-1',
        customerId: 'cust-1',
        totalPaise: 5000000,
        items: [{ productId: 'prod-1' }, { productId: 'prod-2' }],
      },
    };

    await subscribedHandlers.get('retail.sale.completed')!(event);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Sale completed: id=sale-1'),
    );
    consoleSpy.mockRestore();
  });

  it('processes inventory.stock.adjusted events and logs stock changes', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const event = {
      type: 'inventory.stock.adjusted',
      tenantId: TENANT,
      payload: {
        productId: 'prod-1',
        locationId: 'loc-1',
        quantityChange: -3,
        reason: 'Damaged',
      },
    };

    await subscribedHandlers.get('inventory.stock.adjusted')!(event);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Stock adjusted: product=prod-1'),
    );
    consoleSpy.mockRestore();
  });

  it('processes financial.payment.received events', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const event = {
      type: 'financial.payment.received',
      tenantId: TENANT,
      payload: {
        paymentId: 'pay-1',
        amountPaise: 10000000,
        method: 'UPI',
      },
    };

    await subscribedHandlers.get('financial.payment.received')!(event);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Payment received: id=pay-1'),
    );
    consoleSpy.mockRestore();
  });

  it('processes crm.customer.created events', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const event = {
      type: 'crm.customer.created',
      tenantId: TENANT,
      payload: {
        customerId: 'cust-new',
        firstName: 'Rajesh',
        lastName: 'Kumar',
      },
    };

    await subscribedHandlers.get('crm.customer.created')!(event);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('New customer: id=cust-new'),
    );
    consoleSpy.mockRestore();
  });
});
