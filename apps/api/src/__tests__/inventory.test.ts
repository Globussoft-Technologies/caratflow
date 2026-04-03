import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InventoryService } from '../modules/inventory/inventory.service';
import { createMockPrismaService, createMockEventBus, TEST_TENANT_ID, TEST_USER_ID, resetAllMocks } from './setup';

describe('InventoryService', () => {
  let service: InventoryService;
  let mockPrisma: ReturnType<typeof createMockPrismaService>;
  let mockEventBus: ReturnType<typeof createMockEventBus>;

  beforeEach(() => {
    mockPrisma = createMockPrismaService();
    mockEventBus = createMockEventBus();
    service = new InventoryService(mockPrisma as any, mockEventBus as any);
    resetAllMocks(mockPrisma);
  });

  // ─── Create Stock Item ───────────────────────────────────────

  describe('createStockItem', () => {
    it('creates a new stock item successfully', async () => {
      mockPrisma.stockItem.findFirst.mockResolvedValue(null); // no duplicate
      mockPrisma.stockItem.create.mockResolvedValue({
        id: 'stock-1',
        tenantId: TEST_TENANT_ID,
        productId: 'product-1',
        locationId: 'location-1',
        quantityOnHand: 10,
        quantityReserved: 0,
        quantityOnOrder: 0,
        reorderLevel: 5,
        reorderQuantity: 20,
        binLocation: 'A-1-1',
        product: { id: 'product-1', sku: 'GR-001', name: 'Gold Ring', productType: 'JEWELRY' },
        location: { id: 'location-1', name: 'Main Store', locationType: 'STORE' },
      });

      const result = await service.createStockItem(TEST_TENANT_ID, TEST_USER_ID, {
        productId: 'product-1',
        locationId: 'location-1',
        quantityOnHand: 10,
        reorderLevel: 5,
        reorderQuantity: 20,
        binLocation: 'A-1-1',
      });

      expect(result).toBeDefined();
      expect(mockPrisma.stockItem.create).toHaveBeenCalledTimes(1);
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'inventory.item.created' }),
      );
    });

    it('throws BadRequestException when stock item already exists at location', async () => {
      mockPrisma.stockItem.findFirst.mockResolvedValue({
        id: 'existing-stock',
        productId: 'product-1',
        locationId: 'location-1',
      });

      await expect(
        service.createStockItem(TEST_TENANT_ID, TEST_USER_ID, {
          productId: 'product-1',
          locationId: 'location-1',
        }),
      ).rejects.toThrow('Stock item already exists');
    });
  });

  // ─── Stock Movements ─────────────────────────────────────────

  describe('recordMovement', () => {
    it('records IN movement and updates quantity', async () => {
      mockPrisma.stockItem.findFirst.mockResolvedValue({
        id: 'stock-1',
        tenantId: TEST_TENANT_ID,
        productId: 'product-1',
        locationId: 'location-1',
        quantityOnHand: 10,
      });

      const mockMovement = {
        id: 'movement-1',
        stockItemId: 'stock-1',
        movementType: 'IN',
        quantityChange: 5,
        stockItem: {
          id: 'stock-1',
          product: { id: 'product-1', sku: 'GR-001', name: 'Gold Ring' },
          location: { id: 'location-1', name: 'Main Store' },
        },
      };

      mockPrisma.$transaction.mockImplementation(async (operations: unknown[]) => {
        return [mockMovement, { quantityOnHand: 15 }];
      });

      const result = await service.recordMovement(TEST_TENANT_ID, TEST_USER_ID, {
        stockItemId: 'stock-1',
        movementType: 'IN',
        quantityChange: 5,
        notes: 'Purchase receipt',
      });

      expect(result).toBeDefined();
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'inventory.stock.adjusted' }),
      );
    });

    it('throws when OUT movement would result in negative stock', async () => {
      mockPrisma.stockItem.findFirst.mockResolvedValue({
        id: 'stock-1',
        tenantId: TEST_TENANT_ID,
        productId: 'product-1',
        locationId: 'location-1',
        quantityOnHand: 3,
      });

      await expect(
        service.recordMovement(TEST_TENANT_ID, TEST_USER_ID, {
          stockItemId: 'stock-1',
          movementType: 'OUT',
          quantityChange: -5, // trying to take out more than available
        }),
      ).rejects.toThrow('Insufficient stock');
    });

    it('throws when stock item not found', async () => {
      mockPrisma.stockItem.findFirst.mockResolvedValue(null);

      await expect(
        service.recordMovement(TEST_TENANT_ID, TEST_USER_ID, {
          stockItemId: 'nonexistent',
          movementType: 'IN',
          quantityChange: 5,
        }),
      ).rejects.toThrow('Stock item not found');
    });
  });

  // ─── Find Stock Item ─────────────────────────────────────────

  describe('findStockItemById', () => {
    it('returns stock item with product and location details', async () => {
      mockPrisma.stockItem.findFirst.mockResolvedValue({
        id: 'stock-1',
        tenantId: TEST_TENANT_ID,
        productId: 'product-1',
        locationId: 'location-1',
        quantityOnHand: 10,
        quantityReserved: 2,
        quantityOnOrder: 5,
        reorderLevel: 5,
        reorderQuantity: 20,
        binLocation: 'A-1-1',
        product: { id: 'product-1', sku: 'GR-001', name: 'Gold Ring', productType: 'JEWELRY' },
        location: { id: 'location-1', name: 'Main Store', locationType: 'STORE' },
        movements: [],
      });

      const result = await service.findStockItemById(TEST_TENANT_ID, 'stock-1');
      expect(result).toBeDefined();
    });

    it('throws NotFoundException when stock item does not exist', async () => {
      mockPrisma.stockItem.findFirst.mockResolvedValue(null);

      await expect(
        service.findStockItemById(TEST_TENANT_ID, 'nonexistent'),
      ).rejects.toThrow('Stock item not found');
    });
  });

  // ─── Update Stock Item ───────────────────────────────────────

  describe('updateStockItem', () => {
    it('updates stock item properties', async () => {
      mockPrisma.stockItem.findFirst.mockResolvedValue({
        id: 'stock-1',
        tenantId: TEST_TENANT_ID,
      });

      mockPrisma.stockItem.update.mockResolvedValue({
        id: 'stock-1',
        tenantId: TEST_TENANT_ID,
        reorderLevel: 10,
        binLocation: 'B-2-3',
        product: { id: 'product-1', sku: 'GR-001', name: 'Gold Ring', productType: 'JEWELRY' },
        location: { id: 'location-1', name: 'Main Store', locationType: 'STORE' },
      });

      const result = await service.updateStockItem(TEST_TENANT_ID, TEST_USER_ID, 'stock-1', {
        reorderLevel: 10,
        binLocation: 'B-2-3',
      });

      expect(result).toBeDefined();
      expect(mockPrisma.stockItem.update).toHaveBeenCalledTimes(1);
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'inventory.item.updated' }),
      );
    });

    it('throws NotFoundException when stock item does not exist', async () => {
      mockPrisma.stockItem.findFirst.mockResolvedValue(null);

      await expect(
        service.updateStockItem(TEST_TENANT_ID, TEST_USER_ID, 'nonexistent', {
          reorderLevel: 10,
        }),
      ).rejects.toThrow('Stock item not found');
    });
  });
});
