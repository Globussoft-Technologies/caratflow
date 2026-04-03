import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InventoryService } from './inventory.service';
import { createMockPrismaService, createMockEventBus, TEST_TENANT_ID, TEST_USER_ID, resetAllMocks } from '../../__tests__/setup';

describe('InventoryService (Unit)', () => {
  let service: InventoryService;
  let mockPrisma: ReturnType<typeof createMockPrismaService>;
  let mockEventBus: ReturnType<typeof createMockEventBus>;

  beforeEach(() => {
    mockPrisma = createMockPrismaService();
    mockEventBus = createMockEventBus();
    service = new InventoryService(mockPrisma as any, mockEventBus as any);
    resetAllMocks(mockPrisma);
  });

  // ─── Stock Movement Validation ───────────────────────────────

  describe('stock movement validation', () => {
    it('allows movement that keeps stock at zero', async () => {
      mockPrisma.stockItem.findFirst.mockResolvedValue({
        id: 'stock-1',
        tenantId: TEST_TENANT_ID,
        productId: 'product-1',
        locationId: 'location-1',
        quantityOnHand: 5,
      });

      const mockMovement = {
        id: 'mov-1',
        stockItemId: 'stock-1',
        quantityChange: -5,
        stockItem: {
          product: { id: 'product-1', sku: 'GR-001', name: 'Gold Ring' },
          location: { id: 'location-1', name: 'Main Store' },
        },
      };

      mockPrisma.$transaction.mockResolvedValue([mockMovement, { quantityOnHand: 0 }]);

      // Should not throw -- resulting in exactly 0
      const result = await service.recordMovement(TEST_TENANT_ID, TEST_USER_ID, {
        stockItemId: 'stock-1',
        movementType: 'OUT',
        quantityChange: -5,
      });

      expect(result).toBeDefined();
    });

    it('rejects movement that would go below zero', async () => {
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
          quantityChange: -4, // 3 + (-4) = -1
        }),
      ).rejects.toThrow('Insufficient stock');
    });

    it('allows positive IN movement on zero stock', async () => {
      mockPrisma.stockItem.findFirst.mockResolvedValue({
        id: 'stock-1',
        tenantId: TEST_TENANT_ID,
        productId: 'product-1',
        locationId: 'location-1',
        quantityOnHand: 0,
      });

      const mockMovement = {
        id: 'mov-1',
        stockItemId: 'stock-1',
        quantityChange: 10,
        stockItem: {
          product: { id: 'product-1', sku: 'GR-001', name: 'Gold Ring' },
          location: { id: 'location-1', name: 'Main Store' },
        },
      };

      mockPrisma.$transaction.mockResolvedValue([mockMovement, { quantityOnHand: 10 }]);

      const result = await service.recordMovement(TEST_TENANT_ID, TEST_USER_ID, {
        stockItemId: 'stock-1',
        movementType: 'IN',
        quantityChange: 10,
      });

      expect(result).toBeDefined();
    });
  });

  // ─── Tenant Isolation ────────────────────────────────────────

  describe('tenant isolation', () => {
    it('always includes tenantId in stock item queries', async () => {
      mockPrisma.stockItem.findFirst.mockResolvedValue(null);

      try {
        await service.findStockItemById(TEST_TENANT_ID, 'stock-1');
      } catch {
        // Expected to throw NotFoundException
      }

      expect(mockPrisma.stockItem.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: TEST_TENANT_ID }),
        }),
      );
    });

    it('includes tenantId when creating stock items', async () => {
      mockPrisma.stockItem.findFirst.mockResolvedValue(null);
      mockPrisma.stockItem.create.mockResolvedValue({
        id: 'stock-new',
        tenantId: TEST_TENANT_ID,
        product: { id: 'p-1', sku: 'S1', name: 'Test', productType: 'JEWELRY' },
        location: { id: 'l-1', name: 'Store', locationType: 'STORE' },
      });

      await service.createStockItem(TEST_TENANT_ID, TEST_USER_ID, {
        productId: 'p-1',
        locationId: 'l-1',
      });

      expect(mockPrisma.stockItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ tenantId: TEST_TENANT_ID }),
        }),
      );
    });
  });

  // ─── Event Publishing ────────────────────────────────────────

  describe('event publishing', () => {
    it('publishes inventory.item.created event on stock item creation', async () => {
      mockPrisma.stockItem.findFirst.mockResolvedValue(null);
      mockPrisma.stockItem.create.mockResolvedValue({
        id: 'stock-new',
        tenantId: TEST_TENANT_ID,
        product: { id: 'p-1', sku: 'S1', name: 'Test', productType: 'JEWELRY' },
        location: { id: 'l-1', name: 'Store', locationType: 'STORE' },
      });

      await service.createStockItem(TEST_TENANT_ID, TEST_USER_ID, {
        productId: 'p-1',
        locationId: 'l-1',
        quantityOnHand: 10,
      });

      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'inventory.item.created',
          tenantId: TEST_TENANT_ID,
          payload: expect.objectContaining({
            productId: 'p-1',
            locationId: 'l-1',
            quantity: 10,
          }),
        }),
      );
    });

    it('publishes inventory.stock.adjusted event on movement', async () => {
      mockPrisma.stockItem.findFirst.mockResolvedValue({
        id: 'stock-1',
        tenantId: TEST_TENANT_ID,
        productId: 'product-1',
        locationId: 'location-1',
        quantityOnHand: 10,
      });

      mockPrisma.$transaction.mockResolvedValue([
        {
          id: 'mov-1',
          stockItem: {
            product: { id: 'product-1', sku: 'S1', name: 'Test' },
            location: { id: 'location-1', name: 'Store' },
          },
        },
        { quantityOnHand: 15 },
      ]);

      await service.recordMovement(TEST_TENANT_ID, TEST_USER_ID, {
        stockItemId: 'stock-1',
        movementType: 'IN',
        quantityChange: 5,
        notes: 'Stock receipt',
      });

      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'inventory.stock.adjusted',
          payload: expect.objectContaining({
            quantityChange: 5,
          }),
        }),
      );
    });
  });
});
