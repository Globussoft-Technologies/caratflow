import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReferralService } from '../referral.service';
import { createMockPrismaService, createMockEventBus, TEST_TENANT_ID, resetAllMocks } from '../../../__tests__/setup';

describe('ReferralService', () => {
  let service: ReferralService;
  let mockPrisma: ReturnType<typeof createMockPrismaService>;
  let mockEventBus: ReturnType<typeof createMockEventBus>;

  const REFERRER_ID = 'cust-referrer';
  const REFEREE_ID = 'cust-referee';

  const makeProgram = (overrides: Record<string, unknown> = {}) => ({
    id: 'prog-1',
    tenantId: TEST_TENANT_ID,
    name: 'Refer & Earn',
    referrerRewardType: 'CASHBACK',
    referrerRewardValue: 500, // 5% cashback
    refereeRewardType: 'DISCOUNT_COUPON',
    refereeRewardValue: 100000, // Rs 1000 coupon
    minOrderForRewardPaise: BigInt(500000), // Rs 5000
    maxReferralsPerCustomer: 10,
    isActive: true,
    validFrom: new Date('2025-01-01'),
    validTo: null,
    ...overrides,
  });

  beforeEach(() => {
    mockPrisma = createMockPrismaService();
    mockEventBus = createMockEventBus();

    (mockPrisma as any).referralProgram = {
      findFirst: vi.fn(),
      findFirstOrThrow: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
      update: vi.fn(),
    };
    (mockPrisma as any).referralCode = {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    };
    (mockPrisma as any).referral = {
      findFirst: vi.fn(),
      findFirstOrThrow: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
      count: vi.fn().mockResolvedValue(0),
    };
    (mockPrisma as any).referralPayout = {
      findFirstOrThrow: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn().mockResolvedValue(0),
    };

    service = new ReferralService(mockPrisma as any, mockEventBus as any);
    resetAllMocks(mockPrisma);
  });

  // ─── generateReferralCode ──────────────────────────────────

  describe('generateReferralCode', () => {
    it('generates a unique referral code', async () => {
      (mockPrisma as any).referralProgram.findFirst.mockResolvedValue(makeProgram());
      (mockPrisma as any).referralCode.findFirst.mockResolvedValue(null);
      (mockPrisma as any).referralCode.findUnique.mockResolvedValue(null);
      (mockPrisma as any).referralCode.create.mockImplementation(({ data }: any) => ({
        id: 'rc-1', code: data.code, customerId: REFERRER_ID,
      }));

      const result = await service.generateReferralCode(TEST_TENANT_ID, REFERRER_ID);
      expect(result.code).toMatch(/^CF-/);
      expect(result.id).toBeDefined();
    });

    it('returns existing code if already has one', async () => {
      (mockPrisma as any).referralProgram.findFirst.mockResolvedValue(makeProgram());
      (mockPrisma as any).referralCode.findFirst.mockResolvedValue({
        id: 'rc-existing', code: 'CF-CUST-ABCD', isActive: true,
      });

      const result = await service.generateReferralCode(TEST_TENANT_ID, REFERRER_ID);
      expect(result.code).toBe('CF-CUST-ABCD');
    });
  });

  // ─── applyReferral ─────────────────────────────────────────

  describe('applyReferral', () => {
    it('creates referral record when applying valid code', async () => {
      const refCode = {
        id: 'rc-1',
        code: 'CF-CUST-ABCD',
        customerId: REFERRER_ID,
        tenantId: TEST_TENANT_ID,
        isActive: true,
        program: makeProgram(),
      };
      (mockPrisma as any).referralCode.findFirst.mockResolvedValue(refCode);
      (mockPrisma as any).referral.findFirst.mockResolvedValue(null); // no existing referral
      (mockPrisma as any).referral.count.mockResolvedValue(2); // under limit
      (mockPrisma as any).referral.create.mockResolvedValue({
        id: 'ref-1', referrerId: REFERRER_ID, refereeId: REFEREE_ID,
        status: 'REGISTERED',
      });

      const result = await service.applyReferral(
        TEST_TENANT_ID, REFEREE_ID, 'CF-CUST-ABCD',
      );

      expect(result.status).toBe('REGISTERED');
      expect((mockPrisma as any).referralCode.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { usageCount: { increment: 1 } },
        }),
      );
    });

    it('rejects self-referral', async () => {
      (mockPrisma as any).referralCode.findFirst.mockResolvedValue({
        id: 'rc-1', code: 'CF-SELF', customerId: REFEREE_ID,
        tenantId: TEST_TENANT_ID, isActive: true,
        program: makeProgram(),
      });

      await expect(
        service.applyReferral(TEST_TENANT_ID, REFEREE_ID, 'CF-SELF'),
      ).rejects.toThrow('Cannot use your own referral code');
    });

    it('rejects invalid referral code', async () => {
      (mockPrisma as any).referralCode.findFirst.mockResolvedValue(null);

      await expect(
        service.applyReferral(TEST_TENANT_ID, REFEREE_ID, 'INVALID'),
      ).rejects.toThrow('Invalid or inactive');
    });

    it('rejects when max referrals reached', async () => {
      (mockPrisma as any).referralCode.findFirst.mockResolvedValue({
        id: 'rc-1', code: 'CF-CUST-ABCD', customerId: REFERRER_ID,
        tenantId: TEST_TENANT_ID, isActive: true,
        program: makeProgram({ maxReferralsPerCustomer: 5 }),
      });
      (mockPrisma as any).referral.findFirst.mockResolvedValue(null);
      (mockPrisma as any).referral.count.mockResolvedValue(5); // at limit

      await expect(
        service.applyReferral(TEST_TENANT_ID, REFEREE_ID, 'CF-CUST-ABCD'),
      ).rejects.toThrow('maximum referral limit');
    });
  });

  // ─── completeReferral ──────────────────────────────────────

  describe('completeReferral', () => {
    it('calculates rewards and marks as REWARDED', async () => {
      (mockPrisma as any).referral.findFirstOrThrow.mockResolvedValue({
        id: 'ref-1',
        tenantId: TEST_TENANT_ID,
        referrerId: REFERRER_ID,
        refereeId: REFEREE_ID,
        referralCodeId: 'rc-1',
        status: 'REGISTERED',
        referralCode: {
          program: makeProgram(),
        },
      });

      mockPrisma.$transaction.mockImplementation(async (fn: any) => fn(mockPrisma));
      (mockPrisma as any).referral.update = vi.fn();
      (mockPrisma as any).referralPayout.create = vi.fn();
      (mockPrisma as any).referralCode.update = vi.fn();

      const result = await service.completeReferral(
        TEST_TENANT_ID,
        'ref-1',
        'order-1',
        BigInt(1000000), // Rs 10,000 order
      );

      expect(result.rewarded).toBe(true);
      // Referrer: CASHBACK 5% of Rs 10,000 = Rs 500 = 50000 paise
      expect(result.referrerRewardPaise).toBe(50000);
      // Referee: DISCOUNT_COUPON value = 100000 paise
      expect(result.refereeRewardPaise).toBe(100000);
    });

    it('does not reward if order below minimum', async () => {
      (mockPrisma as any).referral.findFirstOrThrow.mockResolvedValue({
        id: 'ref-1',
        tenantId: TEST_TENANT_ID,
        referrerId: REFERRER_ID,
        refereeId: REFEREE_ID,
        referralCodeId: 'rc-1',
        status: 'REGISTERED',
        referralCode: {
          program: makeProgram({ minOrderForRewardPaise: BigInt(5000000) }), // Rs 50,000 min
        },
      });
      (mockPrisma as any).referral.update = vi.fn();

      const result = await service.completeReferral(
        TEST_TENANT_ID,
        'ref-1',
        'order-1',
        BigInt(1000000), // Rs 10,000 - below min
      );

      expect(result.rewarded).toBe(false);
      expect(result.reason).toContain('below minimum');
    });
  });

  // ─── calculateRewardPaise (via completeReferral) ───────────

  describe('reward calculation', () => {
    it('calculates CASHBACK: 5% of order amount', async () => {
      (mockPrisma as any).referral.findFirstOrThrow.mockResolvedValue({
        id: 'ref-1', tenantId: TEST_TENANT_ID,
        referrerId: REFERRER_ID, refereeId: REFEREE_ID,
        referralCodeId: 'rc-1', status: 'REGISTERED',
        referralCode: {
          program: makeProgram({
            referrerRewardType: 'CASHBACK',
            referrerRewardValue: 500, // 5%
            refereeRewardType: 'POINTS',
            refereeRewardValue: 200,
          }),
        },
      });

      mockPrisma.$transaction.mockImplementation(async (fn: any) => fn(mockPrisma));
      (mockPrisma as any).referral.update = vi.fn();
      (mockPrisma as any).referralPayout.create = vi.fn();
      (mockPrisma as any).referralCode.update = vi.fn();

      const result = await service.completeReferral(
        TEST_TENANT_ID, 'ref-1', 'order-1', BigInt(2000000),
      );

      // CASHBACK: floor(2000000 * 500 / 10000) = 100000
      expect(result.referrerRewardPaise).toBe(100000);
      // POINTS: value = 200
      expect(result.refereeRewardPaise).toBe(200);
    });
  });
});
