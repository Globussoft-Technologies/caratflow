// ─── Search Index Service ───────────────────────────────────────
// Build and maintain the search index: index products, compute
// price/weight buckets, reindex all, remove from index.

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { TenantAwareService } from '../../common/base.service';
import { v4 as uuidv4 } from 'uuid';

/** Price range bucket thresholds in paise */
const PRICE_BUCKETS = [
  { max: 1000000, label: 'under-10k' },       // < 10,000 INR
  { max: 5000000, label: '10k-50k' },          // 10,000 - 50,000
  { max: 10000000, label: '50k-1l' },           // 50,000 - 1,00,000
  { max: 50000000, label: '1l-5l' },            // 1,00,000 - 5,00,000
  { max: Infinity, label: 'above-5l' },         // > 5,00,000
] as const;

/** Weight range bucket thresholds in milligrams */
const WEIGHT_BUCKETS = [
  { max: 5000, label: 'under-5g' },       // < 5g
  { max: 10000, label: '5-10g' },          // 5-10g
  { max: 25000, label: '10-25g' },         // 10-25g
  { max: Infinity, label: 'above-25g' },   // > 25g
] as const;

@Injectable()
export class SearchIndexService extends TenantAwareService {
  private readonly logger = new Logger(SearchIndexService.name);

  constructor(prisma: PrismaService) {
    super(prisma);
  }

  /**
   * Index a single product into the search index.
   */
  async indexProduct(productId: string): Promise<void> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        category: { select: { name: true } },
        subCategory: { select: { name: true } },
        stockItems: {
          select: { quantityOnHand: true, quantityReserved: true },
        },
      },
    });

    if (!product || !product.isActive) {
      // If product is inactive or deleted, remove from index
      await this.removeFromIndex(productId);
      return;
    }

    // Build searchable text: concatenate name, description, category, metal type, tags
    const parts: string[] = [
      product.name,
      product.description ?? '',
      product.category?.name ?? '',
      product.subCategory?.name ?? '',
      product.productType,
      product.sku,
    ];

    // Add tags from attributes if present
    const attributes = product.attributes as Record<string, unknown> | null;
    if (attributes) {
      const tags = attributes.tags;
      if (Array.isArray(tags)) {
        parts.push(...tags.map(String));
      }
      // Also add any other string attributes
      for (const [key, value] of Object.entries(attributes)) {
        if (typeof value === 'string' && key !== 'tags') {
          parts.push(value);
        }
      }
    }

    const searchableText = parts.filter(Boolean).join(' ').toLowerCase();

    // Compute price bucket
    const pricePaise = product.sellingPricePaise ? Number(product.sellingPricePaise) : 0;
    const priceRangeBucket = this.getPriceBucket(pricePaise);

    // Compute weight bucket
    const weightMg = product.grossWeightMg ? Number(product.grossWeightMg) : 0;
    const weightBucket = this.getWeightBucket(weightMg);

    // Compute stock status
    const stockItems = product.stockItems ?? [];
    const totalOnHand = stockItems.reduce((sum, si) => sum + si.quantityOnHand, 0);
    const totalReserved = stockItems.reduce((sum, si) => sum + si.quantityReserved, 0);
    const isInStock = (totalOnHand - totalReserved) > 0;

    // Extract tags
    const tags = Array.isArray(attributes?.tags) ? attributes.tags : [];

    // Upsert into search index
    await this.prisma.searchIndex.upsert({
      where: {
        tenantId_productId: {
          tenantId: product.tenantId,
          productId: product.id,
        },
      },
      create: {
        id: uuidv4(),
        tenantId: product.tenantId,
        productId: product.id,
        searchableText,
        metalType: product.productType,
        purityFineness: product.metalPurity,
        categoryName: product.category?.name ?? null,
        priceRangeBucket,
        tags: tags.length > 0 ? tags : undefined,
        weightBucket,
        isInStock,
        lastIndexedAt: new Date(),
      },
      update: {
        searchableText,
        metalType: product.productType,
        purityFineness: product.metalPurity,
        categoryName: product.category?.name ?? null,
        priceRangeBucket,
        tags: tags.length > 0 ? tags : undefined,
        weightBucket,
        isInStock,
        lastIndexedAt: new Date(),
      },
    });

    this.logger.debug(`Indexed product ${productId}`);
  }

  /**
   * Reindex all products for a tenant. Should be dispatched as a BullMQ job.
   */
  async reindexAll(tenantId: string): Promise<{ indexed: number; removed: number }> {
    this.logger.log(`Starting full reindex for tenant ${tenantId}`);

    // Get all active product IDs
    const products = await this.prisma.product.findMany({
      where: { tenantId, isActive: true },
      select: { id: true },
    });

    const productIds = products.map((p) => p.id);
    let indexed = 0;

    // Index in batches of 50
    const batchSize = 50;
    for (let i = 0; i < productIds.length; i += batchSize) {
      const batch = productIds.slice(i, i + batchSize);
      await Promise.all(batch.map((id) => this.indexProduct(id)));
      indexed += batch.length;
    }

    // Remove stale entries (products no longer active)
    const removeResult = await this.prisma.searchIndex.deleteMany({
      where: {
        tenantId,
        productId: { notIn: productIds },
      },
    });

    this.logger.log(
      `Reindex complete for tenant ${tenantId}: ${indexed} indexed, ${removeResult.count} removed`,
    );

    return { indexed, removed: removeResult.count };
  }

  /**
   * Remove a product from the search index.
   */
  async removeFromIndex(productId: string): Promise<void> {
    await this.prisma.searchIndex.deleteMany({
      where: { productId },
    });
    this.logger.debug(`Removed product ${productId} from search index`);
  }

  /**
   * Quick update of stock status for a product.
   */
  async updateStockStatus(productId: string, inStock: boolean): Promise<void> {
    await this.prisma.searchIndex.updateMany({
      where: { productId },
      data: { isInStock: inStock },
    });
  }

  // ─── Private Helpers ──────────────────────────────────────────

  private getPriceBucket(pricePaise: number): string {
    for (const bucket of PRICE_BUCKETS) {
      if (pricePaise < bucket.max) return bucket.label;
    }
    return 'above-5l';
  }

  private getWeightBucket(weightMg: number): string {
    for (const bucket of WEIGHT_BUCKETS) {
      if (weightMg < bucket.max) return bucket.label;
    }
    return 'above-25g';
  }
}
