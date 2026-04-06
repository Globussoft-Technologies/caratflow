import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReportingInventoryService } from '../reporting.inventory.service';
import { createMockPrismaService, TEST_TENANT_ID } from '../../../__tests__/setup';

function extendPrisma(base: ReturnType<typeof createMockPrismaService>) {
  return {
    ...base,
    metalStock: { ...base.metalStock, findMany: vi.fn() },
    $queryRawUnsafe: vi.fn(),
  };
}

describe('ReportingInventoryService (Unit)', () => {
  let service: ReportingInventoryService;
  let mockPrisma: ReturnType<typeof extendPrisma>;

  beforeEach(() => {
    mockPrisma = extendPrisma(createMockPrismaService());
    service = new ReportingInventoryService(mockPrisma as any);
  });

  describe('stockSummary', () => {
    it('returns stock grouped by category', async () => {
      mockPrisma.stockItem.findMany.mockResolvedValue([
        { quantityOnHand: 10, product: { costPricePaise: 5000n, category: { name: 'Rings' } } },
        { quantityOnHand: 5, product: { costPricePaise: 10000n, category: { name: 'Rings' } } },
        { quantityOnHand: 3, product: { costPricePaise: 20000n, category: { name: 'Chains' } } },
      ]);

      const result = await service.stockSummary(TEST_TENANT_ID);

      expect(result.stockSummary).toHaveLength(2);
      expect(result.totalItems).toBe(3);
      expect(result.totalQuantity).toBe(18);
      expect(result.totalValuePaise).toBeGreaterThan(0);
    });

    it('handles items without category', async () => {
      mockPrisma.stockItem.findMany.mockResolvedValue([
        { quantityOnHand: 1, product: { costPricePaise: 1000n, category: null } },
      ]);

      const result = await service.stockSummary(TEST_TENANT_ID);
      expect(result.stockSummary[0].category).toBe('Uncategorized');
    });
  });

  describe('stockByLocation', () => {
    it('returns stock value per location', async () => {
      mockPrisma.stockItem.findMany.mockResolvedValue([
        { locationId: 'l-1', quantityOnHand: 10, location: { name: 'Main' }, product: { costPricePaise: 5000n } },
        { locationId: 'l-2', quantityOnHand: 5, location: { name: 'Branch' }, product: { costPricePaise: 8000n } },
      ]);

      const result = await service.stockByLocation(TEST_TENANT_ID);
      expect(result).toHaveLength(2);
    });
  });

  describe('lowStockAlert', () => {
    it('returns items below reorder level', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue([
        { product_id: 'p-1', product_name: 'Ring', sku: 'R-1', location_name: 'Main', quantity_on_hand: 2, reorder_level: 10 },
      ]);

      const result = await service.lowStockAlert(TEST_TENANT_ID);
      expect(result).toHaveLength(1);
      expect(result[0].deficit).toBe(8);
    });
  });

  describe('deadStockReport', () => {
    it('returns items with no movement in specified days', async () => {
      mockPrisma.$queryRawUnsafe.mockResolvedValue([
        {
          product_id: 'p-1', product_name: 'Old Ring', sku: 'OR-1', location_name: 'Main',
          quantity_on_hand: 5, cost_price_paise: 10000n,
          last_moved_at: new Date('2024-01-01'),
        },
      ]);

      const result = await service.deadStockReport(TEST_TENANT_ID, 90);
      expect(result).toHaveLength(1);
      expect(result[0].daysSinceLastMovement).toBeGreaterThan(90);
    });
  });

  describe('fastSlowMovers', () => {
    it('identifies fast and slow movers', async () => {
      mockPrisma.stockMovement.findMany.mockResolvedValue([
        { stockItem: { productId: 'p-1', quantityOnHand: 10, product: { name: 'Ring', sku: 'R-1', category: { name: 'Rings' } } }, quantityChange: 5 },
        { stockItem: { productId: 'p-1', quantityOnHand: 10, product: { name: 'Ring', sku: 'R-1', category: { name: 'Rings' } } }, quantityChange: -3 },
        { stockItem: { productId: 'p-2', quantityOnHand: 2, product: { name: 'Chain', sku: 'C-1', category: { name: 'Chains' } } }, quantityChange: 1 },
      ]);

      const result = await service.fastSlowMovers(TEST_TENANT_ID, { from: new Date(), to: new Date() });

      expect(result.fastMovers[0].productId).toBe('p-1');
      expect(result.slowMovers[0].productId).toBe('p-2');
    });
  });

  describe('stockAgingReport', () => {
    it('buckets items into age ranges', async () => {
      const now = Date.now();
      mockPrisma.stockItem.findMany.mockResolvedValue([
        { id: 's1', quantityOnHand: 5, createdAt: new Date(now - 10 * 86400000), product: { costPricePaise: 1000n } },
        { id: 's2', quantityOnHand: 3, createdAt: new Date(now - 50 * 86400000), product: { costPricePaise: 2000n } },
        { id: 's3', quantityOnHand: 2, createdAt: new Date(now - 100 * 86400000), product: { costPricePaise: 5000n } },
      ]);

      const result = await service.stockAgingReport(TEST_TENANT_ID);

      expect(result).toHaveLength(4);
      const first = result.find((r) => r.ageRange === '0-30 days');
      expect(first!.itemCount).toBe(1);
    });
  });

  describe('metalStockSummary', () => {
    it('returns metal stock by type and purity', async () => {
      mockPrisma.metalStock.findMany.mockResolvedValue([
        { metalType: 'GOLD', purityFineness: 916, weightMg: 100000n, valuePaise: 7200000n, location: { name: 'Main' } },
        { metalType: 'SILVER', purityFineness: 999, weightMg: 500000n, valuePaise: 450000n, location: { name: 'Main' } },
      ]);

      const result = await service.metalStockSummary(TEST_TENANT_ID);
      expect(result).toHaveLength(2);
      expect(result[0].metalType).toBe('GOLD');
    });
  });

  describe('stockValuationReport', () => {
    it('values stock at cost price', async () => {
      mockPrisma.stockItem.findMany.mockResolvedValue([
        { quantityOnHand: 10, product: { id: 'p-1', name: 'Ring', sku: 'R-1', costPricePaise: 5000n, sellingPricePaise: 8000n } },
      ]);

      const result = await service.stockValuationReport(TEST_TENANT_ID, 'cost');
      expect(result.items[0].unitValuePaise).toBe(5000);
      expect(result.grandTotalPaise).toBe(50000);
    });

    it('values stock at market price', async () => {
      mockPrisma.stockItem.findMany.mockResolvedValue([
        { quantityOnHand: 10, product: { id: 'p-1', name: 'Ring', sku: 'R-1', costPricePaise: 5000n, sellingPricePaise: 8000n } },
      ]);

      const result = await service.stockValuationReport(TEST_TENANT_ID, 'market');
      expect(result.items[0].unitValuePaise).toBe(8000);
    });
  });
});
