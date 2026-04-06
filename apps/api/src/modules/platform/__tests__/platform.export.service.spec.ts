import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { PlatformExportService } from '../platform.export.service';
import {
  createMockPrismaService,
  TEST_TENANT_ID,
  TEST_USER_ID,
} from '../../../__tests__/setup';

function extendPrisma(base: ReturnType<typeof createMockPrismaService>) {
  return {
    ...base,
    exportJob: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    product: {
      ...base.product,
      findMany: vi.fn(),
    },
    supplier: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
  };
}

describe('PlatformExportService (Unit)', () => {
  let service: PlatformExportService;
  let mockPrisma: ReturnType<typeof extendPrisma>;
  const audit = { userId: TEST_USER_ID };

  beforeEach(() => {
    mockPrisma = extendPrisma(createMockPrismaService());
    service = new PlatformExportService(mockPrisma as any);
  });

  describe('createExportJob', () => {
    it('creates an export job with PENDING status', async () => {
      mockPrisma.exportJob.create.mockResolvedValue({
        id: 'exp-1',
        status: 'PENDING',
        entityType: 'customer',
        format: 'CSV',
      });
      // processExport runs async - mock the fetch data calls
      mockPrisma.customer.findMany.mockResolvedValue([]);
      mockPrisma.exportJob.update.mockResolvedValue({});

      const result = await service.createExportJob(TEST_TENANT_ID, {
        entityType: 'customer',
        format: 'CSV',
      }, audit);

      expect(result.status).toBe('PENDING');
      expect(mockPrisma.exportJob.create).toHaveBeenCalledOnce();
    });
  });

  describe('processExport', () => {
    it('exports customer data in CSV format', async () => {
      mockPrisma.exportJob.update.mockResolvedValue({});
      mockPrisma.customer.findMany.mockResolvedValue([
        { id: 'c-1', firstName: 'John', lastName: 'Doe', email: 'j@e.com' },
        { id: 'c-2', firstName: 'Jane', lastName: 'Smith', email: 's@e.com' },
      ]);

      const result = await service.processExport(TEST_TENANT_ID, 'exp-1', {
        entityType: 'customer',
        format: 'CSV',
      }, audit);

      expect(result.status).toBe('COMPLETED');
      expect(result.totalRows).toBe(2);
      expect(result.fileUrl).toContain('customer_export');
    });

    it('applies isActive filter when provided', async () => {
      mockPrisma.exportJob.update.mockResolvedValue({});
      mockPrisma.customer.findMany.mockResolvedValue([]);

      await service.processExport(TEST_TENANT_ID, 'exp-1', {
        entityType: 'customer',
        format: 'CSV',
        filters: { isActive: true },
      }, audit);

      expect(mockPrisma.customer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isActive: true }),
        }),
      );
    });

    it('supports XLSX format output', async () => {
      mockPrisma.exportJob.update.mockResolvedValue({});
      mockPrisma.product.findMany.mockResolvedValue([{ id: 'p-1', name: 'Ring' }]);

      const result = await service.processExport(TEST_TENANT_ID, 'exp-1', {
        entityType: 'product',
        format: 'XLSX',
      }, audit);

      expect(result.status).toBe('COMPLETED');
      expect(result.fileUrl).toContain('.xlsx');
    });
  });

  describe('getExportJob', () => {
    it('returns job when found', async () => {
      mockPrisma.exportJob.findFirst.mockResolvedValue({ id: 'exp-1', status: 'COMPLETED' });
      const result = await service.getExportJob(TEST_TENANT_ID, 'exp-1');
      expect(result.id).toBe('exp-1');
    });

    it('throws NotFoundException when not found', async () => {
      mockPrisma.exportJob.findFirst.mockResolvedValue(null);
      await expect(service.getExportJob(TEST_TENANT_ID, 'bad')).rejects.toThrow(NotFoundException);
    });
  });

  describe('listExportJobs', () => {
    it('returns paginated results', async () => {
      mockPrisma.exportJob.findMany.mockResolvedValue([{ id: 'e-1' }]);
      mockPrisma.exportJob.count.mockResolvedValue(5);

      const result = await service.listExportJobs(TEST_TENANT_ID, 1, 10);
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(5);
    });
  });
});
