import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RecommendationsEventHandler } from '../recommendations.event-handler';
import { createMockEventBus, TEST_TENANT_ID, TEST_USER_ID } from '../../../__tests__/setup';

describe('RecommendationsEventHandler', () => {
  let handler: RecommendationsEventHandler;
  let mockEventBus: ReturnType<typeof createMockEventBus>;
  let mockBehaviorService: {
    trackPurchase: ReturnType<typeof vi.fn>;
    buildBehaviorProfile: ReturnType<typeof vi.fn>;
  };
  let subscribedHandlers: Map<string, Function>;

  beforeEach(() => {
    mockEventBus = createMockEventBus();
    mockBehaviorService = {
      trackPurchase: vi.fn().mockResolvedValue(undefined),
      buildBehaviorProfile: vi.fn().mockResolvedValue(undefined),
    };

    subscribedHandlers = new Map();
    mockEventBus.subscribe.mockImplementation((eventType: string, handlerFn: Function) => {
      subscribedHandlers.set(eventType, handlerFn);
    });

    handler = new RecommendationsEventHandler(
      mockEventBus as any,
      mockBehaviorService as any,
    );
    handler.onModuleInit();
  });

  it('subscribes to the correct event types', () => {
    expect(mockEventBus.subscribe).toHaveBeenCalledTimes(3);
    expect(subscribedHandlers.has('retail.sale.completed')).toBe(true);
    expect(subscribedHandlers.has('storefront.order.completed')).toBe(true);
    expect(subscribedHandlers.has('inventory.item.created')).toBe(true);
  });

  it('handles retail.sale.completed by tracking purchase behavior', async () => {
    const event = {
      type: 'retail.sale.completed',
      tenantId: TEST_TENANT_ID,
      userId: TEST_USER_ID,
      payload: {
        customerId: 'cust-1',
        totalPaise: 500000,
        items: [
          { productId: 'prod-1', pricePaise: 300000 },
          { productId: 'prod-2', pricePaise: 200000 },
        ],
      },
    };

    await subscribedHandlers.get('retail.sale.completed')!(event);

    expect(mockBehaviorService.trackPurchase).toHaveBeenCalledWith(
      TEST_TENANT_ID,
      'cust-1',
      ['prod-1', 'prod-2'],
      500000,
    );
  });

  it('skips tracking when no customerId in retail sale', async () => {
    const event = {
      type: 'retail.sale.completed',
      tenantId: TEST_TENANT_ID,
      userId: TEST_USER_ID,
      payload: {
        customerId: null,
        totalPaise: 500000,
        items: [{ productId: 'prod-1', pricePaise: 500000 }],
      },
    };

    await subscribedHandlers.get('retail.sale.completed')!(event);

    expect(mockBehaviorService.trackPurchase).not.toHaveBeenCalled();
  });

  it('handles storefront.order.completed by building behavior profile', async () => {
    const event = {
      type: 'storefront.order.completed',
      tenantId: TEST_TENANT_ID,
      userId: TEST_USER_ID,
      payload: {
        customerId: 'cust-2',
        orderId: 'order-1',
        totalPaise: 800000,
      },
    };

    await subscribedHandlers.get('storefront.order.completed')!(event);

    expect(mockBehaviorService.buildBehaviorProfile).toHaveBeenCalledWith(
      TEST_TENANT_ID,
      'cust-2',
    );
  });

  it('skips storefront order processing when no customerId', async () => {
    const event = {
      type: 'storefront.order.completed',
      tenantId: TEST_TENANT_ID,
      userId: TEST_USER_ID,
      payload: {
        customerId: null,
        orderId: 'order-2',
        totalPaise: 300000,
      },
    };

    await subscribedHandlers.get('storefront.order.completed')!(event);

    expect(mockBehaviorService.buildBehaviorProfile).not.toHaveBeenCalled();
  });

  it('handles inventory.item.created event without error', async () => {
    const event = {
      type: 'inventory.item.created',
      tenantId: TEST_TENANT_ID,
      userId: TEST_USER_ID,
      payload: {
        productId: 'prod-new-1',
        locationId: 'loc-1',
        quantity: 5,
      },
    };

    await expect(
      subscribedHandlers.get('inventory.item.created')!(event),
    ).resolves.not.toThrow();
  });

  it('ignores events with mismatched type', async () => {
    const event = {
      type: 'some.other.event',
      tenantId: TEST_TENANT_ID,
      userId: TEST_USER_ID,
      payload: {
        customerId: 'cust-1',
        totalPaise: 500000,
        items: [{ productId: 'prod-1', pricePaise: 500000 }],
      },
    };

    await subscribedHandlers.get('retail.sale.completed')!(event);

    expect(mockBehaviorService.trackPurchase).not.toHaveBeenCalled();
  });

  it('handles errors in storefront order processing without crashing', async () => {
    mockBehaviorService.buildBehaviorProfile.mockRejectedValue(new Error('Profile build error'));

    const event = {
      type: 'storefront.order.completed',
      tenantId: TEST_TENANT_ID,
      userId: TEST_USER_ID,
      payload: {
        customerId: 'cust-1',
        orderId: 'order-1',
        totalPaise: 500000,
      },
    };

    await expect(
      subscribedHandlers.get('storefront.order.completed')!(event),
    ).resolves.not.toThrow();
  });
});
