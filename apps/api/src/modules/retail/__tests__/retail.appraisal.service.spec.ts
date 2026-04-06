import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { createMockPrismaService, mockTenantContext, resetMocks } from '../../../__tests__/mocks';
vi.mock('uuid', () => ({ v4: vi.fn(() => 'mock-uuid') }));

import { RetailAppraisalService } from '../retail.appraisal.service';
describe('RetailAppraisalService', () => {
  let service: RetailAppraisalService; let prisma: ReturnType<typeof createMockPrismaService>;
  const { tenantId, userId } = mockTenantContext;
  beforeEach(() => {
    prisma = createMockPrismaService();
    resetMocks(prisma);
    (prisma as any).appraisal = { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), count: vi.fn() };
    service = new RetailAppraisalService(prisma as never);
  });
  const mk = (o: Record<string, unknown> = {}) => ({
    id: 'ap-1', tenantId, appraisalNumber: 'AP/2604/0001', customerId: 'c1', locationId: 'l1',
    itemDescription: 'Gold necklace', metalType: 'GOLD', weightMg: 20000n, purityFineness: 916,
    stoneDetails: null, appraisedValuePaise: 1200000n, appraisedBy: 'expert-1',
    appraisedAt: new Date(), validUntil: new Date('2026-07-07'), certificateUrl: null, notes: null,
    createdAt: new Date(), updatedAt: new Date(), ...o,
  });

  describe('createAppraisal', () => {
    it('should create appraisal', async () => {
      (prisma as any).appraisal.count.mockResolvedValue(0);
      (prisma as any).appraisal.create.mockResolvedValue(mk());
      const r = await service.createAppraisal(tenantId, userId, { customerId: 'c1', locationId: 'l1', itemDescription: 'Gold necklace', appraisedValuePaise: 1200000, appraisedBy: 'expert-1' } as any);
      expect(r.appraisedValuePaise).toBe(1200000);
    });
    it('should set appraisedAt to current date', async () => {
      (prisma as any).appraisal.count.mockResolvedValue(0);
      (prisma as any).appraisal.create.mockImplementation(async ({ data }: any) => ({ ...mk(), appraisedAt: data.appraisedAt }));
      await service.createAppraisal(tenantId, userId, { customerId: 'c1', locationId: 'l1', itemDescription: 'test', appraisedValuePaise: 100, appraisedBy: 'exp' } as any);
      expect((prisma as any).appraisal.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ appraisedAt: expect.any(Date) }) }));
    });
  });

  describe('getAppraisal', () => {
    it('should return appraisal', async () => {
      (prisma as any).appraisal.findFirst.mockResolvedValue(mk());
      const r = await service.getAppraisal(tenantId, 'ap-1');
      expect(r.id).toBe('ap-1');
    });
    it('should throw NotFoundException', async () => {
      (prisma as any).appraisal.findFirst.mockResolvedValue(null);
      await expect(service.getAppraisal(tenantId, 'x')).rejects.toThrow(NotFoundException);
    });
  });

  describe('listAppraisals', () => {
    it('should return paginated list', async () => {
      (prisma as any).appraisal.findMany.mockResolvedValue([mk()]);
      (prisma as any).appraisal.count.mockResolvedValue(1);
      const r = await service.listAppraisals(tenantId, {}, { page: 1, limit: 10 } as any);
      expect(r.total).toBe(1);
      expect(r.items).toHaveLength(1);
    });
    it('should filter by customerId', async () => {
      (prisma as any).appraisal.findMany.mockResolvedValue([]);
      (prisma as any).appraisal.count.mockResolvedValue(0);
      await service.listAppraisals(tenantId, { customerId: 'c1' }, { page: 1, limit: 10 } as any);
      expect((prisma as any).appraisal.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ customerId: 'c1' }) }));
    });
  });
});
