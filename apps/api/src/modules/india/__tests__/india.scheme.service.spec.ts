import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IndiaSchemeService } from '../india.scheme.service';
import { createMockPrismaService, TEST_TENANT_ID, TEST_USER_ID, resetAllMocks } from '../../../__tests__/setup';

describe('IndiaSchemeService (Unit)', () => {
  let service: IndiaSchemeService;
  let mockPrisma: ReturnType<typeof createMockPrismaService>;

  beforeEach(() => {
    mockPrisma = createMockPrismaService();
    (mockPrisma as any).kittyScheme = {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    };
    (mockPrisma as any).kittyMember = {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    };
    (mockPrisma as any).kittyInstallment = {
      findFirst: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    };
    (mockPrisma as any).goldSavingsScheme = {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    };
    (mockPrisma as any).goldSavingsMember = {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    };
    (mockPrisma as any).goldSavingsInstallment = {
      findFirst: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn(),
    };
    mockPrisma.$transaction.mockImplementation((fn: any) => fn(mockPrisma));
    service = new IndiaSchemeService(mockPrisma as any);
    resetAllMocks(mockPrisma);
    mockPrisma.$transaction.mockImplementation((fn: any) => fn(mockPrisma));
  });

  // ═══════════════════════════════════════════════════════════════
  //  KITTY SCHEMES
  // ═══════════════════════════════════════════════════════════════

  describe('createKittyScheme', () => {
    it('creates a kitty scheme with calculated total value', async () => {
      (mockPrisma as any).kittyScheme.create.mockResolvedValue({
        id: 'scheme-1',
        schemeName: 'Gold Kitty 2025',
        monthlyAmountPaise: 500000n,
        durationMonths: 12,
        totalValuePaise: 6000000n,
        status: 'OPEN',
        currentMembers: 0,
        maxMembers: 20,
      });

      const result = await service.createKittyScheme(TEST_TENANT_ID, TEST_USER_ID, {
        schemeName: 'Gold Kitty 2025',
        schemeType: 'KITTY',
        monthlyAmountPaise: 500000,
        durationMonths: 12,
        maxMembers: 20,
        startDate: new Date('2025-04-01'),
      } as any);

      expect(result.status).toBe('OPEN');
      expect(result.totalValuePaise).toBe(6000000n);
    });
  });

  describe('enrollKittyMember', () => {
    const mockScheme = {
      id: 'scheme-1',
      schemeName: 'Gold Kitty',
      status: 'OPEN',
      currentMembers: 5,
      maxMembers: 20,
      durationMonths: 12,
      monthlyAmountPaise: 500000n,
      startDate: new Date('2025-04-01'),
    };

    it('enrolls a member and generates installment schedule', async () => {
      (mockPrisma as any).kittyScheme.findFirst.mockResolvedValue(mockScheme);
      (mockPrisma as any).kittyMember.findFirst.mockResolvedValue(null);
      (mockPrisma as any).kittyMember.create.mockResolvedValue({
        id: 'member-1',
        memberNumber: 'GOL-0006',
        status: 'ACTIVE',
        customer: {},
      });
      (mockPrisma as any).kittyInstallment.createMany.mockResolvedValue({ count: 12 });
      (mockPrisma as any).kittyScheme.update.mockResolvedValue({});

      const result = await service.enrollKittyMember(TEST_TENANT_ID, TEST_USER_ID, {
        kittySchemeId: 'scheme-1',
        customerId: 'cust-1',
        joinedDate: new Date(),
      } as any);

      expect(result.status).toBe('ACTIVE');
      expect((mockPrisma as any).kittyInstallment.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({ installmentNumber: 1 }),
          ]),
        }),
      );
    });

    it('rejects enrollment when scheme is full', async () => {
      (mockPrisma as any).kittyScheme.findFirst.mockResolvedValue({
        ...mockScheme,
        currentMembers: 20,
        maxMembers: 20,
      });

      await expect(
        service.enrollKittyMember(TEST_TENANT_ID, TEST_USER_ID, {
          kittySchemeId: 'scheme-1',
          customerId: 'cust-1',
          joinedDate: new Date(),
        } as any),
      ).rejects.toThrow('maximum members');
    });

    it('rejects duplicate enrollment', async () => {
      (mockPrisma as any).kittyScheme.findFirst.mockResolvedValue(mockScheme);
      (mockPrisma as any).kittyMember.findFirst.mockResolvedValue({ id: 'existing' });

      await expect(
        service.enrollKittyMember(TEST_TENANT_ID, TEST_USER_ID, {
          kittySchemeId: 'scheme-1',
          customerId: 'cust-1',
          joinedDate: new Date(),
        } as any),
      ).rejects.toThrow('already enrolled');
    });

    it('throws NotFoundException for non-existent scheme', async () => {
      (mockPrisma as any).kittyScheme.findFirst.mockResolvedValue(null);

      await expect(
        service.enrollKittyMember(TEST_TENANT_ID, TEST_USER_ID, {
          kittySchemeId: 'nonexistent',
          customerId: 'cust-1',
          joinedDate: new Date(),
        } as any),
      ).rejects.toThrow('not found');
    });
  });

  describe('recordKittyInstallment', () => {
    it('records an installment payment', async () => {
      (mockPrisma as any).kittyInstallment.findFirst.mockResolvedValue({
        id: 'inst-1',
        installmentNumber: 1,
        status: 'PENDING',
      });
      (mockPrisma as any).kittyInstallment.update.mockResolvedValue({
        id: 'inst-1',
        status: 'PAID',
        amountPaise: 500000n,
      });
      (mockPrisma as any).kittyMember.update.mockResolvedValue({});

      const result = await service.recordKittyInstallment(TEST_TENANT_ID, TEST_USER_ID, {
        kittyMemberId: 'member-1',
        installmentNumber: 1,
        paidDate: new Date(),
        amountPaise: 500000,
        method: 'CASH',
      } as any);

      expect(result.status).toBe('PAID');
    });

    it('throws NotFoundException for missing installment', async () => {
      (mockPrisma as any).kittyInstallment.findFirst.mockResolvedValue(null);

      await expect(
        service.recordKittyInstallment(TEST_TENANT_ID, TEST_USER_ID, {
          kittyMemberId: 'member-1',
          installmentNumber: 99,
          paidDate: new Date(),
          amountPaise: 500000,
          method: 'CASH',
        } as any),
      ).rejects.toThrow('not found');
    });

    it('records late fee', async () => {
      (mockPrisma as any).kittyInstallment.findFirst.mockResolvedValue({
        id: 'inst-1',
        status: 'OVERDUE',
      });
      (mockPrisma as any).kittyInstallment.update.mockResolvedValue({
        id: 'inst-1',
        status: 'PAID',
        lateFeePaise: 5000n,
      });
      (mockPrisma as any).kittyMember.update.mockResolvedValue({});

      await service.recordKittyInstallment(TEST_TENANT_ID, TEST_USER_ID, {
        kittyMemberId: 'member-1',
        installmentNumber: 1,
        paidDate: new Date(),
        amountPaise: 500000,
        lateFeePaise: 5000,
        method: 'CASH',
      } as any);

      expect((mockPrisma as any).kittyInstallment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ lateFeePaise: 5000n }),
        }),
      );
    });
  });

  describe('matureKittyScheme', () => {
    it('matures an active scheme', async () => {
      (mockPrisma as any).kittyScheme.findFirst.mockResolvedValue({ id: 'scheme-1', status: 'ACTIVE' });
      (mockPrisma as any).kittyMember.updateMany.mockResolvedValue({ count: 10 });
      (mockPrisma as any).kittyScheme.update.mockResolvedValue({ id: 'scheme-1', status: 'MATURED' });

      const result = await service.matureKittyScheme(TEST_TENANT_ID, TEST_USER_ID, 'scheme-1');
      expect(result.status).toBe('MATURED');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //  GOLD SAVINGS SCHEMES
  // ═══════════════════════════════════════════════════════════════

  describe('createGoldSavingsScheme', () => {
    it('creates a gold savings scheme', async () => {
      (mockPrisma as any).goldSavingsScheme.create.mockResolvedValue({
        id: 'gs-1',
        schemeName: 'Gold Savings Plus',
        monthlyAmountPaise: 500000n,
        durationMonths: 12,
        bonusMonths: 1,
        maturityBonusPercent: 200,
        status: 'OPEN',
      });

      const result = await service.createGoldSavingsScheme(TEST_TENANT_ID, TEST_USER_ID, {
        schemeName: 'Gold Savings Plus',
        monthlyAmountPaise: 500000,
        durationMonths: 12,
        bonusMonths: 1,
        maturityBonusPercent: 200,
        startDate: new Date(),
      } as any);

      expect(result.status).toBe('OPEN');
      expect(result.bonusMonths).toBe(1);
    });
  });

  describe('enrollGoldSavingsMember', () => {
    const mockGsScheme = {
      id: 'gs-1',
      schemeName: 'Gold Savings',
      status: 'OPEN',
      monthlyAmountPaise: 500000n,
      durationMonths: 12,
      bonusMonths: 1,
      maturityBonusPercent: 200, // 2%
    };

    it('enrolls member with maturity value calculation', async () => {
      (mockPrisma as any).goldSavingsScheme.findFirst.mockResolvedValue(mockGsScheme);
      (mockPrisma as any).goldSavingsMember.findFirst.mockResolvedValue(null);
      (mockPrisma as any).goldSavingsMember.count.mockResolvedValue(0);
      (mockPrisma as any).goldSavingsMember.create.mockResolvedValue({
        id: 'gsmem-1',
        memberNumber: 'GS-0001',
        status: 'ACTIVE',
        maturityValuePaise: 6110000n, // 11*500000 + 1*500000 + (5500000*200/10000)
        customer: {},
      });
      (mockPrisma as any).goldSavingsInstallment.createMany.mockResolvedValue({ count: 11 });

      const result = await service.enrollGoldSavingsMember(TEST_TENANT_ID, TEST_USER_ID, {
        goldSavingsSchemeId: 'gs-1',
        customerId: 'cust-1',
        joinedDate: new Date('2025-04-01'),
      } as any);

      expect(result.status).toBe('ACTIVE');
      // Only 11 installments generated (12 - 1 bonus month)
      expect((mockPrisma as any).goldSavingsInstallment.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.any(Array),
        }),
      );
    });

    it('rejects duplicate enrollment', async () => {
      (mockPrisma as any).goldSavingsScheme.findFirst.mockResolvedValue(mockGsScheme);
      (mockPrisma as any).goldSavingsMember.findFirst.mockResolvedValue({ id: 'existing' });

      await expect(
        service.enrollGoldSavingsMember(TEST_TENANT_ID, TEST_USER_ID, {
          goldSavingsSchemeId: 'gs-1',
          customerId: 'cust-1',
          joinedDate: new Date(),
        } as any),
      ).rejects.toThrow('already enrolled');
    });
  });

  describe('recordGoldSavingsInstallment', () => {
    it('records an installment and updates member totals', async () => {
      (mockPrisma as any).goldSavingsInstallment.findFirst.mockResolvedValue({
        id: 'gsi-1',
        installmentNumber: 1,
        status: 'PENDING',
      });
      (mockPrisma as any).goldSavingsInstallment.update.mockResolvedValue({
        id: 'gsi-1',
        status: 'PAID',
      });
      (mockPrisma as any).goldSavingsMember.update.mockResolvedValue({});

      const result = await service.recordGoldSavingsInstallment(TEST_TENANT_ID, TEST_USER_ID, {
        goldSavingsMemberId: 'gsmem-1',
        installmentNumber: 1,
        paidDate: new Date(),
        amountPaise: 500000,
        method: 'UPI',
      } as any);

      expect(result.status).toBe('PAID');
    });
  });

  // ─── calculateMaturityValue ─────────────────────────────────────

  describe('calculateMaturityValue', () => {
    it('calculates pay 11 get 12 with 2% bonus', () => {
      const result = service.calculateMaturityValue(500000, 12, 1, 200);

      // totalPaidPaise = 500000 * 11 = 5500000
      // bonusValuePaise = 500000 * 1 = 500000
      // maturityBonusPaise = 5500000 * 200 / 10000 = 110000
      // maturityValuePaise = 5500000 + 500000 + 110000 = 6110000
      expect(result.totalPaidPaise).toBe(5500000);
      expect(result.bonusValuePaise).toBe(500000);
      expect(result.maturityBonusPaise).toBe(110000);
      expect(result.maturityValuePaise).toBe(6110000);
    });

    it('calculates pay 10 get 12 with 0% bonus', () => {
      const result = service.calculateMaturityValue(100000, 12, 2, 0);

      expect(result.totalPaidPaise).toBe(1000000);
      expect(result.bonusValuePaise).toBe(200000);
      expect(result.maturityBonusPaise).toBe(0);
      expect(result.maturityValuePaise).toBe(1200000);
    });

    it('calculates with no bonus months', () => {
      const result = service.calculateMaturityValue(500000, 12, 0, 500);

      expect(result.totalPaidPaise).toBe(6000000);
      expect(result.bonusValuePaise).toBe(0);
      expect(result.maturityBonusPaise).toBe(300000); // 6000000 * 500 / 10000
      expect(result.maturityValuePaise).toBe(6300000);
    });
  });

  // ─── redeemGoldSavings ──────────────────────────────────────────

  describe('redeemGoldSavings', () => {
    it('redeems a matured membership', async () => {
      (mockPrisma as any).goldSavingsMember.findFirst.mockResolvedValue({
        id: 'gsmem-1',
        status: 'MATURED',
      });
      (mockPrisma as any).goldSavingsMember.update.mockResolvedValue({
        id: 'gsmem-1',
        status: 'REDEEMED',
        redemptionDate: new Date(),
        customer: {},
        goldSavingsScheme: {},
      });

      const result = await service.redeemGoldSavings(TEST_TENANT_ID, TEST_USER_ID, 'gsmem-1');
      expect(result.status).toBe('REDEEMED');
    });

    it('throws NotFoundException for non-matured member', async () => {
      (mockPrisma as any).goldSavingsMember.findFirst.mockResolvedValue(null);

      await expect(
        service.redeemGoldSavings(TEST_TENANT_ID, TEST_USER_ID, 'nonexistent'),
      ).rejects.toThrow('not found');
    });
  });

  // ─── markOverdueInstallments ────────────────────────────────────

  describe('markOverdueInstallments', () => {
    it('marks overdue installments for both kitty and gold savings', async () => {
      (mockPrisma as any).kittyInstallment.updateMany.mockResolvedValue({ count: 3 });
      (mockPrisma as any).goldSavingsInstallment.updateMany.mockResolvedValue({ count: 2 });

      const count = await service.markOverdueInstallments(TEST_TENANT_ID);
      expect(count).toBe(5);
    });
  });

  // ─── processMaturityDates ───────────────────────────────────────

  describe('processMaturityDates', () => {
    it('matures members with all installments paid', async () => {
      (mockPrisma as any).goldSavingsMember.findMany.mockResolvedValue([
        { id: 'gsmem-1', status: 'ACTIVE' },
        { id: 'gsmem-2', status: 'ACTIVE' },
      ]);
      (mockPrisma as any).goldSavingsInstallment.count
        .mockResolvedValueOnce(0) // gsmem-1: no pending
        .mockResolvedValueOnce(2); // gsmem-2: has pending
      (mockPrisma as any).goldSavingsMember.update.mockResolvedValue({});

      const count = await service.processMaturityDates(TEST_TENANT_ID);
      expect(count).toBe(1); // only gsmem-1 matured
    });

    it('does not mature members with pending installments', async () => {
      (mockPrisma as any).goldSavingsMember.findMany.mockResolvedValue([
        { id: 'gsmem-1' },
      ]);
      (mockPrisma as any).goldSavingsInstallment.count.mockResolvedValue(3); // still pending

      const count = await service.processMaturityDates(TEST_TENANT_ID);
      expect(count).toBe(0);
    });
  });

  // ─── early exit handling ────────────────────────────────────────

  describe('getKittyScheme', () => {
    it('throws NotFoundException for missing scheme', async () => {
      (mockPrisma as any).kittyScheme.findFirst.mockResolvedValue(null);

      await expect(
        service.getKittyScheme(TEST_TENANT_ID, 'nonexistent'),
      ).rejects.toThrow('not found');
    });
  });

  describe('getGoldSavingsScheme', () => {
    it('throws NotFoundException for missing scheme', async () => {
      (mockPrisma as any).goldSavingsScheme.findFirst.mockResolvedValue(null);

      await expect(
        service.getGoldSavingsScheme(TEST_TENANT_ID, 'nonexistent'),
      ).rejects.toThrow('not found');
    });
  });
});
