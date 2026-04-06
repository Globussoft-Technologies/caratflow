import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CouponService } from '../coupon.service';
import { createMockPrismaService, createMockEventBus, TEST_TENANT_ID, resetAllMocks } from '../../../__tests__/setup';

describe('CouponService (B2C)', () => {
  let service: CouponService;
  let mockPrisma: ReturnType<typeof createMockPrismaService>;
  let mockEventBus: ReturnType<typeof createMockEventBus>;

  const CUSTOMER_ID = 'cust-1';

  const baseCoupon = {
    id: 'coupon-1',
    tenantId: TEST_TENANT_ID,
    code: 'SAVE10',
    description: '10% off',
    discountType: 'PERCENTAGE',
    discountValue: 1000, // 10% (stored as percent * 100)
    isActive: true,
    validFrom: new Date('2025-01-01'),
    validTo: new Date('2027-12-31'),
    usageLimit: 100,
    usageLimitPerCustomer: 3,
    usedCount: 5,
    minOrderPaise: null as bigint | null,
    maxDiscountPaise: null as bigint | null,
    isFirstOrderOnly: false,
    isAutoApply: false,
    applicableCategories: null,
    applicableProducts: null,
    excludedProducts: null,
  };

  const cartItems = [
    { productId: 'p-1', categoryId: 'cat-1', pricePaise: 5000000, quantity: 1 },
  ];

  beforeEach(() => {
    mockPrisma = createMockPrismaService();
    mockEventBus = createMockEventBus();

    (mockPrisma as any).couponCode = {
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      findFirst: vi.fn(),
      findFirstOrThrow: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    };
    (mockPrisma as any).couponUsage = {
      count: vi.fn().mockResolvedValue(0),
      create: vi.fn(),
    };

    service = new CouponService(mockPrisma as any, mockEventBus as any);
    resetAllMocks(mockPrisma);
  });

  // ─── validateCoupon ────────────────────────────────────────

  describe('validateCoupon', () => {
    it('validates active coupon within dates and under usage limit', async () => {
      (mockPrisma as any).couponCode.findUnique.mockResolvedValue(baseCoupon);
      (mockPrisma as any).couponUsage.count.mockResolvedValue(0);

      const result = await service.validateCoupon(TEST_TENANT_ID, CUSTOMER_ID, {
        code: 'SAVE10',
        cartTotalPaise: 5000000,
        cartItems,
      } as any);

      expect(result.valid).toBe(true);
      expect(result.discountPaise).toBeGreaterThan(0);
    });

    it('rejects expired coupon', async () => {
      (mockPrisma as any).couponCode.findUnique.mockResolvedValue({
        ...baseCoupon,
        validTo: new Date('2020-01-01'),
      });

      const result = await service.validateCoupon(TEST_TENANT_ID, CUSTOMER_ID, {
        code: 'SAVE10', cartTotalPaise: 5000000, cartItems,
      } as any);

      expect(result.valid).toBe(false);
      expect(result.errorMessage).toContain('expired');
    });

    it('rejects over global usage limit', async () => {
      (mockPrisma as any).couponCode.findUnique.mockResolvedValue({
        ...baseCoupon,
        usageLimit: 5,
        usedCount: 5,
      });

      const result = await service.validateCoupon(TEST_TENANT_ID, CUSTOMER_ID, {
        code: 'SAVE10', cartTotalPaise: 5000000, cartItems,
      } as any);

      expect(result.valid).toBe(false);
      expect(result.errorMessage).toContain('usage limit');
    });

    it('enforces per-customer usage limit', async () => {
      (mockPrisma as any).couponCode.findUnique.mockResolvedValue(baseCoupon);
      (mockPrisma as any).couponUsage.count.mockResolvedValue(3); // already used 3 times

      const result = await service.validateCoupon(TEST_TENANT_ID, CUSTOMER_ID, {
        code: 'SAVE10', cartTotalPaise: 5000000, cartItems,
      } as any);

      expect(result.valid).toBe(false);
      expect(result.errorMessage).toContain('maximum number of times');
    });

    it('enforces minimum order amount', async () => {
      (mockPrisma as any).couponCode.findUnique.mockResolvedValue({
        ...baseCoupon,
        minOrderPaise: BigInt(10000000), // Rs 1 lakh
      });

      const result = await service.validateCoupon(TEST_TENANT_ID, CUSTOMER_ID, {
        code: 'SAVE10', cartTotalPaise: 5000000, cartItems,
      } as any);

      expect(result.valid).toBe(false);
      expect(result.errorMessage).toContain('Minimum order');
    });

    it('enforces first-order-only for repeat customers', async () => {
      (mockPrisma as any).couponCode.findUnique.mockResolvedValue({
        ...baseCoupon,
        isFirstOrderOnly: true,
      });
      (mockPrisma as any).couponUsage.count
        .mockResolvedValueOnce(0) // per-customer limit check
        .mockResolvedValueOnce(2); // previous orders check

      const result = await service.validateCoupon(TEST_TENANT_ID, CUSTOMER_ID, {
        code: 'SAVE10', cartTotalPaise: 5000000, cartItems,
      } as any);

      expect(result.valid).toBe(false);
      expect(result.errorMessage).toContain('first orders only');
    });

    it('calculates percentage discount: 10% of Rs 50,000 = Rs 5,000', async () => {
      (mockPrisma as any).couponCode.findUnique.mockResolvedValue(baseCoupon);
      (mockPrisma as any).couponUsage.count.mockResolvedValue(0);

      const result = await service.validateCoupon(TEST_TENANT_ID, CUSTOMER_ID, {
        code: 'SAVE10', cartTotalPaise: 5000000, cartItems,
      } as any);

      // 1000 / 10000 * 5000000 = 500000
      expect(result.discountPaise).toBe(500000);
    });

    it('calculates fixed discount: Rs 1,000 off', async () => {
      (mockPrisma as any).couponCode.findUnique.mockResolvedValue({
        ...baseCoupon,
        discountType: 'FIXED_AMOUNT',
        discountValue: 100000, // Rs 1000 in paise
      });
      (mockPrisma as any).couponUsage.count.mockResolvedValue(0);

      const result = await service.validateCoupon(TEST_TENANT_ID, CUSTOMER_ID, {
        code: 'SAVE10', cartTotalPaise: 5000000, cartItems,
      } as any);

      expect(result.discountPaise).toBe(100000);
    });

    it('caps percentage discount at maxDiscountPaise', async () => {
      (mockPrisma as any).couponCode.findUnique.mockResolvedValue({
        ...baseCoupon,
        discountType: 'PERCENTAGE',
        discountValue: 2000, // 20%
        maxDiscountPaise: BigInt(1000000), // cap at Rs 10,000
      });
      (mockPrisma as any).couponUsage.count.mockResolvedValue(0);

      // 20% of Rs 200,000 = Rs 40,000 but capped at Rs 10,000
      const items = [{ productId: 'p-1', categoryId: 'cat-1', pricePaise: 20000000, quantity: 1 }];
      const result = await service.validateCoupon(TEST_TENANT_ID, CUSTOMER_ID, {
        code: 'SAVE10', cartTotalPaise: 20000000, cartItems: items,
      } as any);

      expect(result.discountPaise).toBe(1000000);
    });

    it('filters by category-specific coupon', async () => {
      (mockPrisma as any).couponCode.findUnique.mockResolvedValue({
        ...baseCoupon,
        applicableCategories: ['cat-rings'],
      });
      (mockPrisma as any).couponUsage.count.mockResolvedValue(0);

      // Cart items not in 'cat-rings'
      const items = [{ productId: 'p-1', categoryId: 'cat-necklaces', pricePaise: 5000000, quantity: 1 }];
      const result = await service.validateCoupon(TEST_TENANT_ID, CUSTOMER_ID, {
        code: 'SAVE10', cartTotalPaise: 5000000, cartItems: items,
      } as any);

      expect(result.valid).toBe(false);
      expect(result.errorMessage).toContain('not applicable');
    });

    it('applies discount only to eligible items (product filter)', async () => {
      (mockPrisma as any).couponCode.findUnique.mockResolvedValue({
        ...baseCoupon,
        applicableProducts: ['p-2'], // only p-2 eligible
      });
      (mockPrisma as any).couponUsage.count.mockResolvedValue(0);

      const items = [
        { productId: 'p-1', categoryId: 'cat-1', pricePaise: 3000000, quantity: 1 },
        { productId: 'p-2', categoryId: 'cat-1', pricePaise: 2000000, quantity: 1 },
      ];
      const result = await service.validateCoupon(TEST_TENANT_ID, CUSTOMER_ID, {
        code: 'SAVE10', cartTotalPaise: 5000000, cartItems: items,
      } as any);

      expect(result.valid).toBe(true);
      // 10% should apply only to p-2's price (2000000)
      // floor(2000000 * 1000 / 10000) = 200000
      expect(result.discountPaise).toBe(200000);
    });

    it('rejects inactive coupon', async () => {
      (mockPrisma as any).couponCode.findUnique.mockResolvedValue({
        ...baseCoupon,
        isActive: false,
      });

      const result = await service.validateCoupon(TEST_TENANT_ID, CUSTOMER_ID, {
        code: 'SAVE10', cartTotalPaise: 5000000, cartItems,
      } as any);

      expect(result.valid).toBe(false);
      expect(result.errorMessage).toContain('no longer active');
    });
  });

  // ─── applyCoupon ───────────────────────────────────────────

  describe('applyCoupon', () => {
    it('returns discount for valid coupon', async () => {
      (mockPrisma as any).couponCode.findUniqueOrThrow.mockResolvedValue(baseCoupon);

      const discount = await service.applyCoupon(
        TEST_TENANT_ID, 'SAVE10', 5000000, cartItems,
      );
      expect(discount).toBe(500000);
    });
  });
});
