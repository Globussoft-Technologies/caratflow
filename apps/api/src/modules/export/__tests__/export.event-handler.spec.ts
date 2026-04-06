import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExportEventHandler } from '../export.event-handler';
import { createMockEventBus, createMockPrismaService, TEST_TENANT_ID } from '../../../__tests__/setup';

describe('ExportEventHandler', () => {
  let handler: ExportEventHandler;
  let mockEventBus: ReturnType<typeof createMockEventBus>;
  let mockPrisma: ReturnType<typeof createMockPrismaService>;
  let subscribedHandlers: Map<string, Function>;

  const TENANT = TEST_TENANT_ID;

  beforeEach(() => {
    mockEventBus = createMockEventBus();
    mockPrisma = createMockPrismaService();
    subscribedHandlers = new Map();

    mockEventBus.subscribe.mockImplementation((eventType: string, fn: Function) => {
      subscribedHandlers.set(eventType, fn);
    });

    (mockPrisma as any).exportOrderItem = {
      findMany: vi.fn().mockResolvedValue([]),
    };
    (mockPrisma as any).exportOrder = {
      findMany: vi.fn().mockResolvedValue([]),
    };

    handler = new ExportEventHandler(mockEventBus as any, mockPrisma as any);
    handler.onModuleInit();
  });

  it('subscribes to compliance.hallmark.verified and financial.invoice.created', () => {
    expect(subscribedHandlers.has('compliance.hallmark.verified')).toBe(true);
    expect(subscribedHandlers.has('financial.invoice.created')).toBe(true);
  });

  it('looks up export order items when hallmark is verified', async () => {
    const event = {
      type: 'compliance.hallmark.verified',
      tenantId: TENANT,
      payload: {
        productId: 'prod-1',
        hallmarkNumber: 'HM-12345',
        purity: 916,
      },
    };

    await subscribedHandlers.get('compliance.hallmark.verified')!(event);

    expect((mockPrisma as any).exportOrderItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: TENANT, productId: 'prod-1' },
      }),
    );
  });

  it('logs when hallmark-verified product is part of an active export order', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    (mockPrisma as any).exportOrderItem.findMany.mockResolvedValue([
      {
        productId: 'prod-1',
        exportOrder: { id: 'eo-1', status: 'CONFIRMED', orderNumber: 'EXP-001' },
      },
    ]);

    const event = {
      type: 'compliance.hallmark.verified',
      tenantId: TENANT,
      payload: {
        productId: 'prod-1',
        hallmarkNumber: 'HM-12345',
        purity: 916,
      },
    };

    await subscribedHandlers.get('compliance.hallmark.verified')!(event);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('hallmark verified for export order EXP-001'),
    );
    consoleSpy.mockRestore();
  });

  it('checks for active export orders when invoice is created with a customer', async () => {
    const event = {
      type: 'financial.invoice.created',
      tenantId: TENANT,
      payload: {
        invoiceId: 'inv-1',
        invoiceNumber: 'INV-001',
        totalPaise: 5000000,
        customerId: 'cust-1',
      },
    };

    await subscribedHandlers.get('financial.invoice.created')!(event);

    expect((mockPrisma as any).exportOrder.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: TENANT,
          buyerId: 'cust-1',
          status: { in: ['CONFIRMED', 'IN_PRODUCTION', 'READY'] },
        }),
      }),
    );
  });

  it('skips export order check when invoice has no customerId', async () => {
    const event = {
      type: 'financial.invoice.created',
      tenantId: TENANT,
      payload: {
        invoiceId: 'inv-2',
        invoiceNumber: 'INV-002',
        totalPaise: 3000000,
        customerId: null,
      },
    };

    await subscribedHandlers.get('financial.invoice.created')!(event);

    expect((mockPrisma as any).exportOrder.findMany).not.toHaveBeenCalled();
  });
});
