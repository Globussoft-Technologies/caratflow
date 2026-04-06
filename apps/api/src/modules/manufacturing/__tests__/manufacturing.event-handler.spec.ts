import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ManufacturingEventHandler } from '../manufacturing.event-handler';
import { createMockEventBus, TEST_TENANT_ID, TEST_USER_ID } from '../../../__tests__/setup';

describe('ManufacturingEventHandler', () => {
  let handler: ManufacturingEventHandler;
  let mockEventBus: ReturnType<typeof createMockEventBus>;
  let subscribedHandlers: Map<string, Function>;

  beforeEach(() => {
    mockEventBus = createMockEventBus();
    subscribedHandlers = new Map();
    mockEventBus.subscribe.mockImplementation((eventType: string, handlerFn: Function) => {
      subscribedHandlers.set(eventType, handlerFn);
    });

    handler = new ManufacturingEventHandler(mockEventBus as any);
    handler.onModuleInit();
  });

  it('subscribes to the correct event types', () => {
    expect(mockEventBus.subscribe).toHaveBeenCalledTimes(2);
    expect(subscribedHandlers.has('retail.custom_order.created')).toBe(true);
    expect(subscribedHandlers.has('inventory.stock.adjusted')).toBe(true);
  });

  it('handles retail.custom_order.created by logging custom order info', async () => {
    const event = {
      type: 'retail.custom_order.created',
      tenantId: TEST_TENANT_ID,
      userId: TEST_USER_ID,
      payload: {
        orderId: 'order-1',
        customerId: 'cust-1',
      },
    };

    // Should not throw
    await expect(
      subscribedHandlers.get('retail.custom_order.created')!(event),
    ).resolves.not.toThrow();
  });

  it('handles inventory.stock.adjusted by logging material availability check', async () => {
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

    await expect(
      subscribedHandlers.get('inventory.stock.adjusted')!(event),
    ).resolves.not.toThrow();
  });

  it('ignores unknown event types gracefully', () => {
    // Only the two expected subscriptions should exist
    expect(subscribedHandlers.has('unknown.event')).toBe(false);
  });

  it('handles errors without crashing on malformed events', async () => {
    const malformedEvent = {
      type: 'retail.custom_order.created',
      tenantId: TEST_TENANT_ID,
      userId: TEST_USER_ID,
      payload: {}, // missing orderId, customerId
    };

    await expect(
      subscribedHandlers.get('retail.custom_order.created')!(malformedEvent),
    ).resolves.not.toThrow();
  });
});
