import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DigitalGoldSipService } from '../digital-gold.sip.service';
import { createMockPrismaService, TEST_TENANT_ID, resetAllMocks } from '../../../__tests__/setup';

describe('DigitalGoldSipService', () => {
  let service: DigitalGoldSipService;
  let mockPrisma: ReturnType<typeof createMockPrismaService>;
  let mockRatesService: any;
  let mockDigitalGoldService: any;
  let mockPaymentGateway: any;
  let mockEventBus: any;

  const CUSTOMER_ID = 'cust-1';
  const VAULT_ID = 'vault-1';
  const SIP_ID = 'sip-1';

  const makeSip = (overrides: Record<string, unknown> = {}) => ({
    id: SIP_ID,
    tenantId: TEST_TENANT_ID,
    vaultId: VAULT_ID,
    customerId: CUSTOMER_ID,
    sipType: 'FIXED_AMOUNT',
    amountPaise: BigInt(100000), // Rs 1,000
    weightMg: null,
    frequency: 'MONTHLY',
    dayOfMonth: 1,
    dayOfWeek: null,
    status: 'ACTIVE',
    startDate: new Date('2025-01-01'),
    endDate: null,
    nextDeductionDate: new Date(),
    totalDeductions: 0,
    failedDeductions: 0,
    paymentMethod: 'AUTO_DEBIT',
    autoDebitReference: 'ref-123',
    createdAt: new Date(),
    ...overrides,
  });

  beforeEach(() => {
    mockPrisma = createMockPrismaService();
    mockRatesService = {
      getCurrentRate: vi.fn().mockResolvedValue({ ratePer10gPaise: 6000000 }),
    };
    mockDigitalGoldService = {
      getOrCreateVault: vi.fn().mockResolvedValue({
        id: VAULT_ID, tenantId: TEST_TENANT_ID, customerId: CUSTOMER_ID,
        balanceMg: BigInt(0), totalInvestedPaise: BigInt(0),
      }),
    };

    (mockPrisma as any).goldSip = {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
      update: vi.fn(),
    };
    (mockPrisma as any).goldVault = {
      findUnique: vi.fn().mockResolvedValue({
        id: VAULT_ID, balanceMg: BigInt(0), totalInvestedPaise: BigInt(0),
        avgBuyPricePer10gPaise: BigInt(0),
      }),
      update: vi.fn(),
    };
    (mockPrisma as any).goldTransaction = { create: vi.fn().mockResolvedValue({ id: 'tx-1' }) };
    (mockPrisma as any).sipExecution = {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({ id: 'exec-1' }),
    };

    mockPaymentGateway = {
      chargeSavedMethod: vi.fn().mockResolvedValue({
        chargeId: 'pg_mock_test_1',
        provider: 'mock',
        savedMethodId: 'ref-123',
        amountPaise: 100000,
        currency: 'INR',
        status: 'SUCCEEDED',
        reference: 'DG-SIP-test',
        processedAt: Date.now(),
      }),
    };
    mockEventBus = {
      publish: vi.fn().mockResolvedValue(undefined),
      subscribe: vi.fn(),
    };

    service = new DigitalGoldSipService(
      mockPrisma as any,
      mockRatesService,
      mockDigitalGoldService,
      mockPaymentGateway,
      mockEventBus,
    );
    resetAllMocks(mockPrisma);
  });

  // ─── createSip ─────────────────────────────────────────────

  describe('createSip', () => {
    it('creates a fixed-amount monthly SIP', async () => {
      (mockPrisma as any).goldSip.create.mockImplementation(({ data }: any) => ({
        ...data,
        id: SIP_ID,
        totalDeductions: 0,
        failedDeductions: 0,
        createdAt: new Date(),
      }));

      const result = await service.createSip(TEST_TENANT_ID, CUSTOMER_ID, {
        sipType: 'FIXED_AMOUNT',
        amountPaise: 100000,
        frequency: 'MONTHLY',
        dayOfMonth: 15,
        startDate: new Date('2025-06-01'),
        paymentMethod: 'AUTO_DEBIT',
      } as any);

      expect(result.sipType).toBe('FIXED_AMOUNT');
      expect(result.frequency).toBe('MONTHLY');
      expect(result.amountPaise).toBe(100000);
      expect(result.status).toBe('ACTIVE');
    });

    it('creates a fixed-weight weekly SIP', async () => {
      (mockPrisma as any).goldSip.create.mockImplementation(({ data }: any) => ({
        ...data,
        id: 'sip-2',
        totalDeductions: 0,
        failedDeductions: 0,
        createdAt: new Date(),
      }));

      const result = await service.createSip(TEST_TENANT_ID, CUSTOMER_ID, {
        sipType: 'FIXED_WEIGHT',
        weightMg: 500,
        frequency: 'WEEKLY',
        dayOfWeek: 1,
        startDate: new Date('2025-06-01'),
        paymentMethod: 'AUTO_DEBIT',
      } as any);

      expect(result.sipType).toBe('FIXED_WEIGHT');
      expect(result.weightMg).toBe(500);
    });
  });

  // ─── executeSip ────────────────────────────────────────────

  describe('executeSip', () => {
    it('buys gold at current rate for fixed-amount SIP', async () => {
      const sip = makeSip();
      (mockPrisma as any).goldSip.findUnique.mockResolvedValue(sip);

      mockPrisma.$transaction.mockImplementation(async (fn: any) => {
        const tx = {
          goldTransaction: { create: vi.fn().mockResolvedValue({ id: 'tx-sip-1' }) },
          goldVault: {
            findUnique: vi.fn().mockResolvedValue({
              id: VAULT_ID, balanceMg: BigInt(0), totalInvestedPaise: BigInt(0),
            }),
            update: vi.fn(),
          },
          sipExecution: { create: vi.fn().mockResolvedValue({ id: 'exec-1' }) },
          goldSip: { update: vi.fn() },
        };
        return fn(tx);
      });

      await service.executeSip(SIP_ID);

      // Should have called transaction
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('skips execution if SIP is not active', async () => {
      (mockPrisma as any).goldSip.findUnique.mockResolvedValue({
        ...makeSip(),
        status: 'PAUSED',
      });

      await service.executeSip(SIP_ID);
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('increments failedDeductions on failure', async () => {
      const sip = makeSip({ failedDeductions: 0 });
      (mockPrisma as any).goldSip.findUnique.mockResolvedValue(sip);

      // Make rate service throw to simulate failure
      mockRatesService.getCurrentRate.mockRejectedValue(new Error('Rate unavailable'));

      mockPrisma.$transaction.mockImplementation(async (fn: any) => {
        const tx = {
          sipExecution: { create: vi.fn() },
          goldSip: { update: vi.fn() },
        };
        return fn(tx);
      });

      await service.executeSip(SIP_ID);

      // The error handling path should record a failure
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('auto-pauses after 3 consecutive failures', async () => {
      const sip = makeSip({ failedDeductions: 2 }); // already 2 failures
      (mockPrisma as any).goldSip.findUnique.mockResolvedValue(sip);
      mockRatesService.getCurrentRate.mockRejectedValue(new Error('Rate unavailable'));

      let capturedSipStatus: string | undefined;
      mockPrisma.$transaction.mockImplementation(async (fn: any) => {
        const tx = {
          sipExecution: { create: vi.fn() },
          goldSip: {
            update: vi.fn().mockImplementation(({ data }: any) => {
              capturedSipStatus = data.status;
            }),
          },
        };
        return fn(tx);
      });

      await service.executeSip(SIP_ID);

      expect(capturedSipStatus).toBe('PAUSED');
    });
  });

  // ─── pauseSip ──────────────────────────────────────────────

  describe('pauseSip', () => {
    it('pauses an active SIP', async () => {
      (mockPrisma as any).goldSip.findFirst.mockResolvedValue(makeSip());
      (mockPrisma as any).goldSip.update.mockResolvedValue({
        ...makeSip(),
        status: 'PAUSED',
      });

      const result = await service.pauseSip(TEST_TENANT_ID, SIP_ID);
      expect(result.status).toBe('PAUSED');
    });

    it('rejects pausing a non-active SIP', async () => {
      (mockPrisma as any).goldSip.findFirst.mockResolvedValue(
        makeSip({ status: 'CANCELLED' }),
      );

      await expect(
        service.pauseSip(TEST_TENANT_ID, SIP_ID),
      ).rejects.toThrow('Cannot pause SIP');
    });
  });

  // ─── resumeSip ─────────────────────────────────────────────

  describe('resumeSip', () => {
    it('resumes a paused SIP and resets failed count', async () => {
      (mockPrisma as any).goldSip.findFirst.mockResolvedValue(
        makeSip({ status: 'PAUSED', failedDeductions: 3 }),
      );
      (mockPrisma as any).goldSip.update.mockImplementation(({ data }: any) => ({
        ...makeSip({ status: 'PAUSED' }),
        ...data,
      }));

      const result = await service.resumeSip(TEST_TENANT_ID, SIP_ID);
      expect(result.status).toBe('ACTIVE');
      expect(result.failedDeductions).toBe(0);
    });

    it('rejects resuming a non-paused SIP', async () => {
      (mockPrisma as any).goldSip.findFirst.mockResolvedValue(makeSip());

      await expect(
        service.resumeSip(TEST_TENANT_ID, SIP_ID),
      ).rejects.toThrow('Cannot resume SIP');
    });
  });

  // ─── cancelSip ─────────────────────────────────────────────

  describe('cancelSip', () => {
    it('cancels an active SIP', async () => {
      (mockPrisma as any).goldSip.findFirst.mockResolvedValue(makeSip());
      (mockPrisma as any).goldSip.update.mockResolvedValue({
        ...makeSip(),
        status: 'CANCELLED',
      });

      const result = await service.cancelSip(TEST_TENANT_ID, SIP_ID);
      expect(result.status).toBe('CANCELLED');
    });

    it('rejects cancelling an already cancelled SIP', async () => {
      (mockPrisma as any).goldSip.findFirst.mockResolvedValue(
        makeSip({ status: 'CANCELLED' }),
      );

      await expect(
        service.cancelSip(TEST_TENANT_ID, SIP_ID),
      ).rejects.toThrow('already CANCELLED');
    });
  });
});
