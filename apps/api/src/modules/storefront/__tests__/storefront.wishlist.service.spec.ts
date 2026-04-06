import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { createMockPrismaService, createMockEventBusService, mockTenantContext, resetMocks } from '../../../__tests__/mocks';
vi.mock('uuid', () => ({ v4: vi.fn(() => 'mock-uuid') }));
import { StorefrontWishlistService } from '../storefront.wishlist.service';

describe('StorefrontWishlistService', () => {
  let service: StorefrontWishlistService; let prisma: ReturnType<typeof createMockPrismaService>;
  let pricingService: any; let eventBus: ReturnType<typeof createMockEventBusService>;
  const { tenantId } = mockTenantContext;
  beforeEach(() => {
    prisma = createMockPrismaService();
    resetMocks(prisma);
    eventBus = createMockEventBusService();
    ['wishlist','priceAlert'].forEach(m => { (prisma as any)[m] = { findFirst: vi.fn(), findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() }; });
    pricingService = { calculateLiveProductPrice: vi.fn().mockResolvedValue({ totalPricePaise: 50000 }) };
    prisma.product.findMany = vi.fn() as any;
    prisma.product.findFirst = vi.fn() as any;
    service = new StorefrontWishlistService(prisma as never, pricingService, eventBus as never);
  });

  describe('add', () => {
    it('should add product to wishlist', async () => {
      prisma.product.findFirst.mockResolvedValue({ id: 'p1', productType: 'GOLD', metalPurity: 916, metalWeightMg: 5000n, makingCharges: 2000n, wastagePercent: 5, sellingPricePaise: 50000n } as any);
      (prisma as any).wishlist.findUnique.mockResolvedValue(null);
      (prisma as any).wishlist.create.mockResolvedValue({});
      await service.add(tenantId, 'c1', 'p1');
      expect((prisma as any).wishlist.create).toHaveBeenCalled();
    });
    it('should throw ConflictException for duplicate', async () => {
      prisma.product.findFirst.mockResolvedValue({ id: 'p1' } as any);
      (prisma as any).wishlist.findUnique.mockResolvedValue({ id: 'w-1' });
      await expect(service.add(tenantId, 'c1', 'p1')).rejects.toThrow(ConflictException);
    });
    it('should throw NotFoundException for missing product', async () => {
      prisma.product.findFirst.mockResolvedValue(null);
      await expect(service.add(tenantId, 'c1', 'x')).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should remove from wishlist', async () => {
      (prisma as any).wishlist.findUnique.mockResolvedValue({ id: 'w-1' });
      (prisma as any).wishlist.delete.mockResolvedValue({});
      await service.remove(tenantId, 'c1', 'p1');
      expect((prisma as any).wishlist.delete).toHaveBeenCalled();
    });
    it('should throw NotFoundException', async () => {
      (prisma as any).wishlist.findUnique.mockResolvedValue(null);
      await expect(service.remove(tenantId, 'c1', 'x')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getWishlist', () => {
    it('should return empty when no items', async () => {
      (prisma as any).wishlist.findMany.mockResolvedValue([]);
      const r = await service.getWishlist(tenantId, 'c1');
      expect(r.total).toBe(0);
    });
  });

  describe('enablePriceAlert', () => {
    it('should enable alert for wishlist item', async () => {
      (prisma as any).wishlist.findUnique.mockResolvedValue({ id: 'w-1' });
      (prisma as any).wishlist.update.mockResolvedValue({});
      prisma.product.findFirst.mockResolvedValue({ id: 'p1', productType: 'GOLD', metalPurity: 916, metalWeightMg: 5000n, makingCharges: 2000n, wastagePercent: 5, sellingPricePaise: 50000n } as any);
      (prisma as any).priceAlert.findFirst.mockResolvedValue(null);
      (prisma as any).priceAlert.create.mockResolvedValue({});
      await service.enablePriceAlert(tenantId, 'c1', 'p1', 45000);
      expect((prisma as any).wishlist.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ priceAlertEnabled: true }) }));
    });
  });

  describe('getWishlist with items', () => {
    it('should return items with live prices', async () => {
      (prisma as any).wishlist.findMany.mockResolvedValue([{ id: 'w-1', productId: 'p1', priceAlertEnabled: false, priceAlertThresholdPaise: null, addedAt: new Date() }]);
      prisma.product.findMany.mockResolvedValue([{ id: 'p1', name: 'Ring', sku: 'S', productType: 'GOLD', metalPurity: 916, metalWeightMg: 5000n, makingCharges: 2000n, wastagePercent: 5, sellingPricePaise: 50000n, currencyCode: 'INR', images: [], stockItems: [{ quantityOnHand: 5, quantityReserved: 0 }] }] as any);
      const r = await service.getWishlist(tenantId, 'c1');
      expect(r.total).toBe(1);
      expect(r.items[0].currentPricePaise).toBe(50000);
    });
  });
});
