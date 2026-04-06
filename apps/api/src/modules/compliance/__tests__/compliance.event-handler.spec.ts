import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ComplianceEventHandler } from '../compliance.event-handler';
import { createMockPrismaService, createMockEventBus, TEST_TENANT_ID, TEST_USER_ID } from '../../../__tests__/setup';

describe('ComplianceEventHandler', () => {
  let handler: ComplianceEventHandler;
  let mockEventBus: ReturnType<typeof createMockEventBus>;
  let mockPrisma: ReturnType<typeof createMockPrismaService>;
  let mockHuidService: {
    enforceHuidOnSale: ReturnType<typeof vi.fn>;
  };
  let subscribedHandlers: Map<string, Function>;

  beforeEach(() => {
    mockEventBus = createMockEventBus();
    mockPrisma = createMockPrismaService();
    mockHuidService = {
      enforceHuidOnSale: vi.fn().mockResolvedValue(true),
    };

    subscribedHandlers = new Map();
    mockEventBus.subscribe.mockImplementation((eventType: string, handlerFn: Function) => {
      subscribedHandlers.set(eventType, handlerFn);
    });

    handler = new ComplianceEventHandler(
      mockEventBus as any,
      mockPrisma as any,
      mockHuidService as any,
    );
    handler.onModuleInit();
  });

  it('subscribes to the correct event types', () => {
    expect(mockEventBus.subscribe).toHaveBeenCalledTimes(2);
    expect(subscribedHandlers.has('retail.sale.completed')).toBe(true);
    expect(subscribedHandlers.has('inventory.item.created')).toBe(true);
  });

  it('handles retail.sale.completed by verifying HUID for sold items', async () => {
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

    expect(mockHuidService.enforceHuidOnSale).toHaveBeenCalledWith(
      TEST_TENANT_ID,
      'prod-1',
    );
  });

  it('warns when gold product is sold without HUID', async () => {
    mockHuidService.enforceHuidOnSale.mockResolvedValue(false);
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const event = {
      type: 'retail.sale.completed',
      tenantId: TEST_TENANT_ID,
      userId: TEST_USER_ID,
      payload: {
        saleId: 'sale-1',
        items: [{ productId: 'prod-gold-1', pricePaise: 500000 }],
      },
    };

    await subscribedHandlers.get('retail.sale.completed')!(event);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('sold without HUID'),
    );
    consoleSpy.mockRestore();
  });

  it('handles inventory.item.created by suggesting HUID for gold products', async () => {
    mockPrisma.product.findFirst.mockResolvedValue({
      id: 'prod-gold-1',
      tenantId: TEST_TENANT_ID,
      sku: 'GR-22K-001',
      productType: 'GOLD',
      huidNumber: null,
    });
    const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

    const event = {
      type: 'inventory.item.created',
      tenantId: TEST_TENANT_ID,
      userId: TEST_USER_ID,
      payload: {
        productId: 'prod-gold-1',
        locationId: 'loc-1',
        quantity: 1,
      },
    };

    await subscribedHandlers.get('inventory.item.created')!(event);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('does not have HUID'),
    );
    consoleSpy.mockRestore();
  });

  it('does not suggest HUID for non-gold products', async () => {
    mockPrisma.product.findFirst.mockResolvedValue({
      id: 'prod-silver-1',
      tenantId: TEST_TENANT_ID,
      sku: 'SR-925-001',
      productType: 'SILVER',
      huidNumber: null,
    });
    const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

    const event = {
      type: 'inventory.item.created',
      tenantId: TEST_TENANT_ID,
      userId: TEST_USER_ID,
      payload: {
        productId: 'prod-silver-1',
        locationId: 'loc-1',
        quantity: 1,
      },
    };

    await subscribedHandlers.get('inventory.item.created')!(event);

    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('handles errors without crashing', async () => {
    mockHuidService.enforceHuidOnSale.mockRejectedValue(new Error('HUID service error'));
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

    await expect(
      subscribedHandlers.get('retail.sale.completed')!(event),
    ).resolves.not.toThrow();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
