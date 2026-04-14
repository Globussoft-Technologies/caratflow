import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TrpcService } from '../../../trpc/trpc.service';
import { DigitalGoldTrpcRouter } from '../digital-gold.trpc';

describe('DigitalGoldTrpcRouter', () => {
  const trpc = new TrpcService();

  const digitalGoldService = {
    buyGold: vi.fn(),
    sellGold: vi.fn(),
    getVault: vi.fn(),
    getPortfolio: vi.fn(),
    getTransactionHistory: vi.fn(),
    getCurrentRates: vi.fn(),
    getDashboard: vi.fn(),
  };
  const sipService = {
    createSip: vi.fn(),
    getCustomerSips: vi.fn(),
    getSip: vi.fn(),
    pauseSip: vi.fn(),
    resumeSip: vi.fn(),
    cancelSip: vi.fn(),
    getSipHistory: vi.fn(),
  };
  const redemptionService = {
    redeemForPhysical: vi.fn(),
    redeemForJewelry: vi.fn(),
    sellBack: vi.fn(),
    getRedemptions: vi.fn(),
  };
  const alertService = {
    createAlert: vi.fn(),
    getCustomerAlerts: vi.fn(),
    cancelAlert: vi.fn(),
  };
  const ratesService = {
    getHistoricalRates: vi.fn(),
  };

  const ctx = {
    tenantId: 'tenant-1',
    userId: 'user-1',
    userRole: 'customer',
    userPermissions: [],
  };

  const routerInstance = new DigitalGoldTrpcRouter(
    trpc,
    digitalGoldService as never,
    sipService as never,
    redemptionService as never,
    alertService as never,
    ratesService as never,
  );
  const caller = routerInstance.router.createCaller(ctx);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const PRODUCT_ID = '11111111-1111-1111-1111-111111111111';
  const ADDRESS_ID = 'addr-1';
  const SIP_ID = '22222222-2222-2222-2222-222222222222';
  const ALERT_ID = '33333333-3333-3333-3333-333333333333';

  // ─── Buy / Sell ────────────────────────────────────────────
  describe('buy', () => {
    it('delegates to digitalGoldService.buyGold with tenantId + userId + input', async () => {
      digitalGoldService.buyGold.mockResolvedValue({ transactionId: 'tx-1' });
      const input = { amountPaise: 10000, paymentMethod: 'UPI' as const };
      const result = await caller.buy(input);
      expect(digitalGoldService.buyGold).toHaveBeenCalledWith('tenant-1', 'user-1', input);
      expect(result).toEqual({ transactionId: 'tx-1' });
    });

    it('rejects invalid input (neither amountPaise nor weightMg)', async () => {
      await expect(caller.buy({ paymentMethod: 'UPI' } as never)).rejects.toThrow();
    });
  });

  describe('sell', () => {
    it('delegates to digitalGoldService.sellGold', async () => {
      digitalGoldService.sellGold.mockResolvedValue({ transactionId: 'tx-2' });
      const result = await caller.sell({ weightMg: 1000 });
      expect(digitalGoldService.sellGold).toHaveBeenCalledWith('tenant-1', 'user-1', { weightMg: 1000 });
      expect(result).toEqual({ transactionId: 'tx-2' });
    });

    it('rejects invalid input (missing weightMg)', async () => {
      await expect(caller.sell({} as never)).rejects.toThrow();
    });
  });

  // ─── Vault / Portfolio ─────────────────────────────────────
  describe('getVault', () => {
    it('delegates to digitalGoldService.getVault', async () => {
      digitalGoldService.getVault.mockResolvedValue({ balanceMg: 1000 });
      const result = await caller.getVault();
      expect(digitalGoldService.getVault).toHaveBeenCalledWith('tenant-1', 'user-1');
      expect(result).toEqual({ balanceMg: 1000 });
    });
  });

  describe('getPortfolio', () => {
    it('delegates to digitalGoldService.getPortfolio', async () => {
      digitalGoldService.getPortfolio.mockResolvedValue({ vault: {} });
      const result = await caller.getPortfolio();
      expect(digitalGoldService.getPortfolio).toHaveBeenCalledWith('tenant-1', 'user-1');
      expect(result).toEqual({ vault: {} });
    });
  });

  // ─── Transactions ──────────────────────────────────────────
  describe('listTransactions', () => {
    it('applies pagination defaults and forwards filters', async () => {
      digitalGoldService.getTransactionHistory.mockResolvedValue({ items: [] });
      await caller.listTransactions({});
      expect(digitalGoldService.getTransactionHistory).toHaveBeenCalledWith(
        'tenant-1',
        'user-1',
        expect.objectContaining({
          page: 1,
          limit: 20,
          sortOrder: 'desc',
        }),
      );
    });
  });

  // ─── SIP ───────────────────────────────────────────────────
  describe('sip.create', () => {
    it('delegates to sipService.createSip', async () => {
      sipService.createSip.mockResolvedValue({ id: SIP_ID });
      const input = {
        sipType: 'FIXED_AMOUNT' as const,
        amountPaise: 50000,
        frequency: 'MONTHLY' as const,
        dayOfMonth: 5,
        startDate: new Date('2026-05-01'),
        paymentMethod: 'UPI' as const,
      };
      // mutate dates to iso-strings to mirror trpc transport coercion
      const result = await caller.sip.create(input);
      expect(sipService.createSip).toHaveBeenCalledWith('tenant-1', 'user-1', expect.objectContaining({
        sipType: 'FIXED_AMOUNT',
        amountPaise: 50000,
      }));
      expect(result).toEqual({ id: SIP_ID });
    });

    it('rejects invalid input (FIXED_AMOUNT without amountPaise)', async () => {
      await expect(
        caller.sip.create({
          sipType: 'FIXED_AMOUNT',
          frequency: 'MONTHLY',
          dayOfMonth: 5,
          startDate: new Date(),
          paymentMethod: 'UPI',
        } as never),
      ).rejects.toThrow();
    });
  });

  describe('sip.list', () => {
    it('delegates to sipService.getCustomerSips', async () => {
      sipService.getCustomerSips.mockResolvedValue([]);
      await caller.sip.list();
      expect(sipService.getCustomerSips).toHaveBeenCalledWith('tenant-1', 'user-1');
    });
  });

  describe('sip.get', () => {
    it('delegates to sipService.getSip', async () => {
      sipService.getSip.mockResolvedValue({ id: SIP_ID });
      await caller.sip.get({ sipId: SIP_ID });
      expect(sipService.getSip).toHaveBeenCalledWith('tenant-1', SIP_ID);
    });

    it('rejects non-uuid sipId', async () => {
      await expect(caller.sip.get({ sipId: 'not-a-uuid' })).rejects.toThrow();
    });
  });

  describe('sip.pause', () => {
    it('delegates to sipService.pauseSip', async () => {
      sipService.pauseSip.mockResolvedValue({ id: SIP_ID });
      await caller.sip.pause({ sipId: SIP_ID });
      expect(sipService.pauseSip).toHaveBeenCalledWith('tenant-1', SIP_ID);
    });
  });

  describe('sip.resume', () => {
    it('delegates to sipService.resumeSip', async () => {
      sipService.resumeSip.mockResolvedValue({ id: SIP_ID });
      await caller.sip.resume({ sipId: SIP_ID });
      expect(sipService.resumeSip).toHaveBeenCalledWith('tenant-1', SIP_ID);
    });
  });

  describe('sip.cancel', () => {
    it('delegates to sipService.cancelSip', async () => {
      sipService.cancelSip.mockResolvedValue({ id: SIP_ID });
      await caller.sip.cancel({ sipId: SIP_ID });
      expect(sipService.cancelSip).toHaveBeenCalledWith('tenant-1', SIP_ID);
    });
  });

  describe('sip.history', () => {
    it('delegates to sipService.getSipHistory', async () => {
      sipService.getSipHistory.mockResolvedValue([]);
      await caller.sip.history({ sipId: SIP_ID });
      expect(sipService.getSipHistory).toHaveBeenCalledWith('tenant-1', SIP_ID);
    });
  });

  // ─── Redemption ────────────────────────────────────────────
  describe('redeem', () => {
    it('routes PHYSICAL_GOLD to redeemForPhysical', async () => {
      redemptionService.redeemForPhysical.mockResolvedValue({ redemptionId: 'r-1' });
      const result = await caller.redeem({
        redemptionType: 'PHYSICAL_GOLD',
        weightMg: 1000,
        addressId: ADDRESS_ID,
      });
      expect(redemptionService.redeemForPhysical).toHaveBeenCalledWith(
        'tenant-1', 'user-1', 1000, ADDRESS_ID,
      );
      expect(result).toEqual({ redemptionId: 'r-1' });
    });

    it('routes JEWELRY to redeemForJewelry', async () => {
      redemptionService.redeemForJewelry.mockResolvedValue({ redemptionId: 'r-2' });
      const result = await caller.redeem({
        redemptionType: 'JEWELRY',
        productId: PRODUCT_ID,
        addressId: ADDRESS_ID,
      });
      expect(redemptionService.redeemForJewelry).toHaveBeenCalledWith(
        'tenant-1', 'user-1', PRODUCT_ID, ADDRESS_ID,
      );
      expect(result).toEqual({ redemptionId: 'r-2' });
    });

    it('routes SELL_BACK to sellBack', async () => {
      redemptionService.sellBack.mockResolvedValue({ redemptionId: 'r-3' });
      const result = await caller.redeem({
        redemptionType: 'SELL_BACK',
        weightMg: 500,
        addressId: ADDRESS_ID,
      });
      expect(redemptionService.sellBack).toHaveBeenCalledWith(
        'tenant-1', 'user-1', 500, ADDRESS_ID,
      );
      expect(result).toEqual({ redemptionId: 'r-3' });
    });

    it('rejects invalid redemptionType', async () => {
      await expect(
        caller.redeem({ redemptionType: 'BOGUS', weightMg: 1, addressId: ADDRESS_ID } as never),
      ).rejects.toThrow();
    });
  });

  describe('listRedemptions', () => {
    it('delegates to redemptionService.getRedemptions', async () => {
      redemptionService.getRedemptions.mockResolvedValue([]);
      await caller.listRedemptions();
      expect(redemptionService.getRedemptions).toHaveBeenCalledWith('tenant-1', 'user-1');
    });
  });

  // ─── Alerts ────────────────────────────────────────────────
  describe('alerts.create', () => {
    it('delegates to alertService.createAlert', async () => {
      alertService.createAlert.mockResolvedValue({ id: ALERT_ID });
      const input = {
        alertType: 'PRICE_BELOW' as const,
        targetPricePer10gPaise: 5000000,
      };
      await caller.alerts.create(input);
      expect(alertService.createAlert).toHaveBeenCalledWith('tenant-1', 'user-1', input);
    });

    it('rejects invalid input', async () => {
      await expect(caller.alerts.create({} as never)).rejects.toThrow();
    });
  });

  describe('alerts.list', () => {
    it('delegates to alertService.getCustomerAlerts', async () => {
      alertService.getCustomerAlerts.mockResolvedValue([]);
      await caller.alerts.list();
      expect(alertService.getCustomerAlerts).toHaveBeenCalledWith('tenant-1', 'user-1');
    });
  });

  describe('alerts.cancel', () => {
    it('delegates to alertService.cancelAlert with alertId', async () => {
      alertService.cancelAlert.mockResolvedValue({ id: ALERT_ID });
      await caller.alerts.cancel({ alertId: ALERT_ID });
      expect(alertService.cancelAlert).toHaveBeenCalledWith('tenant-1', 'user-1', ALERT_ID);
    });
  });

  // ─── Rates ─────────────────────────────────────────────────
  describe('rates.current', () => {
    it('delegates to digitalGoldService.getCurrentRates', async () => {
      digitalGoldService.getCurrentRates.mockResolvedValue({ pricePer10gPaise: 7000000 });
      const result = await caller.rates.current();
      expect(digitalGoldService.getCurrentRates).toHaveBeenCalled();
      expect(result).toEqual({ pricePer10gPaise: 7000000 });
    });
  });

  describe('rates.history', () => {
    it('delegates to ratesService.getHistoricalRates with GOLD / 999 / dateRange', async () => {
      ratesService.getHistoricalRates.mockResolvedValue([]);
      const from = new Date('2026-01-01');
      const to = new Date('2026-02-01');
      await caller.rates.history({ from, to });
      expect(ratesService.getHistoricalRates).toHaveBeenCalledWith({
        metalType: 'GOLD',
        purity: 999,
        dateRange: { from, to },
      });
    });

    it('passes undefined dateRange when no dates provided', async () => {
      ratesService.getHistoricalRates.mockResolvedValue([]);
      await caller.rates.history({});
      expect(ratesService.getHistoricalRates).toHaveBeenCalledWith({
        metalType: 'GOLD',
        purity: 999,
        dateRange: undefined,
      });
    });
  });

  // ─── Dashboard ─────────────────────────────────────────────
  describe('dashboard', () => {
    it('delegates to digitalGoldService.getDashboard with tenantId', async () => {
      digitalGoldService.getDashboard.mockResolvedValue({ totalBalance: 10 });
      const result = await caller.dashboard();
      expect(digitalGoldService.getDashboard).toHaveBeenCalledWith('tenant-1');
      expect(result).toEqual({ totalBalance: 10 });
    });
  });

  // ─── Auth ──────────────────────────────────────────────────
  it('rejects unauthenticated calls', async () => {
    const unauth = routerInstance.router.createCaller({});
    await expect(unauth.dashboard()).rejects.toThrow();
  });
});
