import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AmlEventHandler } from '../aml.event-handler';
import { createMockEventBus, TEST_TENANT_ID } from '../../../__tests__/setup';

describe('AmlEventHandler', () => {
  let handler: AmlEventHandler;
  let mockEventBus: ReturnType<typeof createMockEventBus>;
  let mockAmlService: any;
  let mockRiskService: any;
  let subscribedHandlers: Map<string, Function>;

  const TENANT = TEST_TENANT_ID;

  beforeEach(() => {
    mockEventBus = createMockEventBus();
    subscribedHandlers = new Map();

    mockEventBus.subscribe.mockImplementation((eventType: string, fn: Function) => {
      subscribedHandlers.set(eventType, fn);
    });

    mockAmlService = {
      evaluateTransaction: vi.fn().mockResolvedValue({ passed: true, alertsCreated: 0 }),
    };
    mockRiskService = {
      calculateCustomerRisk: vi.fn().mockResolvedValue(undefined),
    };

    handler = new AmlEventHandler(
      mockEventBus as any,
      mockAmlService,
      mockRiskService,
    );
    handler.onModuleInit();
  });

  it('subscribes to financial.payment.received, retail.sale.completed, and storefront.order.completed', () => {
    expect(subscribedHandlers.has('financial.payment.received')).toBe(true);
    expect(subscribedHandlers.has('retail.sale.completed')).toBe(true);
    expect(subscribedHandlers.has('storefront.order.completed')).toBe(true);
  });

  it('evaluates AML rules on financial.payment.received', async () => {
    const event = {
      type: 'financial.payment.received',
      tenantId: TENANT,
      payload: {
        paymentId: 'pay-1',
        amountPaise: 5000000,
        method: 'CASH',
        referenceId: 'cust-1',
      },
    };

    await subscribedHandlers.get('financial.payment.received')!(event);

    expect(mockAmlService.evaluateTransaction).toHaveBeenCalledWith(
      TENANT,
      'cust-1',
      BigInt(5000000),
      'financial.payment.CASH',
      'pay-1',
    );
  });

  it('recalculates customer risk when AML check fails on retail.sale.completed', async () => {
    mockAmlService.evaluateTransaction.mockResolvedValue({ passed: false, alertsCreated: 2 });

    const event = {
      type: 'retail.sale.completed',
      tenantId: TENANT,
      payload: {
        saleId: 'sale-1',
        customerId: 'cust-2',
        totalPaise: 10000000,
        items: [],
      },
    };

    await subscribedHandlers.get('retail.sale.completed')!(event);

    expect(mockAmlService.evaluateTransaction).toHaveBeenCalledWith(
      TENANT,
      'cust-2',
      BigInt(10000000),
      'retail.sale',
      'sale-1',
    );
    expect(mockRiskService.calculateCustomerRisk).toHaveBeenCalledWith(TENANT, 'cust-2');
  });

  it('evaluates AML rules on storefront.order.completed', async () => {
    const event = {
      type: 'storefront.order.completed',
      tenantId: TENANT,
      payload: {
        orderId: 'order-1',
        customerId: 'cust-3',
        totalPaise: 7500000,
      },
    };

    await subscribedHandlers.get('storefront.order.completed')!(event);

    expect(mockAmlService.evaluateTransaction).toHaveBeenCalledWith(
      TENANT,
      'cust-3',
      BigInt(7500000),
      'storefront.order',
      'order-1',
    );
  });

  it('does not recalculate risk when AML check passes', async () => {
    mockAmlService.evaluateTransaction.mockResolvedValue({ passed: true, alertsCreated: 0 });

    const event = {
      type: 'retail.sale.completed',
      tenantId: TENANT,
      payload: {
        saleId: 'sale-2',
        customerId: 'cust-4',
        totalPaise: 100000,
        items: [],
      },
    };

    await subscribedHandlers.get('retail.sale.completed')!(event);

    expect(mockRiskService.calculateCustomerRisk).not.toHaveBeenCalled();
  });
});
