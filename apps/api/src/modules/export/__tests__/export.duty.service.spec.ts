import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExportDutyService } from '../export.duty.service';
import { createMockPrismaService, TEST_TENANT_ID, TEST_USER_ID, resetAllMocks } from '../../../__tests__/setup';

describe('ExportDutyService (Unit)', () => {
  let service: ExportDutyService;
  let mockPrisma: ReturnType<typeof createMockPrismaService>;

  beforeEach(() => {
    mockPrisma = createMockPrismaService();
    (mockPrisma as any).hsCode = {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    };
    (mockPrisma as any).exportCompliance = {
      findUnique: vi.fn(),
    };
    (mockPrisma as any).customsDuty = {
      create: vi.fn(),
    };
    (mockPrisma as any).dgftLicense = {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    };
    service = new ExportDutyService(mockPrisma as any);
    resetAllMocks(mockPrisma);
  });

  // ─── searchHsCodes ──────────────────────────────────────────────

  describe('searchHsCodes', () => {
    it('searches HS codes by query', async () => {
      (mockPrisma as any).hsCode.findMany.mockResolvedValue([
        { id: 'hs-1', hsCode: '7113.19', description: 'Gold jewelry', chapter: '71', heading: '7113', subheading: '711319', defaultDutyRate: 500, isActive: true },
      ]);
      (mockPrisma as any).hsCode.count.mockResolvedValue(1);

      const result = await service.searchHsCodes(
        { query: 'gold' },
        { page: 1, limit: 10 },
      );

      expect(result.items).toHaveLength(1);
      expect(result.items[0].hsCode).toBe('7113.19');
    });
  });

  // ─── getHsCode ──────────────────────────────────────────────────

  describe('getHsCode', () => {
    it('returns HS code details', async () => {
      (mockPrisma as any).hsCode.findUnique.mockResolvedValue({
        id: 'hs-1',
        hsCode: '7113.19',
        description: 'Articles of jewelry of precious metal',
        chapter: '71',
        heading: '7113',
        subheading: '711319',
        defaultDutyRate: 500,
        isActive: true,
      });

      const result = await service.getHsCode('7113.19');
      expect(result.description).toContain('jewelry');
      expect(result.defaultDutyRate).toBe(500);
    });

    it('throws NotFoundException for unknown HS code', async () => {
      (mockPrisma as any).hsCode.findUnique.mockResolvedValue(null);

      await expect(service.getHsCode('9999.99')).rejects.toThrow('not found');
    });
  });

  // ─── calculateDuty ──────────────────────────────────────────────

  describe('calculateDuty', () => {
    it('calculates duty based on HS code rate and assessable value', async () => {
      (mockPrisma as any).hsCode.findUnique.mockResolvedValue({
        hsCode: '7113.19',
        description: 'Gold jewelry',
        chapter: '71',
        defaultDutyRate: 500, // 5% in basis points
      });
      (mockPrisma as any).exportCompliance.findUnique.mockResolvedValue(null);

      const result = await service.calculateDuty(TEST_TENANT_ID, TEST_USER_ID, {
        hsCode: '7113.19',
        importCountry: 'US',
        assessableValuePaise: 10000000, // 1 lakh
      });

      expect(result.dutyRate).toBe(500);
      // 10000000 * 500 / 10000 = 500000
      expect(result.dutyAmountPaise).toBe(500000);
      expect(result.totalDutyPaise).toBe(500000);
    });

    it('includes exemptions from compliance rules', async () => {
      (mockPrisma as any).hsCode.findUnique.mockResolvedValue({
        hsCode: '7113.19',
        description: 'Gold jewelry',
        chapter: '71',
        defaultDutyRate: 500,
      });
      (mockPrisma as any).exportCompliance.findUnique.mockResolvedValue({
        destinationCountry: 'AE',
        productCategory: '71',
        dutyExemptions: [{ type: 'FTA', description: 'India-UAE CEPA' }],
      });

      const result = await service.calculateDuty(TEST_TENANT_ID, TEST_USER_ID, {
        hsCode: '7113.19',
        importCountry: 'AE',
        assessableValuePaise: 10000000,
      });

      expect(result.exemptions).toHaveLength(1);
      expect(result.exemptions[0].type).toBe('FTA');
    });

    it('saves calculation when linked to export order', async () => {
      (mockPrisma as any).hsCode.findUnique.mockResolvedValue({
        hsCode: '7113.19',
        chapter: '71',
        defaultDutyRate: 300,
      });
      (mockPrisma as any).exportCompliance.findUnique.mockResolvedValue(null);
      (mockPrisma as any).customsDuty.create.mockResolvedValue({});

      await service.calculateDuty(TEST_TENANT_ID, TEST_USER_ID, {
        hsCode: '7113.19',
        importCountry: 'US',
        assessableValuePaise: 5000000,
        exportOrderId: 'order-1',
      });

      expect((mockPrisma as any).customsDuty.create).toHaveBeenCalled();
    });

    it('handles unknown HS code gracefully (0% default rate)', async () => {
      (mockPrisma as any).hsCode.findUnique.mockResolvedValue(null);
      (mockPrisma as any).exportCompliance.findUnique.mockResolvedValue(null);

      const result = await service.calculateDuty(TEST_TENANT_ID, TEST_USER_ID, {
        hsCode: '9999.99',
        importCountry: 'US',
        assessableValuePaise: 10000000,
      });

      expect(result.dutyRate).toBe(0);
      expect(result.dutyAmountPaise).toBe(0);
      expect(result.hsDescription).toBe('Unknown HS code');
    });
  });

  // ─── DGFT License CRUD ─────────────────────────────────────────

  describe('createLicense', () => {
    it('creates a DGFT license with balance = value', async () => {
      (mockPrisma as any).dgftLicense.create.mockResolvedValue({});
      (mockPrisma as any).dgftLicense.findFirst.mockResolvedValue({
        id: 'lic-1',
        tenantId: TEST_TENANT_ID,
        licenseNumber: 'DGFT-2025-001',
        licenseType: 'ADVANCE_AUTH',
        valuePaise: 100000000n,
        usedValuePaise: 0n,
        balanceValuePaise: 100000000n,
        status: 'ACTIVE',
        issuedDate: new Date(),
        expiryDate: new Date(),
        fileUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.createLicense(TEST_TENANT_ID, TEST_USER_ID, {
        licenseNumber: 'DGFT-2025-001',
        licenseType: 'ADVANCE_AUTH',
        issuedDate: new Date(),
        expiryDate: new Date(),
        valuePaise: 100000000,
      } as any);

      expect(result.valuePaise).toBe(100000000);
      expect(result.usedValuePaise).toBe(0);
      expect(result.balanceValuePaise).toBe(100000000);
    });
  });

  describe('utilizeLicense', () => {
    it('deducts utilization and updates balance', async () => {
      (mockPrisma as any).dgftLicense.findFirst
        .mockResolvedValueOnce({
          id: 'lic-1',
          status: 'ACTIVE',
          valuePaise: 100000000n,
          usedValuePaise: 20000000n,
          balanceValuePaise: 80000000n,
        })
        .mockResolvedValueOnce({
          id: 'lic-1',
          tenantId: TEST_TENANT_ID,
          licenseNumber: 'DGFT-001',
          licenseType: 'ADVANCE_AUTH',
          valuePaise: 100000000n,
          usedValuePaise: 50000000n,
          balanceValuePaise: 50000000n,
          status: 'ACTIVE',
          issuedDate: new Date(),
          expiryDate: new Date(),
          fileUrl: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      (mockPrisma as any).dgftLicense.update.mockResolvedValue({});

      const result = await service.utilizeLicense(TEST_TENANT_ID, TEST_USER_ID, 'lic-1', 30000000);
      expect(result.usedValuePaise).toBe(50000000);
    });

    it('sets status to UTILIZED when fully used', async () => {
      (mockPrisma as any).dgftLicense.findFirst
        .mockResolvedValueOnce({
          id: 'lic-1',
          status: 'ACTIVE',
          valuePaise: 100000000n,
          usedValuePaise: 80000000n,
          balanceValuePaise: 20000000n,
        })
        .mockResolvedValueOnce({
          id: 'lic-1',
          tenantId: TEST_TENANT_ID,
          licenseNumber: 'DGFT-001',
          licenseType: 'ADVANCE_AUTH',
          valuePaise: 100000000n,
          usedValuePaise: 100000000n,
          balanceValuePaise: 0n,
          status: 'UTILIZED',
          issuedDate: new Date(),
          expiryDate: new Date(),
          fileUrl: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      (mockPrisma as any).dgftLicense.update.mockResolvedValue({});

      const result = await service.utilizeLicense(TEST_TENANT_ID, TEST_USER_ID, 'lic-1', 20000000);
      expect(result.status).toBe('UTILIZED');
    });

    it('rejects utilization exceeding balance', async () => {
      (mockPrisma as any).dgftLicense.findFirst.mockResolvedValue({
        id: 'lic-1',
        status: 'ACTIVE',
        valuePaise: 100000000n,
        usedValuePaise: 90000000n,
        balanceValuePaise: 10000000n,
      });

      await expect(
        service.utilizeLicense(TEST_TENANT_ID, TEST_USER_ID, 'lic-1', 20000000),
      ).rejects.toThrow('Insufficient license balance');
    });

    it('rejects utilization of non-ACTIVE license', async () => {
      (mockPrisma as any).dgftLicense.findFirst.mockResolvedValue({
        id: 'lic-1',
        status: 'EXPIRED',
      });

      await expect(
        service.utilizeLicense(TEST_TENANT_ID, TEST_USER_ID, 'lic-1', 1000),
      ).rejects.toThrow('EXPIRED');
    });

    it('throws NotFoundException for missing license', async () => {
      (mockPrisma as any).dgftLicense.findFirst.mockResolvedValue(null);

      await expect(
        service.utilizeLicense(TEST_TENANT_ID, TEST_USER_ID, 'nonexistent', 1000),
      ).rejects.toThrow('not found');
    });
  });
});
