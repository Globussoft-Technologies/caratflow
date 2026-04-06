import { describe, it, expect, beforeEach } from 'vitest';
import { RetailPricingService } from '../retail.pricing.service';
import { createMockPrismaService, resetMocks } from '../../../__tests__/mocks';

describe('RetailPricingService', () => {
  let service: RetailPricingService;
  let prisma: ReturnType<typeof createMockPrismaService>;

  beforeEach(() => {
    prisma = createMockPrismaService();
    service = new RetailPricingService(prisma as never);
    resetMocks(prisma);
  });

  // ─── calculateLineItemPrice ────────────────────────────────────

  describe('calculateLineItemPrice', () => {
    it('should calculate: metalRate * weight(g) + making + wastage', () => {
      // metalRate = 600000 paise/g (Rs 6000/g)
      // weight = 5000 mg = 5g
      // making = 20000 paise (Rs 200)
      // wastage = 5000 paise (Rs 50)
      // quantity = 1
      const result = service.calculateLineItemPrice(600000, 5000, 20000, 5000, 1);

      // Metal value = 600000 * 5 = 3,000,000
      expect(result.metalValuePaise).toBe(3000000);
      // Subtotal = (3,000,000 + 20,000 + 5,000) * 1 = 3,025,000
      expect(result.subtotalPaise).toBe(3025000);
    });

    it('should multiply by quantity', () => {
      const result = service.calculateLineItemPrice(600000, 5000, 20000, 5000, 2);

      // (3,000,000 + 20,000 + 5,000) * 2 = 6,050,000
      expect(result.subtotalPaise).toBe(6050000);
    });

    it('should handle zero making charges', () => {
      const result = service.calculateLineItemPrice(600000, 5000, 0, 0, 1);

      expect(result.metalValuePaise).toBe(3000000);
      expect(result.makingChargesPaise).toBe(0);
      expect(result.subtotalPaise).toBe(3000000);
    });

    it('should handle fractional gram weights (mg precision)', () => {
      // 2500 mg = 2.5g
      const result = service.calculateLineItemPrice(600000, 2500, 0, 0, 1);

      // 600000 * 2.5 = 1,500,000
      expect(result.metalValuePaise).toBe(1500000);
    });

    it('should return zero tax fields initially', () => {
      const result = service.calculateLineItemPrice(600000, 5000, 20000, 5000, 1);

      expect(result.cgstPaise).toBe(0);
      expect(result.sgstPaise).toBe(0);
      expect(result.igstPaise).toBe(0);
      expect(result.totalTaxPaise).toBe(0);
    });
  });

  // ─── calculateTax ──────────────────────────────────────────────

  describe('calculateTax', () => {
    const makeLineItem = (overrides: Record<string, unknown> = {}) => ({
      description: '22K Ring',
      quantity: 1,
      unitPricePaise: 500000,
      hsnCode: '7113',
      gstRate: 300, // 3%
      discountPaise: 0,
      ...overrides,
    });

    it('should apply 3% GST on jewelry (HSN 7113)', () => {
      const items = [makeLineItem()];
      const result = service.calculateTax(items as never, {
        sourceState: 'MH',
        destinationState: 'MH',
      });

      const totalTax = result[0].cgstPaise + result[0].sgstPaise + result[0].igstPaise;
      // 500000 * 3% = 15000
      expect(totalTax).toBe(15000);
    });

    it('should split GST as CGST + SGST for intra-state', () => {
      const items = [makeLineItem()];
      const result = service.calculateTax(items as never, {
        sourceState: 'MH',
        destinationState: 'MH',
      });

      // 3% / 2 = 1.5% each
      // 500000 * 1.5% = 7500
      expect(result[0].cgstPaise).toBe(7500);
      expect(result[0].sgstPaise).toBe(7500);
      expect(result[0].igstPaise).toBe(0);
    });

    it('should apply IGST only for inter-state', () => {
      const items = [makeLineItem()];
      const result = service.calculateTax(items as never, {
        sourceState: 'MH',
        destinationState: 'GJ',
      });

      // 500000 * 3% = 15000
      expect(result[0].igstPaise).toBe(15000);
      expect(result[0].cgstPaise).toBe(0);
      expect(result[0].sgstPaise).toBe(0);
    });

    it('should apply 5% GST on making charges', () => {
      const items = [makeLineItem({ gstRate: 500 })]; // 5%
      const result = service.calculateTax(items as never, {
        sourceState: 'MH',
        destinationState: 'MH',
      });

      // 500000 * 5% = 25000
      const totalTax = result[0].cgstPaise + result[0].sgstPaise;
      expect(totalTax).toBe(25000);
    });

    it('should subtract item discount from taxable amount', () => {
      const items = [makeLineItem({ discountPaise: 50000 })]; // Rs 500 discount
      const result = service.calculateTax(items as never, {
        sourceState: 'MH',
        destinationState: 'MH',
      });

      // Taxable = 500000 - 50000 = 450000
      // Tax = 450000 * 3% = 13500
      const totalTax = result[0].cgstPaise + result[0].sgstPaise;
      expect(totalTax).toBe(13500);
    });

    it('should handle quantity > 1', () => {
      const items = [makeLineItem({ quantity: 2 })];
      const result = service.calculateTax(items as never, {
        sourceState: 'MH',
        destinationState: 'MH',
      });

      // Base = 500000 * 2 = 1000000
      // Tax = 1000000 * 3% = 30000
      const totalTax = result[0].cgstPaise + result[0].sgstPaise;
      expect(totalTax).toBe(30000);
    });

    it('should calculate lineTotalPaise correctly', () => {
      const items = [makeLineItem()];
      const result = service.calculateTax(items as never, {
        sourceState: 'MH',
        destinationState: 'MH',
      });

      // Taxable = 500000, Tax = 15000, Line total = 515000
      expect(result[0].lineTotalPaise).toBe(515000);
    });
  });

  // ─── calculateTotal ────────────────────────────────────────────

  describe('calculateTotal', () => {
    it('should calculate subtotal, discount, tax, and grand total', () => {
      const lineItemsWithTax = [
        {
          item: { unitPricePaise: 500000, quantity: 1, discountPaise: 0 },
          cgstPaise: 7500,
          sgstPaise: 7500,
          igstPaise: 0,
          lineTotalPaise: 515000,
        },
      ];

      const result = service.calculateTotal(lineItemsWithTax as never, 0);

      expect(result.subtotalPaise).toBe(500000);
      expect(result.taxPaise).toBe(15000);
      expect(result.discountPaise).toBe(0);
    });

    it('should apply sale-level discount', () => {
      const lineItemsWithTax = [
        {
          item: { unitPricePaise: 500000, quantity: 1, discountPaise: 0 },
          cgstPaise: 7500,
          sgstPaise: 7500,
          igstPaise: 0,
          lineTotalPaise: 515000,
        },
      ];

      const result = service.calculateTotal(lineItemsWithTax as never, 50000); // Rs 500 discount

      expect(result.discountPaise).toBe(50000);
      // beforeRoundOff = 500000 - 50000 + 15000 = 465000
      // Already round, so total = 465000
      expect(result.totalPaise).toBe(465000);
    });

    it('should round to nearest rupee (100 paise)', () => {
      const lineItemsWithTax = [
        {
          item: { unitPricePaise: 333333, quantity: 1, discountPaise: 0 },
          cgstPaise: 5000,
          sgstPaise: 5000,
          igstPaise: 0,
          lineTotalPaise: 343333,
        },
      ];

      const result = service.calculateTotal(lineItemsWithTax as never, 0);

      // beforeRoundOff = 333333 + 10000 = 343333
      // Rounded = 343300
      const roundedTotal = Math.round(343333 / 100) * 100;
      expect(result.totalPaise).toBe(roundedTotal);
      expect(result.roundOffPaise).toBe(roundedTotal - 343333);
    });

    it('should handle zero discount', () => {
      const lineItemsWithTax = [
        {
          item: { unitPricePaise: 500000, quantity: 1, discountPaise: 0 },
          cgstPaise: 7500,
          sgstPaise: 7500,
          igstPaise: 0,
          lineTotalPaise: 515000,
        },
      ];

      const result = service.calculateTotal(lineItemsWithTax as never, 0);

      expect(result.discountPaise).toBe(0);
      expect(result.totalPaise).toBe(515000);
    });

    it('should sum tax from multiple line items', () => {
      const lineItemsWithTax = [
        {
          item: { unitPricePaise: 500000, quantity: 1, discountPaise: 0 },
          cgstPaise: 7500,
          sgstPaise: 7500,
          igstPaise: 0,
          lineTotalPaise: 515000,
        },
        {
          item: { unitPricePaise: 200000, quantity: 1, discountPaise: 0 },
          cgstPaise: 3000,
          sgstPaise: 3000,
          igstPaise: 0,
          lineTotalPaise: 206000,
        },
      ];

      const result = service.calculateTotal(lineItemsWithTax as never, 0);

      expect(result.taxPaise).toBe(21000);
      expect(result.subtotalPaise).toBe(700000);
    });

    it('should handle percentage-style discount applied via item-level', () => {
      // 10% off a 500000 item = 50000 discount
      const lineItemsWithTax = [
        {
          item: { unitPricePaise: 500000, quantity: 1, discountPaise: 50000 },
          cgstPaise: 6750,
          sgstPaise: 6750,
          igstPaise: 0,
          lineTotalPaise: 463500,
        },
      ];

      const result = service.calculateTotal(lineItemsWithTax as never, 0);

      // Subtotal = 500000 - 50000 = 450000
      expect(result.subtotalPaise).toBe(450000);
    });
  });

  // ─── applyDiscount ─────────────────────────────────────────────

  describe('applyDiscount', () => {
    it('should calculate percentage discount', async () => {
      prisma.discount.findFirst.mockResolvedValue({
        id: 'disc-1',
        isActive: true,
        discountType: 'PERCENTAGE',
        value: 1000, // 10% (stored as percent * 100)
        startDate: new Date('2025-01-01'),
        endDate: new Date('2027-12-31'),
        usageLimit: null,
        usedCount: 0,
        minPurchasePaise: null,
        maxDiscountPaise: null,
        applicableProducts: null,
      });

      const result = await service.applyDiscount(
        'test-tenant-id',
        'disc-1',
        500000,
        ['p1'],
      );

      expect(result.isValid).toBe(true);
      // 500000 * 1000 / 10000 = 50000
      expect(result.applicableAmount).toBe(50000);
    });

    it('should calculate fixed discount', async () => {
      prisma.discount.findFirst.mockResolvedValue({
        id: 'disc-2',
        isActive: true,
        discountType: 'FIXED',
        value: 50000, // Rs 500
        startDate: new Date('2025-01-01'),
        endDate: new Date('2027-12-31'),
        usageLimit: null,
        usedCount: 0,
        minPurchasePaise: null,
        maxDiscountPaise: null,
        applicableProducts: null,
      });

      const result = await service.applyDiscount(
        'test-tenant-id',
        'disc-2',
        500000,
        ['p1'],
      );

      expect(result.isValid).toBe(true);
      expect(result.applicableAmount).toBe(50000);
    });

    it('should reject inactive discount', async () => {
      prisma.discount.findFirst.mockResolvedValue({
        id: 'disc-3',
        isActive: false,
        discountType: 'PERCENTAGE',
        value: 1000,
        startDate: new Date('2025-01-01'),
        endDate: new Date('2027-12-31'),
      });

      const result = await service.applyDiscount('test-tenant-id', 'disc-3', 500000, ['p1']);

      expect(result.isValid).toBe(false);
    });

    it('should reject when usage limit reached', async () => {
      prisma.discount.findFirst.mockResolvedValue({
        id: 'disc-4',
        isActive: true,
        discountType: 'PERCENTAGE',
        value: 1000,
        startDate: new Date('2025-01-01'),
        endDate: new Date('2027-12-31'),
        usageLimit: 10,
        usedCount: 10,
      });

      const result = await service.applyDiscount('test-tenant-id', 'disc-4', 500000, ['p1']);

      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('usage limit');
    });

    it('should reject when minimum purchase not met', async () => {
      prisma.discount.findFirst.mockResolvedValue({
        id: 'disc-5',
        isActive: true,
        discountType: 'FIXED',
        value: 50000,
        startDate: new Date('2025-01-01'),
        endDate: new Date('2027-12-31'),
        usageLimit: null,
        usedCount: 0,
        minPurchasePaise: 1000000n, // Rs 10,000 minimum
        maxDiscountPaise: null,
        applicableProducts: null,
      });

      const result = await service.applyDiscount('test-tenant-id', 'disc-5', 500000, ['p1']);

      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('Minimum purchase');
    });

    it('should cap discount at maxDiscountPaise', async () => {
      prisma.discount.findFirst.mockResolvedValue({
        id: 'disc-6',
        isActive: true,
        discountType: 'PERCENTAGE',
        value: 5000, // 50%
        startDate: new Date('2025-01-01'),
        endDate: new Date('2027-12-31'),
        usageLimit: null,
        usedCount: 0,
        minPurchasePaise: null,
        maxDiscountPaise: 100000n, // Max Rs 1000
        applicableProducts: null,
      });

      const result = await service.applyDiscount('test-tenant-id', 'disc-6', 500000, ['p1']);

      expect(result.isValid).toBe(true);
      // 500000 * 50% = 250000, capped at 100000
      expect(result.applicableAmount).toBe(100000);
    });

    it('should return invalid when discount not found', async () => {
      prisma.discount.findFirst.mockResolvedValue(null);

      const result = await service.applyDiscount('test-tenant-id', 'nonexistent', 500000, ['p1']);

      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('not found');
    });
  });
});
