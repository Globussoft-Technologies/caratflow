import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ComplianceDocumentService } from '../compliance.document.service';
import { createMockPrismaService, TEST_TENANT_ID, TEST_USER_ID, resetAllMocks } from '../../../__tests__/setup';

describe('ComplianceDocumentService (Unit)', () => {
  let service: ComplianceDocumentService;
  let mockPrisma: ReturnType<typeof createMockPrismaService>;

  beforeEach(() => {
    mockPrisma = createMockPrismaService();
    (mockPrisma as any).complianceDocument = {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn(),
    };
    service = new ComplianceDocumentService(mockPrisma as any);
    resetAllMocks(mockPrisma);
  });

  // ─── create ─────────────────────────────────────────────────────

  describe('create', () => {
    it('creates a compliance document', async () => {
      const input = {
        documentType: 'KIMBERLEY_PROCESS',
        documentNumber: 'KPC-2025-001',
        issuedBy: 'GJEPC',
        issuedDate: new Date('2025-01-01'),
        expiryDate: new Date('2026-01-01'),
      };

      (mockPrisma as any).complianceDocument.create.mockResolvedValue({
        id: 'doc-1',
        tenantId: TEST_TENANT_ID,
        ...input,
        status: 'ACTIVE',
      });

      const result = await service.create(TEST_TENANT_ID, TEST_USER_ID, input as any);
      expect(result.documentType).toBe('KIMBERLEY_PROCESS');
      expect(result.status).toBe('ACTIVE');
    });

    it('creates a BIS license document', async () => {
      (mockPrisma as any).complianceDocument.create.mockResolvedValue({
        id: 'doc-2',
        documentType: 'BIS_LICENSE',
        documentNumber: 'BIS-MH-001',
        status: 'ACTIVE',
      });

      const result = await service.create(TEST_TENANT_ID, TEST_USER_ID, {
        documentType: 'BIS_LICENSE',
        documentNumber: 'BIS-MH-001',
      } as any);
      expect(result.documentType).toBe('BIS_LICENSE');
    });

    it('creates document with supplier association', async () => {
      (mockPrisma as any).complianceDocument.create.mockResolvedValue({
        id: 'doc-3',
        supplierId: 'sup-1',
        documentType: 'SUPPLIER_CERT',
        status: 'ACTIVE',
      });

      const result = await service.create(TEST_TENANT_ID, TEST_USER_ID, {
        documentType: 'SUPPLIER_CERT',
        documentNumber: 'SC-001',
        supplierId: 'sup-1',
      } as any);
      expect(result.supplierId).toBe('sup-1');
    });
  });

  // ─── update ─────────────────────────────────────────────────────

  describe('update', () => {
    it('updates a document', async () => {
      (mockPrisma as any).complianceDocument.findFirst.mockResolvedValue({ id: 'doc-1' });
      (mockPrisma as any).complianceDocument.update.mockResolvedValue({
        id: 'doc-1',
        notes: 'Updated note',
      });

      const result = await service.update(TEST_TENANT_ID, TEST_USER_ID, 'doc-1', { notes: 'Updated note' } as any);
      expect(result.notes).toBe('Updated note');
    });

    it('throws NotFoundException for missing document', async () => {
      (mockPrisma as any).complianceDocument.findFirst.mockResolvedValue(null);

      await expect(
        service.update(TEST_TENANT_ID, TEST_USER_ID, 'nonexistent', {} as any),
      ).rejects.toThrow('not found');
    });
  });

  // ─── findById ───────────────────────────────────────────────────

  describe('findById', () => {
    it('returns a document by id', async () => {
      (mockPrisma as any).complianceDocument.findFirst.mockResolvedValue({
        id: 'doc-1',
        documentType: 'KIMBERLEY_PROCESS',
      });

      const result = await service.findById(TEST_TENANT_ID, 'doc-1');
      expect(result.id).toBe('doc-1');
    });

    it('throws NotFoundException for missing document', async () => {
      (mockPrisma as any).complianceDocument.findFirst.mockResolvedValue(null);

      await expect(service.findById(TEST_TENANT_ID, 'nonexistent')).rejects.toThrow('not found');
    });
  });

  // ─── revoke ─────────────────────────────────────────────────────

  describe('revoke', () => {
    it('revokes an active document', async () => {
      (mockPrisma as any).complianceDocument.findFirst.mockResolvedValue({
        id: 'doc-1',
        status: 'ACTIVE',
      });
      (mockPrisma as any).complianceDocument.update.mockResolvedValue({
        id: 'doc-1',
        status: 'REVOKED',
      });

      const result = await service.revoke(TEST_TENANT_ID, TEST_USER_ID, 'doc-1');
      expect(result.status).toBe('REVOKED');
    });

    it('throws NotFoundException for missing document', async () => {
      (mockPrisma as any).complianceDocument.findFirst.mockResolvedValue(null);

      await expect(
        service.revoke(TEST_TENANT_ID, TEST_USER_ID, 'nonexistent'),
      ).rejects.toThrow('not found');
    });
  });

  // ─── getExpiringCount ───────────────────────────────────────────

  describe('getExpiringCount', () => {
    it('returns count of documents expiring within 30 days', async () => {
      (mockPrisma as any).complianceDocument.count.mockResolvedValue(3);

      const result = await service.getExpiringCount(TEST_TENANT_ID);
      expect(result).toBe(3);
    });

    it('accepts custom withinDays parameter', async () => {
      (mockPrisma as any).complianceDocument.count.mockResolvedValue(7);

      const result = await service.getExpiringCount(TEST_TENANT_ID, 60);
      expect(result).toBe(7);
    });
  });

  // ─── markExpiredDocuments ───────────────────────────────────────

  describe('markExpiredDocuments', () => {
    it('marks expired documents and returns count', async () => {
      (mockPrisma as any).complianceDocument.updateMany.mockResolvedValue({ count: 2 });

      const result = await service.markExpiredDocuments(TEST_TENANT_ID);
      expect(result.updated).toBe(2);
    });
  });

  // ─── list ───────────────────────────────────────────────────────

  describe('list', () => {
    it('returns paginated results with document type filter', async () => {
      (mockPrisma as any).complianceDocument.findMany.mockResolvedValue([
        { id: 'doc-1', documentType: 'KIMBERLEY_PROCESS' },
      ]);
      (mockPrisma as any).complianceDocument.count.mockResolvedValue(1);

      const result = await service.list(TEST_TENANT_ID, {
        page: 1,
        limit: 10,
        sortOrder: 'desc',
        documentType: 'KIMBERLEY_PROCESS',
      });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('filters by expiring within days', async () => {
      (mockPrisma as any).complianceDocument.findMany.mockResolvedValue([]);
      (mockPrisma as any).complianceDocument.count.mockResolvedValue(0);

      await service.list(TEST_TENANT_ID, {
        page: 1,
        limit: 10,
        sortOrder: 'desc',
        expiringWithinDays: 30,
      });

      expect((mockPrisma as any).complianceDocument.findMany).toHaveBeenCalled();
    });
  });
});
