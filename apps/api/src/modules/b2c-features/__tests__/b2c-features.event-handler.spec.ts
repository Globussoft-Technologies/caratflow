import { describe, it, expect, vi, beforeEach } from 'vitest';
import { B2cFeaturesEventHandler } from '../b2c-features.event-handler';
import { createMockEventBus, TEST_TENANT_ID, TEST_USER_ID } from '../../../__tests__/setup';

describe('B2cFeaturesEventHandler', () => {
  let handler: B2cFeaturesEventHandler;
  let mockEventBus: ReturnType<typeof createMockEventBus>;
  let mockBackInStockService: {
    notifySubscribers: ReturnType<typeof vi.fn>;
  };
  let mockAbandonedCartService: {
    markRecovered: ReturnType<typeof vi.fn>;
    prisma: {
      abandonedCart: {
        findMany: ReturnType<typeof vi.fn>;
      };
    };
  };
  let subscribedHandlers: Map<string, Function>;

  beforeEach(() => {
    mockEventBus = createMockEventBus();
    mockBackInStockService = {
      notifySubscribers: vi.fn().mockResolvedValue(0),
    };
    mockAbandonedCartService = {
      markRecovered: vi.fn().mockResolvedValue(undefined),
      prisma: {
        abandonedCart: {
          findMany: vi.fn().mockResolvedValue([]),
        },
      },
    };

    subscribedHandlers = new Map();
    mockEventBus.subscribe.mockImplementation((eventType: string, handlerFn: Function) => {
      subscribedHandlers.set(eventType, handlerFn);
    });

    handler = new B2cFeaturesEventHandler(
      mockEventBus as any,
      mockBackInStockService as any,
      mockAbandonedCartService as any,
    );
    handler.onModuleInit();
  });

  it('subscribes to the correct event types', () => {
    expect(mockEventBus.subscribe).toHaveBeenCalledTimes(4);
    expect(subscribedHandlers.has('inventory.stock.adjusted')).toBe(true);
    expect(subscribedHandlers.has('retail.sale.completed')).toBe(true);
    expect(subscribedHandlers.has('ecommerce.order.received')).toBe(true);
    expect(subscribedHandlers.has('storefront.order.placed')).toBe(true);
  });

  it('handles inventory.stock.adjusted with positive change by notifying subscribers', async () => {
    mockBackInStockService.notifySubscribers.mockResolvedValue(3);

    const event = {
      type: 'inventory.stock.adjusted',
      tenantId: TEST_TENANT_ID,
      userId: TEST_USER_ID,
      payload: {
        productId: 'prod-1',
        quantityChange: 5,
      },
    };

    await subscribedHandlers.get('inventory.stock.adjusted')!(event);

    expect(mockBackInStockService.notifySubscribers).toHaveBeenCalledWith(
      TEST_TENANT_ID,
      'prod-1',
    );
  });

  it('ignores inventory.stock.adjusted with negative change', async () => {
    const event = {
      type: 'inventory.stock.adjusted',
      tenantId: TEST_TENANT_ID,
      userId: TEST_USER_ID,
      payload: {
        productId: 'prod-1',
        quantityChange: -2,
      },
    };

    await subscribedHandlers.get('inventory.stock.adjusted')!(event);

    expect(mockBackInStockService.notifySubscribers).not.toHaveBeenCalled();
  });

  it('handles retail.sale.completed by recovering abandoned carts', async () => {
    mockAbandonedCartService.prisma.abandonedCart.findMany.mockResolvedValue([
      { id: 'ac-1', cartSessionId: 'session-1', customerId: 'cust-1' },
    ]);

    const event = {
      type: 'retail.sale.completed',
      tenantId: TEST_TENANT_ID,
      userId: TEST_USER_ID,
      payload: {
        saleId: 'sale-1',
        customerId: 'cust-1',
        totalPaise: 500000,
        items: [{ productId: 'prod-1', pricePaise: 500000 }],
      },
    };

    await subscribedHandlers.get('retail.sale.completed')!(event);

    expect(mockAbandonedCartService.markRecovered).toHaveBeenCalledWith(
      TEST_TENANT_ID,
      'session-1',
      'sale-1',
    );
  });

  it('handles ecommerce.order.received by recovering abandoned carts by email', async () => {
    mockAbandonedCartService.prisma.abandonedCart.findMany.mockResolvedValue([
      { id: 'ac-2', cartSessionId: 'session-2', customerEmail: 'test@example.com' },
    ]);

    const event = {
      type: 'ecommerce.order.received',
      tenantId: TEST_TENANT_ID,
      userId: TEST_USER_ID,
      payload: {
        orderId: 'order-1',
        customerEmail: 'test@example.com',
      },
    };

    await subscribedHandlers.get('ecommerce.order.received')!(event);

    expect(mockAbandonedCartService.markRecovered).toHaveBeenCalledWith(
      TEST_TENANT_ID,
      'session-2',
      'order-1',
    );
  });

  it('handles storefront.order.placed by recovering abandoned carts', async () => {
    mockAbandonedCartService.prisma.abandonedCart.findMany.mockResolvedValue([
      { id: 'ac-3', cartSessionId: 'session-3', customerId: 'cust-2' },
    ]);

    const event = {
      type: 'storefront.order.placed',
      tenantId: TEST_TENANT_ID,
      userId: TEST_USER_ID,
      payload: {
        orderId: 'order-2',
        customerId: 'cust-2',
      },
    };

    await subscribedHandlers.get('storefront.order.placed')!(event);

    expect(mockAbandonedCartService.markRecovered).toHaveBeenCalledWith(
      TEST_TENANT_ID,
      'session-3',
      'order-2',
    );
  });

  it('handles errors in back-in-stock notification without crashing', async () => {
    mockBackInStockService.notifySubscribers.mockRejectedValue(new Error('Notify error'));

    const event = {
      type: 'inventory.stock.adjusted',
      tenantId: TEST_TENANT_ID,
      userId: TEST_USER_ID,
      payload: {
        productId: 'prod-1',
        quantityChange: 5,
      },
    };

    await expect(
      subscribedHandlers.get('inventory.stock.adjusted')!(event),
    ).resolves.not.toThrow();
  });
});
