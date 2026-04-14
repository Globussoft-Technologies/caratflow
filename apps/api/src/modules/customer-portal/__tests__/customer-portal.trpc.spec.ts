import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TrpcService } from '../../../trpc/trpc.service';
import { CustomerPortalTrpcRouter } from '../customer-portal.trpc';

describe('CustomerPortalTrpcRouter', () => {
  const trpc = new TrpcService();

  const profileService = {
    getProfile: vi.fn(),
    updateProfile: vi.fn(),
    changePassword: vi.fn(),
    getNotificationPreferences: vi.fn(),
    updateNotificationPreferences: vi.fn(),
    deleteAccount: vi.fn(),
  };
  const ordersService = {
    getMyOrders: vi.fn(),
    getOrderDetail: vi.fn(),
    getOrderTrackingLive: vi.fn(),
    downloadInvoice: vi.fn(),
    requestReturn: vi.fn(),
    cancelOrder: vi.fn(),
  };
  const loyaltyService = {
    getLoyaltyDashboard: vi.fn(),
    getPointsHistory: vi.fn(),
    redeemPoints: vi.fn(),
  };
  const schemesService = {
    getMySchemes: vi.fn(),
    getSchemeDetail: vi.fn(),
    payInstallment: vi.fn(),
    enrollInScheme: vi.fn(),
  };
  const kycService = {
    getKycStatus: vi.fn(),
    uploadDocument: vi.fn(),
  };
  const dashboardService = {
    getDashboard: vi.fn(),
  };

  const ctx = {
    tenantId: 'tenant-1',
    userId: 'user-1',
    userRole: 'customer',
    userPermissions: [],
  };

  const routerInstance = new CustomerPortalTrpcRouter(
    trpc,
    profileService as never,
    ordersService as never,
    loyaltyService as never,
    schemesService as never,
    kycService as never,
    dashboardService as never,
  );
  const caller = routerInstance.router.createCaller(ctx);

  beforeEach(() => vi.clearAllMocks());

  const ORDER_ID = '11111111-1111-1111-1111-111111111111';
  const SCHEME_ID = '22222222-2222-2222-2222-222222222222';
  const MEMBERSHIP_ID = '33333333-3333-3333-3333-333333333333';
  const ORDER_ITEM_ID = '44444444-4444-4444-4444-444444444444';

  // ─── Dashboard ────────────────────────────────────────────
  describe('dashboard', () => {
    it('delegates to dashboardService.getDashboard with tenantId + userId', async () => {
      dashboardService.getDashboard.mockResolvedValue({ greeting: 'Hi' });
      const result = await caller.dashboard();
      expect(dashboardService.getDashboard).toHaveBeenCalledWith('tenant-1', 'user-1');
      expect(result).toEqual({ greeting: 'Hi' });
    });
  });

  // ─── Profile ──────────────────────────────────────────────
  describe('profile.get', () => {
    it('delegates to profileService.getProfile', async () => {
      profileService.getProfile.mockResolvedValue({});
      await caller.profile.get();
      expect(profileService.getProfile).toHaveBeenCalledWith('tenant-1', 'user-1');
    });
  });

  describe('profile.update', () => {
    it('delegates to profileService.updateProfile', async () => {
      profileService.updateProfile.mockResolvedValue({});
      await caller.profile.update({ firstName: 'Jane' });
      expect(profileService.updateProfile).toHaveBeenCalledWith(
        'tenant-1', 'user-1', expect.objectContaining({ firstName: 'Jane' }),
      );
    });

    it('rejects invalid email', async () => {
      await expect(caller.profile.update({ email: 'not-an-email' } as never)).rejects.toThrow();
    });
  });

  describe('profile.changePassword', () => {
    it('delegates to profileService.changePassword', async () => {
      profileService.changePassword.mockResolvedValue({});
      await caller.profile.changePassword({
        currentPassword: 'old-pass',
        newPassword: 'new-password-123',
      });
      expect(profileService.changePassword).toHaveBeenCalledWith(
        'tenant-1', 'user-1',
        { currentPassword: 'old-pass', newPassword: 'new-password-123' },
      );
    });

    it('rejects password shorter than 8 chars', async () => {
      await expect(
        caller.profile.changePassword({ currentPassword: 'a', newPassword: 'short' }),
      ).rejects.toThrow();
    });
  });

  describe('profile.getNotificationPreferences', () => {
    it('delegates to profileService.getNotificationPreferences', async () => {
      profileService.getNotificationPreferences.mockResolvedValue({});
      await caller.profile.getNotificationPreferences();
      expect(profileService.getNotificationPreferences).toHaveBeenCalledWith('tenant-1', 'user-1');
    });
  });

  describe('profile.updateNotificationPreferences', () => {
    it('delegates to profileService.updateNotificationPreferences', async () => {
      profileService.updateNotificationPreferences.mockResolvedValue({});
      const input = { orders: { email: true, sms: false, whatsapp: false, push: true } };
      await caller.profile.updateNotificationPreferences(input);
      expect(profileService.updateNotificationPreferences).toHaveBeenCalledWith(
        'tenant-1', 'user-1', expect.objectContaining({ orders: expect.any(Object) }),
      );
    });
  });

  describe('profile.deleteAccount', () => {
    it('delegates to profileService.deleteAccount', async () => {
      profileService.deleteAccount.mockResolvedValue({});
      await caller.profile.deleteAccount();
      expect(profileService.deleteAccount).toHaveBeenCalledWith('tenant-1', 'user-1');
    });
  });

  // ─── Orders ───────────────────────────────────────────────
  describe('orders.list', () => {
    it('delegates to ordersService.getMyOrders', async () => {
      ordersService.getMyOrders.mockResolvedValue({ items: [] });
      await caller.orders.list({});
      expect(ordersService.getMyOrders).toHaveBeenCalledWith('tenant-1', 'user-1', expect.any(Object));
    });
  });

  describe('orders.get', () => {
    it('delegates to ordersService.getOrderDetail', async () => {
      ordersService.getOrderDetail.mockResolvedValue({});
      await caller.orders.get({ id: ORDER_ID });
      expect(ordersService.getOrderDetail).toHaveBeenCalledWith('tenant-1', 'user-1', ORDER_ID);
    });

    it('rejects invalid uuid', async () => {
      await expect(caller.orders.get({ id: 'bogus' })).rejects.toThrow();
    });
  });

  describe('orders.tracking', () => {
    it('delegates to ordersService.getOrderTrackingLive', async () => {
      ordersService.getOrderTrackingLive.mockResolvedValue({});
      await caller.orders.tracking({ id: ORDER_ID });
      expect(ordersService.getOrderTrackingLive).toHaveBeenCalledWith('tenant-1', 'user-1', ORDER_ID);
    });
  });

  describe('orders.downloadInvoice', () => {
    it('delegates to ordersService.downloadInvoice', async () => {
      ordersService.downloadInvoice.mockResolvedValue({ url: 'https://x' });
      await caller.orders.downloadInvoice({ id: ORDER_ID });
      expect(ordersService.downloadInvoice).toHaveBeenCalledWith('tenant-1', 'user-1', ORDER_ID);
    });
  });

  describe('orders.requestReturn', () => {
    it('delegates to ordersService.requestReturn', async () => {
      ordersService.requestReturn.mockResolvedValue({});
      const input = {
        orderId: ORDER_ID,
        items: [{ orderItemId: ORDER_ITEM_ID, quantity: 1, reason: 'defective' }],
        reason: 'product defective',
        preferredRefundMethod: 'ORIGINAL_PAYMENT' as const,
      };
      await caller.orders.requestReturn(input);
      expect(ordersService.requestReturn).toHaveBeenCalledWith('tenant-1', 'user-1', input);
    });
  });

  describe('orders.cancel', () => {
    it('delegates to ordersService.cancelOrder', async () => {
      ordersService.cancelOrder.mockResolvedValue({});
      await caller.orders.cancel({ id: ORDER_ID });
      expect(ordersService.cancelOrder).toHaveBeenCalledWith('tenant-1', 'user-1', ORDER_ID);
    });
  });

  // ─── Loyalty ──────────────────────────────────────────────
  describe('loyalty.dashboard', () => {
    it('delegates to loyaltyService.getLoyaltyDashboard', async () => {
      loyaltyService.getLoyaltyDashboard.mockResolvedValue({});
      await caller.loyalty.dashboard();
      expect(loyaltyService.getLoyaltyDashboard).toHaveBeenCalledWith('tenant-1', 'user-1');
    });
  });

  describe('loyalty.history', () => {
    it('delegates to loyaltyService.getPointsHistory when called w/out input', async () => {
      loyaltyService.getPointsHistory.mockResolvedValue({ items: [] });
      await caller.loyalty.history();
      expect(loyaltyService.getPointsHistory).toHaveBeenCalledWith('tenant-1', 'user-1', {});
    });

    it('delegates with pagination input', async () => {
      loyaltyService.getPointsHistory.mockResolvedValue({ items: [] });
      await caller.loyalty.history({ page: 2, limit: 10 });
      expect(loyaltyService.getPointsHistory).toHaveBeenCalledWith(
        'tenant-1', 'user-1', expect.objectContaining({ page: 2, limit: 10 }),
      );
    });
  });

  describe('loyalty.redeem', () => {
    it('delegates to loyaltyService.redeemPoints', async () => {
      loyaltyService.redeemPoints.mockResolvedValue({});
      await caller.loyalty.redeem({ points: 100, orderId: ORDER_ID });
      expect(loyaltyService.redeemPoints).toHaveBeenCalledWith('tenant-1', 'user-1', 100, ORDER_ID);
    });

    it('rejects non-positive points', async () => {
      await expect(caller.loyalty.redeem({ points: 0, orderId: ORDER_ID })).rejects.toThrow();
    });
  });

  // ─── Schemes ──────────────────────────────────────────────
  describe('schemes.list', () => {
    it('delegates to schemesService.getMySchemes', async () => {
      schemesService.getMySchemes.mockResolvedValue([]);
      await caller.schemes.list();
      expect(schemesService.getMySchemes).toHaveBeenCalledWith('tenant-1', 'user-1');
    });
  });

  describe('schemes.get', () => {
    it('delegates to schemesService.getSchemeDetail', async () => {
      schemesService.getSchemeDetail.mockResolvedValue({});
      await caller.schemes.get({ id: SCHEME_ID });
      expect(schemesService.getSchemeDetail).toHaveBeenCalledWith('tenant-1', 'user-1', SCHEME_ID);
    });
  });

  describe('schemes.payInstallment', () => {
    it('delegates to schemesService.payInstallment', async () => {
      schemesService.payInstallment.mockResolvedValue({});
      await caller.schemes.payInstallment({
        membershipId: MEMBERSHIP_ID,
        paymentMethod: 'UPI',
      });
      expect(schemesService.payInstallment).toHaveBeenCalledWith(
        'tenant-1', 'user-1', MEMBERSHIP_ID, 'UPI',
      );
    });

    it('rejects invalid paymentMethod', async () => {
      await expect(
        caller.schemes.payInstallment({ membershipId: MEMBERSHIP_ID, paymentMethod: 'CRYPTO' as never }),
      ).rejects.toThrow();
    });
  });

  describe('schemes.enroll', () => {
    it('delegates to schemesService.enrollInScheme', async () => {
      schemesService.enrollInScheme.mockResolvedValue({});
      const input = { schemeId: SCHEME_ID, schemeType: 'KITTY' as const };
      await caller.schemes.enroll(input);
      expect(schemesService.enrollInScheme).toHaveBeenCalledWith('tenant-1', 'user-1', input);
    });
  });

  // ─── KYC ──────────────────────────────────────────────────
  describe('kyc.status', () => {
    it('delegates to kycService.getKycStatus', async () => {
      kycService.getKycStatus.mockResolvedValue({});
      await caller.kyc.status();
      expect(kycService.getKycStatus).toHaveBeenCalledWith('tenant-1', 'user-1');
    });
  });

  describe('kyc.upload', () => {
    it('delegates to kycService.uploadDocument', async () => {
      kycService.uploadDocument.mockResolvedValue({});
      const input = {
        documentType: 'AADHAAR' as const,
        documentNumber: '1234-5678-9012',
        fileUrl: 'https://example.com/doc.pdf',
      };
      await caller.kyc.upload(input);
      expect(kycService.uploadDocument).toHaveBeenCalledWith('tenant-1', 'user-1', input);
    });

    it('rejects invalid fileUrl', async () => {
      await expect(
        caller.kyc.upload({
          documentType: 'AADHAAR',
          documentNumber: '1234',
          fileUrl: 'not-a-url',
        } as never),
      ).rejects.toThrow();
    });
  });

  // ─── Auth ─────────────────────────────────────────────────
  it('rejects unauthenticated calls', async () => {
    const unauth = routerInstance.router.createCaller({});
    await expect(unauth.dashboard()).rejects.toThrow();
  });
});
