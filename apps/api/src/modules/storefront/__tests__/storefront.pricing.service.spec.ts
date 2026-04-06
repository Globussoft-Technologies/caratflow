import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StorefrontPricingService } from '../storefront.pricing.service';
import { createMockPrismaService, TEST_TENANT_ID, resetAllMocks } from '../../../__tests__/setup';

describe('StorefrontPricingService', () => {
  let service: StorefrontPricingService;
  let mockPrisma: ReturnType<typeof createMockPrismaService>;

  beforeEach(() => {
    mockPrisma = createMockPrismaService();
    service = new StorefrontPricingService(mockPrisma as any);
    resetAllMocks(mockPrisma);
    service.invalidateRateCache();
  });

  // ─── calculateProductPrice ─────────────────────────────────

  describe('calculateProductPrice', () => {
    it('calculates 22K gold ring: 5g, rate Rs 6000/g correctly', () => {
      // rate Rs 6000/g = Rs 60000/10g = 6000000 paise/10g
      // 5g = 5000 mg
      // metalValue = (6000000 * 5000) / 10000 = 3000000 paise = Rs 30,000
      // making = 200000 paise = Rs 2,000
      // wastage = 1% => 3000000 * 1 / 100 = 30000 paise = Rs 300
      // subtotal = 3000000 + 200000 + 30000 = 3230000 paise = Rs 32,300
      // GST = 3230000 * 300 / 10000 = 96900 paise = Rs 969
      // total = 3230000 + 96900 = 3326900 paise = Rs 33,269
      const result = service.calculateProductPrice(
        5000,    // 5g in mg
        200000,  // Rs 2000 making charges in paise
        1,       // 1% wastage
        6000000, // Rs 60000 per 10g in paise
      );

      expect(result.metalValuePaise).toBe(3000000);
      expect(result.makingValuePaise).toBe(200000);
      expect(result.wastageValuePaise).toBe(30000);
      expect(result.subtotalPaise).toBe(3230000);
      expect(result.gstPaise).toBe(96900);
      expect(result.totalPricePaise).toBe(3326900);
    });

    it('calculates with zero making charges', () => {
      const result = service.calculateProductPrice(
        5000,    // 5g
        0,       // zero making
        0,       // zero wastage
        6000000, // Rs 60000/10g
      );

      expect(result.metalValuePaise).toBe(3000000);
      expect(result.makingValuePaise).toBe(0);
      expect(result.wastageValuePaise).toBe(0);
      expect(result.subtotalPaise).toBe(3000000);
      // GST = 3000000 * 300 / 10000 = 90000
      expect(result.gstPaise).toBe(90000);
      expect(result.totalPricePaise).toBe(3090000);
    });

    it('calculates with zero weight returns all zeroes', () => {
      const result = service.calculateProductPrice(0, 0, 0, 6000000);
      expect(result.metalValuePaise).toBe(0);
      expect(result.makingValuePaise).toBe(0);
      expect(result.wastageValuePaise).toBe(0);
      expect(result.subtotalPaise).toBe(0);
      expect(result.gstPaise).toBe(0);
      expect(result.totalPricePaise).toBe(0);
    });

    it('calculates with high wastage percent (10%)', () => {
      const result = service.calculateProductPrice(
        10000,   // 10g
        500000,  // Rs 5000 making
        10,      // 10% wastage
        5500000, // Rs 55000/10g
      );

      // metal = (5500000 * 10000) / 10000 = 5500000
      expect(result.metalValuePaise).toBe(5500000);
      // wastage = 5500000 * 10 / 100 = 550000
      expect(result.wastageValuePaise).toBe(550000);
      const expectedSubtotal = 5500000 + 500000 + 550000; // 6550000
      expect(result.subtotalPaise).toBe(expectedSubtotal);
      // GST = 6550000 * 300 / 10000 = 196500
      expect(result.gstPaise).toBe(196500);
      expect(result.totalPricePaise).toBe(expectedSubtotal + 196500);
    });

    it('handles silver rate (different metal type)', () => {
      // Silver: Rs 80/g = Rs 800/10g = 80000 paise/10g
      const result = service.calculateProductPrice(
        50000,  // 50g
        100000, // Rs 1000 making
        2,      // 2% wastage
        80000,  // Rs 800/10g
      );

      // metal = (80000 * 50000) / 10000 = 400000 paise = Rs 4000
      expect(result.metalValuePaise).toBe(400000);
      // wastage = 400000 * 2 / 100 = 8000
      expect(result.wastageValuePaise).toBe(8000);
      const sub = 400000 + 100000 + 8000; // 508000
      expect(result.subtotalPaise).toBe(sub);
      const gst = Math.round((sub * 300) / 10000);
      expect(result.gstPaise).toBe(gst);
      expect(result.totalPricePaise).toBe(sub + gst);
    });

    it('handles platinum rate', () => {
      // Platinum: Rs 3000/g = Rs 30000/10g = 3000000 paise/10g
      const result = service.calculateProductPrice(
        2000,    // 2g
        300000,  // Rs 3000 making
        3,       // 3% wastage
        3000000, // Rs 30000/10g
      );

      // metal = (3000000 * 2000) / 10000 = 600000
      expect(result.metalValuePaise).toBe(600000);
      // wastage = 600000 * 3 / 100 = 18000
      expect(result.wastageValuePaise).toBe(18000);
      const sub = 600000 + 300000 + 18000;
      expect(result.subtotalPaise).toBe(sub);
    });

    it('applies 3% GST (300 basis points) on subtotal', () => {
      const result = service.calculateProductPrice(1000, 100000, 0, 6000000);
      // metal = (6000000 * 1000) / 10000 = 600000
      // sub = 600000 + 100000 = 700000
      // GST = 700000 * 300 / 10000 = 21000 (exactly 3%)
      expect(result.gstPaise).toBe(21000);
      expect(result.totalPricePaise).toBe(700000 + 21000);
    });

    it('returns integer paise values (no floats)', () => {
      const result = service.calculateProductPrice(3333, 12345, 7, 5555555);
      expect(Number.isInteger(result.metalValuePaise)).toBe(true);
      expect(Number.isInteger(result.wastageValuePaise)).toBe(true);
      expect(Number.isInteger(result.gstPaise)).toBe(true);
      expect(Number.isInteger(result.totalPricePaise)).toBe(true);
    });

    it('total = subtotal + GST always', () => {
      const result = service.calculateProductPrice(7777, 99999, 5, 4321000);
      expect(result.totalPricePaise).toBe(result.subtotalPaise + result.gstPaise);
    });

    it('subtotal = metal + making + wastage always', () => {
      const result = service.calculateProductPrice(12345, 678900, 8, 7654321);
      expect(result.subtotalPaise).toBe(
        result.metalValuePaise + result.makingValuePaise + result.wastageValuePaise,
      );
    });
  });

  // ─── calculateCartTotal ────────────────────────────────────

  describe('calculateCartTotal', () => {
    it('sums multiple items correctly', async () => {
      const cartItems = [
        {
          id: 'ci-1',
          productId: 'p-1',
          quantity: 2,
          metalRatePaiseLocked: BigInt(6000000),
          product: {
            productType: 'GOLD',
            metalPurity: 916,
            metalWeightMg: BigInt(5000),
            makingCharges: BigInt(200000),
            wastagePercent: 1,
            sellingPricePaise: null,
          },
        },
        {
          id: 'ci-2',
          productId: 'p-2',
          quantity: 1,
          metalRatePaiseLocked: BigInt(6000000),
          product: {
            productType: 'GOLD',
            metalPurity: 916,
            metalWeightMg: BigInt(10000),
            makingCharges: BigInt(500000),
            wastagePercent: 2,
            sellingPricePaise: null,
          },
        },
      ];

      const result = await service.calculateCartTotal(TEST_TENANT_ID, cartItems);

      expect(result.itemPrices).toHaveLength(2);
      expect(result.subtotalPaise).toBe(
        result.itemPrices[0].lineTotalPaise + result.itemPrices[1].lineTotalPaise,
      );
      expect(result.discountPaise).toBe(0);
      expect(result.totalPaise).toBe(result.subtotalPaise);
    });

    it('applies coupon discount to cart total', async () => {
      const cartItems = [
        {
          id: 'ci-1',
          productId: 'p-1',
          quantity: 1,
          metalRatePaiseLocked: BigInt(6000000),
          product: {
            productType: 'GOLD',
            metalPurity: 916,
            metalWeightMg: BigInt(5000),
            makingCharges: BigInt(200000),
            wastagePercent: 0,
            sellingPricePaise: null,
          },
        },
      ];

      const couponDiscount = 100000; // Rs 1000 off
      const result = await service.calculateCartTotal(TEST_TENANT_ID, cartItems, couponDiscount);

      expect(result.discountPaise).toBe(100000);
      expect(result.totalPaise).toBe(result.subtotalPaise - 100000);
    });

    it('discount does not exceed subtotal', async () => {
      const cartItems = [
        {
          id: 'ci-1',
          productId: 'p-1',
          quantity: 1,
          metalRatePaiseLocked: BigInt(6000000),
          product: {
            productType: 'GOLD',
            metalPurity: 916,
            metalWeightMg: BigInt(100),
            makingCharges: BigInt(0),
            wastagePercent: 0,
            sellingPricePaise: null,
          },
        },
      ];

      const hugeDiscount = 999999999;
      const result = await service.calculateCartTotal(TEST_TENANT_ID, cartItems, hugeDiscount);

      expect(result.discountPaise).toBeLessThanOrEqual(result.subtotalPaise);
      expect(result.totalPaise).toBe(0);
    });

    it('uses locked rate when available', async () => {
      const lockedRate = BigInt(5000000);
      const cartItems = [
        {
          id: 'ci-1',
          productId: 'p-1',
          quantity: 1,
          metalRatePaiseLocked: lockedRate,
          product: {
            productType: 'GOLD',
            metalPurity: 916,
            metalWeightMg: BigInt(5000),
            makingCharges: BigInt(0),
            wastagePercent: 0,
            sellingPricePaise: null,
          },
        },
      ];

      const result = await service.calculateCartTotal(TEST_TENANT_ID, cartItems);

      // metal = 5000000 * 5000 / 10000 = 2500000
      // GST = 2500000 * 300 / 10000 = 75000
      // total per unit = 2575000
      expect(result.itemPrices[0].unitPricePaise).toBe(2575000);
    });
  });

  // ─── getMetalRate / cache ──────────────────────────────────

  describe('getMetalRate', () => {
    it('fetches rate from DB on cache miss', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({
        id: TEST_TENANT_ID,
        settings: {
          metalRates: { GOLD_916: 6000000 },
        },
      });

      const rate = await service.getMetalRate(TEST_TENANT_ID, 'GOLD', 916);
      expect(rate).toBe(6000000);
      expect(mockPrisma.tenant.findUnique).toHaveBeenCalledOnce();
    });

    it('returns cached rate on second call', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({
        id: TEST_TENANT_ID,
        settings: {
          metalRates: { GOLD_916: 6000000 },
        },
      });

      await service.getMetalRate(TEST_TENANT_ID, 'GOLD', 916);
      await service.getMetalRate(TEST_TENANT_ID, 'GOLD', 916);
      expect(mockPrisma.tenant.findUnique).toHaveBeenCalledOnce();
    });

    it('invalidateRateCache clears cache for specific tenant', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({
        id: TEST_TENANT_ID,
        settings: {
          metalRates: { GOLD_916: 6000000 },
        },
      });

      await service.getMetalRate(TEST_TENANT_ID, 'GOLD', 916);
      service.invalidateRateCache(TEST_TENANT_ID);
      await service.getMetalRate(TEST_TENANT_ID, 'GOLD', 916);
      expect(mockPrisma.tenant.findUnique).toHaveBeenCalledTimes(2);
    });
  });

  // ─── calculateLiveProductPrice ─────────────────────────────

  describe('calculateLiveProductPrice', () => {
    it('uses fixed selling price for non-metal products', async () => {
      const result = await service.calculateLiveProductPrice(TEST_TENANT_ID, {
        productType: 'DIAMOND',
        metalPurity: null,
        metalWeightMg: null,
        makingCharges: null,
        wastagePercent: null,
        sellingPricePaise: BigInt(500000),
      });

      expect(result.metalValuePaise).toBe(0);
      expect(result.subtotalPaise).toBe(500000);
      // GST = 500000 * 300 / 10000 = 15000
      expect(result.gstPaise).toBe(15000);
      expect(result.totalPricePaise).toBe(515000);
    });

    it('fetches live rate for metal products', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue({
        id: TEST_TENANT_ID,
        settings: {
          metalRates: { GOLD_916: 6000000 },
        },
      });

      const result = await service.calculateLiveProductPrice(TEST_TENANT_ID, {
        productType: 'GOLD',
        metalPurity: 916,
        metalWeightMg: BigInt(5000),
        makingCharges: BigInt(200000),
        wastagePercent: 1,
        sellingPricePaise: null,
      });

      expect(result.metalValuePaise).toBe(3000000);
      expect(result.totalPricePaise).toBeGreaterThan(0);
    });
  });
});
