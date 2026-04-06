import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ComplianceCertificateService } from '../compliance.certificate.service';
import { createMockPrismaService, TEST_TENANT_ID, TEST_USER_ID, resetAllMocks } from '../../../__tests__/setup';

describe('ComplianceCertificateService (Unit)', () => {
  let service: ComplianceCertificateService;
  let mockPrisma: ReturnType<typeof createMockPrismaService>;

  beforeEach(() => {
    mockPrisma = createMockPrismaService();
    (mockPrisma as any).gemstoneCertificate = {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    };
    (mockPrisma as any).product = {
      ...mockPrisma.product,
      count: vi.fn(),
      findMany: vi.fn(),
    };
    service = new ComplianceCertificateService(mockPrisma as any);
    resetAllMocks(mockPrisma);
  });

  const baseCertInput = {
    productId: 'prod-1',
    certificateNumber: 'GIA-12345678',
    issuingLab: 'GIA',
    stoneType: 'DIAMOND',
    caratWeight: 1.5,
    color: 'D',
    clarity: 'VVS1',
    cut: 'Excellent',
    shape: 'Round',
  };

  // ─── create ─────────────────────────────────────────────────────

  describe('create', () => {
    it('creates a gemstone certificate', async () => {
      (mockPrisma as any).gemstoneCertificate.findFirst.mockResolvedValue(null);
      (mockPrisma as any).gemstoneCertificate.create.mockResolvedValue({
        id: 'cert-1',
        ...baseCertInput,
        product: { id: 'prod-1', sku: 'DIA-001', name: 'Diamond Solitaire' },
      });

      const result = await service.create(TEST_TENANT_ID, TEST_USER_ID, baseCertInput as any);
      expect(result.certificateNumber).toBe('GIA-12345678');
      expect(result.issuingLab).toBe('GIA');
    });

    it('rejects duplicate certificate number within tenant', async () => {
      (mockPrisma as any).gemstoneCertificate.findFirst.mockResolvedValue({ id: 'existing' });

      await expect(
        service.create(TEST_TENANT_ID, TEST_USER_ID, baseCertInput as any),
      ).rejects.toThrow('already exists');
    });

    it('allows different lab types (IGI)', async () => {
      (mockPrisma as any).gemstoneCertificate.findFirst.mockResolvedValue(null);
      (mockPrisma as any).gemstoneCertificate.create.mockResolvedValue({
        id: 'cert-2',
        ...baseCertInput,
        issuingLab: 'IGI',
        certificateNumber: 'IGI-999',
        product: { id: 'prod-1', sku: 'S1', name: 'Stone' },
      });

      const result = await service.create(TEST_TENANT_ID, TEST_USER_ID, {
        ...baseCertInput,
        issuingLab: 'IGI',
        certificateNumber: 'IGI-999',
      } as any);
      expect(result.issuingLab).toBe('IGI');
    });

    it('allows HRD lab type', async () => {
      (mockPrisma as any).gemstoneCertificate.findFirst.mockResolvedValue(null);
      (mockPrisma as any).gemstoneCertificate.create.mockResolvedValue({
        id: 'cert-3',
        ...baseCertInput,
        issuingLab: 'HRD',
        certificateNumber: 'HRD-555',
        product: { id: 'prod-1', sku: 'S1', name: 'Stone' },
      });

      const result = await service.create(TEST_TENANT_ID, TEST_USER_ID, {
        ...baseCertInput,
        issuingLab: 'HRD',
        certificateNumber: 'HRD-555',
      } as any);
      expect(result.issuingLab).toBe('HRD');
    });
  });

  // ─── update ─────────────────────────────────────────────────────

  describe('update', () => {
    it('updates a certificate', async () => {
      (mockPrisma as any).gemstoneCertificate.findFirst.mockResolvedValue({ id: 'cert-1' });
      (mockPrisma as any).gemstoneCertificate.update.mockResolvedValue({
        id: 'cert-1',
        color: 'E',
        product: { id: 'prod-1', sku: 'S1', name: 'Stone' },
      });

      const result = await service.update(TEST_TENANT_ID, TEST_USER_ID, 'cert-1', { color: 'E' } as any);
      expect(result.color).toBe('E');
    });

    it('throws NotFoundException for missing certificate', async () => {
      (mockPrisma as any).gemstoneCertificate.findFirst.mockResolvedValue(null);

      await expect(
        service.update(TEST_TENANT_ID, TEST_USER_ID, 'nonexistent', {} as any),
      ).rejects.toThrow('not found');
    });
  });

  // ─── findByCertificateNumber ────────────────────────────────────

  describe('findByCertificateNumber', () => {
    it('returns certificate by number', async () => {
      (mockPrisma as any).gemstoneCertificate.findFirst.mockResolvedValue({
        id: 'cert-1',
        certificateNumber: 'GIA-12345678',
        product: { id: 'prod-1', sku: 'S1', name: 'Stone' },
      });

      const result = await service.findByCertificateNumber(TEST_TENANT_ID, 'GIA-12345678');
      expect(result?.certificateNumber).toBe('GIA-12345678');
    });

    it('returns null when certificate not found', async () => {
      (mockPrisma as any).gemstoneCertificate.findFirst.mockResolvedValue(null);

      const result = await service.findByCertificateNumber(TEST_TENANT_ID, 'NONEXIST');
      expect(result).toBeNull();
    });
  });

  // ─── verifyCertificate ──────────────────────────────────────────

  describe('verifyCertificate', () => {
    it('marks certificate as verified', async () => {
      (mockPrisma as any).gemstoneCertificate.findFirst.mockResolvedValue({ id: 'cert-1' });
      (mockPrisma as any).gemstoneCertificate.update.mockResolvedValue({
        id: 'cert-1',
        certificateNumber: 'GIA-12345678',
        issuingLab: 'GIA',
        isVerified: true,
        verifiedAt: new Date(),
        product: { id: 'prod-1', sku: 'S1', name: 'Stone' },
      });

      const result = await service.verifyCertificate(TEST_TENANT_ID, TEST_USER_ID, 'cert-1');
      expect(result.isValid).toBe(true);
      expect(result.lab).toBe('GIA');
      expect(result.verifiedAt).toBeDefined();
    });

    it('throws NotFoundException for missing certificate', async () => {
      (mockPrisma as any).gemstoneCertificate.findFirst.mockResolvedValue(null);

      await expect(
        service.verifyCertificate(TEST_TENANT_ID, TEST_USER_ID, 'nonexistent'),
      ).rejects.toThrow('not found');
    });
  });

  // ─── getCertifiedStonesPercent ──────────────────────────────────

  describe('getCertifiedStonesPercent', () => {
    it('calculates percentage of certified stones', async () => {
      (mockPrisma as any).product.count.mockResolvedValue(50);
      (mockPrisma as any).gemstoneCertificate.count.mockResolvedValue(30);

      const result = await service.getCertifiedStonesPercent(TEST_TENANT_ID);
      expect(result).toBe(60);
    });

    it('returns 100% when no stone products exist', async () => {
      (mockPrisma as any).product.count.mockResolvedValue(0);
      (mockPrisma as any).gemstoneCertificate.count.mockResolvedValue(0);

      const result = await service.getCertifiedStonesPercent(TEST_TENANT_ID);
      expect(result).toBe(100);
    });
  });

  // ─── list ───────────────────────────────────────────────────────

  describe('list', () => {
    it('returns paginated results with filters', async () => {
      (mockPrisma as any).gemstoneCertificate.findMany.mockResolvedValue([]);
      (mockPrisma as any).gemstoneCertificate.count.mockResolvedValue(0);

      const result = await service.list(TEST_TENANT_ID, {
        page: 1,
        limit: 10,
        sortOrder: 'desc',
        issuingLab: 'GIA',
      });

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });
});
