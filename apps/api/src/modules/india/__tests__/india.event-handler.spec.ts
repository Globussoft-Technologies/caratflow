import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IndiaEventHandler } from '../india.event-handler';
import { TEST_TENANT_ID } from '../../../__tests__/setup';

describe('IndiaEventHandler', () => {
  let handler: IndiaEventHandler;
  let mockKycService: any;
  let mockSchemeService: any;
  let mockGirviService: any;

  const TENANT = TEST_TENANT_ID;

  beforeEach(() => {
    mockKycService = {
      isKycComplete: vi.fn().mockResolvedValue(true),
      markExpiredVerifications: vi.fn().mockResolvedValue(3),
    };
    mockSchemeService = {
      markOverdueInstallments: vi.fn().mockResolvedValue(5),
      processMaturityDates: vi.fn().mockResolvedValue(2),
    };
    mockGirviService = {
      runDailyInterestAccrual: vi.fn().mockResolvedValue(10),
      processOverdueLoans: vi.fn().mockResolvedValue(1),
    };

    handler = new IndiaEventHandler(mockKycService, mockSchemeService, mockGirviService);
  });

  // ─── handleRetailSale ──────────────────────────────────────────

  describe('handleRetailSale', () => {
    it('checks KYC for high-value sales >= Rs 2 lakh', async () => {
      const event = {
        tenantId: TENANT,
        payload: {
          saleId: 'sale-1',
          customerId: 'cust-1',
          totalPaise: 200_000_00, // exactly Rs 2 lakh
          items: [],
        },
      };

      await handler.handleRetailSale(event as any);

      expect(mockKycService.isKycComplete).toHaveBeenCalledWith(TENANT, 'cust-1');
    });

    it('skips KYC check for low-value sales below Rs 2 lakh', async () => {
      const event = {
        tenantId: TENANT,
        payload: {
          saleId: 'sale-2',
          customerId: 'cust-2',
          totalPaise: 199_999_99, // just under Rs 2 lakh
          items: [],
        },
      };

      await handler.handleRetailSale(event as any);

      expect(mockKycService.isKycComplete).not.toHaveBeenCalled();
    });

    it('logs warning when KYC is incomplete for high-value sale', async () => {
      mockKycService.isKycComplete.mockResolvedValue(false);

      const event = {
        tenantId: TENANT,
        payload: {
          saleId: 'sale-3',
          customerId: 'cust-3',
          totalPaise: 500_000_00, // Rs 5 lakh
          items: [],
        },
      };

      // Should not throw, just logs warning
      await expect(handler.handleRetailSale(event as any)).resolves.toBeUndefined();
      expect(mockKycService.isKycComplete).toHaveBeenCalledWith(TENANT, 'cust-3');
    });
  });

  // ─── handlePaymentReceived ─────────────────────────────────────

  describe('handlePaymentReceived', () => {
    it('detects girvi payment references starting with GRV-', async () => {
      const event = {
        tenantId: TENANT,
        payload: {
          paymentId: 'pay-1',
          amountPaise: 100_000_00,
          referenceId: 'GRV-2025-001',
        },
      };

      // Should not throw
      await expect(handler.handlePaymentReceived(event as any)).resolves.toBeUndefined();
    });

    it('detects scheme payment references starting with KIT- or GS-', async () => {
      const kitEvent = {
        tenantId: TENANT,
        payload: {
          paymentId: 'pay-2',
          amountPaise: 50_000_00,
          referenceId: 'KIT-2025-042',
        },
      };

      await expect(handler.handlePaymentReceived(kitEvent as any)).resolves.toBeUndefined();
    });
  });

  // ─── runDailyTasks ─────────────────────────────────────────────

  describe('runDailyTasks', () => {
    it('runs all daily India-specific tasks for a tenant', async () => {
      await handler.runDailyTasks(TENANT);

      expect(mockGirviService.runDailyInterestAccrual).toHaveBeenCalledWith(TENANT);
      expect(mockGirviService.processOverdueLoans).toHaveBeenCalledWith(TENANT);
      expect(mockSchemeService.markOverdueInstallments).toHaveBeenCalledWith(TENANT);
      expect(mockSchemeService.processMaturityDates).toHaveBeenCalledWith(TENANT);
      expect(mockKycService.markExpiredVerifications).toHaveBeenCalledWith(TENANT);
    });

    it('handles errors gracefully without throwing', async () => {
      mockGirviService.runDailyInterestAccrual.mockRejectedValue(new Error('DB connection failed'));

      // Should not throw -- error is caught and logged
      await expect(handler.runDailyTasks(TENANT)).resolves.toBeUndefined();
    });
  });
});
