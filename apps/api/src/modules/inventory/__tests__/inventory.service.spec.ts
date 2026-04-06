import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { InventoryService } from '../inventory.service';
import {
  createMockPrismaService,
  createMockEventBusService,
  createMockStockItem,
  createMockProduct,
  mockTenantContext,
  TEST_LOCATION,
  resetMocks,
  capturePublishedEvents,
} from '../../../__tests__/mocks';

vi.mock('uuid', () => ({
  v4: vi.fn(() => 'mock-uuid-' + Math.random().toString(36).slice(2, 10)),
}));

describe('InventoryService', () => {
  let service: InventoryService;
  let prisma: ReturnType<typeof createMockPrismaService>;
  let eventBus: ReturnType<typeof createMockEventBusService>;
  const { tenantId, userId } = mockTenantContext;

  beforeEach(() => {
    prisma = createMockPrismaService();
    resetMocks(prisma);
    eventBus = createMockEventBusService();
    capturePublishedEvents(eventBus);
    service = new InventoryService(prisma as never, eventBus as never);
    eventBus.publishedEvents = [];
  });

  // ─── Stock Items CRUD ──────────────────────────────────────────

  describe('createStockItem', () => {
    it('should create a stock item successfully', async () => {
      prisma.stockItem.findFirst.mockResolvedValue(null);
      const mockItem = createMockStockItem();
      prisma.stockItem.create.mockResolvedValue(mockItem);

      const result = await service.createStockItem(tenantId, userId, {
        productId: mockItem.productId,
        locationId: mockItem.locationId,
        quantityOnHand: 10,
      } as never);

      expect(result).toBeDefined();
      expect(prisma.stockItem.create).toHaveBeenCalled();
    });

    it('should throw if stock item already exists at that product+location', async () => {
      prisma.stockItem.findFirst.mockResolvedValue(createMockStockItem());

      await expect(
        service.createStockItem(tenantId, userId, {
          productId: 'prod-id',
          locationId: 'loc-id',
        } as never),
      ).rejects.toThrow(BadRequestException);
    });

    it('should publish inventory.item.created event', async () => {
      prisma.stockItem.findFirst.mockResolvedValue(null);
      prisma.stockItem.create.mockResolvedValue(createMockStockItem());

      await service.createStockItem(tenantId, userId, {
        productId: 'prod-id',
        locationId: 'loc-id',
        quantityOnHand: 5,
      } as never);

      expect(eventBus.publish).toHaveBeenCalled();
      const event = eventBus.publishedEvents[0];
      expect(event.type).toBe('inventory.item.created');
    });
  });

  describe('findAllStockItems', () => {
    it('should return paginated stock items', async () => {
      const items = [createMockStockItem(), createMockStockItem()];
      prisma.stockItem.findMany.mockResolvedValue(items);
      prisma.stockItem.count.mockResolvedValue(2);

      const result = await service.findAllStockItems(tenantId, {
        page: 1,
        limit: 10,
      } as never);

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
    });

    it('should filter by locationId when provided', async () => {
      prisma.stockItem.findMany.mockResolvedValue([]);
      prisma.stockItem.count.mockResolvedValue(0);

      await service.findAllStockItems(tenantId, {
        page: 1,
        limit: 10,
        locationId: 'loc-1',
      } as never);

      expect(prisma.stockItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId, locationId: 'loc-1' }),
        }),
      );
    });
  });

  describe('findStockItemById', () => {
    it('should return stock item with product and location', async () => {
      const mockItem = createMockStockItem();
      prisma.stockItem.findFirst.mockResolvedValue(mockItem);

      const result = await service.findStockItemById(tenantId, mockItem.id);

      expect(result).toBeDefined();
    });

    it('should throw NotFoundException if not found', async () => {
      prisma.stockItem.findFirst.mockResolvedValue(null);

      await expect(service.findStockItemById(tenantId, 'nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateStockItem', () => {
    it('should update and publish event', async () => {
      const existing = createMockStockItem();
      prisma.stockItem.findFirst.mockResolvedValue(existing);
      prisma.stockItem.update.mockResolvedValue({ ...existing, reorderLevel: 20 });

      const result = await service.updateStockItem(tenantId, userId, existing.id, {
        reorderLevel: 20,
      } as never);

      expect(result).toBeDefined();
      expect(eventBus.publish).toHaveBeenCalled();
    });

    it('should throw NotFoundException if item not found', async () => {
      prisma.stockItem.findFirst.mockResolvedValue(null);

      await expect(
        service.updateStockItem(tenantId, userId, 'nonexistent', {} as never),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── Stock Movements ───────────────────────────────────────────

  describe('recordMovement', () => {
    it('should increase quantity for IN movement', async () => {
      const stockItem = createMockStockItem({ quantityOnHand: 10 });
      prisma.stockItem.findFirst.mockResolvedValue(stockItem);
      prisma.$transaction.mockResolvedValue([
        { id: 'movement-id', stockItem },
        { ...stockItem, quantityOnHand: 15 },
      ]);

      const result = await service.recordMovement(tenantId, userId, {
        stockItemId: stockItem.id,
        movementType: 'IN',
        quantityChange: 5,
      } as never);

      expect(result).toBeDefined();
    });

    it('should decrease quantity for OUT movement', async () => {
      const stockItem = createMockStockItem({ quantityOnHand: 10 });
      prisma.stockItem.findFirst.mockResolvedValue(stockItem);
      prisma.$transaction.mockResolvedValue([
        { id: 'movement-id', stockItem },
        { ...stockItem, quantityOnHand: 7 },
      ]);

      const result = await service.recordMovement(tenantId, userId, {
        stockItemId: stockItem.id,
        movementType: 'OUT',
        quantityChange: -3,
      } as never);

      expect(result).toBeDefined();
    });

    it('should reject OUT movement when insufficient stock', async () => {
      const stockItem = createMockStockItem({ quantityOnHand: 2 });
      prisma.stockItem.findFirst.mockResolvedValue(stockItem);

      await expect(
        service.recordMovement(tenantId, userId, {
          stockItemId: stockItem.id,
          movementType: 'OUT',
          quantityChange: -5,
        } as never),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create movement record in transaction', async () => {
      const stockItem = createMockStockItem({ quantityOnHand: 10 });
      prisma.stockItem.findFirst.mockResolvedValue(stockItem);
      prisma.$transaction.mockResolvedValue([
        { id: 'movement-id', stockItem },
        {},
      ]);

      await service.recordMovement(tenantId, userId, {
        stockItemId: stockItem.id,
        movementType: 'ADJUST',
        quantityChange: 3,
      } as never);

      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should publish inventory.stock.adjusted event', async () => {
      const stockItem = createMockStockItem({ quantityOnHand: 10 });
      prisma.stockItem.findFirst.mockResolvedValue(stockItem);
      prisma.$transaction.mockResolvedValue([{ id: 'movement-id', stockItem }, {}]);

      await service.recordMovement(tenantId, userId, {
        stockItemId: stockItem.id,
        movementType: 'IN',
        quantityChange: 5,
      } as never);

      expect(eventBus.publishedEvents.some((e) => e.type === 'inventory.stock.adjusted')).toBe(true);
    });

    it('should throw NotFoundException for non-existent stock item', async () => {
      prisma.stockItem.findFirst.mockResolvedValue(null);

      await expect(
        service.recordMovement(tenantId, userId, {
          stockItemId: 'nonexistent',
          movementType: 'IN',
          quantityChange: 1,
        } as never),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── Stock Transfers ───────────────────────────────────────────

  describe('createTransfer', () => {
    it('should create a DRAFT transfer', async () => {
      const transfer = {
        id: 'transfer-id',
        tenantId,
        status: 'DRAFT',
        fromLocationId: 'loc-a',
        toLocationId: 'loc-b',
        items: [],
      };
      prisma.stockTransfer.create.mockResolvedValue(transfer);

      const result = await service.createTransfer(tenantId, userId, {
        fromLocationId: 'loc-a',
        toLocationId: 'loc-b',
        items: [{ productId: 'p1', quantityRequested: 5 }],
      } as never);

      expect(result.status).toBe('DRAFT');
    });

    it('should reject transfer with same source and destination', async () => {
      await expect(
        service.createTransfer(tenantId, userId, {
          fromLocationId: 'loc-a',
          toLocationId: 'loc-a',
          items: [{ productId: 'p1', quantityRequested: 5 }],
        } as never),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('approveTransfer', () => {
    it('should change status from DRAFT to IN_TRANSIT', async () => {
      const transfer = {
        id: 'transfer-id',
        tenantId,
        status: 'DRAFT',
        fromLocationId: 'loc-a',
        toLocationId: 'loc-b',
        items: [{ id: 'item-1', productId: 'p1', quantityRequested: 5, quantitySent: 0 }],
      };
      prisma.stockTransfer.findFirst.mockResolvedValue(transfer);
      prisma.stockItem.findFirst.mockResolvedValue(createMockStockItem({ quantityOnHand: 20 }));
      prisma.stockTransfer.update.mockResolvedValue({ ...transfer, status: 'IN_TRANSIT' });
      prisma.$transaction.mockResolvedValue([{ id: 'movement-id' }, {}]);
      prisma.stockTransferItem.update.mockResolvedValue({});

      const result = await service.approveTransfer(tenantId, userId, 'transfer-id');

      expect(result.status).toBe('IN_TRANSIT');
    });

    it('should reject approving a CANCELLED transfer', async () => {
      prisma.stockTransfer.findFirst.mockResolvedValue({
        id: 'transfer-id',
        status: 'CANCELLED',
        items: [],
      });

      await expect(
        service.approveTransfer(tenantId, userId, 'transfer-id'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('receiveTransfer', () => {
    it('should reject receiving non-IN_TRANSIT transfer', async () => {
      prisma.stockTransfer.findFirst.mockResolvedValue({
        id: 'transfer-id',
        status: 'DRAFT',
        items: [],
      });

      await expect(
        service.receiveTransfer(tenantId, userId, 'transfer-id'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── Stock Takes ───────────────────────────────────────────────

  describe('createStockTake', () => {
    it('should create stock take and populate system quantities', async () => {
      const stockItems = [
        createMockStockItem({ quantityOnHand: 10 }),
        createMockStockItem({ quantityOnHand: 5 }),
      ];
      prisma.stockItem.findMany.mockResolvedValue(stockItems);
      const stockTake = {
        id: 'st-id',
        tenantId,
        locationId: 'loc-a',
        status: 'DRAFT',
        items: stockItems.map((si) => ({
          productId: si.productId,
          systemQuantity: si.quantityOnHand,
        })),
      };
      prisma.stockTake.create.mockResolvedValue(stockTake);

      const result = await service.createStockTake(tenantId, userId, {
        locationId: 'loc-a',
      } as never);

      expect(result.status).toBe('DRAFT');
      expect(result.items).toHaveLength(2);
    });
  });

  describe('addStockTakeCounts', () => {
    it('should update counted quantities', async () => {
      prisma.stockTake.findFirst.mockResolvedValue({
        id: 'st-id',
        tenantId,
        status: 'DRAFT',
      });
      prisma.stockTake.update.mockResolvedValue({});
      prisma.stockTakeItem.findFirst.mockResolvedValue({
        id: 'sti-id',
        productId: 'p1',
        systemQuantity: 10,
      });
      prisma.stockTakeItem.update.mockResolvedValue({});
      prisma.stockTake.findFirst.mockResolvedValue({
        id: 'st-id',
        items: [{ productId: 'p1', systemQuantity: 10, countedQuantity: 8 }],
      });

      const result = await service.addStockTakeCounts(tenantId, userId, 'st-id', [
        { productId: 'p1', countedQuantity: 8 },
      ] as never);

      expect(result).toBeDefined();
    });

    it('should reject adding counts to COMPLETED stock take', async () => {
      prisma.stockTake.findFirst.mockResolvedValue({
        id: 'st-id',
        tenantId,
        status: 'COMPLETED',
      });

      await expect(
        service.addStockTakeCounts(tenantId, userId, 'st-id', [] as never),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('completeStockTake', () => {
    it('should calculate variances and adjust stock', async () => {
      const stockTake = {
        id: 'st-id',
        tenantId,
        locationId: 'loc-a',
        status: 'IN_PROGRESS',
        items: [
          {
            productId: 'p1',
            systemQuantity: 10,
            countedQuantity: 8,
            varianceQuantity: -2,
          },
        ],
      };
      prisma.stockTake.findFirst.mockResolvedValue(stockTake);
      prisma.stockItem.findFirst.mockResolvedValue(
        createMockStockItem({ quantityOnHand: 10 }),
      );
      prisma.$transaction.mockResolvedValue([{ id: 'movement-id' }, {}]);
      prisma.stockItem.updateMany.mockResolvedValue({ count: 1 });
      prisma.stockTake.update.mockResolvedValue({ ...stockTake, status: 'COMPLETED' });

      const result = await service.completeStockTake(tenantId, userId, 'st-id');

      expect(result.status).toBe('COMPLETED');
    });

    it('should reject completing non-IN_PROGRESS stock take', async () => {
      prisma.stockTake.findFirst.mockResolvedValue({
        id: 'st-id',
        tenantId,
        status: 'DRAFT',
        items: [],
      });

      await expect(
        service.completeStockTake(tenantId, userId, 'st-id'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject if items have not been counted', async () => {
      prisma.stockTake.findFirst.mockResolvedValue({
        id: 'st-id',
        tenantId,
        status: 'IN_PROGRESS',
        items: [{ productId: 'p1', systemQuantity: 10, countedQuantity: null }],
      });

      await expect(
        service.completeStockTake(tenantId, userId, 'st-id'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── Metal Stock ───────────────────────────────────────────────

  describe('adjustMetalStock', () => {
    it('should increase metal stock weight', async () => {
      prisma.metalStock.findFirst.mockResolvedValue({
        id: 'ms-id',
        weightMg: 100000n,
        valuePaise: 500000n,
      });
      prisma.metalStock.update.mockResolvedValue({
        id: 'ms-id',
        weightMg: 150000n,
        valuePaise: 750000n,
      });

      const result = await service.adjustMetalStock(tenantId, userId, {
        locationId: 'loc-a',
        metalType: 'GOLD',
        purityFineness: 916,
        weightChangeMg: 50000n,
        valueChangePaise: 250000n,
      } as never);

      expect(Number(result.weightMg)).toBe(150000);
    });

    it('should create new metal stock record if none exists', async () => {
      prisma.metalStock.findFirst.mockResolvedValue(null);
      prisma.metalStock.create.mockResolvedValue({
        id: 'ms-new',
        weightMg: 50000n,
        valuePaise: 250000n,
      });

      const result = await service.adjustMetalStock(tenantId, userId, {
        locationId: 'loc-a',
        metalType: 'GOLD',
        purityFineness: 916,
        weightChangeMg: 50000n,
        valueChangePaise: 250000n,
      } as never);

      expect(prisma.metalStock.create).toHaveBeenCalled();
    });

    it('should reject deduction from non-existent metal stock', async () => {
      prisma.metalStock.findFirst.mockResolvedValue(null);

      await expect(
        service.adjustMetalStock(tenantId, userId, {
          locationId: 'loc-a',
          metalType: 'GOLD',
          purityFineness: 916,
          weightChangeMg: -50000n,
          valueChangePaise: -250000n,
        } as never),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject if adjustment would make weight negative', async () => {
      prisma.metalStock.findFirst.mockResolvedValue({
        id: 'ms-id',
        weightMg: 10000n,
        valuePaise: 50000n,
      });

      await expect(
        service.adjustMetalStock(tenantId, userId, {
          locationId: 'loc-a',
          metalType: 'GOLD',
          purityFineness: 916,
          weightChangeMg: -20000n,
          valueChangePaise: -100000n,
        } as never),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── Serial Numbers ────────────────────────────────────────────

  describe('createSerialNumber', () => {
    it('should create a new serial number', async () => {
      prisma.serialNumber.findFirst.mockResolvedValue(null);
      prisma.serialNumber.create.mockResolvedValue({
        id: 'sn-id',
        serialNumber: 'SN-001',
        status: 'AVAILABLE',
      });

      const result = await service.createSerialNumber(tenantId, userId, {
        productId: 'p1',
        serialNumber: 'SN-001',
      } as never);

      expect(result.status).toBe('AVAILABLE');
    });

    it('should reject duplicate serial number', async () => {
      prisma.serialNumber.findFirst.mockResolvedValue({ id: 'existing' });

      await expect(
        service.createSerialNumber(tenantId, userId, {
          productId: 'p1',
          serialNumber: 'SN-001',
        } as never),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateSerialNumberStatus', () => {
    it('should update serial number status', async () => {
      prisma.serialNumber.findFirst.mockResolvedValue({
        id: 'sn-id',
        status: 'AVAILABLE',
        locationId: 'loc-a',
      });
      prisma.serialNumber.update.mockResolvedValue({
        id: 'sn-id',
        status: 'SOLD',
      });

      const result = await service.updateSerialNumberStatus(tenantId, userId, {
        id: 'sn-id',
        status: 'SOLD',
      } as never);

      expect(result.status).toBe('SOLD');
    });

    it('should throw if serial number not found', async () => {
      prisma.serialNumber.findFirst.mockResolvedValue(null);

      await expect(
        service.updateSerialNumberStatus(tenantId, userId, {
          id: 'nonexistent',
          status: 'SOLD',
        } as never),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── Batch/Lot ─────────────────────────────────────────────────

  describe('createBatchLot', () => {
    it('should create batch lot with initial quantity', async () => {
      prisma.batchLot.create.mockResolvedValue({
        id: 'bl-id',
        batchNumber: 'BATCH-001',
        quantityInitial: 100,
        quantityCurrent: 100,
      });

      const result = await service.createBatchLot(tenantId, userId, {
        productId: 'p1',
        batchNumber: 'BATCH-001',
        sourceType: 'PURCHASE',
        quantityInitial: 100,
      } as never);

      expect(result.quantityCurrent).toBe(100);
    });
  });

  describe('adjustBatchLotQuantity', () => {
    it('should adjust quantity correctly', async () => {
      prisma.batchLot.findFirst.mockResolvedValue({
        id: 'bl-id',
        quantityCurrent: 100,
      });
      prisma.batchLot.update.mockResolvedValue({
        id: 'bl-id',
        quantityCurrent: 90,
      });

      const result = await service.adjustBatchLotQuantity(tenantId, userId, 'bl-id', -10);

      expect(result.quantityCurrent).toBe(90);
    });

    it('should reject if quantity would go negative', async () => {
      prisma.batchLot.findFirst.mockResolvedValue({
        id: 'bl-id',
        quantityCurrent: 5,
      });

      await expect(
        service.adjustBatchLotQuantity(tenantId, userId, 'bl-id', -10),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException for non-existent batch lot', async () => {
      prisma.batchLot.findFirst.mockResolvedValue(null);

      await expect(
        service.adjustBatchLotQuantity(tenantId, userId, 'nonexistent', 5),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── Tenant Isolation ──────────────────────────────────────────

  describe('tenant isolation', () => {
    it('should always include tenantId in stock item queries', async () => {
      prisma.stockItem.findFirst.mockResolvedValue(null);

      try {
        await service.findStockItemById(tenantId, 'some-id');
      } catch {
        // Expected NotFoundException
      }

      expect(prisma.stockItem.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId }),
        }),
      );
    });

    it('should always include tenantId in transfer queries', async () => {
      prisma.stockTransfer.findFirst.mockResolvedValue(null);

      try {
        await service.approveTransfer(tenantId, userId, 'some-id');
      } catch {
        // Expected NotFoundException
      }

      expect(prisma.stockTransfer.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId }),
        }),
      );
    });
  });
});
