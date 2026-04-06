import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RetailEventHandler } from '../retail.event-handler';
import { createMockEventBus, TEST_TENANT_ID, TEST_USER_ID } from '../../../__tests__/setup';

describe('RetailEventHandler', () => {
  let handler: RetailEventHandler;
  let mockEventBus: ReturnType<typeof createMockEventBus>;
  let subscribedHandlers: Map<string, Function>;

  beforeEach(() => {
    mockEventBus = createMockEventBus();
    subscribedHandlers = new Map();
    mockEventBus.subscribe.mockImplementation((eventType: string, handlerFn: Function) => {
      subscribedHandlers.set(eventType, handlerFn);
    });

    handler = new RetailEventHandler(mockEventBus as any);
    handler.onModuleInit();
  });

  it('subscribes to the correct event types', () => {
    expect(mockEventBus.subscribe).toHaveBeenCalledTimes(3);
    expect(subscribedHandlers.has('inventory.item.created')).toBe(true);
    expect(subscribedHandlers.has('financial.payment.received')).toBe(true);
    expect(subscribedHandlers.has('crm.customer.created')).toBe(true);
  });

  it('handles inventory.item.created by logging product availability', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const event = {
      type: 'inventory.item.created',
      tenantId: TEST_TENANT_ID,
      userId: TEST_USER_ID,
      payload: {
        productId: 'prod-1',
        locationId: 'loc-1',
        quantity: 10,
      },
    };

    await subscribedHandlers.get('inventory.item.created')!(event);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('New inventory item available'),
    );
    consoleSpy.mockRestore();
  });

  it('handles financial.payment.received by logging payment info', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const event = {
      type: 'financial.payment.received',
      tenantId: TEST_TENANT_ID,
      userId: TEST_USER_ID,
      payload: {
        paymentId: 'pay-1',
        amountPaise: 500000,
        method: 'UPI',
        referenceId: 'ref-1',
      },
    };

    await subscribedHandlers.get('financial.payment.received')!(event);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Payment received'),
    );
    consoleSpy.mockRestore();
  });

  it('handles crm.customer.created by logging customer availability', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const event = {
      type: 'crm.customer.created',
      tenantId: TEST_TENANT_ID,
      userId: TEST_USER_ID,
      payload: {
        customerId: 'cust-1',
        firstName: 'Rajesh',
        lastName: 'Sharma',
        phone: '+919876543210',
      },
    };

    await subscribedHandlers.get('crm.customer.created')!(event);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('New customer available'),
    );
    consoleSpy.mockRestore();
  });

  it('ignores events with mismatched type field', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const event = {
      type: 'some.other.event', // doesn't match the if-check inside handler
      tenantId: TEST_TENANT_ID,
      userId: TEST_USER_ID,
      payload: {
        productId: 'prod-1',
        locationId: 'loc-1',
        quantity: 10,
      },
    };

    await subscribedHandlers.get('inventory.item.created')!(event);

    // The handler checks event.type inside, so it should not log
    expect(consoleSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('New inventory item available'),
    );
    consoleSpy.mockRestore();
  });

  it('handles errors without crashing on malformed events', async () => {
    const event = {
      type: 'inventory.item.created',
      tenantId: TEST_TENANT_ID,
      userId: TEST_USER_ID,
      payload: {}, // Missing required fields
    };

    await expect(
      subscribedHandlers.get('inventory.item.created')!(event),
    ).resolves.not.toThrow();
  });
});
