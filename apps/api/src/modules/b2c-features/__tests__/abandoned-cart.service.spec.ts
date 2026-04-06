import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AbandonedCartService } from '../abandoned-cart.service';
import { createMockPrismaService, createMockEventBus, TEST_TENANT_ID, resetAllMocks } from '../../../__tests__/setup';

describe('AbandonedCartService', () => {
  let service: AbandonedCartService;
  let mockPrisma: ReturnType<typeof createMockPrismaService>;
  let mockEventBus: ReturnType<typeof createMockEventBus>;
  let mockNotificationService: any;
  let mockCouponService: any;

  beforeEach(() => {
    mockPrisma = createMockPrismaService();
    mockEventBus = createMockEventBus();
    mockNotificationService = {
      sendNotification: vi.fn().mockResolvedValue(undefined),
    };
    mockCouponService = {
      generateBulkCoupons: vi.fn().mockResolvedValue({ codes: ['RECOVER-ABCD1234'] }),
    };

    (mockPrisma as any).abandonedCart = {
      findFirst: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    };

    service = new AbandonedCartService(
      mockPrisma as any,
      mockEventBus as any,
      mockNotificationService,
      mockCouponService,
    );
    resetAllMocks(mockPrisma);
  });

  // ─── detectAbandonedCarts ──────────────────────────────────

  describe('detectAbandonedCarts', () => {
    it('detects carts idle > 1 hour with items', async () => {
      (mockPrisma as any).abandonedCart.findFirst.mockResolvedValue(null);
      (mockPrisma as any).abandonedCart.create.mockResolvedValue({ id: 'ac-1' });

      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const staleCarts = [
        {
          cartSessionId: 'sess-1',
          customerId: 'cust-1',
          customerEmail: 'test@example.com',
          items: [{ productId: 'p-1', productName: 'Gold Ring', sku: 'GR-001', pricePaise: 5000000, quantity: 1 }],
          totalPaise: 5000000,
          lastActivityAt: twoHoursAgo,
        },
      ];

      const count = await service.detectAbandonedCarts(TEST_TENANT_ID, staleCarts);
      expect(count).toBe(1);
      expect((mockPrisma as any).abandonedCart.create).toHaveBeenCalled();
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'b2c.abandoned_cart.detected' }),
      );
    });

    it('ignores carts idle < 1 hour', async () => {
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      const staleCarts = [
        {
          cartSessionId: 'sess-1',
          customerEmail: 'test@example.com',
          items: [{ productId: 'p-1', productName: 'Ring', sku: 'R-1', pricePaise: 100000, quantity: 1 }],
          totalPaise: 100000,
          lastActivityAt: thirtyMinutesAgo,
        },
      ];

      const count = await service.detectAbandonedCarts(TEST_TENANT_ID, staleCarts);
      expect(count).toBe(0);
    });

    it('ignores carts without email or phone', async () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const staleCarts = [
        {
          cartSessionId: 'sess-1',
          items: [{ productId: 'p-1', productName: 'Ring', sku: 'R-1', pricePaise: 100000, quantity: 1 }],
          totalPaise: 100000,
          lastActivityAt: twoHoursAgo,
          // no email, no phone
        },
      ];

      const count = await service.detectAbandonedCarts(TEST_TENANT_ID, staleCarts as any);
      expect(count).toBe(0);
    });
  });

  // ─── Reminder Pipeline ─────────────────────────────────────

  describe('reminder pipeline', () => {
    it('sends 1st reminder via EMAIL', async () => {
      const cart = {
        id: 'ac-1',
        tenantId: TEST_TENANT_ID,
        cartSessionId: 'sess-1',
        customerId: 'cust-1',
        customerEmail: 'test@example.com',
        status: 'DETECTED',
        abandonedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        items: [{ productName: 'Gold Ring', quantity: 1 }],
        customer: { id: 'cust-1', firstName: 'Raj', email: 'raj@example.com' },
      };
      (mockPrisma as any).abandonedCart.findMany.mockResolvedValue([cart]);

      const count = await service.sendReminder1(TEST_TENANT_ID);
      expect(count).toBe(1);
      expect(mockNotificationService.sendNotification).toHaveBeenCalledWith(
        TEST_TENANT_ID,
        'SYSTEM',
        expect.objectContaining({ channel: 'EMAIL' }),
      );
    });

    it('sends 2nd reminder via WHATSAPP with recovery coupon', async () => {
      const cart = {
        id: 'ac-2',
        tenantId: TEST_TENANT_ID,
        cartSessionId: 'sess-2',
        customerId: 'cust-1',
        customerPhone: '9999999999',
        status: 'REMINDER_1_SENT',
        firstReminderSentAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
        items: [{ productName: 'Silver Bracelet', quantity: 1 }],
        customer: { id: 'cust-1', firstName: 'Raj', phone: '9999999999' },
      };
      (mockPrisma as any).abandonedCart.findMany.mockResolvedValue([cart]);

      const count = await service.sendReminder2(TEST_TENANT_ID);
      expect(count).toBe(1);
      expect(mockNotificationService.sendNotification).toHaveBeenCalledWith(
        TEST_TENANT_ID,
        'SYSTEM',
        expect.objectContaining({ channel: 'WHATSAPP' }),
      );
      expect(mockCouponService.generateBulkCoupons).toHaveBeenCalled();
    });

    it('sends 3rd reminder via EMAIL with bigger discount', async () => {
      const cart = {
        id: 'ac-3',
        tenantId: TEST_TENANT_ID,
        cartSessionId: 'sess-3',
        customerId: 'cust-1',
        customerEmail: 'test@example.com',
        status: 'REMINDER_2_SENT',
        secondReminderSentAt: new Date(Date.now() - 73 * 60 * 60 * 1000),
        items: [{ productName: 'Diamond Pendant', quantity: 1 }],
        customer: { id: 'cust-1', firstName: 'Raj', email: 'raj@example.com' },
      };
      (mockPrisma as any).abandonedCart.findMany.mockResolvedValue([cart]);

      const count = await service.sendReminder3(TEST_TENANT_ID);
      expect(count).toBe(1);
      expect(mockNotificationService.sendNotification).toHaveBeenCalledWith(
        TEST_TENANT_ID,
        'SYSTEM',
        expect.objectContaining({ channel: 'EMAIL' }),
      );
    });
  });

  // ─── markRecovered ─────────────────────────────────────────

  describe('markRecovered', () => {
    it('marks abandoned cart as recovered when order placed', async () => {
      (mockPrisma as any).abandonedCart.findFirst.mockResolvedValue({
        id: 'ac-1',
        tenantId: TEST_TENANT_ID,
        cartSessionId: 'sess-1',
        customerId: 'cust-1',
        totalPaise: BigInt(5000000),
        status: 'REMINDER_1_SENT',
      });
      (mockPrisma as any).abandonedCart.update.mockResolvedValue({
        id: 'ac-1',
        status: 'RECOVERED',
        recoveredOrderId: 'order-1',
      });

      const result = await service.markRecovered(TEST_TENANT_ID, 'sess-1', 'order-1');
      expect(result!.status).toBe('RECOVERED');
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'b2c.abandoned_cart.recovered' }),
      );
    });

    it('returns null when no abandoned cart found', async () => {
      (mockPrisma as any).abandonedCart.findFirst.mockResolvedValue(null);

      const result = await service.markRecovered(TEST_TENANT_ID, 'sess-nonexist', 'order-1');
      expect(result).toBeNull();
    });
  });

  // ─── cleanupExpired ────────────────────────────────────────

  describe('cleanupExpired', () => {
    it('marks old carts as expired', async () => {
      (mockPrisma as any).abandonedCart.updateMany.mockResolvedValue({ count: 5 });

      const count = await service.cleanupExpired(TEST_TENANT_ID);
      expect(count).toBe(5);
    });
  });
});
