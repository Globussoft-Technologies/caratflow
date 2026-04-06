import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WishlistService } from '../wishlist.service';
import { createMockPrismaService, createMockEventBus, TEST_TENANT_ID, resetAllMocks } from '../../../__tests__/setup';

describe('WishlistService', () => {
  let service: WishlistService;
  let mockPrisma: ReturnType<typeof createMockPrismaService>;
  let mockEventBus: ReturnType<typeof createMockEventBus>;
  let mockNotificationService: any;

  const CUSTOMER_ID = 'cust-1';

  beforeEach(() => {
    mockPrisma = createMockPrismaService();
    mockEventBus = createMockEventBus();
    mockNotificationService = {
      sendNotification: vi.fn().mockResolvedValue(undefined),
    };

    (mockPrisma as any).wishlist = {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    };
    (mockPrisma as any).product = {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    };

    service = new WishlistService(
      mockPrisma as any,
      mockEventBus as any,
      mockNotificationService,
    );
    resetAllMocks(mockPrisma);
  });

  // ─── addToWishlist ─────────────────────────────────────────

  describe('addToWishlist', () => {
    it('adds a product to the wishlist', async () => {
      (mockPrisma as any).product.findFirst.mockResolvedValue({
        id: 'p-1', sellingPricePaise: BigInt(5000000),
      });
      (mockPrisma as any).wishlist.upsert.mockResolvedValue({
        id: 'wl-1', productId: 'p-1', customerId: CUSTOMER_ID,
        priceAtAddPaise: BigInt(5000000),
      });

      const result = await service.addToWishlist(TEST_TENANT_ID, CUSTOMER_ID, 'p-1');
      expect(result.productId).toBe('p-1');
      expect((mockPrisma as any).wishlist.upsert).toHaveBeenCalled();
    });

    it('duplicate add is handled via upsert (no error)', async () => {
      (mockPrisma as any).product.findFirst.mockResolvedValue({
        id: 'p-1', sellingPricePaise: BigInt(5000000),
      });
      (mockPrisma as any).wishlist.upsert.mockResolvedValue({
        id: 'wl-1', productId: 'p-1', customerId: CUSTOMER_ID,
        priceAtAddPaise: BigInt(5000000),
      });

      // Calling twice should not throw
      await service.addToWishlist(TEST_TENANT_ID, CUSTOMER_ID, 'p-1');
      await service.addToWishlist(TEST_TENANT_ID, CUSTOMER_ID, 'p-1');

      expect((mockPrisma as any).wishlist.upsert).toHaveBeenCalledTimes(2);
    });

    it('throws when product not found', async () => {
      (mockPrisma as any).product.findFirst.mockResolvedValue(null);

      await expect(
        service.addToWishlist(TEST_TENANT_ID, CUSTOMER_ID, 'p-nonexist'),
      ).rejects.toThrow('Product not found');
    });
  });

  // ─── removeFromWishlist ────────────────────────────────────

  describe('removeFromWishlist', () => {
    it('removes a product from the wishlist', async () => {
      (mockPrisma as any).wishlist.findUnique.mockResolvedValue({
        id: 'wl-1', productId: 'p-1', customerId: CUSTOMER_ID,
      });
      (mockPrisma as any).wishlist.delete.mockResolvedValue({});

      await service.removeFromWishlist(TEST_TENANT_ID, CUSTOMER_ID, 'p-1');
      expect((mockPrisma as any).wishlist.delete).toHaveBeenCalledWith({
        where: { id: 'wl-1' },
      });
    });

    it('throws when item not in wishlist', async () => {
      (mockPrisma as any).wishlist.findUnique.mockResolvedValue(null);

      await expect(
        service.removeFromWishlist(TEST_TENANT_ID, CUSTOMER_ID, 'p-nonexist'),
      ).rejects.toThrow('Wishlist item not found');
    });
  });

  // ─── Price Alerts ──────────────────────────────────────────

  describe('price alerts', () => {
    it('triggers alert when price drops below threshold', async () => {
      (mockPrisma as any).wishlist.findMany.mockResolvedValue([
        {
          id: 'wl-1',
          customerId: CUSTOMER_ID,
          productId: 'p-1',
          priceAlertEnabled: true,
          priceAlertTriggered: false,
          priceAlertThresholdPaise: BigInt(4500000),
          product: { id: 'p-1', name: 'Gold Ring', sellingPricePaise: BigInt(4000000) },
          customer: { id: CUSTOMER_ID, firstName: 'John', email: 'john@test.com', phone: null },
        },
      ]);

      const count = await service.checkPriceAlerts(TEST_TENANT_ID);
      expect(count).toBe(1);
      expect((mockPrisma as any).wishlist.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { priceAlertTriggered: true },
        }),
      );
      expect(mockNotificationService.sendNotification).toHaveBeenCalled();
    });

    it('does not trigger when price is above threshold', async () => {
      (mockPrisma as any).wishlist.findMany.mockResolvedValue([
        {
          id: 'wl-2',
          customerId: CUSTOMER_ID,
          productId: 'p-2',
          priceAlertEnabled: true,
          priceAlertTriggered: false,
          priceAlertThresholdPaise: BigInt(3000000),
          product: { id: 'p-2', name: 'Silver Chain', sellingPricePaise: BigInt(5000000) },
          customer: { id: CUSTOMER_ID, firstName: 'John', email: 'john@test.com', phone: null },
        },
      ]);

      const count = await service.checkPriceAlerts(TEST_TENANT_ID);
      expect(count).toBe(0);
    });

    it('enables price alert with threshold', async () => {
      (mockPrisma as any).wishlist.findUnique.mockResolvedValue({
        id: 'wl-1', productId: 'p-1', customerId: CUSTOMER_ID,
      });
      (mockPrisma as any).wishlist.update.mockResolvedValue({});

      await service.enablePriceAlert(TEST_TENANT_ID, CUSTOMER_ID, 'p-1', 4000000);
      expect((mockPrisma as any).wishlist.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            priceAlertEnabled: true,
            priceAlertThresholdPaise: BigInt(4000000),
          }),
        }),
      );
    });
  });
});
