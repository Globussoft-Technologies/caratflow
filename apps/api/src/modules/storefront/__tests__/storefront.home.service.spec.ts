import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockPrismaService, mockTenantContext, resetMocks } from '../../../__tests__/mocks';
import { StorefrontHomeService } from '../storefront.home.service';

describe('StorefrontHomeService', () => {
  let service: StorefrontHomeService; let prisma: ReturnType<typeof createMockPrismaService>;
  let catalogService: any; let pricingService: any;
  const { tenantId } = mockTenantContext;
  beforeEach(() => {
    prisma = createMockPrismaService();
    resetMocks(prisma);
    prisma.tenant.findUnique = vi.fn().mockResolvedValue({ settings: { metalRates: { GOLD_999: 6000000 }, metalRatesUpdatedAt: new Date().toISOString(), storefrontBanners: [{ imageUrl: 'banner.jpg', title: 'Sale' }] }, defaultCurrency: 'INR' }) as any;
    catalogService = { getFeatured: vi.fn().mockResolvedValue([]), getNewArrivals: vi.fn().mockResolvedValue([]), getCategories: vi.fn().mockResolvedValue([]) };
    pricingService = {};
    service = new StorefrontHomeService(prisma as never, catalogService, pricingService);
  });

  describe('getHomepageData', () => {
    it('should aggregate featured, arrivals, categories, rates, banners', async () => {
      prisma.tenant.findUnique = vi.fn().mockResolvedValue({ settings: { metalRates: { GOLD_999: 6000000 }, metalRatesUpdatedAt: new Date().toISOString(), storefrontBanners: [{ imageUrl: 'b.jpg' }] }, defaultCurrency: 'INR' }) as any;
      const r = await service.getHomepageData(tenantId);
      expect(r.featuredProducts).toBeDefined();
      expect(r.newArrivals).toBeDefined();
      expect(r.categories).toBeDefined();
      expect(r.banners).toBeDefined();
    });
  });
});
