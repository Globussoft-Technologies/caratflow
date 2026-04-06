// ─── CMS SEO Service ──────────────────────────────────────────
// SEO metadata CRUD, generate default metadata for products/categories.

import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  SeoMetadataInput,
  SeoMetadataResponse,
  SeoMetadataListFilter,
} from '@caratflow/shared-types';
import { SeoPageType } from '@caratflow/shared-types';
import type { PaginatedResult, Pagination } from '@caratflow/shared-types';
import { PrismaService } from '../../common/prisma.service';
import { TenantAwareService } from '../../common/base.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class CmsSeoService extends TenantAwareService {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async upsertSeoMetadata(tenantId: string, userId: string, input: SeoMetadataInput): Promise<SeoMetadataResponse> {
    const existing = await this.prisma.seoMetadata.findFirst({
      where: {
        tenantId,
        pageType: input.pageType,
        pageIdentifier: input.pageIdentifier,
      },
    });

    if (existing) {
      const updated = await this.prisma.seoMetadata.update({
        where: { id: existing.id },
        data: {
          metaTitle: input.metaTitle ?? null,
          metaDescription: input.metaDescription ?? null,
          ogImage: input.ogImage ?? null,
          canonicalUrl: input.canonicalUrl ?? null,
          structuredData: input.structuredData ?? undefined,
          updatedBy: userId,
        },
      });
      return this.mapToResponse(updated);
    }

    const created = await this.prisma.seoMetadata.create({
      data: {
        id: uuidv4(),
        tenantId,
        pageType: input.pageType,
        pageIdentifier: input.pageIdentifier,
        metaTitle: input.metaTitle ?? null,
        metaDescription: input.metaDescription ?? null,
        ogImage: input.ogImage ?? null,
        canonicalUrl: input.canonicalUrl ?? null,
        structuredData: input.structuredData ?? undefined,
        createdBy: userId,
        updatedBy: userId,
      },
    });

    return this.mapToResponse(created);
  }

  async deleteSeoMetadata(tenantId: string, id: string): Promise<void> {
    const existing = await this.prisma.seoMetadata.findFirst({
      where: this.tenantWhere(tenantId, { id }) as { tenantId: string; id: string },
    });
    if (!existing) throw new NotFoundException('SEO metadata not found');
    await this.prisma.seoMetadata.delete({ where: { id } });
  }

  async getSeoMetadata(tenantId: string, pageType: string, pageIdentifier: string): Promise<SeoMetadataResponse | null> {
    const metadata = await this.prisma.seoMetadata.findFirst({
      where: {
        tenantId,
        pageType: pageType as SeoPageType,
        pageIdentifier,
      },
    });

    return metadata ? this.mapToResponse(metadata) : null;
  }

  async getSeoMetadataById(tenantId: string, id: string): Promise<SeoMetadataResponse> {
    const metadata = await this.prisma.seoMetadata.findFirst({
      where: this.tenantWhere(tenantId, { id }) as { tenantId: string; id: string },
    });
    if (!metadata) throw new NotFoundException('SEO metadata not found');
    return this.mapToResponse(metadata);
  }

  async listSeoMetadata(
    tenantId: string,
    filters: SeoMetadataListFilter,
    pagination: Pagination,
  ): Promise<PaginatedResult<SeoMetadataResponse>> {
    const where: Record<string, unknown> = { tenantId };
    if (filters.pageType) where.pageType = filters.pageType;
    if (filters.search) {
      where.OR = [
        { pageIdentifier: { contains: filters.search } },
        { metaTitle: { contains: filters.search } },
        { metaDescription: { contains: filters.search } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.seoMetadata.findMany({
        where,
        orderBy: { [pagination.sortBy ?? 'createdAt']: pagination.sortOrder ?? 'desc' },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      }),
      this.prisma.seoMetadata.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pagination.limit);
    return {
      items: items.map((m) => this.mapToResponse(m)),
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages,
      hasNext: pagination.page < totalPages,
      hasPrevious: pagination.page > 1,
    };
  }

  /**
   * Generate default SEO metadata for a product.
   */
  async generateProductSeo(tenantId: string, userId: string, productId: string): Promise<SeoMetadataResponse> {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId },
      include: { category: { select: { name: true } } },
    });

    if (!product) throw new NotFoundException('Product not found');

    const metaTitle = `${product.name} | Buy Online`;
    const metaDescription = product.description
      ? product.description.substring(0, 160)
      : `Shop ${product.name} - ${product.category?.name ?? product.productType}. High quality jewelry at the best prices.`;

    const structuredData = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.name,
      sku: product.sku,
      description: product.description ?? '',
      category: product.category?.name ?? product.productType,
    };

    return this.upsertSeoMetadata(tenantId, userId, {
      pageType: SeoPageType.PRODUCT,
      pageIdentifier: productId,
      metaTitle,
      metaDescription,
      structuredData,
    });
  }

  /**
   * Generate default SEO metadata for a category.
   */
  async generateCategorySeo(tenantId: string, userId: string, categoryId: string): Promise<SeoMetadataResponse> {
    const category = await this.prisma.category.findFirst({
      where: { id: categoryId, tenantId },
    });

    if (!category) throw new NotFoundException('Category not found');

    const metaTitle = `${category.name} Collection | Shop Online`;
    const metaDescription = category.description
      ? category.description.substring(0, 160)
      : `Explore our ${category.name} collection. Discover exquisite jewelry pieces curated for you.`;

    return this.upsertSeoMetadata(tenantId, userId, {
      pageType: SeoPageType.CATEGORY,
      pageIdentifier: categoryId,
      metaTitle,
      metaDescription,
    });
  }

  // ─── Private Helpers ──────────────────────────────────────────

  private mapToResponse(metadata: Record<string, unknown>): SeoMetadataResponse {
    const m = metadata as Record<string, unknown>;
    return {
      id: m.id as string,
      tenantId: m.tenantId as string,
      pageType: m.pageType as SeoPageType,
      pageIdentifier: m.pageIdentifier as string,
      metaTitle: (m.metaTitle as string) ?? null,
      metaDescription: (m.metaDescription as string) ?? null,
      ogImage: (m.ogImage as string) ?? null,
      canonicalUrl: (m.canonicalUrl as string) ?? null,
      structuredData: (m.structuredData as Record<string, unknown>) ?? null,
      createdAt: new Date(m.createdAt as string),
      updatedAt: new Date(m.updatedAt as string),
    };
  }
}
