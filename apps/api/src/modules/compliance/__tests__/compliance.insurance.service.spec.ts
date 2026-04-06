import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ComplianceInsuranceService } from '../compliance.insurance.service';
import { createMockPrismaService, TEST_TENANT_ID, TEST_USER_ID, resetAllMocks } from '../../../__tests__/setup';

describe('ComplianceInsuranceService (Unit)', () => {
  let service: ComplianceInsuranceService;
  let mockPrisma: ReturnType<typeof createMockPrismaService>;

  beforeEach(() => {
    mockPrisma = createMockPrismaService();
    (mockPrisma as any).insurancePolicy = {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn(),
    };
    service = new ComplianceInsuranceService(mockPrisma as any);
    resetAllMocks(mockPrisma);
  });

  const basePolicyInput = {
    policyNumber: 'POL-2025-001',
    provider: 'ICICI Lombard',
    coverageType: 'ALL_RISK',
    coveredValuePaise: 50000000, // 5 lakh in paise
    premiumPaise: 500000,        // 5000 Rs in paise
    startDate: new Date('2025-01-01'),
    endDate: new Date('2026-01-01'),
  };

  // ─── create ─────────────────────────────────────────────────────

  describe('create', () => {
    it('creates an insurance policy with BigInt paise values', async () => {
      (mockPrisma as any).insurancePolicy.findFirst.mockResolvedValue(null);
      (mockPrisma as any).insurancePolicy.create.mockResolvedValue({
        id: 'pol-1',
        ...basePolicyInput,
        coveredValuePaise: 50000000n,
        premiumPaise: 500000n,
        status: 'ACTIVE',
      });

      const result = await service.create(TEST_TENANT_ID, TEST_USER_ID, basePolicyInput as any);
      expect(result.status).toBe('ACTIVE');
    });

    it('rejects duplicate policy number', async () => {
      (mockPrisma as any).insurancePolicy.findFirst.mockResolvedValue({ id: 'existing' });

      await expect(
        service.create(TEST_TENANT_ID, TEST_USER_ID, basePolicyInput as any),
      ).rejects.toThrow('already exists');
    });
  });

  // ─── update ─────────────────────────────────────────────────────

  describe('update', () => {
    it('updates policy fields', async () => {
      (mockPrisma as any).insurancePolicy.findFirst.mockResolvedValue({ id: 'pol-1' });
      (mockPrisma as any).insurancePolicy.update.mockResolvedValue({
        id: 'pol-1',
        provider: 'New India Assurance',
      });

      const result = await service.update(TEST_TENANT_ID, TEST_USER_ID, 'pol-1', {
        provider: 'New India Assurance',
      } as any);
      expect(result.provider).toBe('New India Assurance');
    });

    it('throws NotFoundException for missing policy', async () => {
      (mockPrisma as any).insurancePolicy.findFirst.mockResolvedValue(null);

      await expect(
        service.update(TEST_TENANT_ID, TEST_USER_ID, 'nonexistent', {} as any),
      ).rejects.toThrow('not found');
    });
  });

  // ─── findById ───────────────────────────────────────────────────

  describe('findById', () => {
    it('returns serialized policy with Number paise values', async () => {
      (mockPrisma as any).insurancePolicy.findFirst.mockResolvedValue({
        id: 'pol-1',
        policyNumber: 'POL-2025-001',
        coveredValuePaise: 50000000n,
        premiumPaise: 500000n,
      });

      const result = await service.findById(TEST_TENANT_ID, 'pol-1');
      expect(result.coveredValuePaise).toBe(50000000);
      expect(result.premiumPaise).toBe(500000);
    });

    it('throws NotFoundException for missing policy', async () => {
      (mockPrisma as any).insurancePolicy.findFirst.mockResolvedValue(null);

      await expect(service.findById(TEST_TENANT_ID, 'nonexistent')).rejects.toThrow('not found');
    });
  });

  // ─── getCoverageSummary ─────────────────────────────────────────

  describe('getCoverageSummary', () => {
    it('sums covered values and premiums across active policies', async () => {
      (mockPrisma as any).insurancePolicy.findMany.mockResolvedValue([
        { id: 'pol-1', coveredValuePaise: 50000000n, premiumPaise: 500000n },
        { id: 'pol-2', coveredValuePaise: 30000000n, premiumPaise: 300000n },
      ]);

      const summary = await service.getCoverageSummary(TEST_TENANT_ID);

      expect(summary.activePolicies).toBe(2);
      expect(summary.totalCoveredPaise).toBe(80000000);
      expect(summary.totalPremiumPaise).toBe(800000);
    });

    it('returns zeros when no active policies', async () => {
      (mockPrisma as any).insurancePolicy.findMany.mockResolvedValue([]);

      const summary = await service.getCoverageSummary(TEST_TENANT_ID);

      expect(summary.activePolicies).toBe(0);
      expect(summary.totalCoveredPaise).toBe(0);
      expect(summary.totalPremiumPaise).toBe(0);
    });
  });

  // ─── markExpiredPolicies ────────────────────────────────────────

  describe('markExpiredPolicies', () => {
    it('marks expired policies and returns count', async () => {
      (mockPrisma as any).insurancePolicy.updateMany.mockResolvedValue({ count: 3 });

      const result = await service.markExpiredPolicies(TEST_TENANT_ID);
      expect(result.updated).toBe(3);
    });
  });

  // ─── list ───────────────────────────────────────────────────────

  describe('list', () => {
    it('returns paginated results filtered by coverageType', async () => {
      (mockPrisma as any).insurancePolicy.findMany.mockResolvedValue([
        { id: 'pol-1', coverageType: 'ALL_RISK', coveredValuePaise: 50000000n, premiumPaise: 500000n },
      ]);
      (mockPrisma as any).insurancePolicy.count.mockResolvedValue(1);

      const result = await service.list(TEST_TENANT_ID, {
        page: 1,
        limit: 10,
        sortOrder: 'asc',
        coverageType: 'ALL_RISK',
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].coveredValuePaise).toBe(50000000);
    });
  });
});
