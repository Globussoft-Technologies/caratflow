// ─── CMS Public REST Controller ────────────────────────────────
// Public storefront API endpoints for consuming CMS content.
// No authentication required -- these serve the e-commerce frontend.

import { Controller, Get, Param, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { CmsService } from './cms.service';
import { CmsBlogService } from './cms.blog.service';
import { CmsHomepageService } from './cms.homepage.service';
import { CmsSeoService } from './cms.seo.service';
import type { ApiResponse } from '@caratflow/shared-types';

@Controller('api/v1/store/cms')
export class CmsController {
  constructor(
    private readonly cmsService: CmsService,
    private readonly blogService: CmsBlogService,
    private readonly homepageService: CmsHomepageService,
    private readonly seoService: CmsSeoService,
  ) {}

  /**
   * GET /api/v1/store/cms/homepage
   * Returns resolved homepage layout with section data.
   */
  @Get('homepage')
  async getHomepage(@Req() req: Request): Promise<ApiResponse<unknown>> {
    const tenantId = this.getTenantId(req);
    const layout = await this.homepageService.getResolvedHomepage(tenantId);
    return { success: true, data: layout };
  }

  /**
   * GET /api/v1/store/cms/banners?position=HERO
   * Returns active banners, optionally filtered by position.
   */
  @Get('banners')
  async getBanners(
    @Req() req: Request,
    @Query('position') position?: string,
  ): Promise<ApiResponse<unknown>> {
    const tenantId = this.getTenantId(req);
    const banners = await this.cmsService.getActiveBannersByPosition(
      tenantId,
      position ?? 'HERO',
    );
    return { success: true, data: banners };
  }

  /**
   * GET /api/v1/store/cms/collections
   * Returns active collections.
   */
  @Get('collections')
  async getCollections(@Req() req: Request): Promise<ApiResponse<unknown>> {
    const tenantId = this.getTenantId(req);
    const result = await this.cmsService.listCollections(
      tenantId,
      { isActive: true },
      { page: 1, limit: 50, sortOrder: 'asc' },
    );
    return { success: true, data: result.items };
  }

  /**
   * GET /api/v1/store/cms/collections/:slug
   * Returns a single collection by slug.
   */
  @Get('collections/:slug')
  async getCollectionBySlug(
    @Req() req: Request,
    @Param('slug') slug: string,
  ): Promise<ApiResponse<unknown>> {
    const tenantId = this.getTenantId(req);
    const collection = await this.cmsService.getCollectionBySlug(tenantId, slug);
    return { success: true, data: collection };
  }

  /**
   * GET /api/v1/store/cms/pages/:slug
   * Returns a published page by slug.
   */
  @Get('pages/:slug')
  async getPageBySlug(
    @Req() req: Request,
    @Param('slug') slug: string,
  ): Promise<ApiResponse<unknown>> {
    const tenantId = this.getTenantId(req);
    const page = await this.cmsService.getPageBySlug(tenantId, slug);
    return { success: true, data: page };
  }

  /**
   * GET /api/v1/store/cms/blog
   * Returns published blog posts with pagination.
   */
  @Get('blog')
  async getBlogPosts(
    @Req() req: Request,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('category') category?: string,
    @Query('tag') tag?: string,
  ): Promise<ApiResponse<unknown>> {
    const tenantId = this.getTenantId(req);
    const result = await this.blogService.listPublishedBlogPosts(
      tenantId,
      { categoryTag: category, tag },
      {
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 10,
        sortOrder: 'desc',
      },
    );
    return { success: true, data: result.items, meta: { total: result.total, totalPages: result.totalPages } };
  }

  /**
   * GET /api/v1/store/cms/blog/:slug
   * Returns a published blog post by slug and increments view count.
   */
  @Get('blog/:slug')
  async getBlogPostBySlug(
    @Req() req: Request,
    @Param('slug') slug: string,
  ): Promise<ApiResponse<unknown>> {
    const tenantId = this.getTenantId(req);
    const post = await this.blogService.getBlogPostBySlug(tenantId, slug);

    // Fire-and-forget view count increment
    this.blogService.incrementViewCount(tenantId, post.id).catch(() => {
      // Swallow errors -- view count is non-critical
    });

    return { success: true, data: post };
  }

  /**
   * GET /api/v1/store/cms/faq
   * Returns published FAQ items grouped by category.
   */
  @Get('faq')
  async getFaq(@Req() req: Request): Promise<ApiResponse<unknown>> {
    const tenantId = this.getTenantId(req);
    const faqs = await this.cmsService.getPublishedFaqs(tenantId);

    // Group by category
    const grouped: Record<string, typeof faqs> = {};
    for (const faq of faqs) {
      const cat = faq.category ?? 'General';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(faq);
    }

    return { success: true, data: { items: faqs, grouped } };
  }

  /**
   * GET /api/v1/store/cms/announcement
   * Returns the active announcement (if any).
   */
  @Get('announcement')
  async getAnnouncement(@Req() req: Request): Promise<ApiResponse<unknown>> {
    const tenantId = this.getTenantId(req);
    const announcement = await this.cmsService.getActiveAnnouncement(tenantId);
    return { success: true, data: announcement };
  }

  /**
   * GET /api/v1/store/cms/seo/:pageType/:identifier
   * Returns SEO metadata for a specific page.
   */
  @Get('seo/:pageType/:identifier')
  async getSeoMetadata(
    @Req() req: Request,
    @Param('pageType') pageType: string,
    @Param('identifier') identifier: string,
  ): Promise<ApiResponse<unknown>> {
    const tenantId = this.getTenantId(req);
    const metadata = await this.seoService.getSeoMetadata(tenantId, pageType, identifier);
    return { success: true, data: metadata };
  }

  // ─── Helpers ────────────────────────────────────────────────

  private getTenantId(req: Request): string {
    // Tenant ID is extracted by TenantMiddleware
    const tenantId = (req as Record<string, unknown>).tenantId as string;
    if (!tenantId) {
      throw new Error('Tenant ID is required');
    }
    return tenantId;
  }
}
