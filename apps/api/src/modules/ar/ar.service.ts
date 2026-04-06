// ─── AR Asset Management Service ──────────────────────────────
// Manages 3D/AR assets for products: upload, retrieve, list, delete.

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import type {
  ArAssetInput,
  ArAssetResponse,
  ArProductListItem,
} from '@caratflow/shared-types';
import { ArAssetType, ArProcessingStatus } from '@caratflow/shared-types';
import type { PaginatedResult, Pagination } from '@caratflow/shared-types';
import { PrismaService } from '../../common/prisma.service';
import { TenantAwareService } from '../../common/base.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ArService extends TenantAwareService {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  /**
   * Upload/create an AR asset record for a product.
   */
  async uploadAsset(
    tenantId: string,
    userId: string,
    input: ArAssetInput,
  ): Promise<ArAssetResponse> {
    // Verify product exists for this tenant
    const product = await this.prisma.product.findFirst({
      where: this.tenantWhere(tenantId, { id: input.productId }) as { tenantId: string; id: string },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const asset = await this.prisma.arAsset.create({
      data: {
        id: uuidv4(),
        tenantId,
        productId: input.productId,
        assetType: input.assetType,
        fileUrl: input.fileUrl,
        thumbnailUrl: input.thumbnailUrl ?? null,
        format: input.format,
        fileSizeBytes: input.fileSizeBytes,
        dimensions: input.dimensions ?? undefined,
        category: input.category,
        isActive: true,
        processingStatus: 'READY',
        metadata: input.metadata ?? undefined,
        createdBy: userId,
        updatedBy: userId,
      },
    });

    return this.mapAssetToResponse(asset);
  }

  /**
   * Get a single AR asset by ID.
   */
  async getAsset(tenantId: string, assetId: string): Promise<ArAssetResponse> {
    const asset = await this.prisma.arAsset.findFirst({
      where: this.tenantWhere(tenantId, { id: assetId }) as { tenantId: string; id: string },
    });

    if (!asset) {
      throw new NotFoundException('AR asset not found');
    }

    return this.mapAssetToResponse(asset);
  }

  /**
   * Get AR assets for a product filtered by type.
   */
  async getAssetsForProduct(
    tenantId: string,
    productId: string,
    assetType?: string,
  ): Promise<ArAssetResponse[]> {
    const where: Record<string, unknown> = {
      tenantId,
      productId,
      isActive: true,
      processingStatus: 'READY',
    };

    if (assetType) {
      where.assetType = assetType;
    }

    const assets = await this.prisma.arAsset.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return assets.map((a) => this.mapAssetToResponse(a));
  }

  /**
   * List products that have AR assets for a given tenant.
   */
  async getProductsWithAr(
    tenantId: string,
    category?: string,
    pagination?: Pagination,
  ): Promise<PaginatedResult<ArProductListItem>> {
    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 20;

    // Get distinct products that have active AR assets
    const assetWhere: Record<string, unknown> = {
      tenantId,
      isActive: true,
      processingStatus: 'READY',
    };
    if (category) {
      assetWhere.category = category;
    }

    const assets = await this.prisma.arAsset.findMany({
      where: assetWhere,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            images: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Group by product
    const productMap = new Map<string, {
      product: { id: string; name: string; sku: string; images: unknown };
      category: string;
      hasOverlay: boolean;
      has360: boolean;
      has3dModel: boolean;
    }>();

    for (const asset of assets) {
      const existing = productMap.get(asset.productId);
      const entry = existing ?? {
        product: asset.product,
        category: asset.category,
        hasOverlay: false,
        has360: false,
        has3dModel: false,
      };

      if (asset.assetType === 'AR_OVERLAY_2D') entry.hasOverlay = true;
      if (asset.assetType === 'SPIN_360_IMAGES') entry.has360 = true;
      if (asset.assetType === 'AR_MODEL_3D') entry.has3dModel = true;

      productMap.set(asset.productId, entry);
    }

    // Also check Product360 table
    const product360s = await this.prisma.product360.findMany({
      where: { tenantId },
      select: { productId: true },
    });

    const product360Set = new Set(product360s.map((p) => p.productId));

    // Get try-on session counts
    const sessionCounts = await this.prisma.arTryOnSession.groupBy({
      by: ['productId'],
      where: { tenantId },
      _count: { id: true },
    });

    const sessionCountMap = new Map(
      sessionCounts.map((s) => [s.productId, s._count.id]),
    );

    const allProducts = Array.from(productMap.entries()).map(([productId, entry]) => {
      const images = entry.product.images as Array<{ url: string }> | null;
      const primaryImage = images?.[0]?.url ?? null;

      return {
        productId,
        productName: entry.product.name,
        productSku: entry.product.sku,
        productImage: primaryImage,
        category: entry.category as ArProductListItem['category'],
        hasOverlay: entry.hasOverlay,
        has360: entry.has360 || product360Set.has(productId),
        has3dModel: entry.has3dModel,
        tryOnSessions: sessionCountMap.get(productId) ?? 0,
      };
    });

    const total = allProducts.length;
    const totalPages = Math.ceil(total / limit);
    const paginatedItems = allProducts.slice((page - 1) * limit, page * limit);

    return {
      items: paginatedItems,
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    };
  }

  /**
   * Update an AR asset's status or metadata.
   */
  async updateAsset(
    tenantId: string,
    userId: string,
    assetId: string,
    data: Partial<ArAssetInput> & { isActive?: boolean; processingStatus?: string },
  ): Promise<ArAssetResponse> {
    const existing = await this.prisma.arAsset.findFirst({
      where: this.tenantWhere(tenantId, { id: assetId }) as { tenantId: string; id: string },
    });

    if (!existing) {
      throw new NotFoundException('AR asset not found');
    }

    const updated = await this.prisma.arAsset.update({
      where: { id: assetId },
      data: {
        ...(data.fileUrl !== undefined && { fileUrl: data.fileUrl }),
        ...(data.thumbnailUrl !== undefined && { thumbnailUrl: data.thumbnailUrl }),
        ...(data.format !== undefined && { format: data.format }),
        ...(data.fileSizeBytes !== undefined && { fileSizeBytes: data.fileSizeBytes }),
        ...(data.dimensions !== undefined && { dimensions: data.dimensions }),
        ...(data.category !== undefined && { category: data.category }),
        ...(data.metadata !== undefined && { metadata: data.metadata }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.processingStatus !== undefined && { processingStatus: data.processingStatus }),
        updatedBy: userId,
      },
    });

    return this.mapAssetToResponse(updated);
  }

  /**
   * Delete an AR asset.
   */
  async deleteAsset(tenantId: string, assetId: string): Promise<{ success: boolean }> {
    const existing = await this.prisma.arAsset.findFirst({
      where: this.tenantWhere(tenantId, { id: assetId }) as { tenantId: string; id: string },
    });

    if (!existing) {
      throw new NotFoundException('AR asset not found');
    }

    await this.prisma.arAsset.delete({
      where: { id: assetId },
    });

    return { success: true };
  }

  // ─── Private Helpers ──────────────────────────────────────────

  private mapAssetToResponse(asset: Record<string, unknown>): ArAssetResponse {
    return {
      id: asset.id as string,
      tenantId: asset.tenantId as string,
      productId: asset.productId as string,
      assetType: asset.assetType as ArAssetResponse['assetType'],
      fileUrl: asset.fileUrl as string,
      thumbnailUrl: (asset.thumbnailUrl as string) ?? null,
      format: asset.format as ArAssetResponse['format'],
      fileSizeBytes: asset.fileSizeBytes as number,
      dimensions: (asset.dimensions as ArAssetResponse['dimensions']) ?? null,
      category: asset.category as ArAssetResponse['category'],
      isActive: asset.isActive as boolean,
      processingStatus: asset.processingStatus as ArAssetResponse['processingStatus'],
      metadata: (asset.metadata as ArAssetResponse['metadata']) ?? null,
      createdAt: new Date(asset.createdAt as string),
      updatedAt: new Date(asset.updatedAt as string),
    };
  }
}
