// ─── E-Commerce Catalog Sync Service ──────────────────────────
// Push products to channels, pull updates, bulk sync, manage
// images, pricing rules per channel. Idempotent sync.

import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import type {
  CatalogSyncInput,
  CatalogItemResponse,
  CatalogListFilter,
  BulkSyncResult,
} from '@caratflow/shared-types';
import type { PaginatedResult, Pagination } from '@caratflow/shared-types';
import { CatalogItemStatus, CatalogSyncStatus } from '@caratflow/shared-types';
import { PrismaService } from '../../common/prisma.service';
import { TenantAwareService } from '../../common/base.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class EcommerceCatalogService extends TenantAwareService {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  /**
   * Sync a product to a channel. Idempotent: updates if exists, creates if not.
   */
  async syncProduct(tenantId: string, userId: string, input: CatalogSyncInput): Promise<CatalogItemResponse> {
    // Validate product exists
    const product = await this.prisma.product.findFirst({
      where: { id: input.productId, tenantId },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Validate channel exists
    const channel = await this.prisma.salesChannel.findFirst({
      where: { id: input.channelId, tenantId, isActive: true },
    });
    if (!channel) {
      throw new NotFoundException('Sales channel not found or inactive');
    }

    // Upsert catalog item (idempotent)
    const existing = await this.prisma.catalogItem.findFirst({
      where: { tenantId, productId: input.productId, channelId: input.channelId },
    });

    let catalogItemId: string;
    if (existing) {
      await this.prisma.catalogItem.update({
        where: { id: existing.id },
        data: {
          title: input.title,
          description: input.description ?? null,
          pricePaise: BigInt(input.pricePaise),
          comparePricePaise: input.comparePricePaise ? BigInt(input.comparePricePaise) : null,
          currencyCode: input.currencyCode ?? 'INR',
          images: input.images ?? undefined,
          status: input.status ?? existing.status,
          syncStatus: 'PENDING',
          updatedBy: userId,
        },
      });
      catalogItemId = existing.id;
    } else {
      catalogItemId = uuidv4();
      await this.prisma.catalogItem.create({
        data: {
          id: catalogItemId,
          tenantId,
          productId: input.productId,
          channelId: input.channelId,
          title: input.title,
          description: input.description ?? null,
          pricePaise: BigInt(input.pricePaise),
          comparePricePaise: input.comparePricePaise ? BigInt(input.comparePricePaise) : null,
          currencyCode: input.currencyCode ?? 'INR',
          images: input.images ?? undefined,
          status: input.status ?? 'DRAFT',
          syncStatus: 'PENDING',
          createdBy: userId,
          updatedBy: userId,
        },
      });
    }

    return this.getCatalogItem(tenantId, catalogItemId);
  }

  /**
   * Bulk sync products to a channel.
   */
  async bulkSync(
    tenantId: string,
    userId: string,
    channelId: string,
    productIds: string[],
  ): Promise<BulkSyncResult> {
    const channel = await this.prisma.salesChannel.findFirst({
      where: { id: channelId, tenantId, isActive: true },
    });
    if (!channel) {
      throw new NotFoundException('Sales channel not found or inactive');
    }

    const products = await this.prisma.product.findMany({
      where: { tenantId, id: { in: productIds }, isActive: true },
    });

    const result: BulkSyncResult = {
      totalItems: productIds.length,
      synced: 0,
      failed: 0,
      skipped: 0,
      errors: [],
    };

    for (const productId of productIds) {
      const product = products.find((p) => p.id === productId);
      if (!product) {
        result.skipped += 1;
        result.errors.push({ productId, error: 'Product not found or inactive' });
        continue;
      }

      try {
        await this.syncProduct(tenantId, userId, {
          productId,
          channelId,
          title: product.name,
          description: product.description ?? undefined,
          pricePaise: Number(product.sellingPricePaise ?? 0),
          currencyCode: product.currencyCode,
          images: product.images ? (product.images as string[]) : undefined,
          status: CatalogItemStatus.ACTIVE,
        });
        result.synced += 1;
      } catch (err) {
        result.failed += 1;
        result.errors.push({
          productId,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    // Update channel lastSyncAt
    await this.prisma.salesChannel.update({
      where: { id: channelId },
      data: { lastSyncAt: new Date() },
    });

    return result;
  }

  /**
   * Mark a catalog item as synced (called after successful push to channel).
   */
  async markSynced(
    tenantId: string,
    catalogItemId: string,
    externalProductId: string,
    externalVariantId?: string,
  ): Promise<CatalogItemResponse> {
    const item = await this.prisma.catalogItem.findFirst({
      where: { id: catalogItemId, tenantId },
    });
    if (!item) {
      throw new NotFoundException('Catalog item not found');
    }

    await this.prisma.catalogItem.update({
      where: { id: catalogItemId },
      data: {
        externalProductId,
        externalVariantId: externalVariantId ?? null,
        syncStatus: 'SYNCED',
        lastSyncAt: new Date(),
        syncError: null,
      },
    });

    return this.getCatalogItem(tenantId, catalogItemId);
  }

  /**
   * Mark a catalog item sync as failed.
   */
  async markSyncFailed(tenantId: string, catalogItemId: string, error: string): Promise<void> {
    await this.prisma.catalogItem.updateMany({
      where: { id: catalogItemId, tenantId },
      data: {
        syncStatus: 'FAILED',
        syncError: error,
      },
    });
  }

  /**
   * Get a single catalog item.
   */
  async getCatalogItem(tenantId: string, catalogItemId: string): Promise<CatalogItemResponse> {
    const item = await this.prisma.catalogItem.findFirst({
      where: this.tenantWhere(tenantId, { id: catalogItemId }) as { tenantId: string; id: string },
    });

    if (!item) {
      throw new NotFoundException('Catalog item not found');
    }

    return this.mapCatalogItemToResponse(item);
  }

  /**
   * List catalog items with filters.
   */
  async listCatalogItems(
    tenantId: string,
    filters: CatalogListFilter,
    pagination: Pagination,
  ): Promise<PaginatedResult<CatalogItemResponse>> {
    const where: Record<string, unknown> = { tenantId };

    if (filters.channelId) where.channelId = filters.channelId;
    if (filters.status) where.status = filters.status;
    if (filters.syncStatus) where.syncStatus = filters.syncStatus;
    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search } },
        { externalProductId: { contains: filters.search } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.catalogItem.findMany({
        where,
        orderBy: { createdAt: pagination.sortOrder ?? 'desc' },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      }),
      this.prisma.catalogItem.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pagination.limit);

    return {
      items: items.map((i) => this.mapCatalogItemToResponse(i)),
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages,
      hasNext: pagination.page < totalPages,
      hasPrevious: pagination.page > 1,
    };
  }

  /**
   * Delete a catalog item.
   */
  async deleteCatalogItem(tenantId: string, catalogItemId: string): Promise<void> {
    const item = await this.prisma.catalogItem.findFirst({
      where: { id: catalogItemId, tenantId },
    });
    if (!item) {
      throw new NotFoundException('Catalog item not found');
    }

    await this.prisma.catalogItem.delete({ where: { id: catalogItemId } });
  }

  // ─── Private Helpers ──────────────────────────────────────────

  private mapCatalogItemToResponse(item: Record<string, unknown>): CatalogItemResponse {
    const i = item as Record<string, unknown>;
    return {
      id: i.id as string,
      tenantId: i.tenantId as string,
      productId: i.productId as string,
      channelId: i.channelId as string,
      externalProductId: (i.externalProductId as string) ?? null,
      externalVariantId: (i.externalVariantId as string) ?? null,
      title: i.title as string,
      description: (i.description as string) ?? null,
      pricePaise: Number(i.pricePaise),
      comparePricePaise: i.comparePricePaise ? Number(i.comparePricePaise) : null,
      currencyCode: i.currencyCode as string,
      images: i.images ?? null,
      status: i.status as CatalogItemStatus,
      syncStatus: i.syncStatus as CatalogSyncStatus,
      lastSyncAt: i.lastSyncAt ? new Date(i.lastSyncAt as string) : null,
      syncError: (i.syncError as string) ?? null,
      createdAt: new Date(i.createdAt as string),
      updatedAt: new Date(i.updatedAt as string),
    };
  }
}
