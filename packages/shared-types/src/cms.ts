// ─── CaratFlow CMS Types ───────────────────────────────────────
// Types for content management: banners, collections, pages,
// blog posts, FAQs, announcements, SEO metadata, homepage layout.

import { z } from 'zod';

// ─── Enums ─────────────────────────────────────────────────────

export enum BannerLinkType {
  PRODUCT = 'PRODUCT',
  CATEGORY = 'CATEGORY',
  COLLECTION = 'COLLECTION',
  EXTERNAL = 'EXTERNAL',
  NONE = 'NONE',
}

export enum BannerPosition {
  HERO = 'HERO',
  SIDEBAR = 'SIDEBAR',
  POPUP = 'POPUP',
  INLINE = 'INLINE',
}

export enum TargetAudience {
  ALL = 'ALL',
  NEW_CUSTOMERS = 'NEW_CUSTOMERS',
  RETURNING = 'RETURNING',
  LOYALTY_MEMBERS = 'LOYALTY_MEMBERS',
}

export enum SeoPageType {
  HOME = 'HOME',
  CATEGORY = 'CATEGORY',
  PRODUCT = 'PRODUCT',
  COLLECTION = 'COLLECTION',
  BLOG = 'BLOG',
}

export enum HomepageSectionType {
  HERO_BANNER = 'HERO_BANNER',
  CATEGORY_GRID = 'CATEGORY_GRID',
  FEATURED_PRODUCTS = 'FEATURED_PRODUCTS',
  NEW_ARRIVALS = 'NEW_ARRIVALS',
  SHOP_BY_OCCASION = 'SHOP_BY_OCCASION',
  TESTIMONIALS = 'TESTIMONIALS',
  NEWSLETTER = 'NEWSLETTER',
  PROMOTION_BANNER = 'PROMOTION_BANNER',
  CUSTOM_HTML = 'CUSTOM_HTML',
}

// ─── Banner ────────────────────────────────────────────────────

export const BannerInputSchema = z.object({
  title: z.string().min(1).max(255),
  subtitle: z.string().max(500).optional(),
  imageUrl: z.string().url().max(1000),
  linkUrl: z.string().max(1000).optional(),
  linkType: z.nativeEnum(BannerLinkType).default(BannerLinkType.NONE),
  position: z.nativeEnum(BannerPosition).default(BannerPosition.HERO),
  displayOrder: z.number().int().nonnegative().default(0),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  isActive: z.boolean().default(true),
  targetAudience: z.nativeEnum(TargetAudience).default(TargetAudience.ALL),
});
export type BannerInput = z.infer<typeof BannerInputSchema>;

export const BannerResponseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  title: z.string(),
  subtitle: z.string().nullable(),
  imageUrl: z.string(),
  linkUrl: z.string().nullable(),
  linkType: z.nativeEnum(BannerLinkType),
  position: z.nativeEnum(BannerPosition),
  displayOrder: z.number().int(),
  startDate: z.coerce.date().nullable(),
  endDate: z.coerce.date().nullable(),
  isActive: z.boolean(),
  targetAudience: z.nativeEnum(TargetAudience),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type BannerResponse = z.infer<typeof BannerResponseSchema>;

export const BannerListFilterSchema = z.object({
  position: z.nativeEnum(BannerPosition).optional(),
  isActive: z.boolean().optional(),
  search: z.string().optional(),
});
export type BannerListFilter = z.infer<typeof BannerListFilterSchema>;

// ─── Collection ────────────────────────────────────────────────

export const CollectionInputSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens'),
  description: z.string().optional(),
  imageUrl: z.string().url().max(1000).optional(),
  products: z.array(z.string().uuid()).default([]),
  displayOrder: z.number().int().nonnegative().default(0),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
});
export type CollectionInput = z.infer<typeof CollectionInputSchema>;

export const CollectionResponseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  imageUrl: z.string().nullable(),
  products: z.array(z.string()).nullable(),
  displayOrder: z.number().int(),
  isActive: z.boolean(),
  isFeatured: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type CollectionResponse = z.infer<typeof CollectionResponseSchema>;

export const CollectionListFilterSchema = z.object({
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  search: z.string().optional(),
});
export type CollectionListFilter = z.infer<typeof CollectionListFilterSchema>;

// ─── Page ──────────────────────────────────────────────────────

export const PageInputSchema = z.object({
  title: z.string().min(1).max(255),
  slug: z.string().min(1).max(255).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens'),
  content: z.string().min(1),
  metaTitle: z.string().max(255).optional(),
  metaDescription: z.string().max(500).optional(),
  isPublished: z.boolean().default(false),
});
export type PageInput = z.infer<typeof PageInputSchema>;

export const PageResponseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  title: z.string(),
  slug: z.string(),
  content: z.string(),
  metaTitle: z.string().nullable(),
  metaDescription: z.string().nullable(),
  isPublished: z.boolean(),
  publishedAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type PageResponse = z.infer<typeof PageResponseSchema>;

export const PageListFilterSchema = z.object({
  isPublished: z.boolean().optional(),
  search: z.string().optional(),
});
export type PageListFilter = z.infer<typeof PageListFilterSchema>;

// ─── Blog Post ─────────────────────────────────────────────────

export const BlogPostInputSchema = z.object({
  title: z.string().min(1).max(255),
  slug: z.string().min(1).max(255).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens'),
  excerpt: z.string().optional(),
  content: z.string().min(1),
  coverImageUrl: z.string().url().max(1000).optional(),
  author: z.string().min(1).max(255),
  categoryTag: z.string().max(100).optional(),
  tags: z.array(z.string()).default([]),
  readTimeMinutes: z.number().int().nonnegative().default(0),
  isPublished: z.boolean().default(false),
});
export type BlogPostInput = z.infer<typeof BlogPostInputSchema>;

export const BlogPostResponseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  title: z.string(),
  slug: z.string(),
  excerpt: z.string().nullable(),
  content: z.string(),
  coverImageUrl: z.string().nullable(),
  author: z.string(),
  categoryTag: z.string().nullable(),
  tags: z.array(z.string()).nullable(),
  readTimeMinutes: z.number().int(),
  isPublished: z.boolean(),
  publishedAt: z.coerce.date().nullable(),
  viewCount: z.number().int(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type BlogPostResponse = z.infer<typeof BlogPostResponseSchema>;

export const BlogPostListFilterSchema = z.object({
  isPublished: z.boolean().optional(),
  categoryTag: z.string().optional(),
  tag: z.string().optional(),
  search: z.string().optional(),
});
export type BlogPostListFilter = z.infer<typeof BlogPostListFilterSchema>;

// ─── FAQ Item ──────────────────────────────────────────────────

export const FaqInputSchema = z.object({
  question: z.string().min(1).max(500),
  answer: z.string().min(1),
  category: z.string().max(100).optional(),
  displayOrder: z.number().int().nonnegative().default(0),
  isPublished: z.boolean().default(true),
});
export type FaqInput = z.infer<typeof FaqInputSchema>;

export const FaqResponseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  question: z.string(),
  answer: z.string(),
  category: z.string().nullable(),
  displayOrder: z.number().int(),
  isPublished: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type FaqResponse = z.infer<typeof FaqResponseSchema>;

export const FaqListFilterSchema = z.object({
  category: z.string().optional(),
  isPublished: z.boolean().optional(),
});
export type FaqListFilter = z.infer<typeof FaqListFilterSchema>;

// ─── Announcement ──────────────────────────────────────────────

export const AnnouncementInputSchema = z.object({
  message: z.string().min(1).max(500),
  linkUrl: z.string().max(1000).optional(),
  linkText: z.string().max(100).optional(),
  backgroundColor: z.string().max(20).optional(),
  textColor: z.string().max(20).optional(),
  isActive: z.boolean().default(true),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});
export type AnnouncementInput = z.infer<typeof AnnouncementInputSchema>;

export const AnnouncementResponseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  message: z.string(),
  linkUrl: z.string().nullable(),
  linkText: z.string().nullable(),
  backgroundColor: z.string().nullable(),
  textColor: z.string().nullable(),
  isActive: z.boolean(),
  startDate: z.coerce.date().nullable(),
  endDate: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type AnnouncementResponse = z.infer<typeof AnnouncementResponseSchema>;

// ─── SEO Metadata ──────────────────────────────────────────────

export const SeoMetadataInputSchema = z.object({
  pageType: z.nativeEnum(SeoPageType),
  pageIdentifier: z.string().min(1).max(255),
  metaTitle: z.string().max(255).optional(),
  metaDescription: z.string().max(500).optional(),
  ogImage: z.string().url().max(1000).optional(),
  canonicalUrl: z.string().url().max(1000).optional(),
  structuredData: z.record(z.unknown()).optional(),
});
export type SeoMetadataInput = z.infer<typeof SeoMetadataInputSchema>;

export const SeoMetadataResponseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  pageType: z.nativeEnum(SeoPageType),
  pageIdentifier: z.string(),
  metaTitle: z.string().nullable(),
  metaDescription: z.string().nullable(),
  ogImage: z.string().nullable(),
  canonicalUrl: z.string().nullable(),
  structuredData: z.record(z.unknown()).nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type SeoMetadataResponse = z.infer<typeof SeoMetadataResponseSchema>;

export const SeoMetadataListFilterSchema = z.object({
  pageType: z.nativeEnum(SeoPageType).optional(),
  search: z.string().optional(),
});
export type SeoMetadataListFilter = z.infer<typeof SeoMetadataListFilterSchema>;

// ─── Homepage Section ──────────────────────────────────────────

export const HomepageSectionConfigSchema = z.object({
  title: z.string().optional(),
  subtitle: z.string().optional(),
  limit: z.number().int().positive().optional(),
  categoryId: z.string().uuid().optional(),
  collectionId: z.string().uuid().optional(),
  bannerId: z.string().uuid().optional(),
  occasion: z.string().optional(),
  htmlContent: z.string().optional(),
  backgroundColor: z.string().optional(),
  textColor: z.string().optional(),
  showViewAll: z.boolean().optional(),
  viewAllUrl: z.string().optional(),
});
export type HomepageSectionConfig = z.infer<typeof HomepageSectionConfigSchema>;

export const HomepageSectionInputSchema = z.object({
  sectionType: z.nativeEnum(HomepageSectionType),
  displayOrder: z.number().int().nonnegative().default(0),
  isActive: z.boolean().default(true),
  config: HomepageSectionConfigSchema.optional(),
});
export type HomepageSectionInput = z.infer<typeof HomepageSectionInputSchema>;

export const HomepageSectionResponseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  sectionType: z.nativeEnum(HomepageSectionType),
  displayOrder: z.number().int(),
  isActive: z.boolean(),
  config: HomepageSectionConfigSchema.nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type HomepageSectionResponse = z.infer<typeof HomepageSectionResponseSchema>;

export const ResolvedHomepageSectionSchema = z.object({
  id: z.string().uuid(),
  sectionType: z.nativeEnum(HomepageSectionType),
  displayOrder: z.number().int(),
  config: HomepageSectionConfigSchema.nullable(),
  data: z.unknown().nullable(),
});
export type ResolvedHomepageSection = z.infer<typeof ResolvedHomepageSectionSchema>;

export const HomepageLayoutResponseSchema = z.object({
  sections: z.array(ResolvedHomepageSectionSchema),
});
export type HomepageLayoutResponse = z.infer<typeof HomepageLayoutResponseSchema>;

export const ReorderItemSchema = z.object({
  id: z.string().uuid(),
  displayOrder: z.number().int().nonnegative(),
});
export type ReorderItem = z.infer<typeof ReorderItemSchema>;

// ─── CMS Dashboard ─────────────────────────────────────────────

export const CmsDashboardResponseSchema = z.object({
  activeBanners: z.number().int(),
  totalCollections: z.number().int(),
  publishedPages: z.number().int(),
  publishedBlogPosts: z.number().int(),
  publishedFaqs: z.number().int(),
  activeAnnouncements: z.number().int(),
  homepageSections: z.number().int(),
});
export type CmsDashboardResponse = z.infer<typeof CmsDashboardResponseSchema>;
