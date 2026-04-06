// ─── CMS Homepage Service ──────────────────────────────────────
// Homepage layout management: get ordered sections, resolve
// section data, reorder sections, toggle active.

import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  HomepageSectionInput,
  HomepageSectionResponse,
  HomepageSectionConfig,
  HomepageLayoutResponse,
  ResolvedHomepageSection,
  ReorderItem,
} from '@caratflow/shared-types';
import { HomepageSectionType } from '@caratflow/shared-types';
import { PrismaService } from '../../common/prisma.service';
import { TenantAwareService } from '../../common/base.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class CmsHomepageService extends TenantAwareService {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async createSection(tenantId: string, userId: string, input: HomepageSectionInput): Promise<HomepageSectionResponse> {
    const section = await this.prisma.homepageSection.create({
      data: {
        id: uuidv4(),
        tenantId,
        sectionType: input.sectionType,
        displayOrder: input.displayOrder ?? 0,
        isActive: input.isActive ?? true,
        config: input.config ?? undefined,
        createdBy: userId,
        updatedBy: userId,
      },
    });

    return this.mapToResponse(section);
  }

  async updateSection(
    tenantId: string,
    userId: string,
    id: string,
    input: Partial<HomepageSectionInput>,
  ): Promise<HomepageSectionResponse> {
    const existing = await this.prisma.homepageSection.findFirst({
      where: this.tenantWhere(tenantId, { id }) as { tenantId: string; id: string },
    });
    if (!existing) throw new NotFoundException('Homepage section not found');

    const data: Record<string, unknown> = { updatedBy: userId };
    if (input.sectionType !== undefined) data.sectionType = input.sectionType;
    if (input.displayOrder !== undefined) data.displayOrder = input.displayOrder;
    if (input.isActive !== undefined) data.isActive = input.isActive;
    if (input.config !== undefined) data.config = input.config;

    const section = await this.prisma.homepageSection.update({ where: { id }, data });
    return this.mapToResponse(section);
  }

  async deleteSection(tenantId: string, id: string): Promise<void> {
    const existing = await this.prisma.homepageSection.findFirst({
      where: this.tenantWhere(tenantId, { id }) as { tenantId: string; id: string },
    });
    if (!existing) throw new NotFoundException('Homepage section not found');
    await this.prisma.homepageSection.delete({ where: { id } });
  }

  async getSection(tenantId: string, id: string): Promise<HomepageSectionResponse> {
    const section = await this.prisma.homepageSection.findFirst({
      where: this.tenantWhere(tenantId, { id }) as { tenantId: string; id: string },
    });
    if (!section) throw new NotFoundException('Homepage section not found');
    return this.mapToResponse(section);
  }

  async listSections(tenantId: string): Promise<HomepageSectionResponse[]> {
    const sections = await this.prisma.homepageSection.findMany({
      where: { tenantId },
      orderBy: { displayOrder: 'asc' },
    });
    return sections.map((s) => this.mapToResponse(s));
  }

  async toggleSectionActive(tenantId: string, userId: string, id: string): Promise<HomepageSectionResponse> {
    const existing = await this.prisma.homepageSection.findFirst({
      where: this.tenantWhere(tenantId, { id }) as { tenantId: string; id: string },
    });
    if (!existing) throw new NotFoundException('Homepage section not found');

    const section = await this.prisma.homepageSection.update({
      where: { id },
      data: { isActive: !existing.isActive, updatedBy: userId },
    });

    return this.mapToResponse(section);
  }

  async reorderSections(tenantId: string, userId: string, items: ReorderItem[]): Promise<void> {
    await this.prisma.$transaction(
      items.map((item) =>
        this.prisma.homepageSection.updateMany({
          where: { id: item.id, tenantId },
          data: { displayOrder: item.displayOrder, updatedBy: userId },
        }),
      ),
    );
  }

  /**
   * Get resolved homepage layout with section data for storefront rendering.
   * Fetches actual data for each section type (e.g., banners, products).
   */
  async getResolvedHomepage(tenantId: string): Promise<HomepageLayoutResponse> {
    const sections = await this.prisma.homepageSection.findMany({
      where: { tenantId, isActive: true },
      orderBy: { displayOrder: 'asc' },
    });

    const resolved: ResolvedHomepageSection[] = [];

    for (const section of sections) {
      const config = section.config as HomepageSectionConfig | null;
      let data: unknown = null;

      switch (section.sectionType) {
        case HomepageSectionType.HERO_BANNER:
          data = await this.resolveHeroBanner(tenantId, config);
          break;
        case HomepageSectionType.FEATURED_PRODUCTS:
        case HomepageSectionType.NEW_ARRIVALS:
          data = await this.resolveProducts(tenantId, config, section.sectionType);
          break;
        case HomepageSectionType.CATEGORY_GRID:
          data = await this.resolveCategories(tenantId, config);
          break;
        case HomepageSectionType.PROMOTION_BANNER:
          data = await this.resolvePromotionBanner(tenantId, config);
          break;
        case HomepageSectionType.CUSTOM_HTML:
          data = { htmlContent: config?.htmlContent ?? '' };
          break;
        case HomepageSectionType.TESTIMONIALS:
        case HomepageSectionType.NEWSLETTER:
        case HomepageSectionType.SHOP_BY_OCCASION:
          // Config-driven sections; frontend renders based on config
          data = config;
          break;
      }

      resolved.push({
        id: section.id,
        sectionType: section.sectionType as HomepageSectionType,
        displayOrder: section.displayOrder,
        config,
        data,
      });
    }

    return { sections: resolved };
  }

  // ─── Section Data Resolvers ───────────────────────────────────

  private async resolveHeroBanner(tenantId: string, config: HomepageSectionConfig | null): Promise<unknown> {
    const now = new Date();
    const banners = await this.prisma.banner.findMany({
      where: {
        tenantId,
        position: 'HERO',
        isActive: true,
        OR: [
          { startDate: null, endDate: null },
          { startDate: { lte: now }, endDate: null },
          { startDate: null, endDate: { gte: now } },
          { startDate: { lte: now }, endDate: { gte: now } },
        ],
      },
      orderBy: { displayOrder: 'asc' },
      take: config?.limit ?? 5,
    });

    return banners.map((b) => ({
      id: b.id,
      title: b.title,
      subtitle: b.subtitle,
      imageUrl: b.imageUrl,
      linkUrl: b.linkUrl,
      linkType: b.linkType,
    }));
  }

  private async resolveProducts(
    tenantId: string,
    config: HomepageSectionConfig | null,
    sectionType: string,
  ): Promise<unknown> {
    const where: Record<string, unknown> = { tenantId, isActive: true };

    if (config?.categoryId) {
      where.categoryId = config.categoryId;
    }

    const orderBy = sectionType === HomepageSectionType.NEW_ARRIVALS
      ? { createdAt: 'desc' as const }
      : { sellingPricePaise: 'desc' as const };

    const products = await this.prisma.product.findMany({
      where,
      orderBy,
      take: config?.limit ?? 8,
      select: {
        id: true,
        name: true,
        sku: true,
        productType: true,
        sellingPricePaise: true,
        images: true,
        metalPurity: true,
      },
    });

    return products.map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      productType: p.productType,
      sellingPricePaise: p.sellingPricePaise ? Number(p.sellingPricePaise) : null,
      images: p.images,
      metalPurity: p.metalPurity,
    }));
  }

  private async resolveCategories(tenantId: string, config: HomepageSectionConfig | null): Promise<unknown> {
    const categories = await this.prisma.category.findMany({
      where: { tenantId, parentId: null },
      orderBy: { sortOrder: 'asc' },
      take: config?.limit ?? 8,
      select: {
        id: true,
        name: true,
        description: true,
      },
    });

    return categories;
  }

  private async resolvePromotionBanner(tenantId: string, config: HomepageSectionConfig | null): Promise<unknown> {
    if (config?.bannerId) {
      const banner = await this.prisma.banner.findFirst({
        where: { id: config.bannerId, tenantId, isActive: true },
      });
      if (banner) {
        return {
          id: banner.id,
          title: banner.title,
          subtitle: banner.subtitle,
          imageUrl: banner.imageUrl,
          linkUrl: banner.linkUrl,
          linkType: banner.linkType,
        };
      }
    }

    // Fallback: get the first active inline/promotion banner
    const now = new Date();
    const banner = await this.prisma.banner.findFirst({
      where: {
        tenantId,
        position: 'INLINE',
        isActive: true,
        OR: [
          { startDate: null, endDate: null },
          { startDate: { lte: now }, endDate: null },
          { startDate: null, endDate: { gte: now } },
          { startDate: { lte: now }, endDate: { gte: now } },
        ],
      },
      orderBy: { displayOrder: 'asc' },
    });

    if (!banner) return null;

    return {
      id: banner.id,
      title: banner.title,
      subtitle: banner.subtitle,
      imageUrl: banner.imageUrl,
      linkUrl: banner.linkUrl,
      linkType: banner.linkType,
    };
  }

  // ─── Private Helpers ──────────────────────────────────────────

  private mapToResponse(section: Record<string, unknown>): HomepageSectionResponse {
    const s = section as Record<string, unknown>;
    return {
      id: s.id as string,
      tenantId: s.tenantId as string,
      sectionType: s.sectionType as HomepageSectionType,
      displayOrder: s.displayOrder as number,
      isActive: s.isActive as boolean,
      config: (s.config as HomepageSectionConfig) ?? null,
      createdAt: new Date(s.createdAt as string),
      updatedAt: new Date(s.updatedAt as string),
    };
  }
}
