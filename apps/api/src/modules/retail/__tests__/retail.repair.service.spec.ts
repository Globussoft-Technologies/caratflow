import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RetailRepairService } from '../retail.repair.service';
import { createMockPrismaService, createMockEventBusService, mockTenantContext, resetMocks } from '../../../__tests__/mocks';

vi.mock('uuid', () => ({ v4: vi.fn(() => 'mock-uuid-' + Math.random().toString(36).slice(2, 10)) }));

describe('RetailRepairService', () => {
  let service: RetailRepairService;
  let prisma: ReturnType<typeof createMockPrismaService>;
  let eventBus: ReturnType<typeof createMockEventBusService>;
  const { tenantId, userId } = mockTenantContext;

  beforeEach(() => {
    prisma = createMockPrismaService();
    resetMocks(prisma);
    eventBus = createMockEventBusService();
    (prisma as any).repairOrder = {
      findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), count: vi.fn(),
    };
    service = new RetailRepairService(prisma as never, eventBus as never);
  });

  const mockRepair = (overrides: Record<string, unknown> = {}) => ({
    id: 'repair-1', tenantId, repairNumber: 'RP/MUM/2604/0001', customerId: 'cust-1',
    locationId: 'loc-1', status: 'RECEIVED', itemDescription: 'Gold ring repair',
    itemWeightMg: 5000n, itemImages: null, diagnosticNotes: null, estimatePaise: null,
    actualCostPaise: null, laborPaise: null, materialPaise: null, promisedDate: null,
    completedDate: null, deliveredDate: null, createdAt: new Date(), updatedAt: new Date(),
    ...overrides,
  });

  describe('createRepairOrder', () => {
    it('should create a repair order with RECEIVED status', async () => {
      prisma.location.findFirst.mockResolvedValue({ city: 'Mumbai' } as any);
      (prisma as any).repairOrder.count.mockResolvedValue(0);
      (prisma as any).repairOrder.create.mockResolvedValue(mockRepair());

      const result = await service.createRepairOrder(tenantId, userId, {
        customerId: 'cust-1', locationId: 'loc-1', itemDescription: 'Gold ring repair',
      } as any);

      expect(result.status).toBe('RECEIVED');
      expect(result.itemDescription).toBe('Gold ring repair');
    });

    it('should publish retail.repair.created event', async () => {
      prisma.location.findFirst.mockResolvedValue({ city: 'Mumbai' } as any);
      (prisma as any).repairOrder.count.mockResolvedValue(0);
      (prisma as any).repairOrder.create.mockResolvedValue(mockRepair());

      await service.createRepairOrder(tenantId, userId, {
        customerId: 'cust-1', locationId: 'loc-1', itemDescription: 'Ring repair',
      } as any);

      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'retail.repair.created' }),
      );
    });

    it('should generate repair number with location code', async () => {
      prisma.location.findFirst.mockResolvedValue({ city: 'Mumbai' } as any);
      (prisma as any).repairOrder.count.mockResolvedValue(2);
      (prisma as any).repairOrder.create.mockImplementation(async ({ data }: any) => ({
        ...mockRepair(), repairNumber: data.repairNumber,
      }));

      await service.createRepairOrder(tenantId, userId, {
        customerId: 'cust-1', locationId: 'loc-1', itemDescription: 'test',
      } as any);

      expect((prisma as any).repairOrder.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ repairNumber: expect.stringContaining('RP/MUM/') }) }),
      );
    });
  });

  describe('updateRepairStatus', () => {
    it('should transition RECEIVED -> DIAGNOSED', async () => {
      (prisma as any).repairOrder.findFirst.mockResolvedValue(mockRepair({ status: 'RECEIVED' }));
      (prisma as any).repairOrder.update.mockResolvedValue(mockRepair({ status: 'DIAGNOSED' }));

      const result = await service.updateRepairStatus(tenantId, userId, 'repair-1', { status: 'DIAGNOSED' } as any);
      expect(result.status).toBe('DIAGNOSED');
    });

    it('should transition DIAGNOSED -> QUOTED', async () => {
      (prisma as any).repairOrder.findFirst.mockResolvedValue(mockRepair({ status: 'DIAGNOSED' }));
      (prisma as any).repairOrder.update.mockResolvedValue(mockRepair({ status: 'QUOTED' }));

      const result = await service.updateRepairStatus(tenantId, userId, 'repair-1', { status: 'QUOTED' } as any);
      expect(result.status).toBe('QUOTED');
    });

    it('should reject invalid transition RECEIVED -> COMPLETED', async () => {
      (prisma as any).repairOrder.findFirst.mockResolvedValue(mockRepair({ status: 'RECEIVED' }));

      await expect(
        service.updateRepairStatus(tenantId, userId, 'repair-1', { status: 'COMPLETED' } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should auto-set completedDate on COMPLETED transition', async () => {
      (prisma as any).repairOrder.findFirst.mockResolvedValue(mockRepair({ status: 'IN_PROGRESS' }));
      (prisma as any).repairOrder.update.mockResolvedValue(mockRepair({ status: 'COMPLETED' }));

      await service.updateRepairStatus(tenantId, userId, 'repair-1', { status: 'COMPLETED' } as any);

      expect((prisma as any).repairOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ completedDate: expect.any(Date) }) }),
      );
    });

    it('should auto-set deliveredDate on DELIVERED transition', async () => {
      (prisma as any).repairOrder.findFirst.mockResolvedValue(mockRepair({ status: 'COMPLETED' }));
      (prisma as any).repairOrder.update.mockResolvedValue(mockRepair({ status: 'DELIVERED' }));

      await service.updateRepairStatus(tenantId, userId, 'repair-1', { status: 'DELIVERED' } as any);

      expect((prisma as any).repairOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ deliveredDate: expect.any(Date) }) }),
      );
    });

    it('should throw NotFoundException for nonexistent repair', async () => {
      (prisma as any).repairOrder.findFirst.mockResolvedValue(null);

      await expect(
        service.updateRepairStatus(tenantId, userId, 'nonexistent', { status: 'DIAGNOSED' } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should include labor and material costs in update data', async () => {
      (prisma as any).repairOrder.findFirst.mockResolvedValue(mockRepair({ status: 'IN_PROGRESS' }));
      (prisma as any).repairOrder.update.mockResolvedValue(mockRepair({ status: 'COMPLETED' }));

      await service.updateRepairStatus(tenantId, userId, 'repair-1', {
        status: 'COMPLETED', laborPaise: 50000, materialPaise: 20000,
      } as any);

      expect((prisma as any).repairOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ laborPaise: 50000n, materialPaise: 20000n }) }),
      );
    });
  });

  describe('getRepairQueue', () => {
    it('should group repairs by status excluding DELIVERED and CANCELLED', async () => {
      (prisma as any).repairOrder.findMany.mockResolvedValue([
        mockRepair({ status: 'RECEIVED' }),
        mockRepair({ status: 'DIAGNOSED', id: 'r2' }),
        mockRepair({ status: 'IN_PROGRESS', id: 'r3' }),
      ]);

      const queue = await service.getRepairQueue(tenantId, 'loc-1');

      expect(queue.RECEIVED).toHaveLength(1);
      expect(queue.DIAGNOSED).toHaveLength(1);
      expect(queue.IN_PROGRESS).toHaveLength(1);
      expect(queue.COMPLETED).toHaveLength(0);
    });
  });

  describe('getRepairOrder', () => {
    it('should return repair by id', async () => {
      (prisma as any).repairOrder.findFirst.mockResolvedValue(mockRepair());
      const result = await service.getRepairOrder(tenantId, 'repair-1');
      expect(result.id).toBe('repair-1');
    });

    it('should throw NotFoundException when not found', async () => {
      (prisma as any).repairOrder.findFirst.mockResolvedValue(null);
      await expect(service.getRepairOrder(tenantId, 'nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});
