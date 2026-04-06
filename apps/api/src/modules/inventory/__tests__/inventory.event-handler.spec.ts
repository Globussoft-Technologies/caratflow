import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InventoryEventHandler } from '../inventory.event-handler';
import { createMockPrismaService, createMockEventBus, TEST_TENANT_ID, TEST_USER_ID } from '../../../__tests__/setup';

describe('InventoryEventHandler', () => {
  let handler: InventoryEventHandler;
  let mockEventBus: ReturnType<typeof createMockEventBus>;
  let mockPrisma: ReturnType<typeof createMockPrismaService>;
  let mockInventoryService: {
    recordMovement: ReturnType<typeof vi.fn>;
  };
  let subscribedHandlers: Map<string, Function>;

  beforeEach(() => {
    mockEventBus = createMockEventBus();
    mockPrisma = createMockPrismaService();
    mockInventoryService = {
      recordMovement: vi.fn().mockResolvedValue({ id: 'movement-1' }),
    };

    subscribedHandlers = new Map();
    mockEventBus.subscribe.mockImplementation((eventType: string, handlerFn: Function) => {
      subscribedHandlers.set(eventType, handlerFn);
    });

    handler = new InventoryEventHandler(
      mockEventBus as any,
      mockPrisma as any,
      mockInventoryService as any,
    );
    handler.onModuleInit();
  });

  it('subscribes to the correct event types', () => {
    expect(mockEventBus.subscribe).toHaveBeenCalledTimes(3);
    expect(subscribedHandlers.has('retail.sale.completed')).toBe(true);
    expect(subscribedHandlers.has('manufacturing.job.completed')).toBe(true);
    expect(subscribedHandlers.has('wholesale.consignment.returned')).toBe(true);
  });

  it('handles retail.sale.completed by decrementing stock', async () => {
    const stockItem = { id: 'stock-1', productId: 'prod-1', tenantId: TEST_TENANT_ID };
    mockPrisma.stockItem.findMany.mockResolvedValue([stockItem]);

    const event = {
      type: 'retail.sale.completed',
      tenantId: TEST_TENANT_ID,
      userId: TEST_USER_ID,
      payload: {
        saleId: 'sale-1',
        items: [{ productId: 'prod-1', pricePaise: 500000 }],
      },
    };

    await subscribedHandlers.get('retail.sale.completed')!(event);

    expect(mockInventoryService.recordMovement).toHaveBeenCalledWith(
      TEST_TENANT_ID,
      TEST_USER_ID,
      expect.objectContaining({
        stockItemId: 'stock-1',
        movementType: 'OUT',
        quantityChange: -1,
        referenceType: 'RETAIL_SALE',
        referenceId: 'sale-1',
      }),
    );
  });

  it('handles manufacturing.job.completed by adding finished goods', async () => {
    const stockItem = { id: 'stock-2', productId: 'prod-2', tenantId: TEST_TENANT_ID };
    mockPrisma.stockItem.findMany.mockResolvedValue([stockItem]);

    const event = {
      type: 'manufacturing.job.completed',
      tenantId: TEST_TENANT_ID,
      userId: TEST_USER_ID,
      payload: {
        jobOrderId: 'job-1',
        outputProductId: 'prod-2',
      },
    };

    await subscribedHandlers.get('manufacturing.job.completed')!(event);

    expect(mockInventoryService.recordMovement).toHaveBeenCalledWith(
      TEST_TENANT_ID,
      TEST_USER_ID,
      expect.objectContaining({
        stockItemId: 'stock-2',
        movementType: 'PRODUCTION',
        quantityChange: 1,
        referenceType: 'MANUFACTURING_JOB',
        referenceId: 'job-1',
      }),
    );
  });

  it('handles wholesale.consignment.returned by adjusting stock', async () => {
    const stockItem = { id: 'stock-3', productId: 'prod-3', tenantId: TEST_TENANT_ID };
    mockPrisma.stockItem.findMany.mockResolvedValue([stockItem]);

    const event = {
      type: 'wholesale.consignment.returned',
      tenantId: TEST_TENANT_ID,
      userId: TEST_USER_ID,
      payload: {
        consignmentId: 'consign-1',
        returnedItems: [{ productId: 'prod-3' }],
      },
    };

    await subscribedHandlers.get('wholesale.consignment.returned')!(event);

    expect(mockInventoryService.recordMovement).toHaveBeenCalledWith(
      TEST_TENANT_ID,
      TEST_USER_ID,
      expect.objectContaining({
        stockItemId: 'stock-3',
        movementType: 'RETURN',
        quantityChange: 1,
        referenceType: 'CONSIGNMENT_RETURN',
        referenceId: 'consign-1',
      }),
    );
  });

  it('skips movement when no stock item found for product', async () => {
    mockPrisma.stockItem.findMany.mockResolvedValue([]);

    const event = {
      type: 'retail.sale.completed',
      tenantId: TEST_TENANT_ID,
      userId: TEST_USER_ID,
      payload: {
        saleId: 'sale-1',
        items: [{ productId: 'nonexistent-prod', pricePaise: 100000 }],
      },
    };

    await subscribedHandlers.get('retail.sale.completed')!(event);

    expect(mockInventoryService.recordMovement).not.toHaveBeenCalled();
  });

  it('handles errors without crashing', async () => {
    mockPrisma.stockItem.findMany.mockRejectedValue(new Error('DB error'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const event = {
      type: 'retail.sale.completed',
      tenantId: TEST_TENANT_ID,
      userId: TEST_USER_ID,
      payload: {
        saleId: 'sale-1',
        items: [{ productId: 'prod-1', pricePaise: 500000 }],
      },
    };

    await expect(subscribedHandlers.get('retail.sale.completed')!(event)).resolves.not.toThrow();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
