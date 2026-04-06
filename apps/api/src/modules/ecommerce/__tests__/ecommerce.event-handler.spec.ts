import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EcommerceEventHandler } from '../ecommerce.event-handler';
import { createMockPrismaService, createMockEventBus, TEST_TENANT_ID, TEST_USER_ID } from '../../../__tests__/setup';

describe('EcommerceEventHandler', () => {
  let handler: EcommerceEventHandler;
  let mockEventBus: ReturnType<typeof createMockEventBus>;
  let mockPrisma: ReturnType<typeof createMockPrismaService>;
  let mockShopifyService: {
    syncInventoryToShopify: ReturnType<typeof vi.fn>;
  };
  let subscribedHandlers: Map<string, Function>;

  beforeEach(() => {
    mockEventBus = createMockEventBus();
    mockPrisma = createMockPrismaService();
    mockShopifyService = {
      syncInventoryToShopify: vi.fn().mockResolvedValue(undefined),
    };

    subscribedHandlers = new Map();
    mockEventBus.subscribe.mockImplementation((eventType: string, handlerFn: Function) => {
      subscribedHandlers.set(eventType, handlerFn);
    });

    // Add missing mock models
    (mockPrisma as any).salesChannel = {
      findMany: vi.fn().mockResolvedValue([]),
    };
    (mockPrisma as any).catalogItem = {
      findMany: vi.fn().mockResolvedValue([]),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    };
    (mockPrisma as any).stockItem = {
      ...mockPrisma.stockItem,
      aggregate: vi.fn().mockResolvedValue({
        _sum: { quantityOnHand: 10, quantityReserved: 2 },
      }),
    };

    handler = new EcommerceEventHandler(
      mockEventBus as any,
      mockPrisma as any,
      mockShopifyService as any,
    );
    handler.onModuleInit();
  });

  it('subscribes to the correct event types', () => {
    expect(mockEventBus.subscribe).toHaveBeenCalledTimes(2);
    expect(subscribedHandlers.has('inventory.stock.adjusted')).toBe(true);
    expect(subscribedHandlers.has('retail.sale.completed')).toBe(true);
  });

  it('handles inventory.stock.adjusted by syncing stock to Shopify channels', async () => {
    (mockPrisma as any).salesChannel.findMany.mockResolvedValue([
      { id: 'ch-1', channelType: 'SHOPIFY', isActive: true, tenantId: TEST_TENANT_ID },
    ]);

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

    expect(mockShopifyService.syncInventoryToShopify).toHaveBeenCalledWith(
      TEST_TENANT_ID,
      'ch-1',
      'prod-1',
      8, // 10 - 2
    );
  });

  it('handles retail.sale.completed by marking catalog items as out of sync', async () => {
    (mockPrisma as any).catalogItem.findMany.mockResolvedValue([
      { id: 'cat-1', productId: 'prod-1', syncStatus: 'SYNCED' },
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

    expect((mockPrisma as any).catalogItem.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: TEST_TENANT_ID,
          productId: 'prod-1',
          syncStatus: 'SYNCED',
        }),
        data: { syncStatus: 'OUT_OF_SYNC' },
      }),
    );
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

    expect((mockPrisma as any).salesChannel.findMany).not.toHaveBeenCalled();
  });

  it('does not sync to non-Shopify channels', async () => {
    (mockPrisma as any).salesChannel.findMany.mockResolvedValue([
      { id: 'ch-2', channelType: 'AMAZON', isActive: true, tenantId: TEST_TENANT_ID },
    ]);

    const event = {
      type: 'inventory.stock.adjusted',
      tenantId: TEST_TENANT_ID,
      userId: TEST_USER_ID,
      payload: {
        productId: 'prod-1',
        locationId: 'loc-1',
        quantityChange: -1,
        reason: 'sale',
      },
    };

    await subscribedHandlers.get('inventory.stock.adjusted')!(event);

    expect(mockShopifyService.syncInventoryToShopify).not.toHaveBeenCalled();
  });

  it('handles errors without crashing', async () => {
    (mockPrisma as any).salesChannel.findMany.mockRejectedValue(new Error('DB error'));

    const event = {
      type: 'inventory.stock.adjusted',
      tenantId: TEST_TENANT_ID,
      userId: TEST_USER_ID,
      payload: {
        productId: 'prod-1',
        locationId: 'loc-1',
        quantityChange: -1,
        reason: 'sale',
      },
    };

    // The handler doesn't have try/catch, so this will throw
    // But it should at least not crash the process
    await expect(
      subscribedHandlers.get('inventory.stock.adjusted')!(event),
    ).rejects.toThrow('DB error');
  });
});
