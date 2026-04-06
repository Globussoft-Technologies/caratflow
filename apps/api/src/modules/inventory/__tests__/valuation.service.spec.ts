import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InventoryValuationService } from '../inventory.valuation.service';
import { createMockPrismaService, mockTenantContext, resetMocks } from '../../../__tests__/mocks';

describe('InventoryValuationService', () => {
  let service: InventoryValuationService;
  let prisma: ReturnType<typeof createMockPrismaService>;
  const { tenantId } = mockTenantContext;

  const makeStockItems = (overrides: Array<Record<string, unknown>> = []) => {
    const defaults = [
      {
        id: 'si-1',
        tenantId,
        productId: 'p1',
        quantityOnHand: 10,
        product: {
          id: 'p1',
          sku: 'GR-22K-001',
          name: '22K Gold Ring',
          costPricePaise: 500000n,
          sellingPricePaise: 650000n,
          metalWeightMg: 5000,
          metalPurity: 916,
          categoryId: 'cat-1',
          category: { id: 'cat-1', name: 'Rings' },
        },
        movements: [
          { movementType: 'IN', quantityChange: 10, movedAt: new Date('2025-01-01') },
        ],
      },
      {
        id: 'si-2',
        tenantId,
        productId: 'p2',
        quantityOnHand: 5,
        product: {
          id: 'p2',
          sku: 'NC-18K-001',
          name: '18K Necklace',
          costPricePaise: 1200000n,
          sellingPricePaise: 1500000n,
          metalWeightMg: 15000,
          metalPurity: 750,
          categoryId: 'cat-2',
          category: { id: 'cat-2', name: 'Necklaces' },
        },
        movements: [
          { movementType: 'IN', quantityChange: 5, movedAt: new Date('2025-02-01') },
        ],
      },
    ];

    return overrides.length > 0
      ? defaults.map((d, i) => ({ ...d, ...(overrides[i] ?? {}) }))
      : defaults;
  };

  beforeEach(() => {
    prisma = createMockPrismaService();
    service = new InventoryValuationService(prisma as never);
    resetMocks(prisma);
  });

  // ─── FIFO ──────────────────────────────────────────────────────

  describe('calculateFIFO', () => {
    it('should price stock using cost price (oldest first principle)', async () => {
      prisma.stockItem.findMany.mockResolvedValue(makeStockItems());

      const result = await service.calculateFIFO(tenantId, null);

      expect(result.method).toBe('FIFO');
      expect(result.items).toHaveLength(2);
      // Item 1: 500000 * 10 = 5,000,000
      expect(result.items[0].totalValuePaise).toBe(5000000n);
      // Item 2: 1200000 * 5 = 6,000,000
      expect(result.items[1].totalValuePaise).toBe(6000000n);
    });

    it('should calculate total value across all items', async () => {
      prisma.stockItem.findMany.mockResolvedValue(makeStockItems());

      const result = await service.calculateFIFO(tenantId, null);

      // 5,000,000 + 6,000,000 = 11,000,000
      expect(result.totalValuePaise).toBe(11000000n);
    });
  });

  // ─── Weighted Average ──────────────────────────────────────────

  describe('calculateWeightedAverage', () => {
    it('should calculate using total value / total quantity', async () => {
      prisma.stockItem.findMany.mockResolvedValue(makeStockItems());

      const result = await service.calculateWeightedAverage(tenantId, null);

      expect(result.method).toBe('AVG');
      expect(result.items).toHaveLength(2);
      expect(result.totalValuePaise).toBe(11000000n);
    });
  });

  // ─── Last Purchase ─────────────────────────────────────────────

  describe('calculateLastPurchase', () => {
    it('should use the product current cost price', async () => {
      prisma.stockItem.findMany.mockResolvedValue(makeStockItems());

      const result = await service.calculateLastPurchase(tenantId, null);

      expect(result.method).toBe('LAST_PURCHASE');
      expect(result.items[0].unitValuePaise).toBe(500000n);
    });
  });

  // ─── Market Value ──────────────────────────────────────────────

  describe('calculateMarketValue', () => {
    it('should use current market rate * weight * purity', async () => {
      prisma.stockItem.findMany.mockResolvedValue(makeStockItems());

      // Current rate: 600000 paise per gram (Rs 6000/g)
      const result = await service.calculateMarketValue(tenantId, null, 600000n);

      expect(result.method).toBe('MARKET');
      // Item 1: (5000/1000) * (916/1000) * 600000 = 5 * 0.916 * 600000 = 2,748,000
      expect(result.items[0].unitValuePaise).toBe(2748000n);
      // Item 2: (15000/1000) * (750/1000) * 600000 = 15 * 0.75 * 600000 = 6,750,000
      expect(result.items[1].unitValuePaise).toBe(6750000n);
    });

    it('should fall back to selling price when no rate provided', async () => {
      prisma.stockItem.findMany.mockResolvedValue(makeStockItems());

      const result = await service.calculateMarketValue(tenantId, null, 0n);

      expect(result.items[0].unitValuePaise).toBe(650000n); // sellingPricePaise
    });
  });

  // ─── Different methods give different values ───────────────────

  describe('method comparison', () => {
    it('should yield different total values for different methods', async () => {
      const items = makeStockItems();
      prisma.stockItem.findMany.mockResolvedValue(items);

      const fifo = await service.calculateFIFO(tenantId, null);

      prisma.stockItem.findMany.mockResolvedValue(items);
      const market = await service.calculateMarketValue(tenantId, null, 600000n);

      // FIFO uses cost price, market uses current rate * weight * purity
      expect(fifo.totalValuePaise).not.toBe(market.totalValuePaise);
    });
  });

  // ─── Location filtering ────────────────────────────────────────

  describe('location filtering', () => {
    it('should filter by locationId when provided', async () => {
      prisma.stockItem.findMany.mockResolvedValue([]);

      await service.calculateFIFO(tenantId, 'loc-a');

      expect(prisma.stockItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId, locationId: 'loc-a' }),
        }),
      );
    });

    it('should not filter by locationId when null', async () => {
      prisma.stockItem.findMany.mockResolvedValue([]);

      await service.calculateFIFO(tenantId, null);

      const where = prisma.stockItem.findMany.mock.calls[0][0].where;
      expect(where.locationId).toBeUndefined();
    });
  });

  // ─── Category Breakdown ────────────────────────────────────────

  describe('category breakdown', () => {
    it('should group items by category', async () => {
      prisma.stockItem.findMany.mockResolvedValue(makeStockItems());

      const result = await service.calculateFIFO(tenantId, null);

      expect(result.categoryBreakdown).toHaveLength(2);
      const rings = result.categoryBreakdown.find((c) => c.categoryName === 'Rings');
      expect(rings).toBeDefined();
      expect(rings!.itemCount).toBe(1);
    });
  });

  // ─── calculateValuation dispatcher ─────────────────────────────

  describe('calculateValuation', () => {
    it('should dispatch to correct method based on input', async () => {
      prisma.stockItem.findMany.mockResolvedValue(makeStockItems());

      const result = await service.calculateValuation(tenantId, { method: 'FIFO' } as never);

      expect(result.method).toBe('FIFO');
    });

    it('should default to weighted average for unknown method', async () => {
      prisma.stockItem.findMany.mockResolvedValue(makeStockItems());

      const result = await service.calculateValuation(tenantId, { method: 'UNKNOWN' } as never);

      expect(result.method).toBe('AVG');
    });
  });
});
