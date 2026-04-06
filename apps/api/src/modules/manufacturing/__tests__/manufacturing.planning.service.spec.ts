import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { createMockPrismaService, mockTenantContext, resetMocks } from '../../../__tests__/mocks';
import { ManufacturingPlanningService } from '../manufacturing.planning.service';

describe('ManufacturingPlanningService', () => {
  let service: ManufacturingPlanningService; let prisma: ReturnType<typeof createMockPrismaService>;
  let mfgService: any;
  const { tenantId, userId } = mockTenantContext;
  beforeEach(() => {
    prisma = createMockPrismaService();
    resetMocks(prisma);
    ['productionPlan','productionPlanItem','jobOrder','karigar'].forEach(m => { (prisma as any)[m] = { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), count: vi.fn() }; });
    mfgService = { createJobOrder: vi.fn().mockResolvedValue({ id: 'job-1' }) };
    service = new ManufacturingPlanningService(prisma as never, mfgService);
  });

  describe('createPlan', () => {
    it('should create plan', async () => {
      (prisma as any).productionPlan.create.mockResolvedValue({ id: 'pp-1', name: 'Plan A', status: 'DRAFT' });
      const r = await service.createPlan(tenantId, userId, { name: 'Plan A', locationId: 'l1', startDate: new Date('2026-01-01'), endDate: new Date('2026-02-01') } as any);
      expect(r.name).toBe('Plan A');
    });
    it('should reject endDate before startDate', async () => {
      await expect(service.createPlan(tenantId, userId, { name: 'Plan', locationId: 'l1', startDate: new Date('2026-02-01'), endDate: new Date('2026-01-01') } as any)).rejects.toThrow(BadRequestException);
    });
  });

  describe('addPlanItem', () => {
    it('should add item to plan', async () => {
      (prisma as any).productionPlan.findFirst.mockResolvedValue({ id: 'pp-1', status: 'DRAFT' });
      (prisma as any).productionPlanItem.create.mockResolvedValue({ id: 'ppi-1', productId: 'p1', quantity: 10 });
      const r = await service.addPlanItem(tenantId, userId, 'pp-1', { productId: 'p1', quantity: 10, priority: 'HIGH' } as any);
      expect(r.productId).toBe('p1');
    });
    it('should reject adding to completed plan', async () => {
      (prisma as any).productionPlan.findFirst.mockResolvedValue({ id: 'pp-1', status: 'COMPLETED' });
      await expect(service.addPlanItem(tenantId, userId, 'pp-1', { productId: 'p1', quantity: 10, priority: 'HIGH' } as any)).rejects.toThrow(BadRequestException);
    });
  });

  describe('generateJobOrdersFromPlan', () => {
    it('should create jobs for items without existing job', async () => {
      (prisma as any).productionPlan.findFirst.mockResolvedValue({ id: 'pp-1', status: 'DRAFT', locationId: 'l1', items: [{ id: 'ppi-1', productId: 'p1', quantity: 5, bomId: null, priority: 'HIGH', estimatedStartDate: null, estimatedEndDate: null }] });
      (prisma as any).productionPlanItem.update.mockResolvedValue({});
      (prisma as any).productionPlan.update.mockResolvedValue({});
      const r = await service.generateJobOrdersFromPlan(tenantId, userId, 'pp-1');
      expect(r.count).toBe(1);
    });
  });

  describe('getCapacityAnalysis', () => {
    it('should return capacity data', async () => {
      (prisma as any).jobOrder.count.mockResolvedValue(5);
      (prisma as any).karigar.count.mockResolvedValueOnce(10).mockResolvedValueOnce(3);
      const r = await service.getCapacityAnalysis(tenantId, 'l1');
      expect(r.activeJobs).toBe(5);
      expect(r.totalKarigars).toBe(10);
      expect(r.availableKarigars).toBe(7);
      expect(r.utilizationPercent).toBe(30);
    });
  });

  describe('findPlanById', () => {
    it('should throw NotFoundException', async () => {
      (prisma as any).productionPlan.findFirst.mockResolvedValue(null);
      await expect(service.findPlanById(tenantId, 'x')).rejects.toThrow(NotFoundException);
    });
  });
});
