// ─── CMS tRPC Router ──────────────────────────────────────────
// Admin management endpoints for all CMS entities.

import { Injectable } from '@nestjs/common';
import { TrpcService } from '../../trpc/trpc.service';
import { CmsService } from './cms.service';
import { CmsBlogService } from './cms.blog.service';
import { CmsHomepageService } from './cms.homepage.service';
import { CmsSeoService } from './cms.seo.service';
import { z } from 'zod';
import {
  BannerInputSchema,
  BannerListFilterSchema,
  CollectionInputSchema,
  CollectionListFilterSchema,
  PageInputSchema,
  PageListFilterSchema,
  BlogPostInputSchema,
  BlogPostListFilterSchema,
  FaqInputSchema,
  FaqListFilterSchema,
  AnnouncementInputSchema,
  HomepageSectionInputSchema,
  SeoMetadataInputSchema,
  SeoMetadataListFilterSchema,
  ReorderItemSchema,
  PaginationSchema,
} from '@caratflow/shared-types';

@Injectable()
export class CmsTrpcRouter {
  constructor(
    private readonly trpc: TrpcService,
    private readonly cmsService: CmsService,
    private readonly blogService: CmsBlogService,
    private readonly homepageService: CmsHomepageService,
    private readonly seoService: CmsSeoService,
  ) {}

  get router() {
    return this.trpc.router({
      // ─── Dashboard ──────────────────────────────────────────
      dashboard: this.trpc.authedProcedure.query(({ ctx }) =>
        this.cmsService.getDashboard(ctx.tenantId),
      ),

      // ─── Banners ────────────────────────────────────────────
      banners: this.trpc.router({
        list: this.trpc.authedProcedure
          .input(z.object({ filters: BannerListFilterSchema.optional(), pagination: PaginationSchema.optional() }))
          .query(({ ctx, input }) =>
            this.cmsService.listBanners(
              ctx.tenantId,
              input.filters ?? {},
              input.pagination ?? { page: 1, limit: 20, sortOrder: 'asc' },
            ),
          ),

        getById: this.trpc.authedProcedure
          .input(z.object({ id: z.string().uuid() }))
          .query(({ ctx, input }) =>
            this.cmsService.getBanner(ctx.tenantId, input.id),
          ),

        create: this.trpc.authedProcedure
          .input(BannerInputSchema)
          .mutation(({ ctx, input }) =>
            this.cmsService.createBanner(ctx.tenantId, ctx.userId, input),
          ),

        update: this.trpc.authedProcedure
          .input(z.object({ id: z.string().uuid(), data: BannerInputSchema.partial() }))
          .mutation(({ ctx, input }) =>
            this.cmsService.updateBanner(ctx.tenantId, ctx.userId, input.id, input.data),
          ),

        delete: this.trpc.authedProcedure
          .input(z.object({ id: z.string().uuid() }))
          .mutation(({ ctx, input }) =>
            this.cmsService.deleteBanner(ctx.tenantId, input.id),
          ),
      }),

      // ─── Collections ────────────────────────────────────────
      collections: this.trpc.router({
        list: this.trpc.authedProcedure
          .input(z.object({ filters: CollectionListFilterSchema.optional(), pagination: PaginationSchema.optional() }))
          .query(({ ctx, input }) =>
            this.cmsService.listCollections(
              ctx.tenantId,
              input.filters ?? {},
              input.pagination ?? { page: 1, limit: 20, sortOrder: 'asc' },
            ),
          ),

        getById: this.trpc.authedProcedure
          .input(z.object({ id: z.string().uuid() }))
          .query(({ ctx, input }) =>
            this.cmsService.getCollection(ctx.tenantId, input.id),
          ),

        create: this.trpc.authedProcedure
          .input(CollectionInputSchema)
          .mutation(({ ctx, input }) =>
            this.cmsService.createCollection(ctx.tenantId, ctx.userId, input),
          ),

        update: this.trpc.authedProcedure
          .input(z.object({ id: z.string().uuid(), data: CollectionInputSchema.partial() }))
          .mutation(({ ctx, input }) =>
            this.cmsService.updateCollection(ctx.tenantId, ctx.userId, input.id, input.data),
          ),

        delete: this.trpc.authedProcedure
          .input(z.object({ id: z.string().uuid() }))
          .mutation(({ ctx, input }) =>
            this.cmsService.deleteCollection(ctx.tenantId, input.id),
          ),
      }),

      // ─── Pages ──────────────────────────────────────────────
      pages: this.trpc.router({
        list: this.trpc.authedProcedure
          .input(z.object({ filters: PageListFilterSchema.optional(), pagination: PaginationSchema.optional() }))
          .query(({ ctx, input }) =>
            this.cmsService.listPages(
              ctx.tenantId,
              input.filters ?? {},
              input.pagination ?? { page: 1, limit: 20, sortOrder: 'desc' },
            ),
          ),

        getById: this.trpc.authedProcedure
          .input(z.object({ id: z.string().uuid() }))
          .query(({ ctx, input }) =>
            this.cmsService.getPage(ctx.tenantId, input.id),
          ),

        create: this.trpc.authedProcedure
          .input(PageInputSchema)
          .mutation(({ ctx, input }) =>
            this.cmsService.createPage(ctx.tenantId, ctx.userId, input),
          ),

        update: this.trpc.authedProcedure
          .input(z.object({ id: z.string().uuid(), data: PageInputSchema.partial() }))
          .mutation(({ ctx, input }) =>
            this.cmsService.updatePage(ctx.tenantId, ctx.userId, input.id, input.data),
          ),

        delete: this.trpc.authedProcedure
          .input(z.object({ id: z.string().uuid() }))
          .mutation(({ ctx, input }) =>
            this.cmsService.deletePage(ctx.tenantId, input.id),
          ),
      }),

      // ─── Blog Posts ─────────────────────────────────────────
      blog: this.trpc.router({
        list: this.trpc.authedProcedure
          .input(z.object({ filters: BlogPostListFilterSchema.optional(), pagination: PaginationSchema.optional() }))
          .query(({ ctx, input }) =>
            this.blogService.listBlogPosts(
              ctx.tenantId,
              input.filters ?? {},
              input.pagination ?? { page: 1, limit: 20, sortOrder: 'desc' },
            ),
          ),

        getById: this.trpc.authedProcedure
          .input(z.object({ id: z.string().uuid() }))
          .query(({ ctx, input }) =>
            this.blogService.getBlogPost(ctx.tenantId, input.id),
          ),

        create: this.trpc.authedProcedure
          .input(BlogPostInputSchema)
          .mutation(({ ctx, input }) =>
            this.blogService.createBlogPost(ctx.tenantId, ctx.userId, input),
          ),

        update: this.trpc.authedProcedure
          .input(z.object({ id: z.string().uuid(), data: BlogPostInputSchema.partial() }))
          .mutation(({ ctx, input }) =>
            this.blogService.updateBlogPost(ctx.tenantId, ctx.userId, input.id, input.data),
          ),

        delete: this.trpc.authedProcedure
          .input(z.object({ id: z.string().uuid() }))
          .mutation(({ ctx, input }) =>
            this.blogService.deleteBlogPost(ctx.tenantId, input.id),
          ),

        publish: this.trpc.authedProcedure
          .input(z.object({ id: z.string().uuid() }))
          .mutation(({ ctx, input }) =>
            this.blogService.publishBlogPost(ctx.tenantId, ctx.userId, input.id),
          ),

        unpublish: this.trpc.authedProcedure
          .input(z.object({ id: z.string().uuid() }))
          .mutation(({ ctx, input }) =>
            this.blogService.unpublishBlogPost(ctx.tenantId, ctx.userId, input.id),
          ),
      }),

      // ─── FAQ Items ──────────────────────────────────────────
      faq: this.trpc.router({
        list: this.trpc.authedProcedure
          .input(z.object({ filters: FaqListFilterSchema.optional(), pagination: PaginationSchema.optional() }))
          .query(({ ctx, input }) =>
            this.cmsService.listFaqs(
              ctx.tenantId,
              input.filters ?? {},
              input.pagination ?? { page: 1, limit: 50, sortOrder: 'asc' },
            ),
          ),

        create: this.trpc.authedProcedure
          .input(FaqInputSchema)
          .mutation(({ ctx, input }) =>
            this.cmsService.createFaq(ctx.tenantId, ctx.userId, input),
          ),

        update: this.trpc.authedProcedure
          .input(z.object({ id: z.string().uuid(), data: FaqInputSchema.partial() }))
          .mutation(({ ctx, input }) =>
            this.cmsService.updateFaq(ctx.tenantId, ctx.userId, input.id, input.data),
          ),

        delete: this.trpc.authedProcedure
          .input(z.object({ id: z.string().uuid() }))
          .mutation(({ ctx, input }) =>
            this.cmsService.deleteFaq(ctx.tenantId, input.id),
          ),

        reorder: this.trpc.authedProcedure
          .input(z.object({ items: z.array(ReorderItemSchema) }))
          .mutation(({ ctx, input }) =>
            this.cmsService.reorderFaqs(ctx.tenantId, ctx.userId, input.items),
          ),
      }),

      // ─── Announcements ─────────────────────────────────────
      announcements: this.trpc.router({
        list: this.trpc.authedProcedure
          .input(z.object({ pagination: PaginationSchema.optional() }))
          .query(({ ctx, input }) =>
            this.cmsService.listAnnouncements(
              ctx.tenantId,
              input.pagination ?? { page: 1, limit: 20, sortOrder: 'desc' },
            ),
          ),

        create: this.trpc.authedProcedure
          .input(AnnouncementInputSchema)
          .mutation(({ ctx, input }) =>
            this.cmsService.createAnnouncement(ctx.tenantId, ctx.userId, input),
          ),

        update: this.trpc.authedProcedure
          .input(z.object({ id: z.string().uuid(), data: AnnouncementInputSchema.partial() }))
          .mutation(({ ctx, input }) =>
            this.cmsService.updateAnnouncement(ctx.tenantId, ctx.userId, input.id, input.data),
          ),

        delete: this.trpc.authedProcedure
          .input(z.object({ id: z.string().uuid() }))
          .mutation(({ ctx, input }) =>
            this.cmsService.deleteAnnouncement(ctx.tenantId, input.id),
          ),
      }),

      // ─── Homepage Sections ──────────────────────────────────
      homepage: this.trpc.router({
        list: this.trpc.authedProcedure.query(({ ctx }) =>
          this.homepageService.listSections(ctx.tenantId),
        ),

        getById: this.trpc.authedProcedure
          .input(z.object({ id: z.string().uuid() }))
          .query(({ ctx, input }) =>
            this.homepageService.getSection(ctx.tenantId, input.id),
          ),

        create: this.trpc.authedProcedure
          .input(HomepageSectionInputSchema)
          .mutation(({ ctx, input }) =>
            this.homepageService.createSection(ctx.tenantId, ctx.userId, input),
          ),

        update: this.trpc.authedProcedure
          .input(z.object({ id: z.string().uuid(), data: HomepageSectionInputSchema.partial() }))
          .mutation(({ ctx, input }) =>
            this.homepageService.updateSection(ctx.tenantId, ctx.userId, input.id, input.data),
          ),

        delete: this.trpc.authedProcedure
          .input(z.object({ id: z.string().uuid() }))
          .mutation(({ ctx, input }) =>
            this.homepageService.deleteSection(ctx.tenantId, input.id),
          ),

        toggleActive: this.trpc.authedProcedure
          .input(z.object({ id: z.string().uuid() }))
          .mutation(({ ctx, input }) =>
            this.homepageService.toggleSectionActive(ctx.tenantId, ctx.userId, input.id),
          ),

        reorder: this.trpc.authedProcedure
          .input(z.object({ items: z.array(ReorderItemSchema) }))
          .mutation(({ ctx, input }) =>
            this.homepageService.reorderSections(ctx.tenantId, ctx.userId, input.items),
          ),
      }),

      // ─── SEO Metadata ──────────────────────────────────────
      seo: this.trpc.router({
        list: this.trpc.authedProcedure
          .input(z.object({ filters: SeoMetadataListFilterSchema.optional(), pagination: PaginationSchema.optional() }))
          .query(({ ctx, input }) =>
            this.seoService.listSeoMetadata(
              ctx.tenantId,
              input.filters ?? {},
              input.pagination ?? { page: 1, limit: 20, sortOrder: 'desc' },
            ),
          ),

        getById: this.trpc.authedProcedure
          .input(z.object({ id: z.string().uuid() }))
          .query(({ ctx, input }) =>
            this.seoService.getSeoMetadataById(ctx.tenantId, input.id),
          ),

        upsert: this.trpc.authedProcedure
          .input(SeoMetadataInputSchema)
          .mutation(({ ctx, input }) =>
            this.seoService.upsertSeoMetadata(ctx.tenantId, ctx.userId, input),
          ),

        delete: this.trpc.authedProcedure
          .input(z.object({ id: z.string().uuid() }))
          .mutation(({ ctx, input }) =>
            this.seoService.deleteSeoMetadata(ctx.tenantId, input.id),
          ),

        generateForProduct: this.trpc.authedProcedure
          .input(z.object({ productId: z.string().uuid() }))
          .mutation(({ ctx, input }) =>
            this.seoService.generateProductSeo(ctx.tenantId, ctx.userId, input.productId),
          ),

        generateForCategory: this.trpc.authedProcedure
          .input(z.object({ categoryId: z.string().uuid() }))
          .mutation(({ ctx, input }) =>
            this.seoService.generateCategorySeo(ctx.tenantId, ctx.userId, input.categoryId),
          ),
      }),
    });
  }
}
