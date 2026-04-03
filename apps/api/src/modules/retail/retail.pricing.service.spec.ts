import { describe, it, expect, beforeEach } from 'vitest';
import { RetailPricingService } from './retail.pricing.service';
import { createMockPrismaService } from '../../__tests__/setup';

describe('RetailPricingService (Unit)', () => {
  let pricingService: RetailPricingService;
  let mockPrisma: ReturnType<typeof createMockPrismaService>;

  beforeEach(() => {
    mockPrisma = createMockPrismaService();
    pricingService = new RetailPricingService(mockPrisma as any);
  });

  // ─── Line Item Price Calculation ──────────────────────────────

  describe('calculateLineItemPrice', () => {
    it('calculates jewelry price: (rate_per_gram * weight_in_grams) + making + wastage', () => {
      // Gold rate: Rs 6000/gram = 600000 paise/gram
      // Weight: 10g = 10000 mg
      // Making: Rs 3000 = 300000 paise
      // Wastage: Rs 2000 = 200000 paise
      const result = pricingService.calculateLineItemPrice(
        600000,   // metalRatePaisePerGram
        10000,    // metalWeightMg (10g)
        300000,   // makingChargesPaise
        200000,   // wastageChargesPaise
        1,        // quantity
      );

      // Metal value: 600000 * 10 = 6000000 paise (Rs 60,000)
      expect(result.metalValuePaise).toBe(6000000);
      // Subtotal: 6000000 + 300000 + 200000 = 6500000 paise (Rs 65,000)
      expect(result.subtotalPaise).toBe(6500000);
      // No tax calculated here (done separately)
      expect(result.totalTaxPaise).toBe(0);
      expect(result.totalPaise).toBe(6500000);
    });

    it('handles quantity > 1', () => {
      const result = pricingService.calculateLineItemPrice(
        600000,  // rate per gram
        5000,    // 5g
        100000,  // making
        50000,   // wastage
        2,       // 2 pieces
      );

      // Per piece: (600000 * 5) + 100000 + 50000 = 3150000
      // x2 = 6300000
      expect(result.subtotalPaise).toBe(6300000);
    });

    it('handles zero making charges (plain gold bar)', () => {
      const result = pricingService.calculateLineItemPrice(
        600000,
        10000,
        0,
        0,
        1,
      );

      expect(result.metalValuePaise).toBe(6000000);
      expect(result.subtotalPaise).toBe(6000000);
    });

    it('handles fractional gram weights correctly', () => {
      // 2.5g = 2500 mg
      const result = pricingService.calculateLineItemPrice(
        600000, // rate per gram
        2500,   // 2.5g in mg
        50000,  // making
        0,      // no wastage
        1,
      );

      // Metal value: 600000 * 2.5 = 1500000
      expect(result.metalValuePaise).toBe(1500000);
      expect(result.subtotalPaise).toBe(1550000);
    });
  });

  // ─── GST Calculation ─────────────────────────────────────────

  describe('calculateTax', () => {
    it('calculates 3% GST on jewelry intra-state (CGST + SGST)', () => {
      const lineItems = [
        {
          description: '22K Gold Ring',
          quantity: 1,
          unitPricePaise: 6500000,
          hsnCode: '7113',
          gstRate: 300, // 3%
        },
      ];

      const result = pricingService.calculateTax(lineItems as any, {
        sourceState: 'MH',
        destinationState: 'MH',
      });

      expect(result).toHaveLength(1);
      const item = result[0]!;

      // 3% of 6500000 = 195000, split: 97500 CGST + 97500 SGST
      expect(item.cgstPaise).toBe(97500);
      expect(item.sgstPaise).toBe(97500);
      expect(item.igstPaise).toBe(0);
      expect(item.lineTotalPaise).toBe(6695000); // 6500000 + 195000
    });

    it('calculates 3% IGST on jewelry inter-state', () => {
      const lineItems = [
        {
          description: '22K Gold Ring',
          quantity: 1,
          unitPricePaise: 6500000,
          hsnCode: '7113',
          gstRate: 300,
        },
      ];

      const result = pricingService.calculateTax(lineItems as any, {
        sourceState: 'MH',
        destinationState: 'GJ',
      });

      expect(result).toHaveLength(1);
      const item = result[0]!;

      expect(item.cgstPaise).toBe(0);
      expect(item.sgstPaise).toBe(0);
      expect(item.igstPaise).toBe(195000); // 3% of 6500000
      expect(item.lineTotalPaise).toBe(6695000);
    });

    it('handles line item discount before computing tax', () => {
      const lineItems = [
        {
          description: '22K Gold Ring',
          quantity: 1,
          unitPricePaise: 6500000,
          discountPaise: 500000, // Rs 5,000 discount
          hsnCode: '7113',
          gstRate: 300,
        },
      ];

      const result = pricingService.calculateTax(lineItems as any, {
        sourceState: 'MH',
        destinationState: 'MH',
      });

      const item = result[0]!;
      // Taxable = 6500000 - 500000 = 6000000
      // 3% = 180000, split: 90000 each
      expect(item.cgstPaise).toBe(90000);
      expect(item.sgstPaise).toBe(90000);
      expect(item.lineTotalPaise).toBe(6180000); // 6000000 + 180000
    });

    it('handles multiple line items', () => {
      const lineItems = [
        {
          description: 'Gold Ring',
          quantity: 1,
          unitPricePaise: 5000000,
          hsnCode: '7113',
          gstRate: 300,
        },
        {
          description: 'Silver Bracelet',
          quantity: 2,
          unitPricePaise: 500000,
          hsnCode: '7113',
          gstRate: 300,
        },
      ];

      const result = pricingService.calculateTax(lineItems as any, {
        sourceState: 'MH',
        destinationState: 'MH',
      });

      expect(result).toHaveLength(2);

      // Ring: 3% of 5000000 = 150000
      expect(result[0]!.cgstPaise + result[0]!.sgstPaise).toBe(150000);

      // Bracelet: 500000 * 2 = 1000000, 3% = 30000
      expect(result[1]!.cgstPaise + result[1]!.sgstPaise).toBe(30000);
    });
  });

  // ─── Discount Application ────────────────────────────────────

  describe('applyDiscount', () => {
    it('applies percentage discount', async () => {
      mockPrisma.discount.findFirst.mockResolvedValue({
        id: 'disc-1',
        tenantId: 'tenant-1',
        discountType: 'PERCENTAGE',
        value: 1000, // 10% (stored as percent * 100)
        isActive: true,
        startDate: new Date(Date.now() - 86400000),
        endDate: new Date(Date.now() + 86400000),
        usageLimit: null,
        usedCount: 0,
        minPurchasePaise: null,
        maxDiscountPaise: null,
        applicableProducts: null,
      });

      const result = await pricingService.applyDiscount(
        'tenant-1',
        'disc-1',
        6500000, // Rs 65,000
        [],
      );

      expect(result.isValid).toBe(true);
      // 10% of 65000 = 6500 = 650000 paise
      expect(result.applicableAmount).toBe(650000);
    });

    it('applies fixed discount', async () => {
      mockPrisma.discount.findFirst.mockResolvedValue({
        id: 'disc-2',
        tenantId: 'tenant-1',
        discountType: 'FIXED',
        value: 500000, // Rs 5,000
        isActive: true,
        startDate: new Date(Date.now() - 86400000),
        endDate: new Date(Date.now() + 86400000),
        usageLimit: null,
        usedCount: 0,
        minPurchasePaise: null,
        maxDiscountPaise: null,
        applicableProducts: null,
      });

      const result = await pricingService.applyDiscount('tenant-1', 'disc-2', 6500000, []);

      expect(result.isValid).toBe(true);
      expect(result.applicableAmount).toBe(500000);
    });

    it('rejects expired discount', async () => {
      mockPrisma.discount.findFirst.mockResolvedValue({
        id: 'disc-3',
        tenantId: 'tenant-1',
        discountType: 'PERCENTAGE',
        value: 1000,
        isActive: true,
        startDate: new Date(Date.now() - 172800000),
        endDate: new Date(Date.now() - 86400000), // expired yesterday
        usageLimit: null,
        usedCount: 0,
        minPurchasePaise: null,
        maxDiscountPaise: null,
        applicableProducts: null,
      });

      const result = await pricingService.applyDiscount('tenant-1', 'disc-3', 6500000, []);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('inactive or expired');
    });

    it('rejects discount when minimum purchase not met', async () => {
      mockPrisma.discount.findFirst.mockResolvedValue({
        id: 'disc-4',
        tenantId: 'tenant-1',
        discountType: 'PERCENTAGE',
        value: 500,
        isActive: true,
        startDate: new Date(Date.now() - 86400000),
        endDate: new Date(Date.now() + 86400000),
        usageLimit: null,
        usedCount: 0,
        minPurchasePaise: BigInt(10000000), // Rs 1,00,000 minimum
        maxDiscountPaise: null,
        applicableProducts: null,
      });

      const result = await pricingService.applyDiscount('tenant-1', 'disc-4', 5000000, []);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('Minimum purchase');
    });

    it('returns not found when discount does not exist', async () => {
      mockPrisma.discount.findFirst.mockResolvedValue(null);

      const result = await pricingService.applyDiscount('tenant-1', 'nonexistent', 6500000, []);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('not found');
    });
  });

  // ─── Total Calculation with Round-off ─────────────────────────

  describe('calculateTotal', () => {
    it('computes totals with tax and round-off', () => {
      const lineItemsWithTax = [
        {
          item: { unitPricePaise: 6500000, quantity: 1, discountPaise: 0 },
          cgstPaise: 97500,
          sgstPaise: 97500,
          igstPaise: 0,
          lineTotalPaise: 6695000,
        },
      ];

      const result = pricingService.calculateTotal(lineItemsWithTax as any, 0);

      expect(result.subtotalPaise).toBe(6500000);
      expect(result.taxPaise).toBe(195000);
      expect(result.discountPaise).toBe(0);
      // Before round-off: 6500000 + 195000 = 6695000
      // Round to nearest 100: 6695000 (already a multiple of 100)
      expect(result.roundOffPaise).toBe(0);
      expect(result.totalPaise).toBe(6695000);
    });

    it('applies round-off to nearest rupee (100 paise)', () => {
      const lineItemsWithTax = [
        {
          item: { unitPricePaise: 3333333, quantity: 1, discountPaise: 0 },
          cgstPaise: 49999,
          sgstPaise: 50000,
          igstPaise: 0,
          lineTotalPaise: 3433332,
        },
      ];

      const result = pricingService.calculateTotal(lineItemsWithTax as any, 0);

      // Before round-off: 3333333 + 49999 + 50000 = 3433332
      // Rounded to nearest 100: 3433300
      expect(result.totalPaise % 100).toBe(0); // total is always rounded to nearest rupee
    });

    it('subtracts discount from total', () => {
      const lineItemsWithTax = [
        {
          item: { unitPricePaise: 6500000, quantity: 1, discountPaise: 0 },
          cgstPaise: 97500,
          sgstPaise: 97500,
          igstPaise: 0,
          lineTotalPaise: 6695000,
        },
      ];

      const result = pricingService.calculateTotal(lineItemsWithTax as any, 500000); // Rs 5,000 discount

      expect(result.discountPaise).toBe(500000);
      // 6500000 - 500000 + 195000 = 6195000
      // Round to nearest 100: 6195000
      expect(result.totalPaise).toBe(6195000);
    });
  });
});
