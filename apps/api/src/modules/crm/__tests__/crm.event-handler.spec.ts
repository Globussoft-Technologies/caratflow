import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CrmEventHandler } from '../crm.event-handler';
import { createMockEventBus, TEST_TENANT_ID, TEST_USER_ID } from '../../../__tests__/setup';

describe('CrmEventHandler', () => {
  let handler: CrmEventHandler;
  let mockEventBus: ReturnType<typeof createMockEventBus>;
  let mockLoyaltyService: {
    calculatePointsForSale: ReturnType<typeof vi.fn>;
    earnPoints: ReturnType<typeof vi.fn>;
  };
  let mockFeedbackService: {
    createFeedback: ReturnType<typeof vi.fn>;
  };
  let subscribedHandlers: Map<string, Function>;

  beforeEach(() => {
    mockEventBus = createMockEventBus();
    mockLoyaltyService = {
      calculatePointsForSale: vi.fn().mockResolvedValue(50),
      earnPoints: vi.fn().mockResolvedValue({ id: 'lt-1', points: 50 }),
    };
    mockFeedbackService = {
      createFeedback: vi.fn().mockResolvedValue({ id: 'fb-1' }),
    };

    subscribedHandlers = new Map();
    mockEventBus.subscribe.mockImplementation((eventType: string, handlerFn: Function) => {
      subscribedHandlers.set(eventType, handlerFn);
    });

    handler = new CrmEventHandler(
      mockEventBus as any,
      mockLoyaltyService as any,
      mockFeedbackService as any,
    );
    handler.onModuleInit();
  });

  it('subscribes to the correct event types', () => {
    expect(mockEventBus.subscribe).toHaveBeenCalledTimes(2);
    expect(subscribedHandlers.has('retail.sale.completed')).toBe(true);
    expect(subscribedHandlers.has('financial.payment.received')).toBe(true);
  });

  it('handles retail.sale.completed by awarding loyalty points', async () => {
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

    expect(mockLoyaltyService.calculatePointsForSale).toHaveBeenCalledWith(TEST_TENANT_ID, 500000);
    expect(mockLoyaltyService.earnPoints).toHaveBeenCalledWith(
      TEST_TENANT_ID,
      TEST_USER_ID,
      'cust-1',
      50,
      'SALE',
      'sale-1',
      expect.stringContaining('sale-1'),
    );
  });

  it('handles retail.sale.completed by creating a feedback request', async () => {
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

    expect(mockFeedbackService.createFeedback).toHaveBeenCalledWith(
      TEST_TENANT_ID,
      TEST_USER_ID,
      expect.objectContaining({
        customerId: 'cust-1',
        feedbackType: 'PURCHASE',
        rating: 0,
        saleId: 'sale-1',
      }),
    );
  });

  it('skips loyalty points when calculated points are zero', async () => {
    mockLoyaltyService.calculatePointsForSale.mockResolvedValue(0);

    const event = {
      type: 'retail.sale.completed',
      tenantId: TEST_TENANT_ID,
      userId: TEST_USER_ID,
      payload: {
        saleId: 'sale-2',
        customerId: 'cust-2',
        totalPaise: 100,
        items: [{ productId: 'prod-1', pricePaise: 100 }],
      },
    };

    await subscribedHandlers.get('retail.sale.completed')!(event);

    expect(mockLoyaltyService.earnPoints).not.toHaveBeenCalled();
    // Feedback is still created even with zero points
    expect(mockFeedbackService.createFeedback).toHaveBeenCalled();
  });

  it('handles financial.payment.received by logging scheme updates', async () => {
    const event = {
      type: 'financial.payment.received',
      tenantId: TEST_TENANT_ID,
      userId: TEST_USER_ID,
      payload: {
        paymentId: 'pay-1',
        amountPaise: 500000,
        method: 'UPI',
        referenceId: 'ref-1',
      },
    };

    // Should not throw
    await expect(
      subscribedHandlers.get('financial.payment.received')!(event),
    ).resolves.not.toThrow();
  });

  it('handles errors without crashing', async () => {
    mockLoyaltyService.calculatePointsForSale.mockRejectedValue(new Error('Service error'));

    const event = {
      type: 'retail.sale.completed',
      tenantId: TEST_TENANT_ID,
      userId: TEST_USER_ID,
      payload: {
        saleId: 'sale-3',
        customerId: 'cust-3',
        totalPaise: 500000,
        items: [{ productId: 'prod-1', pricePaise: 500000 }],
      },
    };

    await expect(
      subscribedHandlers.get('retail.sale.completed')!(event),
    ).resolves.not.toThrow();
  });
});
