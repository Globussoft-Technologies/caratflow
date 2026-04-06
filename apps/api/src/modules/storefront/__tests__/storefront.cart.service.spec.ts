import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StorefrontCartService } from '../storefront.cart.service';
import { createMockPrismaService, TEST_TENANT_ID, resetAllMocks } from '../../../__tests__/setup';

describe('StorefrontCartService', () => {
  let service: StorefrontCartService;
  let mockPrisma: ReturnType<typeof createMockPrismaService>;
  let mockPricingService: any;
  let mockCouponService: any;

  beforeEach(() => {
    mockPrisma = createMockPrismaService();
    mockPricingService = {
      calculateLiveProductPrice: vi.fn().mockResolvedValue({
        metalValuePaise: 3000000,
        makingValuePaise: 200000,
        wastageValuePaise: 30000,
        subtotalPaise: 3230000,
        gstPaise: 96900,
        totalPricePaise: 3326900,
      }),
      calculateCartTotal: vi.fn(),
      lockPriceForCheckout: vi.fn(),
    };
    mockCouponService = {
      validateCoupon: vi.fn(),
      applyCoupon: vi.fn().mockResolvedValue({
        isValid: true,
        discountAmountPaise: 0,
      }),
    };
    service = new StorefrontCartService(
      mockPrisma as any,
      mockPricingService,
      mockCouponService,
    );
    resetAllMocks(mockPrisma);
  });

  // ─── getOrCreateCart ───────────────────────────────────────

  describe('getOrCreateCart', () => {
    it('creates a cart for a guest (sessionId only)', async () => {
      (mockPrisma as any).cart = {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({
          id: 'cart-1',
          tenantId: TEST_TENANT_ID,
          customerId: null,
          sessionId: 'session-abc',
          currencyCode: 'INR',
          couponCode: null,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          items: [],
        }),
        update: vi.fn(),
        delete: vi.fn(),
      };
      (mockPrisma as any).product = { findFirst: vi.fn(), findMany: vi.fn().mockResolvedValue([]) };
      (mockPrisma as any).cartItem = { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), deleteMany: vi.fn() };

      const result = await service.getOrCreateCart(TEST_TENANT_ID, null, 'session-abc');
      expect(result.id).toBe('cart-1');
      expect(result.customerId).toBeNull();
      expect(result.sessionId).toBe('session-abc');
      expect(result.currencyCode).toBe('INR');
    });

    it('creates a cart for a logged-in customer', async () => {
      (mockPrisma as any).cart = {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({
          id: 'cart-2',
          tenantId: TEST_TENANT_ID,
          customerId: 'cust-1',
          sessionId: 'session-xyz',
          currencyCode: 'INR',
          couponCode: null,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          items: [],
        }),
        update: vi.fn(),
        delete: vi.fn(),
      };
      (mockPrisma as any).product = { findFirst: vi.fn(), findMany: vi.fn().mockResolvedValue([]) };
      (mockPrisma as any).cartItem = { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), deleteMany: vi.fn() };

      const result = await service.getOrCreateCart(TEST_TENANT_ID, 'cust-1', 'session-xyz');
      expect(result.customerId).toBe('cust-1');
    });

    it('returns existing cart if one exists', async () => {
      const existingCart = {
        id: 'cart-existing',
        tenantId: TEST_TENANT_ID,
        customerId: 'cust-1',
        sessionId: 'session-xyz',
        currencyCode: 'INR',
        couponCode: null,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        items: [],
      };
      (mockPrisma as any).cart = {
        findFirst: vi.fn().mockResolvedValue(existingCart),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      };
      (mockPrisma as any).product = { findFirst: vi.fn(), findMany: vi.fn().mockResolvedValue([]) };
      (mockPrisma as any).cartItem = { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), deleteMany: vi.fn() };

      const result = await service.getOrCreateCart(TEST_TENANT_ID, 'cust-1', 'session-xyz');
      expect(result.id).toBe('cart-existing');
    });
  });

  // ─── addItem ───────────────────────────────────────────────

  describe('addItem', () => {
    it('creates a CartItem for a new product', async () => {
      (mockPrisma as any).cart = {
        findFirst: vi.fn()
          .mockResolvedValueOnce({ id: 'cart-1', tenantId: TEST_TENANT_ID }) // getCartOrThrow
          .mockResolvedValue({
            id: 'cart-1', tenantId: TEST_TENANT_ID, customerId: null,
            sessionId: 's1', currencyCode: 'INR', couponCode: null,
            expiresAt: new Date(Date.now() + 86400000), items: [],
          }),
        update: vi.fn(),
        delete: vi.fn(),
      };
      (mockPrisma as any).product = {
        findFirst: vi.fn().mockResolvedValue({ id: 'p-1', tenantId: TEST_TENANT_ID, isActive: true }),
        findMany: vi.fn().mockResolvedValue([]),
      };
      (mockPrisma as any).stockItem = {
        aggregate: vi.fn().mockResolvedValue({
          _sum: { quantityOnHand: 10, quantityReserved: 0 },
        }),
      };
      (mockPrisma as any).cartItem = {
        findFirst: vi.fn().mockResolvedValue(null), // no existing item
        create: vi.fn().mockResolvedValue({ id: 'ci-1', productId: 'p-1', quantity: 2 }),
        findMany: vi.fn().mockResolvedValue([]),
        update: vi.fn(),
        delete: vi.fn(),
        deleteMany: vi.fn(),
      };

      const result = await service.addItem(TEST_TENANT_ID, 'cart-1', 'p-1', 2);
      expect((mockPrisma as any).cartItem.create).toHaveBeenCalled();
    });

    it('increments quantity when same product added twice', async () => {
      (mockPrisma as any).cart = {
        findFirst: vi.fn()
          .mockResolvedValueOnce({ id: 'cart-1', tenantId: TEST_TENANT_ID })
          .mockResolvedValue({
            id: 'cart-1', tenantId: TEST_TENANT_ID, customerId: null,
            sessionId: 's1', currencyCode: 'INR', couponCode: null,
            expiresAt: new Date(Date.now() + 86400000), items: [],
          }),
        update: vi.fn(),
        delete: vi.fn(),
      };
      (mockPrisma as any).product = {
        findFirst: vi.fn().mockResolvedValue({ id: 'p-1', tenantId: TEST_TENANT_ID, isActive: true }),
        findMany: vi.fn().mockResolvedValue([]),
      };
      (mockPrisma as any).stockItem = {
        aggregate: vi.fn().mockResolvedValue({
          _sum: { quantityOnHand: 10, quantityReserved: 0 },
        }),
      };
      (mockPrisma as any).cartItem = {
        findFirst: vi.fn().mockResolvedValue({ id: 'ci-1', productId: 'p-1', quantity: 1 }),
        update: vi.fn().mockResolvedValue({ id: 'ci-1', productId: 'p-1', quantity: 3 }),
        create: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
        delete: vi.fn(),
        deleteMany: vi.fn(),
      };

      await service.addItem(TEST_TENANT_ID, 'cart-1', 'p-1', 2);
      expect((mockPrisma as any).cartItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ci-1' },
          data: { quantity: 3 },
        }),
      );
    });

    it('rejects add when insufficient stock', async () => {
      (mockPrisma as any).cart = {
        findFirst: vi.fn().mockResolvedValue({ id: 'cart-1', tenantId: TEST_TENANT_ID }),
        update: vi.fn(),
        delete: vi.fn(),
      };
      (mockPrisma as any).product = {
        findFirst: vi.fn().mockResolvedValue({ id: 'p-1', tenantId: TEST_TENANT_ID, isActive: true }),
        findMany: vi.fn().mockResolvedValue([]),
      };
      (mockPrisma as any).stockItem = {
        aggregate: vi.fn().mockResolvedValue({
          _sum: { quantityOnHand: 2, quantityReserved: 1 },
        }),
      };
      (mockPrisma as any).cartItem = {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
        update: vi.fn(),
        delete: vi.fn(),
        deleteMany: vi.fn(),
      };

      await expect(
        service.addItem(TEST_TENANT_ID, 'cart-1', 'p-1', 5),
      ).rejects.toThrow('Insufficient stock');
    });

    it('throws when product not found', async () => {
      (mockPrisma as any).cart = {
        findFirst: vi.fn().mockResolvedValue({ id: 'cart-1', tenantId: TEST_TENANT_ID }),
        update: vi.fn(),
        delete: vi.fn(),
      };
      (mockPrisma as any).product = {
        findFirst: vi.fn().mockResolvedValue(null),
        findMany: vi.fn().mockResolvedValue([]),
      };
      (mockPrisma as any).cartItem = {
        findFirst: vi.fn(), create: vi.fn(), findMany: vi.fn(), update: vi.fn(), delete: vi.fn(), deleteMany: vi.fn(),
      };

      await expect(
        service.addItem(TEST_TENANT_ID, 'cart-1', 'p-nonexistent', 1),
      ).rejects.toThrow('Product not found');
    });
  });

  // ─── removeItem ────────────────────────────────────────────

  describe('removeItem', () => {
    it('deletes cart item', async () => {
      (mockPrisma as any).cart = {
        findFirst: vi.fn().mockResolvedValue({
          id: 'cart-1', tenantId: TEST_TENANT_ID, customerId: null,
          sessionId: 's1', currencyCode: 'INR', couponCode: null,
          expiresAt: new Date(Date.now() + 86400000), items: [],
        }),
        update: vi.fn(),
        delete: vi.fn(),
      };
      (mockPrisma as any).cartItem = {
        findFirst: vi.fn().mockResolvedValue({ id: 'ci-1', cartId: 'cart-1', tenantId: TEST_TENANT_ID }),
        delete: vi.fn().mockResolvedValue({}),
        findMany: vi.fn().mockResolvedValue([]),
        create: vi.fn(),
        update: vi.fn(),
        deleteMany: vi.fn(),
      };
      (mockPrisma as any).product = { findFirst: vi.fn(), findMany: vi.fn().mockResolvedValue([]) };

      await service.removeItem(TEST_TENANT_ID, 'cart-1', 'ci-1');
      expect((mockPrisma as any).cartItem.delete).toHaveBeenCalledWith({ where: { id: 'ci-1' } });
    });

    it('throws when item not found', async () => {
      (mockPrisma as any).cartItem = {
        findFirst: vi.fn().mockResolvedValue(null),
        delete: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        deleteMany: vi.fn(),
      };
      (mockPrisma as any).cart = { findFirst: vi.fn(), update: vi.fn(), delete: vi.fn() };
      (mockPrisma as any).product = { findFirst: vi.fn(), findMany: vi.fn() };

      await expect(
        service.removeItem(TEST_TENANT_ID, 'cart-1', 'ci-nonexistent'),
      ).rejects.toThrow('Cart item not found');
    });
  });

  // ─── mergeGuestCart ────────────────────────────────────────

  describe('mergeGuestCart', () => {
    it('converts guest cart to customer cart when no customer cart exists', async () => {
      const guestCart = {
        id: 'guest-cart',
        tenantId: TEST_TENANT_ID,
        sessionId: 'session-1',
        customerId: null,
        currencyCode: 'INR',
        couponCode: null,
        expiresAt: new Date(Date.now() + 86400000),
        items: [{ id: 'ci-1', productId: 'p-1', quantity: 2 }],
      };

      (mockPrisma as any).cart = {
        findFirst: vi.fn()
          .mockResolvedValueOnce(guestCart) // guest cart lookup
          .mockResolvedValueOnce(null) // no customer cart
          .mockResolvedValue({ ...guestCart, customerId: 'cust-1', items: guestCart.items }), // after update
        update: vi.fn().mockResolvedValue({ ...guestCart, customerId: 'cust-1' }),
        create: vi.fn(),
        delete: vi.fn(),
      };
      (mockPrisma as any).cartItem = {
        findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), findMany: vi.fn().mockResolvedValue([]),
        delete: vi.fn(), deleteMany: vi.fn(),
      };
      (mockPrisma as any).product = {
        findFirst: vi.fn(),
        findMany: vi.fn().mockResolvedValue([{
          id: 'p-1', productType: 'GOLD', metalPurity: 916,
          metalWeightMg: BigInt(5000), makingCharges: BigInt(200000),
          wastagePercent: 1, sellingPricePaise: null, images: [],
        }]),
      };

      const result = await service.mergeGuestCart(TEST_TENANT_ID, 'session-1', 'cust-1');
      expect((mockPrisma as any).cart.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'guest-cart' },
          data: { customerId: 'cust-1' },
        }),
      );
    });

    it('merges items into existing customer cart and deletes guest cart', async () => {
      const guestCart = {
        id: 'guest-cart', tenantId: TEST_TENANT_ID, sessionId: 'session-1',
        customerId: null, currencyCode: 'INR', couponCode: null,
        expiresAt: new Date(Date.now() + 86400000),
        items: [{ id: 'gci-1', productId: 'p-1', quantity: 1 }],
      };
      const customerCart = {
        id: 'cust-cart', tenantId: TEST_TENANT_ID, sessionId: 'session-old',
        customerId: 'cust-1', currencyCode: 'INR', couponCode: null,
        expiresAt: new Date(Date.now() + 86400000),
        items: [{ id: 'cci-1', productId: 'p-2', quantity: 3 }],
      };

      (mockPrisma as any).cart = {
        findFirst: vi.fn()
          .mockResolvedValueOnce(guestCart) // guest cart
          .mockResolvedValueOnce(customerCart) // customer cart
          .mockResolvedValue({ ...customerCart, items: [] }), // getCart
        update: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
      };
      (mockPrisma as any).cartItem = {
        findFirst: vi.fn(), create: vi.fn(), update: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
        delete: vi.fn(), deleteMany: vi.fn(),
      };
      (mockPrisma as any).product = { findFirst: vi.fn(), findMany: vi.fn().mockResolvedValue([]) };

      await service.mergeGuestCart(TEST_TENANT_ID, 'session-1', 'cust-1');

      // Guest cart should be deleted
      expect((mockPrisma as any).cart.delete).toHaveBeenCalledWith({ where: { id: 'guest-cart' } });
      // New item should be created in customer cart
      expect((mockPrisma as any).cartItem.create).toHaveBeenCalled();
    });
  });

  // ─── applyCoupon ───────────────────────────────────────────

  describe('applyCoupon', () => {
    it('rejects invalid coupon', async () => {
      (mockPrisma as any).cart = {
        findFirst: vi.fn().mockResolvedValue({
          id: 'cart-1', tenantId: TEST_TENANT_ID, items: [],
          customerId: 'cust-1', couponCode: null,
        }),
        update: vi.fn(),
        delete: vi.fn(),
      };
      (mockPrisma as any).product = { findFirst: vi.fn(), findMany: vi.fn().mockResolvedValue([]) };
      (mockPrisma as any).cartItem = {
        findFirst: vi.fn(), create: vi.fn(), update: vi.fn(),
        findMany: vi.fn(), delete: vi.fn(), deleteMany: vi.fn(),
      };

      mockCouponService.validateCoupon.mockResolvedValue({
        isValid: false,
        reason: 'Coupon code not found',
        discountAmountPaise: 0,
      });

      await expect(
        service.applyCoupon(TEST_TENANT_ID, 'cart-1', 'INVALID', 'cust-1'),
      ).rejects.toThrow('Coupon code not found');
    });
  });

  // ─── Cart Expiry ───────────────────────────────────────────

  describe('cart expiry', () => {
    it('sets expiresAt to 30 days from creation', async () => {
      const now = Date.now();
      (mockPrisma as any).cart = {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockImplementation(({ data }) => {
          const expiresAt = data.expiresAt as Date;
          const daysFromNow = (expiresAt.getTime() - now) / (1000 * 60 * 60 * 24);
          // Should be approximately 30 days
          expect(daysFromNow).toBeGreaterThan(29);
          expect(daysFromNow).toBeLessThan(31);
          return {
            ...data,
            items: [],
          };
        }),
        update: vi.fn(),
        delete: vi.fn(),
      };
      (mockPrisma as any).product = { findFirst: vi.fn(), findMany: vi.fn().mockResolvedValue([]) };
      (mockPrisma as any).cartItem = {
        findFirst: vi.fn(), create: vi.fn(), update: vi.fn(),
        findMany: vi.fn(), delete: vi.fn(), deleteMany: vi.fn(),
      };

      await service.getOrCreateCart(TEST_TENANT_ID, null, 'sess-1');
      expect((mockPrisma as any).cart.create).toHaveBeenCalled();
    });
  });
});
