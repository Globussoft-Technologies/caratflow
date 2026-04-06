// ─── CMS Blog Service ──────────────────────────────────────────
// Blog post CRUD, publish/unpublish, view count tracking,
// list by tag/category.

import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import type {
  BlogPostInput,
  BlogPostResponse,
  BlogPostListFilter,
} from '@caratflow/shared-types';
import type { PaginatedResult, Pagination } from '@caratflow/shared-types';
import { PrismaService } from '../../common/prisma.service';
import { TenantAwareService } from '../../common/base.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class CmsBlogService extends TenantAwareService {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async createBlogPost(tenantId: string, userId: string, input: BlogPostInput): Promise<BlogPostResponse> {
    const existingSlug = await this.prisma.blogPost.findFirst({
      where: { tenantId, slug: input.slug },
    });
    if (existingSlug) throw new ConflictException('Blog post with this slug already exists');

    const post = await this.prisma.blogPost.create({
      data: {
        id: uuidv4(),
        tenantId,
        title: input.title,
        slug: input.slug,
        excerpt: input.excerpt ?? null,
        content: input.content,
        coverImageUrl: input.coverImageUrl ?? null,
        author: input.author,
        categoryTag: input.categoryTag ?? null,
        tags: input.tags ?? [],
        readTimeMinutes: input.readTimeMinutes ?? 0,
        isPublished: input.isPublished ?? false,
        publishedAt: input.isPublished ? new Date() : null,
        createdBy: userId,
        updatedBy: userId,
      },
    });

    return this.mapToResponse(post);
  }

  async updateBlogPost(tenantId: string, userId: string, id: string, input: Partial<BlogPostInput>): Promise<BlogPostResponse> {
    const existing = await this.prisma.blogPost.findFirst({
      where: this.tenantWhere(tenantId, { id }) as { tenantId: string; id: string },
    });
    if (!existing) throw new NotFoundException('Blog post not found');

    if (input.slug && input.slug !== existing.slug) {
      const slugConflict = await this.prisma.blogPost.findFirst({
        where: { tenantId, slug: input.slug, id: { not: id } },
      });
      if (slugConflict) throw new ConflictException('Blog post with this slug already exists');
    }

    const data: Record<string, unknown> = { updatedBy: userId };
    for (const [key, value] of Object.entries(input)) {
      if (value !== undefined) data[key] = value;
    }

    // Set publishedAt when first publishing
    if (input.isPublished === true && !existing.isPublished) {
      data.publishedAt = new Date();
    }

    const post = await this.prisma.blogPost.update({ where: { id }, data });
    return this.mapToResponse(post);
  }

  async deleteBlogPost(tenantId: string, id: string): Promise<void> {
    const existing = await this.prisma.blogPost.findFirst({
      where: this.tenantWhere(tenantId, { id }) as { tenantId: string; id: string },
    });
    if (!existing) throw new NotFoundException('Blog post not found');
    await this.prisma.blogPost.delete({ where: { id } });
  }

  async getBlogPost(tenantId: string, id: string): Promise<BlogPostResponse> {
    const post = await this.prisma.blogPost.findFirst({
      where: this.tenantWhere(tenantId, { id }) as { tenantId: string; id: string },
    });
    if (!post) throw new NotFoundException('Blog post not found');
    return this.mapToResponse(post);
  }

  async getBlogPostBySlug(tenantId: string, slug: string): Promise<BlogPostResponse> {
    const post = await this.prisma.blogPost.findFirst({
      where: { tenantId, slug, isPublished: true },
    });
    if (!post) throw new NotFoundException('Blog post not found');
    return this.mapToResponse(post);
  }

  async publishBlogPost(tenantId: string, userId: string, id: string): Promise<BlogPostResponse> {
    const existing = await this.prisma.blogPost.findFirst({
      where: this.tenantWhere(tenantId, { id }) as { tenantId: string; id: string },
    });
    if (!existing) throw new NotFoundException('Blog post not found');

    const post = await this.prisma.blogPost.update({
      where: { id },
      data: {
        isPublished: true,
        publishedAt: existing.publishedAt ?? new Date(),
        updatedBy: userId,
      },
    });

    return this.mapToResponse(post);
  }

  async unpublishBlogPost(tenantId: string, userId: string, id: string): Promise<BlogPostResponse> {
    const existing = await this.prisma.blogPost.findFirst({
      where: this.tenantWhere(tenantId, { id }) as { tenantId: string; id: string },
    });
    if (!existing) throw new NotFoundException('Blog post not found');

    const post = await this.prisma.blogPost.update({
      where: { id },
      data: { isPublished: false, updatedBy: userId },
    });

    return this.mapToResponse(post);
  }

  async incrementViewCount(tenantId: string, id: string): Promise<void> {
    await this.prisma.blogPost.updateMany({
      where: { id, tenantId },
      data: { viewCount: { increment: 1 } },
    });
  }

  async listBlogPosts(
    tenantId: string,
    filters: BlogPostListFilter,
    pagination: Pagination,
  ): Promise<PaginatedResult<BlogPostResponse>> {
    const where: Record<string, unknown> = { tenantId };
    if (filters.isPublished !== undefined) where.isPublished = filters.isPublished;
    if (filters.categoryTag) where.categoryTag = filters.categoryTag;
    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search } },
        { excerpt: { contains: filters.search } },
        { content: { contains: filters.search } },
      ];
    }

    // Tag filter uses JSON_CONTAINS for MySQL JSON arrays
    if (filters.tag) {
      where.tags = { array_contains: filters.tag };
    }

    const [items, total] = await Promise.all([
      this.prisma.blogPost.findMany({
        where,
        orderBy: { [pagination.sortBy ?? 'createdAt']: pagination.sortOrder ?? 'desc' },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      }),
      this.prisma.blogPost.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pagination.limit);
    return {
      items: items.map((p) => this.mapToResponse(p)),
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages,
      hasNext: pagination.page < totalPages,
      hasPrevious: pagination.page > 1,
    };
  }

  async listPublishedBlogPosts(
    tenantId: string,
    filters: BlogPostListFilter,
    pagination: Pagination,
  ): Promise<PaginatedResult<BlogPostResponse>> {
    return this.listBlogPosts(tenantId, { ...filters, isPublished: true }, pagination);
  }

  // ─── Private Helpers ──────────────────────────────────────────

  private mapToResponse(post: Record<string, unknown>): BlogPostResponse {
    const p = post as Record<string, unknown>;
    return {
      id: p.id as string,
      tenantId: p.tenantId as string,
      title: p.title as string,
      slug: p.slug as string,
      excerpt: (p.excerpt as string) ?? null,
      content: p.content as string,
      coverImageUrl: (p.coverImageUrl as string) ?? null,
      author: p.author as string,
      categoryTag: (p.categoryTag as string) ?? null,
      tags: (p.tags as string[]) ?? null,
      readTimeMinutes: p.readTimeMinutes as number,
      isPublished: p.isPublished as boolean,
      publishedAt: p.publishedAt ? new Date(p.publishedAt as string) : null,
      viewCount: p.viewCount as number,
      createdAt: new Date(p.createdAt as string),
      updatedAt: new Date(p.updatedAt as string),
    };
  }
}
