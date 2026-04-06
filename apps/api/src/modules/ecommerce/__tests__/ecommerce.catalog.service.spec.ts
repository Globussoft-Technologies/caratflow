import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { EcommerceCatalogService } from '../ecommerce.catalog.service';
import { createMockPrismaService, TEST_TENANT_ID, TEST_USER_ID } from '../../../__tests__/setup';

function extendPrisma(base: ReturnType<typeof createMockPrismaService>) {
  return {
    ...base,
    product: { ...base.product, findFirst: vi.fn(), findMany: vi.fn() },
    salesChannel: { findFirst: vi.fn(), update: vi.fn() },
    catalogItem: {
      findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(),
      updateMany: vi.fn(), delete: vi.fn(), count: vi.fn(),
    },
  };
}

describe('EcommerceCatalogService (Unit)', () => {
  let service: EcommerceCatalogService;
  let mockPrisma: ReturnType<typeof extendPrisma>;

  const catalogItem = {
    id: 'ci-1', tenantId: TEST_TENANT_ID, productId: 'p-1', channelId: 'ch-1',
    externalProductId: null, externalVariantId: null, title: 'Ring', description: null,
    pricePaise: 500000n, comparePricePaise: null, currencyCode: 'INR', images: null,
    status: 'DRAFT', syncStatus: 'PENDING', lastSyncAt: null, syncError: null,
    createdAt: new Date(), updatedAt: new Date(),
  };

  beforeEach(() => {
    mockPrisma = extendPrisma(createMockPrismaService());
    service = new EcommerceCatalogService(mockPrisma as any);
  });

  describe('syncProduct', () => {
    it('creates new catalog item when none exists', async () => {
      mockPrisma.product.findFirst.mockResolvedValue({ id: 'p-1' });
      mockPrisma.salesChannel.findFirst.mockResolvedValue({ id: 'ch-1', isActive: true });
      mockPrisma.catalogItem.findFirst
        .mockResolvedValueOnce(null) // existing check
        .mockResolvedValueOnce(catalogItem); // getCatalogItem
      mockPrisma.catalogItem.create.mockResolvedValue(catalogItem);

      const result = await service.syncProduct(TEST_TENANT_ID, TEST_USER_ID, {
        productId: 'p-1', channelId: 'ch-1', title: 'Ring', pricePaise: 500000,
      });

      expect(result.title).toBe('Ring');
      expect(mockPrisma.catalogItem.create).toHaveBeenCalledOnce();
    });

    it('updates existing catalog item (idempotent upsert)', async () => {
      mockPrisma.product.findFirst.mockResolvedValue({ id: 'p-1' });
      mockPrisma.salesChannel.findFirst.mockResolvedValue({ id: 'ch-1', isActive: true });
      mockPrisma.catalogItem.findFirst
        .mockResolvedValueOnce({ id: 'ci-1', status: 'DRAFT' }) // existing
        .mockResolvedValueOnce(catalogItem); // getCatalogItem
      mockPrisma.catalogItem.update.mockResolvedValue(catalogItem);

      const result = await service.syncProduct(TEST_TENANT_ID, TEST_USER_ID, {
        productId: 'p-1', channelId: 'ch-1', title: 'Ring Updated', pricePaise: 500000,
      });

      expect(mockPrisma.catalogItem.update).toHaveBeenCalledOnce();
    });

    it('throws NotFoundException for missing product', async () => {
      mockPrisma.product.findFirst.mockResolvedValue(null);
      await expect(
        service.syncProduct(TEST_TENANT_ID, TEST_USER_ID, {
          productId: 'bad', channelId: 'ch-1', title: 'X', pricePaise: 100,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException for inactive channel', async () => {
      mockPrisma.product.findFirst.mockResolvedValue({ id: 'p-1' });
      mockPrisma.salesChannel.findFirst.mockResolvedValue(null);
      await expect(
        service.syncProduct(TEST_TENANT_ID, TEST_USER_ID, {
          productId: 'p-1', channelId: 'bad', title: 'X', pricePaise: 100,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('bulkSync', () => {
    it('syncs multiple products and returns counts', async () => {
      mockPrisma.salesChannel.findFirst.mockResolvedValue({ id: 'ch-1', isActive: true });
      mockPrisma.product.findMany.mockResolvedValue([
        { id: 'p-1', name: 'Ring', sellingPricePaise: 500000n, currencyCode: 'INR' },
      ]);
      mockPrisma.product.findFirst.mockResolvedValue({ id: 'p-1' });
      mockPrisma.catalogItem.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(catalogItem);
      mockPrisma.catalogItem.create.mockResolvedValue(catalogItem);
      mockPrisma.salesChannel.update.mockResolvedValue({});

      const result = await service.bulkSync(TEST_TENANT_ID, TEST_USER_ID, 'ch-1', ['p-1', 'p-missing']);

      expect(result.synced).toBe(1);
      expect(result.skipped).toBe(1);
    });
  });

  describe('markSynced', () => {
    it('updates sync status and external ID', async () => {
      mockPrisma.catalogItem.findFirst
        .mockResolvedValueOnce({ id: 'ci-1' }) // found check
        .mockResolvedValueOnce({ ...catalogItem, syncStatus: 'SYNCED' }); // getCatalogItem
      mockPrisma.catalogItem.update.mockResolvedValue({});

      const result = await service.markSynced(TEST_TENANT_ID, 'ci-1', 'ext-123');
      expect(mockPrisma.catalogItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ syncStatus: 'SYNCED', externalProductId: 'ext-123' }),
        }),
      );
    });
  });

  describe('markSyncFailed', () => {
    it('sets sync status to FAILED with error message', async () => {
      mockPrisma.catalogItem.updateMany.mockResolvedValue({ count: 1 });

      await service.markSyncFailed(TEST_TENANT_ID, 'ci-1', 'API timeout');
      expect(mockPrisma.catalogItem.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ syncStatus: 'FAILED', syncError: 'API timeout' }),
        }),
      );
    });
  });

  describe('getCatalogItem', () => {
    it('returns item when found', async () => {
      mockPrisma.catalogItem.findFirst.mockResolvedValue(catalogItem);
      const result = await service.getCatalogItem(TEST_TENANT_ID, 'ci-1');
      expect(result.id).toBe('ci-1');
    });

    it('throws NotFoundException when not found', async () => {
      mockPrisma.catalogItem.findFirst.mockResolvedValue(null);
      await expect(service.getCatalogItem(TEST_TENANT_ID, 'bad')).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteCatalogItem', () => {
    it('deletes an existing catalog item', async () => {
      mockPrisma.catalogItem.findFirst.mockResolvedValue({ id: 'ci-1' });
      mockPrisma.catalogItem.delete.mockResolvedValue({});

      await service.deleteCatalogItem(TEST_TENANT_ID, 'ci-1');
      expect(mockPrisma.catalogItem.delete).toHaveBeenCalledOnce();
    });

    it('throws NotFoundException for missing item', async () => {
      mockPrisma.catalogItem.findFirst.mockResolvedValue(null);
      await expect(service.deleteCatalogItem(TEST_TENANT_ID, 'bad')).rejects.toThrow(NotFoundException);
    });
  });
});
