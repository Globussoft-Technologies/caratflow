import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { ArService } from '../ar.service';
import { createMockPrismaService, TEST_TENANT_ID } from '../../../__tests__/setup';

describe('ArService', () => {
  let service: ArService;
  let mockPrisma: ReturnType<typeof createMockPrismaService>;

  const TENANT = TEST_TENANT_ID;
  const USER_ID = 'user-1';
  const PRODUCT_ID = 'product-1';
  const ASSET_ID = 'asset-1';

  const mockAssetRecord = {
    id: ASSET_ID,
    tenantId: TENANT,
    productId: PRODUCT_ID,
    assetType: 'AR_OVERLAY_2D',
    fileUrl: 'https://cdn.example.com/overlay.png',
    thumbnailUrl: 'https://cdn.example.com/thumb.png',
    format: 'PNG',
    fileSizeBytes: 102400,
    dimensions: { width: 800, height: 600 },
    category: 'RING',
    isActive: true,
    processingStatus: 'READY',
    metadata: null,
    createdBy: USER_ID,
    updatedBy: USER_ID,
    createdAt: new Date('2025-06-01').toISOString(),
    updatedAt: new Date('2025-06-01').toISOString(),
  };

  beforeEach(() => {
    mockPrisma = createMockPrismaService();

    (mockPrisma as any).arAsset = {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
    };
    (mockPrisma as any).product360 = {
      findMany: vi.fn().mockResolvedValue([]),
    };
    (mockPrisma as any).arTryOnSession = {
      groupBy: vi.fn().mockResolvedValue([]),
    };

    service = new ArService(mockPrisma as any);
  });

  // ─── uploadAsset ───────────────────────────────────────────────

  describe('uploadAsset', () => {
    it('creates an AR asset when the product exists', async () => {
      (mockPrisma as any).product.findFirst.mockResolvedValue({ id: PRODUCT_ID, tenantId: TENANT });
      (mockPrisma as any).arAsset.create.mockResolvedValue(mockAssetRecord);

      const result = await service.uploadAsset(TENANT, USER_ID, {
        productId: PRODUCT_ID,
        assetType: 'AR_OVERLAY_2D' as any,
        fileUrl: 'https://cdn.example.com/overlay.png',
        thumbnailUrl: 'https://cdn.example.com/thumb.png',
        format: 'PNG' as any,
        fileSizeBytes: 102400,
        category: 'RING' as any,
      });

      expect(result.id).toBe(ASSET_ID);
      expect(result.productId).toBe(PRODUCT_ID);
      expect(result.assetType).toBe('AR_OVERLAY_2D');
      expect((mockPrisma as any).arAsset.create).toHaveBeenCalledOnce();
    });

    it('throws NotFoundException when product does not exist', async () => {
      (mockPrisma as any).product.findFirst.mockResolvedValue(null);

      await expect(
        service.uploadAsset(TENANT, USER_ID, {
          productId: 'nonexistent',
          assetType: 'AR_OVERLAY_2D' as any,
          fileUrl: 'https://cdn.example.com/overlay.png',
          format: 'PNG' as any,
          fileSizeBytes: 102400,
          category: 'RING' as any,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── getAsset / getAssetsForProduct ────────────────────────────

  describe('getAsset', () => {
    it('returns the asset when found', async () => {
      (mockPrisma as any).arAsset.findFirst.mockResolvedValue(mockAssetRecord);

      const result = await service.getAsset(TENANT, ASSET_ID);
      expect(result.id).toBe(ASSET_ID);
      expect(result.isActive).toBe(true);
    });

    it('throws NotFoundException when asset not found', async () => {
      (mockPrisma as any).arAsset.findFirst.mockResolvedValue(null);

      await expect(service.getAsset(TENANT, 'missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getAssetsForProduct', () => {
    it('returns active READY assets for a product', async () => {
      (mockPrisma as any).arAsset.findMany.mockResolvedValue([mockAssetRecord]);

      const result = await service.getAssetsForProduct(TENANT, PRODUCT_ID);
      expect(result).toHaveLength(1);
      expect(result[0].productId).toBe(PRODUCT_ID);
    });

    it('filters by assetType when provided', async () => {
      (mockPrisma as any).arAsset.findMany.mockResolvedValue([]);

      await service.getAssetsForProduct(TENANT, PRODUCT_ID, 'AR_MODEL_3D');

      expect((mockPrisma as any).arAsset.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ assetType: 'AR_MODEL_3D' }),
        }),
      );
    });
  });

  // ─── getProductsWithAr ─────────────────────────────────────────

  describe('getProductsWithAr', () => {
    it('returns paginated list of products with AR assets', async () => {
      (mockPrisma as any).arAsset.findMany.mockResolvedValue([
        {
          ...mockAssetRecord,
          product: { id: PRODUCT_ID, name: '22K Gold Ring', sku: 'GR-22K-001', images: [{ url: 'img.jpg' }] },
        },
      ]);
      (mockPrisma as any).product360.findMany.mockResolvedValue([]);
      (mockPrisma as any).arTryOnSession.groupBy.mockResolvedValue([]);

      const result = await service.getProductsWithAr(TENANT, undefined, { page: 1, limit: 10, sortOrder: 'desc' });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].productName).toBe('22K Gold Ring');
      expect(result.total).toBe(1);
      expect(result.hasNext).toBe(false);
    });
  });

  // ─── updateAsset ───────────────────────────────────────────────

  describe('updateAsset', () => {
    it('updates asset fields and returns updated record', async () => {
      (mockPrisma as any).arAsset.findFirst.mockResolvedValue(mockAssetRecord);
      const updatedRecord = { ...mockAssetRecord, isActive: false };
      (mockPrisma as any).arAsset.update.mockResolvedValue(updatedRecord);

      const result = await service.updateAsset(TENANT, USER_ID, ASSET_ID, { isActive: false });

      expect(result.isActive).toBe(false);
      expect((mockPrisma as any).arAsset.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: ASSET_ID },
          data: expect.objectContaining({ isActive: false, updatedBy: USER_ID }),
        }),
      );
    });

    it('throws NotFoundException when asset does not exist', async () => {
      (mockPrisma as any).arAsset.findFirst.mockResolvedValue(null);

      await expect(
        service.updateAsset(TENANT, USER_ID, 'missing', { isActive: false }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── deleteAsset ───────────────────────────────────────────────

  describe('deleteAsset', () => {
    it('deletes the asset and returns success', async () => {
      (mockPrisma as any).arAsset.findFirst.mockResolvedValue(mockAssetRecord);
      (mockPrisma as any).arAsset.delete.mockResolvedValue(mockAssetRecord);

      const result = await service.deleteAsset(TENANT, ASSET_ID);
      expect(result.success).toBe(true);
      expect((mockPrisma as any).arAsset.delete).toHaveBeenCalledWith({ where: { id: ASSET_ID } });
    });

    it('throws NotFoundException when asset does not exist', async () => {
      (mockPrisma as any).arAsset.findFirst.mockResolvedValue(null);

      await expect(service.deleteAsset(TENANT, 'missing')).rejects.toThrow(NotFoundException);
    });
  });
});
