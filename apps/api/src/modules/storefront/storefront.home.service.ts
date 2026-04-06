// ─── Storefront Home Service ───────────────────────────────────
// Homepage data aggregation: featured products, new arrivals,
// categories, live metal rates, banners.

import { Injectable, Logger } from '@nestjs/common';
import type { StorefrontHomeResponse } from '@caratflow/shared-types';
import { PrismaService } from '../../common/prisma.service';
import { TenantAwareService } from '../../common/base.service';
import { StorefrontCatalogService } from './storefront.catalog.service';
import { StorefrontPricingService } from './storefront.pricing.service';

@Injectable()
export class StorefrontHomeService extends TenantAwareService {
  private readonly logger = new Logger(StorefrontHomeService.name);

  constructor(
    prisma: PrismaService,
    private readonly catalogService: StorefrontCatalogService,
    private readonly pricingService: StorefrontPricingService,
  ) {
    super(prisma);
  }

  /**
   * Get all homepage data in a single call for the B2C storefront.
   */
  async getHomepageData(tenantId: string): Promise<StorefrontHomeResponse> {
    const [
      featuredProducts,
      newArrivals,
      categories,
      liveRates,
      banners,
    ] = await Promise.all([
      this.catalogService.getFeatured(tenantId, 8),
      this.catalogService.getNewArrivals(tenantId, 8),
      this.catalogService.getCategories(tenantId),
      this.getLiveRates(tenantId),
      this.getBanners(tenantId),
    ]);

    return {
      featuredProducts,
      newArrivals,
      categories,
      liveRates,
      banners,
    };
  }

  /**
   * Get live metal rates for display on the storefront.
   */
  private async getLiveRates(tenantId: string): Promise<StorefrontHomeResponse['liveRates']> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { settings: true, defaultCurrency: true },
    });

    const settings = (tenant?.settings ?? {}) as Record<string, unknown>;
    const ratesMap = (settings.metalRates ?? {}) as Record<string, number>;
    const ratesUpdatedAt = settings.metalRatesUpdatedAt
      ? new Date(settings.metalRatesUpdatedAt as string)
      : new Date();

    const rates: StorefrontHomeResponse['liveRates'] = [];

    // Standard purities to display
    const standardRates = [
      { metalType: 'GOLD', purity: 999, label: '24K Gold' },
      { metalType: 'GOLD', purity: 916, label: '22K Gold' },
      { metalType: 'GOLD', purity: 750, label: '18K Gold' },
      { metalType: 'SILVER', purity: 999, label: 'Silver' },
      { metalType: 'PLATINUM', purity: 950, label: 'Platinum' },
    ];

    for (const std of standardRates) {
      const rateKey = `${std.metalType}_${std.purity}`;
      const rate = ratesMap[rateKey];
      if (rate) {
        rates.push({
          metalType: std.metalType,
          purity: std.purity,
          ratePaisePer10g: rate,
          currencyCode: tenant?.defaultCurrency ?? 'INR',
          updatedAt: ratesUpdatedAt,
        });
      }
    }

    return rates;
  }

  /**
   * Get promotional banners from tenant settings.
   */
  private async getBanners(tenantId: string): Promise<StorefrontHomeResponse['banners']> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { settings: true },
    });

    const settings = (tenant?.settings ?? {}) as Record<string, unknown>;
    const bannerData = (settings.storefrontBanners ?? []) as Array<{
      id?: string;
      imageUrl: string;
      linkUrl?: string;
      title?: string;
      sortOrder?: number;
    }>;

    return bannerData.map((b, index) => ({
      id: b.id ?? `banner-${index}`,
      imageUrl: b.imageUrl,
      linkUrl: b.linkUrl ?? null,
      title: b.title ?? null,
      sortOrder: b.sortOrder ?? index,
    }));
  }
}
