import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { createMockPrismaService, mockTenantContext, resetMocks } from '../../../__tests__/mocks';
vi.mock('uuid', () => ({ v4: vi.fn(() => 'mock-uuid') }));
import { StorefrontCatalogService } from '../storefront.catalog.service';

describe('StorefrontCatalogService', () => {
  let service: StorefrontCatalogService; let prisma: ReturnType<typeof createMockPrismaService>;
  let pricingService: any;
  const { tenantId } = mockTenantContext;
  beforeEach(() => {
    prisma = createMockPrismaService();
    resetMocks(prisma);
    (prisma as any).category = { findMany: vi.fn() };
    (prisma as any).searchLog = { create: vi.fn().mockResolvedValue({}) };
    (prisma as any).productReview = { findMany: vi.fn() };
    pricingService = { calculateLiveProductPrice: vi.fn().mockResolvedValue({ metalValuePaise: 40000, makingValuePaise: 5000, wastageValuePaise: 1000, subtotalPaise: 46000, gstPaise: 1380, totalPricePaise: 47380 }) };
    prisma.product.findMany = vi.fn() as any;
    prisma.product.count = vi.fn() as any;
    prisma.product.findFirst = vi.fn() as any;
    service = new StorefrontCatalogService(prisma as never, pricingService);
  });

  const mkProduct = (o: Record<string,unknown> = {}) => ({ id: 'p1', tenantId, sku: 'SKU-1', name: 'Gold Ring', description: 'Nice', productType: 'GOLD', metalPurity: 916, metalWeightMg: 5000n, grossWeightMg: 5500n, netWeightMg: 5000n, stoneWeightCt: null, makingCharges: 2000n, wastagePercent: 5, sellingPricePaise: 50000n, currencyCode: 'INR', images: [], attributes: null, huidNumber: null, hallmarkNumber: null, isActive: true, category: { id: 'c1', name: 'Rings' }, subCategory: null, stockItems: [{ quantityOnHand: 10, quantityReserved: 2 }], productReviews: [{ rating: 4 }, { rating: 5 }], createdAt: new Date(), updatedAt: new Date(), ...o });

  describe('getProducts', () => {
    it('should return paginated products with live pricing', async () => {
      prisma.product.findMany.mockResolvedValue([mkProduct()] as any);
      prisma.product.count.mockResolvedValue(1);
      const r = await service.getProducts(tenantId, { page: 1, limit: 10 } as any);
      expect(r.total).toBe(1);
      expect(r.items[0].totalPricePaise).toBe(47380);
    });
    it('should filter by categoryId', async () => {
      prisma.product.findMany.mockResolvedValue([]);
      prisma.product.count.mockResolvedValue(0);
      await service.getProducts(tenantId, { page: 1, limit: 10, categoryId: 'c1' } as any);
      expect(prisma.product.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ OR: expect.arrayContaining([{ categoryId: 'c1' }]) }) }));
    });
  });

  describe('getProductById', () => {
    it('should return product with live price', async () => {
      prisma.product.findFirst.mockResolvedValue(mkProduct() as any);
      const r = await service.getProductById(tenantId, 'p1');
      expect(r.id).toBe('p1');
      expect(r.reviewSummary.averageRating).toBe(4.5);
    });
    it('should throw NotFoundException', async () => {
      prisma.product.findFirst.mockResolvedValue(null);
      await expect(service.getProductById(tenantId, 'x')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getCategories', () => {
    it('should return category tree', async () => {
      (prisma as any).category.findMany.mockResolvedValue([{ id: 'c1', name: 'Rings', parentId: null, description: null, sortOrder: 0, children: [{ id: 'c2', name: 'Gold Rings', parentId: 'c1', description: null, sortOrder: 0 }] }]);
      const r = await service.getCategories(tenantId);
      expect(r[0].children).toHaveLength(1);
    });
  });

  describe('getNewArrivals', () => {
    it('should return newest products', async () => {
      prisma.product.findMany.mockResolvedValue([mkProduct()] as any);
      const r = await service.getNewArrivals(tenantId, 8);
      expect(r).toHaveLength(1);
    });
  });

  describe('getFeatured', () => {
    it('should return featured products', async () => {
      prisma.product.findMany.mockResolvedValue([mkProduct({ attributes: { featured: true } })] as any);
      const r = await service.getFeatured(tenantId, 8);
      expect(r).toHaveLength(1);
    });
  });

  describe('compareProducts', () => {
    it('should return side by side comparison', async () => {
      prisma.product.findFirst.mockResolvedValue(mkProduct() as any);
      const r = await service.compareProducts(tenantId, ['p1']);
      expect(r.products).toHaveLength(1);
    });
  });

  describe('searchProducts', () => {
    it('should search by query', async () => {
      prisma.product.findMany.mockResolvedValue([mkProduct()] as any);
      const r = await service.searchProducts(tenantId, 'gold', null);
      expect(r).toHaveLength(1);
    });
  });
});
