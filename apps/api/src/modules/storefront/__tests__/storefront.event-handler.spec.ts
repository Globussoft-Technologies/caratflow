import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StorefrontEventHandler } from '../storefront.event-handler';
import { createMockPrismaService, createMockEventBus, TEST_TENANT_ID, TEST_USER_ID } from '../../../__tests__/setup';

describe('StorefrontEventHandler', () => {
  let handler: StorefrontEventHandler;
  let mockEventBus: ReturnType<typeof createMockEventBus>;
  let mockPrisma: ReturnType<typeof createMockPrismaService>;
  let mockPricingService: {
    invalidateRateCache: ReturnType<typeof vi.fn>;
  };
  let mockAbandonedCartService: {
    markRecovered: ReturnType<typeof vi.fn>;
  };
  let subscribedHandlers: Map<string, Function>;

  beforeEach(() => {
    mockEventBus = createMockEventBus();
    mockPrisma = createMockPrismaService();
    mockPricingService = {
      invalidateRateCache: vi.fn(),
    };
    mockAbandonedCartService = {
      markRecovered: vi.fn().mockResolvedValue(undefined),
    };

    subscribedHandlers = new Map();
    mockEventBus.subscribe.mockImplementation((eventType: string, handlerFn: Function) => {
      subscribedHandlers.set(eventType, handlerFn);
    });

    // Add missing mock models
    (mockPrisma as any).stockItem = {
      ...mockPrisma.stockItem,
      aggregate: vi.fn().mockResolvedValue({
        _sum: { quantityOnHand: 5, quantityReserved: 2 },
      }),
    };
    (mockPrisma as any).cart = {
      findFirst: vi.fn().mockResolvedValue(null),
    };

    handler = new StorefrontEventHandler(
      mockEventBus as any,
      mockPrisma as any,
      mockPricingService as any,
      mockAbandonedCartService as any,
    );
    handler.onModuleInit();
  });

  it('subscribes to the correct event types', () => {
    expect(mockEventBus.subscribe).toHaveBeenCalledTimes(3);
    expect(subscribedHandlers.has('inventory.stock.adjusted')).toBe(true);
    expect(subscribedHandlers.has('india.metal_rate.updated')).toBe(true);
    expect(subscribedHandlers.has('storefront.order.completed')).toBe(true);
  });

  it('handles inventory.stock.adjusted by checking available stock', async () => {
    const event = {
      type: 'inventory.stock.adjusted',
      tenantId: TEST_TENANT_ID,
      userId: TEST_USER_ID,
      payload: {
        productId: 'prod-1',
        quantityChange: -3,
      },
    };

    await subscribedHandlers.get('inventory.stock.adjusted')!(event);

    expect((mockPrisma as any).stockItem.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: TEST_TENANT_ID, productId: 'prod-1' },
      }),
    );
  });

  it('handles india.metal_rate.updated by invalidating rate cache', async () => {
    const event = {
      type: 'india.metal_rate.updated',
      tenantId: TEST_TENANT_ID,
      userId: TEST_USER_ID,
      payload: {
        metalType: 'GOLD',
        purity: 916,
        ratePer10gPaise: 5500000,
      },
    };

    await subscribedHandlers.get('india.metal_rate.updated')!(event);

    expect(mockPricingService.invalidateRateCache).toHaveBeenCalledWith(TEST_TENANT_ID);
  });

  it('handles storefront.order.completed by marking abandoned cart recovered', async () => {
    (mockPrisma as any).cart.findFirst.mockResolvedValue({
      id: 'cart-1',
      tenantId: TEST_TENANT_ID,
      customerId: 'cust-1',
      sessionId: 'session-abc',
    });

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

    await subscribedHandlers.get('storefront.order.completed')!(event);

    expect(mockAbandonedCartService.markRecovered).toHaveBeenCalledWith(
      TEST_TENANT_ID,
      'session-abc',
      'order-1',
    );
  });

  it('skips abandoned cart recovery when no cart found', async () => {
    (mockPrisma as any).cart.findFirst.mockResolvedValue(null);

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

    await subscribedHandlers.get('storefront.order.completed')!(event);

    expect(mockAbandonedCartService.markRecovered).not.toHaveBeenCalled();
  });

  it('ignores events with mismatched type', async () => {
    const event = {
      type: 'some.other.event',
      tenantId: TEST_TENANT_ID,
      userId: TEST_USER_ID,
      payload: {
        productId: 'prod-1',
        quantityChange: -3,
      },
    };

    await subscribedHandlers.get('inventory.stock.adjusted')!(event);

    expect((mockPrisma as any).stockItem.aggregate).not.toHaveBeenCalled();
  });
});
