import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CrmLoyaltyService } from '../crm.loyalty.service';
import { createMockPrismaService, createMockEventBus, TEST_TENANT_ID, TEST_USER_ID, resetAllMocks } from '../../../__tests__/setup';

describe('CrmLoyaltyService (Unit)', () => {
  let service: CrmLoyaltyService;
  let mockPrisma: ReturnType<typeof createMockPrismaService>;
  let mockEventBus: ReturnType<typeof createMockEventBus>;

  beforeEach(() => {
    mockPrisma = createMockPrismaService();
    mockEventBus = createMockEventBus();
    service = new CrmLoyaltyService(mockPrisma as any, mockEventBus as any);
    resetAllMocks(mockPrisma);
    mockPrisma.$transaction.mockImplementation((fn: any) => fn(mockPrisma));
  });

  // ─── Earn Points ──────────────────────────────────────────────

  describe('earnPoints', () => {
    it('converts sale amount to points and updates balance', async () => {
      mockPrisma.customer.findFirstOrThrow.mockResolvedValue({
        id: 'cust-1',
        tenantId: TEST_TENANT_ID,
        loyaltyPoints: 100,
        loyaltyTier: 'SILVER',
      });

      mockPrisma.loyaltyTransaction.create.mockResolvedValue({
        id: 'lt-1',
        points: 50,
        balanceAfter: 150,
      });
      mockPrisma.customer.update.mockResolvedValue({});

      // For recalculateTier
      mockPrisma.loyaltyProgram.findFirst.mockResolvedValue(null);

      const result = await service.earnPoints(
        TEST_TENANT_ID,
        TEST_USER_ID,
        'cust-1',
        50,
        'SALE',
        'sale-1',
        'Purchase reward',
      );

      expect(result.newBalance).toBe(150);
      expect(mockPrisma.customer.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            loyaltyPoints: 150,
          }),
        }),
      );
    });

    it('rejects earning zero or negative points', async () => {
      await expect(
        service.earnPoints(TEST_TENANT_ID, TEST_USER_ID, 'cust-1', 0, 'SALE', 'sale-1'),
      ).rejects.toThrow('Points to earn must be positive');

      await expect(
        service.earnPoints(TEST_TENANT_ID, TEST_USER_ID, 'cust-1', -10, 'SALE', 'sale-1'),
      ).rejects.toThrow('Points to earn must be positive');
    });

    it('publishes loyalty points earned event', async () => {
      mockPrisma.customer.findFirstOrThrow.mockResolvedValue({
        id: 'cust-1',
        loyaltyPoints: 0,
      });
      mockPrisma.loyaltyTransaction.create.mockResolvedValue({ id: 'lt-1' });
      mockPrisma.customer.update.mockResolvedValue({});
      mockPrisma.loyaltyProgram.findFirst.mockResolvedValue(null);

      await service.earnPoints(TEST_TENANT_ID, TEST_USER_ID, 'cust-1', 100, 'SALE', 'sale-1');

      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'crm.loyalty.points_earned',
          payload: expect.objectContaining({
            customerId: 'cust-1',
            points: 100,
          }),
        }),
      );
    });
  });

  // ─── Redeem Points ─────────────────────────────────────────────

  describe('redeemPoints', () => {
    it('deducts points from balance', async () => {
      mockPrisma.customer.findFirstOrThrow.mockResolvedValue({
        id: 'cust-1',
        loyaltyPoints: 500,
      });
      mockPrisma.loyaltyProgram.findFirst.mockResolvedValue({
        id: 'prog-1',
        isActive: true,
        redemptionRate: 100, // 100 points = 1 currency unit = 100 paise
        tiers: [],
      });
      mockPrisma.loyaltyTransaction.create.mockResolvedValue({ id: 'lt-1' });
      mockPrisma.customer.update.mockResolvedValue({});

      const result = await service.redeemPoints(
        TEST_TENANT_ID,
        TEST_USER_ID,
        'cust-1',
        200,
        'REDEMPTION',
        'sale-1',
      );

      expect(result.newBalance).toBe(300);
      expect(result.redemptionValuePaise).toBe(200); // (200/100) * 100
    });

    it('rejects redemption of more points than available', async () => {
      mockPrisma.customer.findFirstOrThrow.mockResolvedValue({
        id: 'cust-1',
        loyaltyPoints: 100,
      });

      await expect(
        service.redeemPoints(TEST_TENANT_ID, TEST_USER_ID, 'cust-1', 200, 'REDEMPTION', 'sale-1'),
      ).rejects.toThrow('Insufficient points');
    });

    it('rejects zero or negative redemption', async () => {
      await expect(
        service.redeemPoints(TEST_TENANT_ID, TEST_USER_ID, 'cust-1', 0, 'REDEMPTION', 'sale-1'),
      ).rejects.toThrow('Points to redeem must be positive');
    });

    it('throws when no active loyalty program', async () => {
      mockPrisma.customer.findFirstOrThrow.mockResolvedValue({
        id: 'cust-1',
        loyaltyPoints: 500,
      });
      mockPrisma.loyaltyProgram.findFirst.mockResolvedValue(null);

      await expect(
        service.redeemPoints(TEST_TENANT_ID, TEST_USER_ID, 'cust-1', 100, 'REDEMPTION', 'sale-1'),
      ).rejects.toThrow('No active loyalty program configured');
    });
  });

  // ─── Point Expiry ──────────────────────────────────────────────

  describe('expirePoints', () => {
    it('expires points past their expiresAt date', async () => {
      const pastDate = new Date('2026-01-01');

      mockPrisma.loyaltyTransaction.findMany.mockResolvedValue([
        {
          id: 'lt-1',
          customerId: 'cust-1',
          transactionType: 'EARNED',
          points: 100,
          expiresAt: pastDate,
        },
      ]);

      mockPrisma.customer.findFirst.mockResolvedValue({
        id: 'cust-1',
        loyaltyPoints: 150,
      });

      mockPrisma.loyaltyTransaction.update.mockResolvedValue({});
      mockPrisma.loyaltyTransaction.create.mockResolvedValue({});
      mockPrisma.customer.update.mockResolvedValue({});

      const expiredCount = await service.expirePoints(TEST_TENANT_ID);

      expect(expiredCount).toBe(100);
    });

    it('does not expire more than available balance', async () => {
      mockPrisma.loyaltyTransaction.findMany.mockResolvedValue([
        {
          id: 'lt-1',
          customerId: 'cust-1',
          transactionType: 'EARNED',
          points: 200,
          expiresAt: new Date('2026-01-01'),
        },
      ]);

      mockPrisma.customer.findFirst.mockResolvedValue({
        id: 'cust-1',
        loyaltyPoints: 50, // Only 50 available
      });

      mockPrisma.loyaltyTransaction.update.mockResolvedValue({});
      mockPrisma.loyaltyTransaction.create.mockResolvedValue({});
      mockPrisma.customer.update.mockResolvedValue({});

      const expiredCount = await service.expirePoints(TEST_TENANT_ID);

      expect(expiredCount).toBe(50);
    });

    it('handles no expiring transactions', async () => {
      mockPrisma.loyaltyTransaction.findMany.mockResolvedValue([]);

      const expiredCount = await service.expirePoints(TEST_TENANT_ID);
      expect(expiredCount).toBe(0);
    });
  });

  // ─── Tier Calculation ──────────────────────────────────────────

  describe('tier calculation', () => {
    const setupTierProgram = () => {
      mockPrisma.loyaltyProgram.findFirst.mockResolvedValue({
        id: 'prog-1',
        isActive: true,
        redemptionRate: 100,
        tiers: [
          { name: 'BRONZE', minPoints: 0, multiplier: 1 },
          { name: 'SILVER', minPoints: 500, multiplier: 1.5 },
          { name: 'GOLD', minPoints: 2000, multiplier: 2 },
          { name: 'PLATINUM', minPoints: 5000, multiplier: 3 },
        ],
      });
    };

    it('upgrades tier when points increase past threshold', async () => {
      setupTierProgram();
      mockPrisma.customer.findFirstOrThrow.mockResolvedValue({
        id: 'cust-1',
        loyaltyPoints: 400, // Currently BRONZE
      });
      mockPrisma.loyaltyTransaction.create.mockResolvedValue({ id: 'lt-1' });
      mockPrisma.customer.update.mockResolvedValue({});

      await service.earnPoints(
        TEST_TENANT_ID,
        TEST_USER_ID,
        'cust-1',
        200, // Now 600 -> SILVER
        'SALE',
        'sale-1',
      );

      // The recalculateTier should update to SILVER
      const updateCalls = mockPrisma.customer.update.mock.calls;
      const tierUpdateCall = updateCalls.find(
        (call: any) => call[0].data.loyaltyTier !== undefined,
      );
      expect(tierUpdateCall).toBeDefined();
      expect(tierUpdateCall![0].data.loyaltyTier).toBe('SILVER');
    });

    it('downgrades tier when points drop below threshold via redemption', async () => {
      setupTierProgram();
      mockPrisma.customer.findFirstOrThrow.mockResolvedValue({
        id: 'cust-1',
        loyaltyPoints: 600, // SILVER
      });
      mockPrisma.loyaltyTransaction.create.mockResolvedValue({ id: 'lt-1' });
      mockPrisma.customer.update.mockResolvedValue({});

      await service.redeemPoints(
        TEST_TENANT_ID,
        TEST_USER_ID,
        'cust-1',
        200, // Now 400 -> BRONZE
        'REDEMPTION',
        'sale-1',
      );

      const updateCalls = mockPrisma.customer.update.mock.calls;
      const tierUpdateCall = updateCalls.find(
        (call: any) => call[0].data.loyaltyTier !== undefined,
      );
      expect(tierUpdateCall).toBeDefined();
      expect(tierUpdateCall![0].data.loyaltyTier).toBe('BRONZE');
    });
  });

  // ─── Points Calculation ────────────────────────────────────────

  describe('calculatePointsForSale', () => {
    it('calculates points based on sale amount', async () => {
      mockPrisma.loyaltyProgram.findFirst.mockResolvedValue({
        id: 'prog-1',
        isActive: true,
        pointsPerCurrencyUnit: 1,
      });

      // 500000 paise = Rs 5000 => floor(500000 / 10000) * 1 = 50 points
      const points = await service.calculatePointsForSale(TEST_TENANT_ID, 500000);
      expect(points).toBe(50);
    });

    it('returns zero when no active program', async () => {
      mockPrisma.loyaltyProgram.findFirst.mockResolvedValue(null);

      const points = await service.calculatePointsForSale(TEST_TENANT_ID, 1000000);
      expect(points).toBe(0);
    });

    it('returns zero for small amounts below threshold', async () => {
      mockPrisma.loyaltyProgram.findFirst.mockResolvedValue({
        id: 'prog-1',
        isActive: true,
        pointsPerCurrencyUnit: 1,
      });

      // 5000 paise = Rs 50 => floor(5000 / 10000) = 0
      const points = await service.calculatePointsForSale(TEST_TENANT_ID, 5000);
      expect(points).toBe(0);
    });
  });
});
