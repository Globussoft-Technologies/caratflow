import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StorefrontCouponService } from '../storefront.coupon.service';
import { createMockPrismaService, TEST_TENANT_ID, resetAllMocks } from '../../../__tests__/setup';

describe('StorefrontCouponService', () => {
  let service: StorefrontCouponService;
  let mockPrisma: ReturnType<typeof createMockPrismaService>;

  const baseCoupon = {
    id: 'coupon-1',
    tenantId: TEST_TENANT_ID,
    code: 'SAVE10',
    discountType: 'PERCENTAGE',
    discountValue: 10,
    isActive: true,
    validFrom: new Date('2025-01-01'),
    validTo: new Date('2027-12-31'),
    usageLimit: 100,
    usedCount: 5,
    minOrderPaise: null as bigint | null,
    maxDiscountPaise: null as bigint | null,
    isFirstOrderOnly: false,
    applicableCategories: null,
    applicableProducts: null,
  };

  beforeEach(() => {
    mockPrisma = createMockPrismaService();
    (mockPrisma as any).couponCode = {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    };
    (mockPrisma as any).onlineOrder = { count: vi.fn() };
    service = new StorefrontCouponService(mockPrisma as any);
    resetAllMocks(mockPrisma);
  });

  // ─── validateCoupon ────────────────────────────────────────

  describe('validateCoupon', () => {
    it('validates active coupon within date range', async () => {
      (mockPrisma as any).couponCode.findUnique.mockResolvedValue(baseCoupon);

      const result = await service.validateCoupon(TEST_TENANT_ID, 'SAVE10', 5000000, null);
      expect(result.isValid).toBe(true);
      expect(result.discountAmountPaise).toBe(500000); // 10% of 5000000
    });

    it('rejects coupon not found', async () => {
      (mockPrisma as any).couponCode.findUnique.mockResolvedValue(null);

      const result = await service.validateCoupon(TEST_TENANT_ID, 'INVALID', 5000000, null);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('not found');
    });

    it('rejects inactive coupon', async () => {
      (mockPrisma as any).couponCode.findUnique.mockResolvedValue({
        ...baseCoupon,
        isActive: false,
      });

      const result = await service.validateCoupon(TEST_TENANT_ID, 'SAVE10', 5000000, null);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('inactive');
    });

    it('rejects expired coupon', async () => {
      (mockPrisma as any).couponCode.findUnique.mockResolvedValue({
        ...baseCoupon,
        validTo: new Date('2020-01-01'),
      });

      const result = await service.validateCoupon(TEST_TENANT_ID, 'SAVE10', 5000000, null);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('expired');
    });

    it('rejects coupon not yet valid', async () => {
      (mockPrisma as any).couponCode.findUnique.mockResolvedValue({
        ...baseCoupon,
        validFrom: new Date('2099-01-01'),
      });

      const result = await service.validateCoupon(TEST_TENANT_ID, 'SAVE10', 5000000, null);
      expect(result.isValid).toBe(false);
    });

    it('rejects coupon over usage limit', async () => {
      (mockPrisma as any).couponCode.findUnique.mockResolvedValue({
        ...baseCoupon,
        usageLimit: 5,
        usedCount: 5,
      });

      const result = await service.validateCoupon(TEST_TENANT_ID, 'SAVE10', 5000000, null);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('usage limit');
    });

    it('enforces minimum order amount', async () => {
      (mockPrisma as any).couponCode.findUnique.mockResolvedValue({
        ...baseCoupon,
        minOrderPaise: BigInt(10000000), // Rs 1,00,000
      });

      const result = await service.validateCoupon(TEST_TENANT_ID, 'SAVE10', 5000000, null);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('Minimum order amount');
    });

    it('enforces first-order-only restriction', async () => {
      (mockPrisma as any).couponCode.findUnique.mockResolvedValue({
        ...baseCoupon,
        isFirstOrderOnly: true,
      });
      (mockPrisma as any).onlineOrder.count.mockResolvedValue(2);

      const result = await service.validateCoupon(TEST_TENANT_ID, 'SAVE10', 5000000, 'cust-1');
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('first orders only');
    });

    it('allows first-order-only for new customers', async () => {
      (mockPrisma as any).couponCode.findUnique.mockResolvedValue({
        ...baseCoupon,
        isFirstOrderOnly: true,
      });
      (mockPrisma as any).onlineOrder.count.mockResolvedValue(0);

      const result = await service.validateCoupon(TEST_TENANT_ID, 'SAVE10', 5000000, 'cust-new');
      expect(result.isValid).toBe(true);
    });

    it('calculates percentage discount: 10% of Rs 50,000', async () => {
      (mockPrisma as any).couponCode.findUnique.mockResolvedValue({
        ...baseCoupon,
        discountType: 'PERCENTAGE',
        discountValue: 10,
      });

      const result = await service.validateCoupon(TEST_TENANT_ID, 'SAVE10', 5000000, null);
      expect(result.discountAmountPaise).toBe(500000);
    });

    it('calculates fixed discount: Rs 1000 off', async () => {
      (mockPrisma as any).couponCode.findUnique.mockResolvedValue({
        ...baseCoupon,
        discountType: 'FIXED',
        discountValue: 100000, // Rs 1000 in paise
      });

      const result = await service.validateCoupon(TEST_TENANT_ID, 'SAVE10', 5000000, null);
      expect(result.discountAmountPaise).toBe(100000);
    });

    it('caps percentage discount at maxDiscountPaise', async () => {
      // 20% of Rs 2,00,000 = Rs 40,000 but maxDiscount = Rs 10,000
      (mockPrisma as any).couponCode.findUnique.mockResolvedValue({
        ...baseCoupon,
        discountType: 'PERCENTAGE',
        discountValue: 20,
        maxDiscountPaise: BigInt(1000000), // Rs 10,000
      });

      const result = await service.validateCoupon(TEST_TENANT_ID, 'SAVE10', 20000000, null);
      expect(result.discountAmountPaise).toBe(1000000); // capped at Rs 10,000
    });

    it('discount never exceeds cart total', async () => {
      (mockPrisma as any).couponCode.findUnique.mockResolvedValue({
        ...baseCoupon,
        discountType: 'FIXED',
        discountValue: 9999999999, // huge fixed discount
      });

      const cartTotal = 500000; // Rs 5,000
      const result = await service.validateCoupon(TEST_TENANT_ID, 'SAVE10', cartTotal, null);
      expect(result.discountAmountPaise).toBeLessThanOrEqual(cartTotal);
    });
  });

  // ─── applyCoupon ───────────────────────────────────────────

  describe('applyCoupon', () => {
    it('returns discount amount for valid coupon', async () => {
      (mockPrisma as any).couponCode.findUnique.mockResolvedValue(baseCoupon);

      const result = await service.applyCoupon(TEST_TENANT_ID, 'SAVE10', 5000000);
      expect(result.isValid).toBe(true);
      expect(result.discountAmountPaise).toBe(500000);
    });

    it('returns zero for invalid/inactive coupon', async () => {
      (mockPrisma as any).couponCode.findUnique.mockResolvedValue(null);

      const result = await service.applyCoupon(TEST_TENANT_ID, 'GONE', 5000000);
      expect(result.isValid).toBe(false);
      expect(result.discountAmountPaise).toBe(0);
    });
  });
});
