// ─── CMS Core Service ──────────────────────────────────────────
// CRUD operations for banners, collections, pages, FAQs,
// and announcements.

import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import type {
  BannerInput,
  BannerResponse,
  BannerListFilter,
  CollectionInput,
  CollectionResponse,
  CollectionListFilter,
  PageInput,
  PageResponse,
  PageListFilter,
  FaqInput,
  FaqResponse,
  FaqListFilter,
  AnnouncementInput,
  AnnouncementResponse,
  ReorderItem,
  CmsDashboardResponse,
} from '@caratflow/shared-types';
import type { PaginatedResult, Pagination } from '@caratflow/shared-types';
import { PrismaService } from '../../common/prisma.service';
import { TenantAwareService } from '../../common/base.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class CmsService extends TenantAwareService {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  // ─── Banners ───────────────────────────────────────────────────

  async createBanner(tenantId: string, userId: string, input: BannerInput): Promise<BannerResponse> {
    const banner = await this.prisma.banner.create({
      data: {
        id: uuidv4(),
        tenantId,
        title: input.title,
        subtitle: input.subtitle ?? null,
        imageUrl: input.imageUrl,
        linkUrl: input.linkUrl ?? null,
        linkType: input.linkType ?? 'NONE',
        position: input.position ?? 'HERO',
        displayOrder: input.displayOrder ?? 0,
        startDate: input.startDate ?? null,
        endDate: input.endDate ?? null,
        isActive: input.isActive ?? true,
        targetAudience: input.targetAudience ?? 'ALL',
        createdBy: userId,
        updatedBy: userId,
      },
    });

    return this.mapBannerToResponse(banner);
  }

  async updateBanner(tenantId: string, userId: string, id: string, input: Partial<BannerInput>): Promise<BannerResponse> {
    const existing = await this.prisma.banner.findFirst({
      where: this.tenantWhere(tenantId, { id }) as { tenantId: string; id: string },
    });
    if (!existing) throw new NotFoundException('Banner not found');

    const banner = await this.prisma.banner.update({
      where: { id },
      data: {
        ...this.buildUpdateData(input),
        updatedBy: userId,
      },
    });

    return this.mapBannerToResponse(banner);
  }

  async deleteBanner(tenantId: string, id: string): Promise<void> {
    const existing = await this.prisma.banner.findFirst({
      where: this.tenantWhere(tenantId, { id }) as { tenantId: string; id: string },
    });
    if (!existing) throw new NotFoundException('Banner not found');

    await this.prisma.banner.delete({ where: { id } });
  }

  async getBanner(tenantId: string, id: string): Promise<BannerResponse> {
    const banner = await this.prisma.banner.findFirst({
      where: this.tenantWhere(tenantId, { id }) as { tenantId: string; id: string },
    });
    if (!banner) throw new NotFoundException('Banner not found');
    return this.mapBannerToResponse(banner);
  }

  async listBanners(
    tenantId: string,
    filters: BannerListFilter,
    pagination: Pagination,
  ): Promise<PaginatedResult<BannerResponse>> {
    const where: Record<string, unknown> = { tenantId };
    if (filters.position) where.position = filters.position;
    if (filters.isActive !== undefined) where.isActive = filters.isActive;
    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search } },
        { subtitle: { contains: filters.search } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.banner.findMany({
        where,
        orderBy: { [pagination.sortBy ?? 'displayOrder']: pagination.sortOrder ?? 'asc' },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      }),
      this.prisma.banner.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pagination.limit);
    return {
      items: items.map((b) => this.mapBannerToResponse(b)),
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages,
      hasNext: pagination.page < totalPages,
      hasPrevious: pagination.page > 1,
    };
  }

  async getActiveBannersByPosition(tenantId: string, position: string): Promise<BannerResponse[]> {
    const now = new Date();
    const banners = await this.prisma.banner.findMany({
      where: {
        tenantId,
        position: position as 'HERO' | 'SIDEBAR' | 'POPUP' | 'INLINE',
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

    return banners.map((b) => this.mapBannerToResponse(b));
  }

  // ─── Collections ───────────────────────────────────────────────

  async createCollection(tenantId: string, userId: string, input: CollectionInput): Promise<CollectionResponse> {
    const existingSlug = await this.prisma.collection.findFirst({
      where: { tenantId, slug: input.slug },
    });
    if (existingSlug) throw new ConflictException('Collection with this slug already exists');

    const collection = await this.prisma.collection.create({
      data: {
        id: uuidv4(),
        tenantId,
        name: input.name,
        slug: input.slug,
        description: input.description ?? null,
        imageUrl: input.imageUrl ?? null,
        products: input.products ?? [],
        displayOrder: input.displayOrder ?? 0,
        isActive: input.isActive ?? true,
        isFeatured: input.isFeatured ?? false,
        createdBy: userId,
        updatedBy: userId,
      },
    });

    return this.mapCollectionToResponse(collection);
  }

  async updateCollection(tenantId: string, userId: string, id: string, input: Partial<CollectionInput>): Promise<CollectionResponse> {
    const existing = await this.prisma.collection.findFirst({
      where: this.tenantWhere(tenantId, { id }) as { tenantId: string; id: string },
    });
    if (!existing) throw new NotFoundException('Collection not found');

    if (input.slug && input.slug !== existing.slug) {
      const slugConflict = await this.prisma.collection.findFirst({
        where: { tenantId, slug: input.slug, id: { not: id } },
      });
      if (slugConflict) throw new ConflictException('Collection with this slug already exists');
    }

    const collection = await this.prisma.collection.update({
      where: { id },
      data: {
        ...this.buildUpdateData(input),
        updatedBy: userId,
      },
    });

    return this.mapCollectionToResponse(collection);
  }

  async deleteCollection(tenantId: string, id: string): Promise<void> {
    const existing = await this.prisma.collection.findFirst({
      where: this.tenantWhere(tenantId, { id }) as { tenantId: string; id: string },
    });
    if (!existing) throw new NotFoundException('Collection not found');
    await this.prisma.collection.delete({ where: { id } });
  }

  async getCollection(tenantId: string, id: string): Promise<CollectionResponse> {
    const collection = await this.prisma.collection.findFirst({
      where: this.tenantWhere(tenantId, { id }) as { tenantId: string; id: string },
    });
    if (!collection) throw new NotFoundException('Collection not found');
    return this.mapCollectionToResponse(collection);
  }

  async getCollectionBySlug(tenantId: string, slug: string): Promise<CollectionResponse> {
    const collection = await this.prisma.collection.findFirst({
      where: { tenantId, slug, isActive: true },
    });
    if (!collection) throw new NotFoundException('Collection not found');
    return this.mapCollectionToResponse(collection);
  }

  async listCollections(
    tenantId: string,
    filters: CollectionListFilter,
    pagination: Pagination,
  ): Promise<PaginatedResult<CollectionResponse>> {
    const where: Record<string, unknown> = { tenantId };
    if (filters.isActive !== undefined) where.isActive = filters.isActive;
    if (filters.isFeatured !== undefined) where.isFeatured = filters.isFeatured;
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search } },
        { description: { contains: filters.search } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.collection.findMany({
        where,
        orderBy: { [pagination.sortBy ?? 'displayOrder']: pagination.sortOrder ?? 'asc' },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      }),
      this.prisma.collection.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pagination.limit);
    return {
      items: items.map((c) => this.mapCollectionToResponse(c)),
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages,
      hasNext: pagination.page < totalPages,
      hasPrevious: pagination.page > 1,
    };
  }

  // ─── Pages ─────────────────────────────────────────────────────

  async createPage(tenantId: string, userId: string, input: PageInput): Promise<PageResponse> {
    const existingSlug = await this.prisma.page.findFirst({
      where: { tenantId, slug: input.slug },
    });
    if (existingSlug) throw new ConflictException('Page with this slug already exists');

    const page = await this.prisma.page.create({
      data: {
        id: uuidv4(),
        tenantId,
        title: input.title,
        slug: input.slug,
        content: input.content,
        metaTitle: input.metaTitle ?? null,
        metaDescription: input.metaDescription ?? null,
        isPublished: input.isPublished ?? false,
        publishedAt: input.isPublished ? new Date() : null,
        createdBy: userId,
        updatedBy: userId,
      },
    });

    return this.mapPageToResponse(page);
  }

  async updatePage(tenantId: string, userId: string, id: string, input: Partial<PageInput>): Promise<PageResponse> {
    const existing = await this.prisma.page.findFirst({
      where: this.tenantWhere(tenantId, { id }) as { tenantId: string; id: string },
    });
    if (!existing) throw new NotFoundException('Page not found');

    if (input.slug && input.slug !== existing.slug) {
      const slugConflict = await this.prisma.page.findFirst({
        where: { tenantId, slug: input.slug, id: { not: id } },
      });
      if (slugConflict) throw new ConflictException('Page with this slug already exists');
    }

    const data: Record<string, unknown> = { ...this.buildUpdateData(input), updatedBy: userId };
    if (input.isPublished === true && !existing.isPublished) {
      data.publishedAt = new Date();
    }

    const page = await this.prisma.page.update({ where: { id }, data });
    return this.mapPageToResponse(page);
  }

  async deletePage(tenantId: string, id: string): Promise<void> {
    const existing = await this.prisma.page.findFirst({
      where: this.tenantWhere(tenantId, { id }) as { tenantId: string; id: string },
    });
    if (!existing) throw new NotFoundException('Page not found');
    await this.prisma.page.delete({ where: { id } });
  }

  async getPage(tenantId: string, id: string): Promise<PageResponse> {
    const page = await this.prisma.page.findFirst({
      where: this.tenantWhere(tenantId, { id }) as { tenantId: string; id: string },
    });
    if (!page) throw new NotFoundException('Page not found');
    return this.mapPageToResponse(page);
  }

  async getPageBySlug(tenantId: string, slug: string): Promise<PageResponse> {
    const page = await this.prisma.page.findFirst({
      where: { tenantId, slug, isPublished: true },
    });
    if (!page) throw new NotFoundException('Page not found');
    return this.mapPageToResponse(page);
  }

  async listPages(
    tenantId: string,
    filters: PageListFilter,
    pagination: Pagination,
  ): Promise<PaginatedResult<PageResponse>> {
    const where: Record<string, unknown> = { tenantId };
    if (filters.isPublished !== undefined) where.isPublished = filters.isPublished;
    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search } },
        { content: { contains: filters.search } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.page.findMany({
        where,
        orderBy: { [pagination.sortBy ?? 'createdAt']: pagination.sortOrder ?? 'desc' },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      }),
      this.prisma.page.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pagination.limit);
    return {
      items: items.map((p) => this.mapPageToResponse(p)),
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages,
      hasNext: pagination.page < totalPages,
      hasPrevious: pagination.page > 1,
    };
  }

  // ─── FAQ Items ─────────────────────────────────────────────────

  async createFaq(tenantId: string, userId: string, input: FaqInput): Promise<FaqResponse> {
    const faq = await this.prisma.faqItem.create({
      data: {
        id: uuidv4(),
        tenantId,
        question: input.question,
        answer: input.answer,
        category: input.category ?? null,
        displayOrder: input.displayOrder ?? 0,
        isPublished: input.isPublished ?? true,
        createdBy: userId,
        updatedBy: userId,
      },
    });

    return this.mapFaqToResponse(faq);
  }

  async updateFaq(tenantId: string, userId: string, id: string, input: Partial<FaqInput>): Promise<FaqResponse> {
    const existing = await this.prisma.faqItem.findFirst({
      where: this.tenantWhere(tenantId, { id }) as { tenantId: string; id: string },
    });
    if (!existing) throw new NotFoundException('FAQ item not found');

    const faq = await this.prisma.faqItem.update({
      where: { id },
      data: { ...this.buildUpdateData(input), updatedBy: userId },
    });

    return this.mapFaqToResponse(faq);
  }

  async deleteFaq(tenantId: string, id: string): Promise<void> {
    const existing = await this.prisma.faqItem.findFirst({
      where: this.tenantWhere(tenantId, { id }) as { tenantId: string; id: string },
    });
    if (!existing) throw new NotFoundException('FAQ item not found');
    await this.prisma.faqItem.delete({ where: { id } });
  }

  async listFaqs(
    tenantId: string,
    filters: FaqListFilter,
    pagination: Pagination,
  ): Promise<PaginatedResult<FaqResponse>> {
    const where: Record<string, unknown> = { tenantId };
    if (filters.category) where.category = filters.category;
    if (filters.isPublished !== undefined) where.isPublished = filters.isPublished;

    const [items, total] = await Promise.all([
      this.prisma.faqItem.findMany({
        where,
        orderBy: { displayOrder: 'asc' },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      }),
      this.prisma.faqItem.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pagination.limit);
    return {
      items: items.map((f) => this.mapFaqToResponse(f)),
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages,
      hasNext: pagination.page < totalPages,
      hasPrevious: pagination.page > 1,
    };
  }

  async getPublishedFaqs(tenantId: string): Promise<FaqResponse[]> {
    const faqs = await this.prisma.faqItem.findMany({
      where: { tenantId, isPublished: true },
      orderBy: { displayOrder: 'asc' },
    });
    return faqs.map((f) => this.mapFaqToResponse(f));
  }

  async reorderFaqs(tenantId: string, userId: string, items: ReorderItem[]): Promise<void> {
    await this.prisma.$transaction(
      items.map((item) =>
        this.prisma.faqItem.updateMany({
          where: { id: item.id, tenantId },
          data: { displayOrder: item.displayOrder, updatedBy: userId },
        }),
      ),
    );
  }

  // ─── Announcements ─────────────────────────────────────────────

  async createAnnouncement(tenantId: string, userId: string, input: AnnouncementInput): Promise<AnnouncementResponse> {
    const announcement = await this.prisma.announcement.create({
      data: {
        id: uuidv4(),
        tenantId,
        message: input.message,
        linkUrl: input.linkUrl ?? null,
        linkText: input.linkText ?? null,
        backgroundColor: input.backgroundColor ?? null,
        textColor: input.textColor ?? null,
        isActive: input.isActive ?? true,
        startDate: input.startDate ?? null,
        endDate: input.endDate ?? null,
        createdBy: userId,
        updatedBy: userId,
      },
    });

    return this.mapAnnouncementToResponse(announcement);
  }

  async updateAnnouncement(tenantId: string, userId: string, id: string, input: Partial<AnnouncementInput>): Promise<AnnouncementResponse> {
    const existing = await this.prisma.announcement.findFirst({
      where: this.tenantWhere(tenantId, { id }) as { tenantId: string; id: string },
    });
    if (!existing) throw new NotFoundException('Announcement not found');

    const announcement = await this.prisma.announcement.update({
      where: { id },
      data: { ...this.buildUpdateData(input), updatedBy: userId },
    });

    return this.mapAnnouncementToResponse(announcement);
  }

  async deleteAnnouncement(tenantId: string, id: string): Promise<void> {
    const existing = await this.prisma.announcement.findFirst({
      where: this.tenantWhere(tenantId, { id }) as { tenantId: string; id: string },
    });
    if (!existing) throw new NotFoundException('Announcement not found');
    await this.prisma.announcement.delete({ where: { id } });
  }

  async getActiveAnnouncement(tenantId: string): Promise<AnnouncementResponse | null> {
    const now = new Date();
    const announcement = await this.prisma.announcement.findFirst({
      where: {
        tenantId,
        isActive: true,
        OR: [
          { startDate: null, endDate: null },
          { startDate: { lte: now }, endDate: null },
          { startDate: null, endDate: { gte: now } },
          { startDate: { lte: now }, endDate: { gte: now } },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });

    return announcement ? this.mapAnnouncementToResponse(announcement) : null;
  }

  async listAnnouncements(
    tenantId: string,
    pagination: Pagination,
  ): Promise<PaginatedResult<AnnouncementResponse>> {
    const where = { tenantId };

    const [items, total] = await Promise.all([
      this.prisma.announcement.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      }),
      this.prisma.announcement.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pagination.limit);
    return {
      items: items.map((a) => this.mapAnnouncementToResponse(a)),
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages,
      hasNext: pagination.page < totalPages,
      hasPrevious: pagination.page > 1,
    };
  }

  // ─── Dashboard ─────────────────────────────────────────────────

  async getDashboard(tenantId: string): Promise<CmsDashboardResponse> {
    const [
      activeBanners,
      totalCollections,
      publishedPages,
      publishedBlogPosts,
      publishedFaqs,
      activeAnnouncements,
      homepageSections,
    ] = await Promise.all([
      this.prisma.banner.count({ where: { tenantId, isActive: true } }),
      this.prisma.collection.count({ where: { tenantId } }),
      this.prisma.page.count({ where: { tenantId, isPublished: true } }),
      this.prisma.blogPost.count({ where: { tenantId, isPublished: true } }),
      this.prisma.faqItem.count({ where: { tenantId, isPublished: true } }),
      this.prisma.announcement.count({ where: { tenantId, isActive: true } }),
      this.prisma.homepageSection.count({ where: { tenantId, isActive: true } }),
    ]);

    return {
      activeBanners,
      totalCollections,
      publishedPages,
      publishedBlogPosts,
      publishedFaqs,
      activeAnnouncements,
      homepageSections,
    };
  }

  // ─── Private Helpers ──────────────────────────────────────────

  private buildUpdateData(input: Record<string, unknown>): Record<string, unknown> {
    const data: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      if (value !== undefined) {
        data[key] = value;
      }
    }
    return data;
  }

  private mapBannerToResponse(banner: Record<string, unknown>): BannerResponse {
    const b = banner as Record<string, unknown>;
    return {
      id: b.id as string,
      tenantId: b.tenantId as string,
      title: b.title as string,
      subtitle: (b.subtitle as string) ?? null,
      imageUrl: b.imageUrl as string,
      linkUrl: (b.linkUrl as string) ?? null,
      linkType: b.linkType as BannerResponse['linkType'],
      position: b.position as BannerResponse['position'],
      displayOrder: b.displayOrder as number,
      startDate: b.startDate ? new Date(b.startDate as string) : null,
      endDate: b.endDate ? new Date(b.endDate as string) : null,
      isActive: b.isActive as boolean,
      targetAudience: b.targetAudience as BannerResponse['targetAudience'],
      createdAt: new Date(b.createdAt as string),
      updatedAt: new Date(b.updatedAt as string),
    };
  }

  private mapCollectionToResponse(collection: Record<string, unknown>): CollectionResponse {
    const c = collection as Record<string, unknown>;
    return {
      id: c.id as string,
      tenantId: c.tenantId as string,
      name: c.name as string,
      slug: c.slug as string,
      description: (c.description as string) ?? null,
      imageUrl: (c.imageUrl as string) ?? null,
      products: (c.products as string[]) ?? null,
      displayOrder: c.displayOrder as number,
      isActive: c.isActive as boolean,
      isFeatured: c.isFeatured as boolean,
      createdAt: new Date(c.createdAt as string),
      updatedAt: new Date(c.updatedAt as string),
    };
  }

  private mapPageToResponse(page: Record<string, unknown>): PageResponse {
    const p = page as Record<string, unknown>;
    return {
      id: p.id as string,
      tenantId: p.tenantId as string,
      title: p.title as string,
      slug: p.slug as string,
      content: p.content as string,
      metaTitle: (p.metaTitle as string) ?? null,
      metaDescription: (p.metaDescription as string) ?? null,
      isPublished: p.isPublished as boolean,
      publishedAt: p.publishedAt ? new Date(p.publishedAt as string) : null,
      createdAt: new Date(p.createdAt as string),
      updatedAt: new Date(p.updatedAt as string),
    };
  }

  private mapFaqToResponse(faq: Record<string, unknown>): FaqResponse {
    const f = faq as Record<string, unknown>;
    return {
      id: f.id as string,
      tenantId: f.tenantId as string,
      question: f.question as string,
      answer: f.answer as string,
      category: (f.category as string) ?? null,
      displayOrder: f.displayOrder as number,
      isPublished: f.isPublished as boolean,
      createdAt: new Date(f.createdAt as string),
      updatedAt: new Date(f.updatedAt as string),
    };
  }

  private mapAnnouncementToResponse(announcement: Record<string, unknown>): AnnouncementResponse {
    const a = announcement as Record<string, unknown>;
    return {
      id: a.id as string,
      tenantId: a.tenantId as string,
      message: a.message as string,
      linkUrl: (a.linkUrl as string) ?? null,
      linkText: (a.linkText as string) ?? null,
      backgroundColor: (a.backgroundColor as string) ?? null,
      textColor: (a.textColor as string) ?? null,
      isActive: a.isActive as boolean,
      startDate: a.startDate ? new Date(a.startDate as string) : null,
      endDate: a.endDate ? new Date(a.endDate as string) : null,
      createdAt: new Date(a.createdAt as string),
      updatedAt: new Date(a.updatedAt as string),
    };
  }
}
