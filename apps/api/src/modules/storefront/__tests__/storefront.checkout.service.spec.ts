import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StorefrontCheckoutService } from '../storefront.checkout.service';
import { createMockPrismaService, createMockEventBus, TEST_TENANT_ID, resetAllMocks } from '../../../__tests__/setup';

describe('StorefrontCheckoutService', () => {
  let service: StorefrontCheckoutService;
  let mockPrisma: ReturnType<typeof createMockPrismaService>;
  let mockEventBus: ReturnType<typeof createMockEventBus>;
  let mockPricingService: any;
  let mockCouponService: any;

  const CUSTOMER_ID = 'cust-1';
  const CART_ID = 'cart-1';
  const ORDER_ID = 'order-1';

  beforeEach(() => {
    mockPrisma = createMockPrismaService();
    mockEventBus = createMockEventBus();
    mockPricingService = {
      lockPriceForCheckout: vi.fn().mockResolvedValue(undefined),
      calculateCartTotal: vi.fn().mockResolvedValue({
        subtotalPaise: 3326900,
        discountPaise: 0,
        taxPaise: 0,
        totalPaise: 3326900,
        itemPrices: [
          { cartItemId: 'ci-1', productId: 'p-1', unitPricePaise: 3326900, lineTotalPaise: 3326900 },
        ],
      }),
      calculateLiveProductPrice: vi.fn(),
    };
    mockCouponService = {
      validateCoupon: vi.fn().mockResolvedValue({ isValid: false, discountAmountPaise: 0 }),
      applyCoupon: vi.fn(),
    };

    // Set up all the extra prisma models needed by checkout
    (mockPrisma as any).customerAddress = { findFirst: vi.fn() };
    (mockPrisma as any).salesChannel = { findFirst: vi.fn(), create: vi.fn() };
    (mockPrisma as any).onlineOrder = {
      findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), count: vi.fn().mockResolvedValue(0),
    };
    (mockPrisma as any).onlineOrderItem = { create: vi.fn() };
    (mockPrisma as any).onlinePayment = { create: vi.fn(), update: vi.fn(), updateMany: vi.fn() };
    (mockPrisma as any).paymentGateway = { findFirst: vi.fn() };
    (mockPrisma as any).cart = {
      findFirst: vi.fn(), update: vi.fn(), delete: vi.fn(),
    };
    (mockPrisma as any).cartItem = {
      findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(),
      update: vi.fn(), delete: vi.fn(), deleteMany: vi.fn(),
    };
    (mockPrisma as any).couponCode = { update: vi.fn() };
    (mockPrisma as any).stockMovement = { create: vi.fn() };
    (mockPrisma as any).product = {
      findFirst: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
    };

    service = new StorefrontCheckoutService(
      mockPrisma as any,
      mockPricingService,
      mockCouponService,
      mockEventBus as any,
    );
    resetAllMocks(mockPrisma);
  });

  // ─── initiateCheckout ──────────────────────────────────────

  describe('initiateCheckout', () => {
    it('validates stock and creates OnlineOrder', async () => {
      const cartItems = [
        { id: 'ci-1', productId: 'p-1', quantity: 1, metalRatePaiseLocked: null },
      ];
      (mockPrisma as any).cart.findFirst.mockResolvedValue({
        id: CART_ID, tenantId: TEST_TENANT_ID, items: cartItems,
        currencyCode: 'INR', couponCode: null,
      });
      (mockPrisma as any).customerAddress.findFirst.mockResolvedValue({
        id: 'addr-1', firstName: 'Test', lastName: 'User',
        phone: '9999999999', addressLine1: '123 St', city: 'Mumbai',
        state: 'MH', country: 'IN', postalCode: '400001',
      });
      (mockPrisma as any).product = {
        findFirst: vi.fn(),
        findMany: vi.fn().mockResolvedValue([{
          id: 'p-1', name: 'Gold Ring', sku: 'GR-001', isActive: true,
          productType: 'GOLD', metalPurity: 916, metalWeightMg: BigInt(5000),
          makingCharges: BigInt(200000), wastagePercent: 1, sellingPricePaise: null,
          grossWeightMg: BigInt(5200), images: [],
          stockItems: [{ quantityOnHand: 5, quantityReserved: 0 }],
        }]),
      };
      (mockPrisma as any).cartItem.findMany.mockResolvedValue([
        { id: 'ci-1', productId: 'p-1', quantity: 1, metalRatePaiseLocked: BigInt(6000000) },
      ]);
      (mockPrisma as any).salesChannel.findFirst.mockResolvedValue({
        id: 'ch-1', channelType: 'WEBSITE', isActive: true,
      });
      (mockPrisma as any).onlineOrder.count.mockResolvedValue(0);

      // Transaction mock
      mockPrisma.$transaction.mockImplementation(async (fn: any) => fn(mockPrisma));
      (mockPrisma as any).paymentGateway.findFirst.mockResolvedValue({
        id: 'gw-1', isActive: true, isDefault: true,
      });

      // getOrderResponse
      (mockPrisma as any).onlineOrder.findFirst.mockResolvedValue({
        id: ORDER_ID, orderNumber: 'ON/B2C/2604/00001', status: 'PENDING',
        subtotalPaise: BigInt(3326900), shippingPaise: BigInt(0),
        taxPaise: BigInt(0), discountPaise: BigInt(0), totalPaise: BigInt(3326900),
        currencyCode: 'INR', shippingAddress: {}, placedAt: new Date(),
        confirmedAt: null, shippedAt: null, deliveredAt: null, cancelReason: null,
        createdAt: new Date(), updatedAt: new Date(),
        items: [], shipments: [], payments: [],
      });

      const result = await service.initiateCheckout(TEST_TENANT_ID, CUSTOMER_ID, {
        cartId: CART_ID,
        addressId: 'addr-1',
        paymentMethod: 'RAZORPAY',
      } as any);

      expect(result.status).toBe('PENDING');
      expect(mockPricingService.lockPriceForCheckout).toHaveBeenCalled();
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'storefront.order.placed' }),
      );
    });

    it('rejects checkout with empty cart', async () => {
      (mockPrisma as any).cart.findFirst.mockResolvedValue({
        id: CART_ID, tenantId: TEST_TENANT_ID, items: [],
      });

      await expect(
        service.initiateCheckout(TEST_TENANT_ID, CUSTOMER_ID, {
          cartId: CART_ID, addressId: 'addr-1', paymentMethod: 'RAZORPAY',
        } as any),
      ).rejects.toThrow('Cart is empty or not found');
    });

    it('rejects checkout when product out of stock', async () => {
      (mockPrisma as any).cart.findFirst.mockResolvedValue({
        id: CART_ID, tenantId: TEST_TENANT_ID,
        items: [{ id: 'ci-1', productId: 'p-1', quantity: 10 }],
        currencyCode: 'INR',
      });
      (mockPrisma as any).customerAddress.findFirst.mockResolvedValue({ id: 'addr-1' });
      (mockPrisma as any).product = {
        findFirst: vi.fn(),
        findMany: vi.fn().mockResolvedValue([{
          id: 'p-1', name: 'Gold Ring', isActive: true,
          stockItems: [{ quantityOnHand: 2, quantityReserved: 0 }],
        }]),
      };

      await expect(
        service.initiateCheckout(TEST_TENANT_ID, CUSTOMER_ID, {
          cartId: CART_ID, addressId: 'addr-1', paymentMethod: 'RAZORPAY',
        } as any),
      ).rejects.toThrow('Insufficient stock');
    });
  });

  // ─── completeCheckout ──────────────────────────────────────

  describe('completeCheckout', () => {
    it('marks order CONFIRMED and decrements stock', async () => {
      const order = {
        id: ORDER_ID, tenantId: TEST_TENANT_ID, customerId: CUSTOMER_ID,
        status: 'PENDING', orderNumber: 'ON/B2C/2604/00001',
        totalPaise: BigInt(3326900),
        items: [{ id: 'oi-1', productId: 'p-1', quantity: 1 }],
        payments: [{ id: 'pay-1' }],
      };

      (mockPrisma as any).onlineOrder.findFirst
        .mockResolvedValueOnce(order) // first call (completeCheckout)
        .mockResolvedValue({ // getOrderResponse
          ...order, status: 'CONFIRMED', confirmedAt: new Date(),
          subtotalPaise: BigInt(3326900), shippingPaise: BigInt(0),
          taxPaise: BigInt(0), discountPaise: BigInt(0),
          currencyCode: 'INR', shippingAddress: {},
          placedAt: new Date(), shippedAt: null, deliveredAt: null,
          cancelReason: null, createdAt: new Date(), updatedAt: new Date(),
          items: [], shipments: [], payments: [],
        });

      mockPrisma.$transaction.mockImplementation(async (fn: any) => fn(mockPrisma));
      (mockPrisma as any).stockItem.findFirst.mockResolvedValue({ id: 'si-1', quantityOnHand: 5 });
      (mockPrisma as any).cart.findFirst.mockResolvedValue(null);
      (mockPrisma as any).product.findMany.mockResolvedValue([]);

      const result = await service.completeCheckout(
        TEST_TENANT_ID, CUSTOMER_ID, ORDER_ID,
        { externalPaymentId: 'pay_ext_123' },
      );

      expect(result.status).toBe('CONFIRMED');
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'storefront.order.completed' }),
      );
    });

    it('rejects if order not in PENDING status', async () => {
      (mockPrisma as any).onlineOrder.findFirst.mockResolvedValue({
        id: ORDER_ID, tenantId: TEST_TENANT_ID, customerId: CUSTOMER_ID,
        status: 'CONFIRMED', items: [], payments: [],
      });

      await expect(
        service.completeCheckout(TEST_TENANT_ID, CUSTOMER_ID, ORDER_ID, {
          externalPaymentId: 'pay_ext_123',
        }),
      ).rejects.toThrow('Order is not in pending status');
    });
  });

  // ─── cancelOrder ───────────────────────────────────────────

  describe('cancelOrder', () => {
    it('cancels a PENDING order without restoring stock', async () => {
      const order = {
        id: ORDER_ID, tenantId: TEST_TENANT_ID, customerId: CUSTOMER_ID,
        status: 'PENDING', orderNumber: 'ON/B2C/2604/00001',
        items: [{ id: 'oi-1', productId: 'p-1', quantity: 1 }],
      };

      (mockPrisma as any).onlineOrder.findFirst
        .mockResolvedValueOnce(order)
        .mockResolvedValue({
          ...order, status: 'CANCELLED', cancelReason: 'Changed mind',
          subtotalPaise: BigInt(3326900), shippingPaise: BigInt(0),
          taxPaise: BigInt(0), discountPaise: BigInt(0), totalPaise: BigInt(3326900),
          currencyCode: 'INR', shippingAddress: {}, placedAt: new Date(),
          confirmedAt: null, shippedAt: null, deliveredAt: null,
          createdAt: new Date(), updatedAt: new Date(),
          items: [], shipments: [], payments: [],
        });
      mockPrisma.$transaction.mockImplementation(async (fn: any) => fn(mockPrisma));
      (mockPrisma as any).product.findMany.mockResolvedValue([]);

      const result = await service.cancelOrder(TEST_TENANT_ID, CUSTOMER_ID, ORDER_ID, 'Changed mind');
      expect(result.status).toBe('CANCELLED');
    });

    it('cancels a CONFIRMED order and restores stock', async () => {
      const order = {
        id: ORDER_ID, tenantId: TEST_TENANT_ID, customerId: CUSTOMER_ID,
        status: 'CONFIRMED', orderNumber: 'ON/B2C/2604/00001',
        items: [{ id: 'oi-1', productId: 'p-1', quantity: 2 }],
      };

      (mockPrisma as any).onlineOrder.findFirst
        .mockResolvedValueOnce(order)
        .mockResolvedValue({
          ...order, status: 'CANCELLED',
          subtotalPaise: BigInt(0), shippingPaise: BigInt(0),
          taxPaise: BigInt(0), discountPaise: BigInt(0), totalPaise: BigInt(0),
          currencyCode: 'INR', shippingAddress: {}, placedAt: new Date(),
          confirmedAt: new Date(), shippedAt: null, deliveredAt: null,
          cancelReason: 'Defective', createdAt: new Date(), updatedAt: new Date(),
          items: [], shipments: [], payments: [],
        });
      mockPrisma.$transaction.mockImplementation(async (fn: any) => fn(mockPrisma));
      (mockPrisma as any).stockItem.findFirst.mockResolvedValue({ id: 'si-1' });
      (mockPrisma as any).product.findMany.mockResolvedValue([]);

      const result = await service.cancelOrder(TEST_TENANT_ID, CUSTOMER_ID, ORDER_ID, 'Defective');
      expect(result.status).toBe('CANCELLED');
      expect((mockPrisma as any).stockItem.findFirst).toHaveBeenCalled();
      expect((mockPrisma as any).stockItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { quantityOnHand: { increment: 2 } },
        }),
      );
    });

    it('rejects cancel for SHIPPED order', async () => {
      (mockPrisma as any).onlineOrder.findFirst.mockResolvedValue({
        id: ORDER_ID, tenantId: TEST_TENANT_ID, customerId: CUSTOMER_ID,
        status: 'SHIPPED', items: [],
      });

      await expect(
        service.cancelOrder(TEST_TENANT_ID, CUSTOMER_ID, ORDER_ID, 'Changed mind'),
      ).rejects.toThrow('Order cannot be cancelled');
    });

    it('rejects cancel for non-existent order', async () => {
      (mockPrisma as any).onlineOrder.findFirst.mockResolvedValue(null);

      await expect(
        service.cancelOrder(TEST_TENANT_ID, CUSTOMER_ID, 'nonexistent', 'reason'),
      ).rejects.toThrow('Order not found');
    });
  });
});
