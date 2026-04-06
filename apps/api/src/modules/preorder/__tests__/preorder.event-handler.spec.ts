import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PreOrderEventHandler } from '../preorder.event-handler';
import { createMockPrismaService, createMockEventBus, TEST_TENANT_ID, TEST_USER_ID } from '../../../__tests__/setup';

describe('PreOrderEventHandler', () => {
  let handler: PreOrderEventHandler;
  let mockEventBus: ReturnType<typeof createMockEventBus>;
  let mockPrisma: ReturnType<typeof createMockPrismaService>;
  let mockPreOrderService: {
    notifyPreOrderCustomers: ReturnType<typeof vi.fn>;
    autoDetectBackorder: ReturnType<typeof vi.fn>;
  };
  let subscribedHandlers: Map<string, Function>;

  beforeEach(() => {
    mockEventBus = createMockEventBus();
    mockPrisma = createMockPrismaService();
    mockPreOrderService = {
      notifyPreOrderCustomers: vi.fn().mockResolvedValue(3),
      autoDetectBackorder: vi.fn().mockResolvedValue(undefined),
    };

    subscribedHandlers = new Map();
    mockEventBus.subscribe.mockImplementation((eventType: string, handlerFn: Function) => {
      subscribedHandlers.set(eventType, handlerFn);
    });

    // Add missing mock model
    (mockPrisma as any).preOrder = {
      count: vi.fn().mockResolvedValue(0),
    };

    handler = new PreOrderEventHandler(
      mockEventBus as any,
      mockPrisma as any,
      mockPreOrderService as any,
    );
    handler.onModuleInit();
  });

  it('subscribes to the correct event types', () => {
    expect(mockEventBus.subscribe).toHaveBeenCalledTimes(1);
    expect(subscribedHandlers.has('inventory.stock.adjusted')).toBe(true);
  });

  it('handles stock increase by notifying pre-order customers when pending orders exist', async () => {
    (mockPrisma as any).preOrder.count.mockResolvedValue(2);

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

    expect(mockPreOrderService.notifyPreOrderCustomers).toHaveBeenCalledWith(
      TEST_TENANT_ID,
      TEST_USER_ID,
      'prod-1',
    );
  });

  it('skips notification when no pending pre-orders exist', async () => {
    (mockPrisma as any).preOrder.count.mockResolvedValue(0);

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

    expect(mockPreOrderService.notifyPreOrderCustomers).not.toHaveBeenCalled();
  });

  it('ignores stock decrease events', async () => {
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

    expect((mockPrisma as any).preOrder.count).not.toHaveBeenCalled();
    expect(mockPreOrderService.notifyPreOrderCustomers).not.toHaveBeenCalled();
  });

  it('always runs backorder auto-detection on stock increase', async () => {
    (mockPrisma as any).preOrder.count.mockResolvedValue(0);

    const event = {
      type: 'inventory.stock.adjusted',
      tenantId: TEST_TENANT_ID,
      userId: TEST_USER_ID,
      payload: {
        productId: 'prod-1',
        quantityChange: 10,
      },
    };

    await subscribedHandlers.get('inventory.stock.adjusted')!(event);

    expect(mockPreOrderService.autoDetectBackorder).toHaveBeenCalledWith(
      TEST_TENANT_ID,
      'prod-1',
    );
  });

  it('handles errors in notification without crashing', async () => {
    (mockPrisma as any).preOrder.count.mockResolvedValue(5);
    mockPreOrderService.notifyPreOrderCustomers.mockRejectedValue(new Error('Notify error'));

    const event = {
      type: 'inventory.stock.adjusted',
      tenantId: TEST_TENANT_ID,
      userId: TEST_USER_ID,
      payload: {
        productId: 'prod-1',
        quantityChange: 3,
      },
    };

    // Handler has try/catch, should not throw
    await expect(
      subscribedHandlers.get('inventory.stock.adjusted')!(event),
    ).resolves.not.toThrow();
  });

  it('ignores events with mismatched type', async () => {
    const event = {
      type: 'some.other.event',
      tenantId: TEST_TENANT_ID,
      userId: TEST_USER_ID,
      payload: {
        productId: 'prod-1',
        quantityChange: 5,
      },
    };

    await subscribedHandlers.get('inventory.stock.adjusted')!(event);

    expect((mockPrisma as any).preOrder.count).not.toHaveBeenCalled();
  });
});
