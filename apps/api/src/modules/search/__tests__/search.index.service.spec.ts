import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockPrismaService, mockTenantContext, resetMocks } from '../../../__tests__/mocks';
vi.mock('uuid', () => ({ v4: vi.fn(() => 'mock-uuid') }));
import { SearchIndexService } from '../search.index.service';

describe('SearchIndexService', () => {
  let service: SearchIndexService; let prisma: ReturnType<typeof createMockPrismaService>;
  const { tenantId } = mockTenantContext;
  beforeEach(() => {
    prisma = createMockPrismaService();
    resetMocks(prisma);
    (prisma as any).searchIndex = { upsert: vi.fn(), deleteMany: vi.fn(), updateMany: vi.fn() };
    prisma.product.findMany = vi.fn() as any;
    prisma.product.findFirst = vi.fn() as any;
    prisma.product.count = vi.fn() as any;
    prisma.product.findUnique = vi.fn() as any;
    service = new SearchIndexService(prisma as never);
  });

  describe('indexProduct', () => {
    it('should build searchable text and upsert', async () => {
      prisma.product.findUnique = vi.fn().mockResolvedValue({ id: 'p1', tenantId, name: 'Gold Ring', description: 'Beautiful ring', sku: 'GR-001', productType: 'GOLD', metalPurity: 916, isActive: true, sellingPricePaise: 5000000n, grossWeightMg: 8000, category: { name: 'Rings' }, subCategory: { name: 'Engagement' }, attributes: { tags: ['wedding'] }, stockItems: [{ quantityOnHand: 5, quantityReserved: 1 }] }) as any;
      (prisma as any).searchIndex.upsert.mockResolvedValue({});
      await service.indexProduct('p1');
      expect((prisma as any).searchIndex.upsert).toHaveBeenCalledWith(expect.objectContaining({ create: expect.objectContaining({ searchableText: expect.stringContaining('gold ring') }) }));
    });
    it('should assign correct price bucket', async () => {
      prisma.product.findUnique = vi.fn().mockResolvedValue({ id: 'p1', tenantId, name: 'Test', description: '', sku: 'T', productType: 'GOLD', metalPurity: 916, isActive: true, sellingPricePaise: 800000n, grossWeightMg: 5000, category: null, subCategory: null, attributes: null, stockItems: [] }) as any;
      (prisma as any).searchIndex.upsert.mockResolvedValue({});
      await service.indexProduct('p1');
      expect((prisma as any).searchIndex.upsert).toHaveBeenCalledWith(expect.objectContaining({ create: expect.objectContaining({ priceRangeBucket: 'under-10k' }) }));
    });
    it('should remove inactive product from index', async () => {
      prisma.product.findUnique = vi.fn().mockResolvedValue({ id: 'p1', isActive: false }) as any;
      (prisma as any).searchIndex.deleteMany.mockResolvedValue({});
      await service.indexProduct('p1');
      expect((prisma as any).searchIndex.deleteMany).toHaveBeenCalledWith(expect.objectContaining({ where: { productId: 'p1' } }));
    });
  });

  describe('reindexAll', () => {
    it('should index all active products and remove stale', async () => {
      prisma.product.findMany.mockResolvedValue([{ id: 'p1' }] as any);
      prisma.product.findUnique = vi.fn().mockResolvedValue({ id: 'p1', tenantId, name: 'T', description: '', sku: 'T', productType: 'GOLD', metalPurity: 916, isActive: true, sellingPricePaise: 50000n, grossWeightMg: 5000, category: null, subCategory: null, attributes: null, stockItems: [] }) as any;
      (prisma as any).searchIndex.upsert.mockResolvedValue({});
      (prisma as any).searchIndex.deleteMany.mockResolvedValue({ count: 2 });
      const r = await service.reindexAll(tenantId);
      expect(r.indexed).toBe(1);
      expect(r.removed).toBe(2);
    });
  });

  describe('removeFromIndex', () => {
    it('should delete by productId', async () => {
      (prisma as any).searchIndex.deleteMany.mockResolvedValue({});
      await service.removeFromIndex('p1');
      expect((prisma as any).searchIndex.deleteMany).toHaveBeenCalledWith({ where: { productId: 'p1' } });
    });
  });
});
