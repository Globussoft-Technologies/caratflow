import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DigitalGoldEventHandler } from '../digital-gold.event-handler';
import { TEST_TENANT_ID, TEST_USER_ID } from '../../../__tests__/setup';

describe('DigitalGoldEventHandler', () => {
  let handler: DigitalGoldEventHandler;
  let mockAlertService: {
    checkAlerts: ReturnType<typeof vi.fn>;
  };
  let mockSipService: {
    executeDueSips: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockAlertService = {
      checkAlerts: vi.fn().mockResolvedValue({ triggered: 0 }),
    };
    mockSipService = {
      executeDueSips: vi.fn().mockResolvedValue({ executed: 3, failed: 0 }),
    };

    handler = new DigitalGoldEventHandler(
      mockAlertService as any,
      mockSipService as any,
    );
  });

  it('initializes without error on onModuleInit', () => {
    expect(() => handler.onModuleInit()).not.toThrow();
  });

  it('handles gold rate update by checking price alerts', async () => {
    mockAlertService.checkAlerts.mockResolvedValue({ triggered: 5 });

    const event = {
      type: 'india.rates.updated',
      tenantId: TEST_TENANT_ID,
      userId: TEST_USER_ID,
      payload: {
        metalType: 'GOLD',
        purity: 999,
        ratePer10gPaise: 6000000,
      },
    };

    await handler.handleRateUpdated(event as any);

    expect(mockAlertService.checkAlerts).toHaveBeenCalled();
  });

  it('ignores non-gold rate updates', async () => {
    const event = {
      type: 'india.rates.updated',
      tenantId: TEST_TENANT_ID,
      userId: TEST_USER_ID,
      payload: {
        metalType: 'SILVER',
        purity: 999,
        ratePer10gPaise: 80000,
      },
    };

    await handler.handleRateUpdated(event as any);

    expect(mockAlertService.checkAlerts).not.toHaveBeenCalled();
  });

  it('handles payment received for digital gold transactions', async () => {
    const event = {
      type: 'financial.payment.received',
      tenantId: TEST_TENANT_ID,
      userId: TEST_USER_ID,
      payload: {
        paymentId: 'pay-1',
        amountPaise: 100000,
        referenceId: 'DG-txn-001',
      },
    };

    // Should not throw
    await expect(handler.handlePaymentReceived(event as any)).resolves.not.toThrow();
  });

  it('ignores payment events not related to digital gold', async () => {
    const event = {
      type: 'financial.payment.received',
      tenantId: TEST_TENANT_ID,
      userId: TEST_USER_ID,
      payload: {
        paymentId: 'pay-2',
        amountPaise: 500000,
        referenceId: 'INV-001', // Not a DG- reference
      },
    };

    await expect(handler.handlePaymentReceived(event as any)).resolves.not.toThrow();
  });

  it('runs daily tasks executing SIPs and checking alerts', async () => {
    await handler.runDailyTasks();

    expect(mockSipService.executeDueSips).toHaveBeenCalled();
    expect(mockAlertService.checkAlerts).toHaveBeenCalled();
  });

  it('handles errors in rate update without crashing', async () => {
    mockAlertService.checkAlerts.mockRejectedValue(new Error('Alert service error'));

    const event = {
      type: 'india.rates.updated',
      tenantId: TEST_TENANT_ID,
      userId: TEST_USER_ID,
      payload: {
        metalType: 'GOLD',
        purity: 999,
        ratePer10gPaise: 6000000,
      },
    };

    await expect(handler.handleRateUpdated(event as any)).resolves.not.toThrow();
  });

  it('handles errors in daily tasks without crashing', async () => {
    mockSipService.executeDueSips.mockRejectedValue(new Error('SIP execution error'));

    await expect(handler.runDailyTasks()).resolves.not.toThrow();
  });
});
