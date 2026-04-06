// ─── Compare List Service ───────────────────────────────────────
// Add/remove products to comparison, max 4 items, same product type validation.

import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { TenantAwareService } from '../../common/base.service';
import { PrismaService } from '../../common/prisma.service';

const MAX_COMPARE_ITEMS = 4;

@Injectable()
export class CompareService extends TenantAwareService {
  private readonly logger = new Logger(CompareService.name);

  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async addToCompare(
    tenantId: string,
    productId: string,
    customerId?: string,
    sessionId?: string,
  ) {
    if (!customerId && !sessionId) {
      throw new BadRequestException('Either customerId or sessionId is required');
    }

    // Verify the product exists
    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId },
      select: { id: true, productType: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Find existing compare list
    const existing = await this.findCompareList(tenantId, customerId, sessionId);

    if (existing) {
      const currentIds = existing.productIds as string[];

      // Check if product is already in the list
      if (currentIds.includes(productId)) {
        return existing;
      }

      // Check max items limit
      if (currentIds.length >= MAX_COMPARE_ITEMS) {
        throw new BadRequestException(
          `Cannot compare more than ${MAX_COMPARE_ITEMS} products. Remove an item first.`,
        );
      }

      // Validate same product type: fetch types for all existing products
      if (currentIds.length > 0) {
        const existingProducts = await this.prisma.product.findMany({
          where: { id: { in: currentIds }, tenantId },
          select: { productType: true },
        });

        const existingType = existingProducts[0]?.productType;
        if (existingType && existingType !== product.productType) {
          throw new BadRequestException(
            `Cannot compare different product types. Current list contains ${existingType} items.`,
          );
        }
      }

      // Update
      return this.prisma.compareList.update({
        where: { id: existing.id },
        data: {
          productIds: [...currentIds, productId],
        },
      });
    }

    // Create new compare list
    const resolvedSessionId = sessionId ?? customerId!;
    return this.prisma.compareList.create({
      data: {
        tenantId,
        customerId,
        sessionId: resolvedSessionId,
        productIds: [productId],
      },
    });
  }

  async removeFromCompare(
    tenantId: string,
    productId: string,
    customerId?: string,
    sessionId?: string,
  ) {
    const existing = await this.findCompareList(tenantId, customerId, sessionId);

    if (!existing) {
      throw new NotFoundException('Compare list not found');
    }

    const currentIds = existing.productIds as string[];
    const updatedIds = currentIds.filter((id) => id !== productId);

    if (updatedIds.length === currentIds.length) {
      throw new NotFoundException('Product not in compare list');
    }

    if (updatedIds.length === 0) {
      // Delete the list if empty
      await this.prisma.compareList.delete({ where: { id: existing.id } });
      return null;
    }

    return this.prisma.compareList.update({
      where: { id: existing.id },
      data: { productIds: updatedIds },
    });
  }

  async getCompareList(tenantId: string, customerId?: string, sessionId?: string) {
    const existing = await this.findCompareList(tenantId, customerId, sessionId);

    if (!existing) {
      return { id: '', productIds: [], products: [] };
    }

    const productIds = existing.productIds as string[];

    if (productIds.length === 0) {
      return { id: existing.id, productIds: [], products: [] };
    }

    // Fetch full product details
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, tenantId },
      select: {
        id: true,
        name: true,
        sku: true,
        productType: true,
        metalPurity: true,
        metalWeightMg: true,
        grossWeightMg: true,
        netWeightMg: true,
        makingCharges: true,
        sellingPricePaise: true,
        images: true,
        attributes: true,
        category: {
          select: { name: true },
        },
      },
    });

    // Maintain the order of productIds
    const productMap = new Map(products.map((p) => [p.id, p]));
    const orderedProducts = productIds
      .map((id) => productMap.get(id))
      .filter(Boolean)
      .map((p) => ({
        id: p!.id,
        name: p!.name,
        sku: p!.sku,
        productType: p!.productType,
        metalPurity: p!.metalPurity,
        metalWeightMg: p!.metalWeightMg,
        grossWeightMg: p!.grossWeightMg,
        netWeightMg: p!.netWeightMg,
        makingCharges: p!.makingCharges,
        sellingPricePaise: p!.sellingPricePaise,
        images: p!.images,
        attributes: p!.attributes,
        categoryName: p!.category?.name ?? null,
      }));

    return {
      id: existing.id,
      productIds,
      products: orderedProducts,
    };
  }

  async clearCompare(tenantId: string, customerId?: string, sessionId?: string) {
    const existing = await this.findCompareList(tenantId, customerId, sessionId);

    if (!existing) {
      return;
    }

    await this.prisma.compareList.delete({ where: { id: existing.id } });
  }

  private async findCompareList(
    tenantId: string,
    customerId?: string,
    sessionId?: string,
  ) {
    if (customerId) {
      return this.prisma.compareList.findFirst({
        where: { tenantId, customerId },
      });
    }

    if (sessionId) {
      return this.prisma.compareList.findFirst({
        where: { tenantId, sessionId },
      });
    }

    return null;
  }
}
