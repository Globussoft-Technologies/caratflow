import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { PlatformImportService } from '../platform.import.service';
import {
  createMockPrismaService,
  TEST_TENANT_ID,
  TEST_USER_ID,
} from '../../../__tests__/setup';

function extendPrisma(base: ReturnType<typeof createMockPrismaService>) {
  return {
    ...base,
    importJob: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    product: {
      ...base.product,
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    supplier: {
      ...base.supplier,
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  };
}

describe('PlatformImportService (Unit)', () => {
  let service: PlatformImportService;
  let mockPrisma: ReturnType<typeof extendPrisma>;
  const audit = { userId: TEST_USER_ID };

  beforeEach(() => {
    mockPrisma = extendPrisma(createMockPrismaService());
    service = new PlatformImportService(mockPrisma as any);
  });

  describe('getEntityFields', () => {
    it('returns fields for customer entity', () => {
      const fields = service.getEntityFields('customer');
      expect(fields).toContain('firstName');
      expect(fields).toContain('lastName');
      expect(fields).toContain('email');
    });

    it('returns fields for product entity', () => {
      const fields = service.getEntityFields('product');
      expect(fields).toContain('sku');
      expect(fields).toContain('name');
    });

    it('throws for unsupported entity type', () => {
      expect(() => service.getEntityFields('unknown' as any)).toThrow(BadRequestException);
    });
  });

  describe('createImportJob', () => {
    it('creates an import job with PENDING status', async () => {
      mockPrisma.importJob.create.mockResolvedValue({
        id: 'job-1',
        status: 'PENDING',
        entityType: 'customer',
        totalRows: 100,
      });

      const result = await service.createImportJob(TEST_TENANT_ID, {
        fileName: 'customers.csv',
        entityType: 'customer',
        totalRows: 100,
        columnMapping: { 'First Name': 'firstName' },
      }, audit);

      expect(result.status).toBe('PENDING');
      expect(result.totalRows).toBe(100);
    });
  });

  describe('processImport', () => {
    it('processes rows and returns success/error counts', async () => {
      mockPrisma.importJob.findFirst.mockResolvedValue({
        id: 'job-1',
        status: 'PENDING',
        entityType: 'customer',
        columnMapping: {},
      });
      mockPrisma.importJob.update.mockResolvedValue({});
      mockPrisma.customer.findFirst.mockResolvedValue(null);
      mockPrisma.customer.create.mockResolvedValue({ id: 'c-1' });

      const rows = [
        { firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
        { firstName: 'Jane', lastName: 'Smith' },
      ];

      const result = await service.processImport(TEST_TENANT_ID, 'job-1', rows, audit);

      expect(result.successRows).toBe(2);
      expect(result.errorRows).toBe(0);
      expect(result.status).toBe('COMPLETED');
    });

    it('collects validation errors for invalid rows', async () => {
      mockPrisma.importJob.findFirst.mockResolvedValue({
        id: 'job-1',
        status: 'PENDING',
        entityType: 'customer',
        columnMapping: {},
      });
      mockPrisma.importJob.update.mockResolvedValue({});

      const rows = [
        { email: 'nofirst@example.com' }, // missing firstName and lastName
      ];

      const result = await service.processImport(TEST_TENANT_ID, 'job-1', rows, audit);

      expect(result.errorRows).toBeGreaterThan(0);
      expect(result.errors[0]).toEqual(
        expect.objectContaining({ field: 'firstName' }),
      );
    });

    it('applies column mapping to rows', async () => {
      mockPrisma.importJob.findFirst.mockResolvedValue({
        id: 'job-1',
        status: 'PENDING',
        entityType: 'customer',
        columnMapping: { 'First Name': 'firstName', 'Last Name': 'lastName' },
      });
      mockPrisma.importJob.update.mockResolvedValue({});
      mockPrisma.customer.findFirst.mockResolvedValue(null);
      mockPrisma.customer.create.mockResolvedValue({ id: 'c-1' });

      const rows = [{ 'First Name': 'John', 'Last Name': 'Doe' }];
      const result = await service.processImport(TEST_TENANT_ID, 'job-1', rows, audit);

      expect(result.successRows).toBe(1);
    });

    it('throws NotFoundException for unknown job', async () => {
      mockPrisma.importJob.findFirst.mockResolvedValue(null);

      await expect(
        service.processImport(TEST_TENANT_ID, 'bad-job', [], audit),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException for already-processed job', async () => {
      mockPrisma.importJob.findFirst.mockResolvedValue({
        id: 'job-1',
        status: 'COMPLETED',
      });

      await expect(
        service.processImport(TEST_TENANT_ID, 'job-1', [], audit),
      ).rejects.toThrow(BadRequestException);
    });

    it('returns FAILED status when all rows have errors', async () => {
      mockPrisma.importJob.findFirst.mockResolvedValue({
        id: 'job-1',
        status: 'PENDING',
        entityType: 'product',
        columnMapping: {},
      });
      mockPrisma.importJob.update.mockResolvedValue({});

      const rows = [{ name: 'Product without SKU' }]; // missing sku and productType
      const result = await service.processImport(TEST_TENANT_ID, 'job-1', rows, audit);

      expect(result.status).toBe('FAILED');
    });
  });

  describe('getImportJob', () => {
    it('returns job when found', async () => {
      mockPrisma.importJob.findFirst.mockResolvedValue({ id: 'job-1' });
      const result = await service.getImportJob(TEST_TENANT_ID, 'job-1');
      expect(result.id).toBe('job-1');
    });

    it('throws NotFoundException when not found', async () => {
      mockPrisma.importJob.findFirst.mockResolvedValue(null);
      await expect(service.getImportJob(TEST_TENANT_ID, 'bad')).rejects.toThrow(NotFoundException);
    });
  });

  describe('listImportJobs', () => {
    it('returns paginated import jobs', async () => {
      mockPrisma.importJob.findMany.mockResolvedValue([{ id: 'j-1' }]);
      mockPrisma.importJob.count.mockResolvedValue(1);

      const result = await service.listImportJobs(TEST_TENANT_ID);
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });
});
