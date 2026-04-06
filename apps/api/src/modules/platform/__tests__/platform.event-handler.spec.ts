import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PlatformEventHandler } from '../platform.event-handler';
import { createMockEventBus, TEST_TENANT_ID, TEST_USER_ID } from '../../../__tests__/setup';

describe('PlatformEventHandler', () => {
  let handler: PlatformEventHandler;
  let mockEventBus: ReturnType<typeof createMockEventBus>;
  let mockAuditService: any;
  let mockNotificationService: any;
  let subscribedHandlers: Map<string, Function>;

  const TENANT = TEST_TENANT_ID;

  beforeEach(() => {
    mockEventBus = createMockEventBus();
    subscribedHandlers = new Map();

    mockEventBus.subscribe.mockImplementation((eventType: string, fn: Function) => {
      // Store all handlers (platform subscribes to many event types)
      subscribedHandlers.set(eventType, fn);
    });

    mockAuditService = {
      logDataChange: vi.fn().mockResolvedValue(undefined),
      logActivity: vi.fn().mockResolvedValue(undefined),
    };
    mockNotificationService = {
      createNotification: vi.fn().mockResolvedValue(undefined),
      broadcastNotification: vi.fn().mockResolvedValue(undefined),
    };

    handler = new PlatformEventHandler(
      mockEventBus as any,
      mockAuditService,
      mockNotificationService,
    );
    handler.onModuleInit();
  });

  it('subscribes to all known domain event types for audit logging', () => {
    // Platform handler subscribes to a comprehensive set of events
    expect(subscribedHandlers.size).toBeGreaterThan(20);
    expect(subscribedHandlers.has('retail.sale.completed')).toBe(true);
    expect(subscribedHandlers.has('inventory.stock.adjusted')).toBe(true);
    expect(subscribedHandlers.has('financial.payment.received')).toBe(true);
    expect(subscribedHandlers.has('platform.user.created')).toBe(true);
    expect(subscribedHandlers.has('crm.customer.created')).toBe(true);
  });

  it('logs data change and activity for every event', async () => {
    const event = {
      type: 'retail.sale.completed',
      tenantId: TENANT,
      userId: TEST_USER_ID,
      correlationId: 'corr-1',
      payload: {
        saleId: 'sale-1',
        customerId: 'cust-1',
        totalPaise: 5000000,
        items: [],
      },
    };

    await subscribedHandlers.get('retail.sale.completed')!(event);

    expect(mockAuditService.logDataChange).toHaveBeenCalledWith(
      TENANT,
      expect.objectContaining({
        action: 'completed',
        entityType: 'retail.sale',
        entityId: 'sale-1',
      }),
      { userId: TEST_USER_ID },
    );
    expect(mockAuditService.logActivity).toHaveBeenCalledWith(
      TENANT,
      expect.objectContaining({
        action: 'retail.sale.completed',
        description: expect.stringContaining('Sale completed'),
      }),
      { userId: TEST_USER_ID },
    );
  });

  it('sends notification for manufacturing.job.completed', async () => {
    const event = {
      type: 'manufacturing.job.completed',
      tenantId: TENANT,
      userId: TEST_USER_ID,
      correlationId: 'corr-2',
      payload: {
        jobOrderId: 'job-1',
        outputProductId: 'prod-1',
        actualWeightMg: 5000,
      },
    };

    await subscribedHandlers.get('manufacturing.job.completed')!(event);

    expect(mockNotificationService.createNotification).toHaveBeenCalledWith(
      TENANT,
      expect.objectContaining({
        title: 'Job Order Completed',
        type: 'SUCCESS',
      }),
    );
  });

  it('sends warning notification for negative stock adjustments', async () => {
    const event = {
      type: 'inventory.stock.adjusted',
      tenantId: TENANT,
      userId: TEST_USER_ID,
      correlationId: 'corr-3',
      payload: {
        productId: 'prod-1',
        locationId: 'loc-1',
        quantityChange: -5,
        reason: 'Damaged',
      },
    };

    await subscribedHandlers.get('inventory.stock.adjusted')!(event);

    expect(mockNotificationService.createNotification).toHaveBeenCalledWith(
      TENANT,
      expect.objectContaining({
        title: 'Stock Reduction',
        type: 'WARNING',
      }),
    );
  });

  it('broadcasts notification for new ecommerce orders', async () => {
    const event = {
      type: 'ecommerce.order.received',
      tenantId: TENANT,
      userId: TEST_USER_ID,
      correlationId: 'corr-4',
      payload: {
        orderId: 'order-1',
        channel: 'SHOPIFY',
      },
    };

    await subscribedHandlers.get('ecommerce.order.received')!(event);

    expect(mockNotificationService.broadcastNotification).toHaveBeenCalledWith(
      TENANT,
      expect.objectContaining({
        title: 'New Online Order',
        type: 'INFO',
      }),
    );
  });
});
