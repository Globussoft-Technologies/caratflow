import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DigitalGoldRedemptionService } from '../digital-gold.redemption.service';
import { createMockPrismaService, TEST_TENANT_ID, resetAllMocks } from '../../../__tests__/setup';

describe('DigitalGoldRedemptionService', () => {
  let service: DigitalGoldRedemptionService;
  let mockPrisma: ReturnType<typeof createMockPrismaService>;
  let mockRatesService: any;

  const CUSTOMER_ID = 'cust-1';
  const VAULT_ID = 'vault-1';

  const makeVault = (overrides: Record<string, unknown> = {}) => ({
    id: VAULT_ID,
    tenantId: TEST_TENANT_ID,
    customerId: CUSTOMER_ID,
    balanceMg: BigInt(10000), // 10g default
    totalInvestedPaise: BigInt(6000000),
    totalSoldPaise: BigInt(0),
    isActive: true,
    ...overrides,
  });

  beforeEach(() => {
    mockPrisma = createMockPrismaService();
    mockRatesService = {
      getCurrentRate: vi.fn().mockResolvedValue({ ratePer10gPaise: 6000000 }),
    };

    (mockPrisma as any).goldVault = {
      findUnique: vi.fn().mockResolvedValue(makeVault()),
      update: vi.fn(),
    };
    (mockPrisma as any).goldTransaction = { create: vi.fn() };
    (mockPrisma as any).goldRedemption = {
      findFirst: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
      update: vi.fn(),
    };

    service = new DigitalGoldRedemptionService(mockPrisma as any, mockRatesService);
    resetAllMocks(mockPrisma);
  });

  // ─── redeemForPhysical ─────────────────────────────────────

  describe('redeemForPhysical', () => {
    it('deducts gold from vault and creates redemption', async () => {
      (mockPrisma as any).goldVault.findUnique.mockResolvedValue(makeVault());

      mockPrisma.$transaction.mockImplementation(async (fn: any) => {
        const tx = {
          goldVault: { update: vi.fn() },
          goldRedemption: { create: vi.fn().mockResolvedValue({ id: 'red-1' }) },
          goldTransaction: { create: vi.fn() },
        };
        return fn(tx);
      });

      const result = await service.redeemForPhysical(
        TEST_TENANT_ID, CUSTOMER_ID, 5000, 'addr-1',
      );

      expect(result.redemptionType).toBe('PHYSICAL_GOLD');
      expect(result.goldWeightMg).toBe(5000);
      expect(result.newBalanceMg).toBe(5000); // 10000 - 5000
      expect(result.status).toBe('REQUESTED');
    });

    it('rejects when weight exceeds balance', async () => {
      (mockPrisma as any).goldVault.findUnique.mockResolvedValue(
        makeVault({ balanceMg: BigInt(1000) }),
      );

      await expect(
        service.redeemForPhysical(TEST_TENANT_ID, CUSTOMER_ID, 5000, 'addr-1'),
      ).rejects.toThrow('Insufficient gold balance');
    });

    it('rejects below minimum physical redemption (500 mg)', async () => {
      (mockPrisma as any).goldVault.findUnique.mockResolvedValue(makeVault());

      await expect(
        service.redeemForPhysical(TEST_TENANT_ID, CUSTOMER_ID, 100, 'addr-1'),
      ).rejects.toThrow('Minimum physical redemption');
    });

    it('calculates value at current market rate', async () => {
      (mockPrisma as any).goldVault.findUnique.mockResolvedValue(makeVault());

      mockPrisma.$transaction.mockImplementation(async (fn: any) => {
        const tx = {
          goldVault: { update: vi.fn() },
          goldRedemption: { create: vi.fn().mockResolvedValue({ id: 'red-1' }) },
          goldTransaction: { create: vi.fn() },
        };
        return fn(tx);
      });

      const result = await service.redeemForPhysical(
        TEST_TENANT_ID, CUSTOMER_ID, 5000, 'addr-1',
      );

      // rate = 6000000 / 10 = 600000 per gram
      // value = round(5000 * 600000 / 1000) = 3000000 paise
      expect(result.valuePaise).toBe(3000000);
    });
  });

  // ─── redeemForJewelry ──────────────────────────────────────

  describe('redeemForJewelry', () => {
    it('deducts the gold weight of the product from vault', async () => {
      (mockPrisma as any).goldVault.findUnique.mockResolvedValue(makeVault());
      (mockPrisma as any).product = {
        findFirst: vi.fn().mockResolvedValue({
          id: 'p-1', name: 'Gold Necklace', isActive: true,
          metalWeightMg: BigInt(8000), // 8g product
        }),
      };

      mockPrisma.$transaction.mockImplementation(async (fn: any) => {
        const tx = {
          goldVault: { update: vi.fn() },
          goldRedemption: { create: vi.fn().mockResolvedValue({ id: 'red-jwl-1' }) },
          goldTransaction: { create: vi.fn() },
        };
        return fn(tx);
      });

      const result = await service.redeemForJewelry(
        TEST_TENANT_ID, CUSTOMER_ID, 'p-1', 'addr-1',
      );

      expect(result.redemptionType).toBe('JEWELRY');
      expect(result.goldWeightMg).toBe(8000);
      expect(result.newBalanceMg).toBe(2000); // 10000 - 8000
    });

    it('rejects when balance insufficient for jewelry', async () => {
      (mockPrisma as any).goldVault.findUnique.mockResolvedValue(
        makeVault({ balanceMg: BigInt(3000) }),
      );
      (mockPrisma as any).product = {
        findFirst: vi.fn().mockResolvedValue({
          id: 'p-1', name: 'Heavy Necklace', isActive: true,
          metalWeightMg: BigInt(8000),
        }),
      };

      await expect(
        service.redeemForJewelry(TEST_TENANT_ID, CUSTOMER_ID, 'p-1', 'addr-1'),
      ).rejects.toThrow('Insufficient gold balance');
    });

    it('rejects when product not found', async () => {
      (mockPrisma as any).goldVault.findUnique.mockResolvedValue(makeVault());
      (mockPrisma as any).product = {
        findFirst: vi.fn().mockResolvedValue(null),
      };

      await expect(
        service.redeemForJewelry(TEST_TENANT_ID, CUSTOMER_ID, 'p-nonexist', 'addr-1'),
      ).rejects.toThrow('Product not found');
    });
  });

  // ─── sellBack ──────────────────────────────────────────────

  describe('sellBack', () => {
    it('credits amount at current rate with sell spread', async () => {
      (mockPrisma as any).goldVault.findUnique.mockResolvedValue(makeVault());

      mockPrisma.$transaction.mockImplementation(async (fn: any) => {
        const tx = {
          goldVault: { update: vi.fn() },
          goldRedemption: { create: vi.fn().mockResolvedValue({ id: 'red-sell-1' }) },
          goldTransaction: { create: vi.fn() },
        };
        return fn(tx);
      });

      const result = await service.sellBack(
        TEST_TENANT_ID, CUSTOMER_ID, 5000, 'bank-ref-1',
      );

      // sellPrice = 6000000 - 5000 = 5995000 per 10g
      // sellPricePerGram = round(5995000 / 10) = 599500
      // amount = floor(5000 * 599500 / 1000) = 2997500
      expect(result.redemptionType).toBe('SELL_BACK');
      expect(result.valuePaise).toBe(2997500);
      expect(result.newBalanceMg).toBe(5000);
      expect(result.status).toBe('PROCESSING');
    });

    it('rejects when sell exceeds balance', async () => {
      (mockPrisma as any).goldVault.findUnique.mockResolvedValue(
        makeVault({ balanceMg: BigInt(2000) }),
      );

      await expect(
        service.sellBack(TEST_TENANT_ID, CUSTOMER_ID, 5000, 'bank-ref-1'),
      ).rejects.toThrow('Insufficient gold balance');
    });
  });
});
