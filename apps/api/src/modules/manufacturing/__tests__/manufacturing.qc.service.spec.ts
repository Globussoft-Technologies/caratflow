import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { createMockPrismaService, mockTenantContext, resetMocks } from '../../../__tests__/mocks';
import { ManufacturingQcService } from '../manufacturing.qc.service';

describe('ManufacturingQcService', () => {
  let service: ManufacturingQcService; let prisma: ReturnType<typeof createMockPrismaService>;
  const { tenantId, userId } = mockTenantContext;
  beforeEach(() => {
    prisma = createMockPrismaService();
    resetMocks(prisma);
    ['jobOrder','qualityCheckpoint'].forEach(m => { (prisma as any)[m] = { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn() }; });
    service = new ManufacturingQcService(prisma as never);
  });

  describe('recordCheckpoint', () => {
    it('should create checkpoint', async () => {
      (prisma as any).jobOrder.findFirst.mockResolvedValue({ id: 'j-1' });
      (prisma as any).qualityCheckpoint.create.mockResolvedValue({ id: 'qc-1', status: 'PASSED', jobOrder: { id: 'j-1', jobNumber: 'JO-1' } });
      const r = await service.recordCheckpoint(tenantId, userId, { jobOrderId: 'j-1', checkpointType: 'WEIGHT', checkedBy: 'user-1', status: 'PASSED' } as any);
      expect(r.status).toBe('PASSED');
    });
    it('should throw NotFoundException for missing job', async () => {
      (prisma as any).jobOrder.findFirst.mockResolvedValue(null);
      await expect(service.recordCheckpoint(tenantId, userId, { jobOrderId: 'x', checkpointType: 'WEIGHT', checkedBy: 'u', status: 'PASSED' } as any)).rejects.toThrow(NotFoundException);
    });
  });

  describe('passJob', () => {
    it('should transition QC_PENDING to QC_PASSED', async () => {
      (prisma as any).jobOrder.findFirst.mockResolvedValue({ id: 'j-1', status: 'QC_PENDING' });
      (prisma as any).jobOrder.update.mockResolvedValue({ id: 'j-1', status: 'QC_PASSED' });
      const r = await service.passJob(tenantId, userId, 'j-1');
      expect(r.status).toBe('QC_PASSED');
    });
    it('should reject non-QC_PENDING status', async () => {
      (prisma as any).jobOrder.findFirst.mockResolvedValue({ id: 'j-1', status: 'IN_PROGRESS' });
      await expect(service.passJob(tenantId, userId, 'j-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('failJob', () => {
    it('should transition to QC_FAILED', async () => {
      (prisma as any).jobOrder.findFirst.mockResolvedValue({ id: 'j-1', status: 'QC_PENDING' });
      (prisma as any).jobOrder.update.mockResolvedValue({ id: 'j-1', status: 'QC_FAILED' });
      const r = await service.failJob(tenantId, userId, 'j-1', 'Weight mismatch');
      expect(r.status).toBe('QC_FAILED');
    });
  });

  describe('getPendingQcJobs', () => {
    it('should return QC_PENDING jobs', async () => {
      (prisma as any).jobOrder.findMany.mockResolvedValue([{ id: 'j-1', status: 'QC_PENDING' }]);
      const r = await service.getPendingQcJobs(tenantId);
      expect(r).toHaveLength(1);
    });
  });
});
