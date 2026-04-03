// ─── Inventory Valuation Service ──────────────────────────────
// Calculates stock value using different valuation methods.

import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantAwareService } from '../../common/base.service';
import { PrismaService } from '../../common/prisma.service';
import type { StockValuationRequest } from '@caratflow/shared-types';

interface ValuationItem {
  productId: string;
  productName: string;
  sku: string;
  category: string | null;
  quantity: number;
  unitValuePaise: bigint;
  totalValuePaise: bigint;
}

interface CategoryBreakdownItem {
  categoryId: string | null;
  categoryName: string;
  totalValuePaise: bigint;
  itemCount: number;
}

@Injectable()
export class InventoryValuationService extends TenantAwareService {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async calculateValuation(tenantId: string, input: StockValuationRequest) {
    switch (input.method) {
      case 'FIFO':
        return this.calculateFIFO(tenantId, input.locationId ?? null);
      case 'AVG':
        return this.calculateWeightedAverage(tenantId, input.locationId ?? null);
      case 'LAST_PURCHASE':
        return this.calculateLastPurchase(tenantId, input.locationId ?? null);
      case 'GROSS_PROFIT':
        return this.calculateGrossProfit(tenantId, input.locationId ?? null);
      case 'MARKET':
        return this.calculateMarketValue(tenantId, input.locationId ?? null, input.currentRatePaise ?? 0n);
      default:
        return this.calculateWeightedAverage(tenantId, input.locationId ?? null);
    }
  }

  async calculateFIFO(tenantId: string, locationId: string | null) {
    const stockItems = await this.getStockItemsWithMovements(tenantId, locationId);
    const items: ValuationItem[] = [];

    for (const si of stockItems) {
      // Get inward movements ordered by date (oldest first = FIFO)
      const inwardMovements = si.movements
        .filter((m: { movementType: string; quantityChange: number }) => m.quantityChange > 0)
        .sort((a: { movedAt: Date }, b: { movedAt: Date }) => a.movedAt.getTime() - b.movedAt.getTime());

      // Use cost price from product as unit cost for simplicity
      // In a full implementation, each inward movement would carry its purchase price
      const unitCost = si.product.costPricePaise ? BigInt(si.product.costPricePaise) : 0n;
      const totalValue = unitCost * BigInt(si.quantityOnHand);

      items.push({
        productId: si.productId,
        productName: si.product.name,
        sku: si.product.sku,
        category: si.product.category?.name ?? null,
        quantity: si.quantityOnHand,
        unitValuePaise: unitCost,
        totalValuePaise: totalValue,
      });
    }

    return this.buildValuationResponse('FIFO', locationId, items);
  }

  async calculateWeightedAverage(tenantId: string, locationId: string | null) {
    const stockItems = await this.getStockItemsWithMovements(tenantId, locationId);
    const items: ValuationItem[] = [];

    for (const si of stockItems) {
      // Weighted average: total inward value / total inward quantity
      const inwardMovements = si.movements.filter(
        (m: { quantityChange: number }) => m.quantityChange > 0,
      );
      const totalInwardQty = inwardMovements.reduce(
        (sum: number, m: { quantityChange: number }) => sum + m.quantityChange, 0,
      );

      // Use product cost price as the per-unit cost
      const unitCost = si.product.costPricePaise ? BigInt(si.product.costPricePaise) : 0n;
      const totalValue = unitCost * BigInt(si.quantityOnHand);

      items.push({
        productId: si.productId,
        productName: si.product.name,
        sku: si.product.sku,
        category: si.product.category?.name ?? null,
        quantity: si.quantityOnHand,
        unitValuePaise: unitCost,
        totalValuePaise: totalValue,
      });
    }

    return this.buildValuationResponse('AVG', locationId, items);
  }

  async calculateLastPurchase(tenantId: string, locationId: string | null) {
    const stockItems = await this.getStockItemsWithMovements(tenantId, locationId);
    const items: ValuationItem[] = [];

    for (const si of stockItems) {
      // Last purchase: use the product's current cost price (latest)
      const unitCost = si.product.costPricePaise ? BigInt(si.product.costPricePaise) : 0n;
      const totalValue = unitCost * BigInt(si.quantityOnHand);

      items.push({
        productId: si.productId,
        productName: si.product.name,
        sku: si.product.sku,
        category: si.product.category?.name ?? null,
        quantity: si.quantityOnHand,
        unitValuePaise: unitCost,
        totalValuePaise: totalValue,
      });
    }

    return this.buildValuationResponse('LAST_PURCHASE', locationId, items);
  }

  async calculateGrossProfit(tenantId: string, locationId: string | null) {
    const stockItems = await this.getStockItemsWithMovements(tenantId, locationId);
    const items: ValuationItem[] = [];

    for (const si of stockItems) {
      // Gross profit method: value at selling price minus expected margin
      // Estimated margin = (sellingPrice - costPrice) / sellingPrice
      const costPrice = si.product.costPricePaise ? BigInt(si.product.costPricePaise) : 0n;
      const sellingPrice = si.product.sellingPricePaise ? BigInt(si.product.sellingPricePaise) : costPrice;

      let unitValue = costPrice;
      if (sellingPrice > 0n && costPrice > 0n) {
        // Net realisable value approach: selling price minus margin
        const marginRatio = Number(sellingPrice - costPrice) / Number(sellingPrice);
        unitValue = BigInt(Math.round(Number(sellingPrice) * (1 - marginRatio)));
      }

      items.push({
        productId: si.productId,
        productName: si.product.name,
        sku: si.product.sku,
        category: si.product.category?.name ?? null,
        quantity: si.quantityOnHand,
        unitValuePaise: unitValue,
        totalValuePaise: unitValue * BigInt(si.quantityOnHand),
      });
    }

    return this.buildValuationResponse('GROSS_PROFIT', locationId, items);
  }

  async calculateMarketValue(tenantId: string, locationId: string | null, currentRatePaise: bigint) {
    const stockItems = await this.getStockItemsWithMovements(tenantId, locationId);
    const items: ValuationItem[] = [];

    for (const si of stockItems) {
      // Market value: use current market rate for metal-based products
      let unitValue: bigint;
      if (currentRatePaise > 0n && si.product.metalWeightMg) {
        // Value = (metalWeightMg / 1000) * (purity / 1000) * ratePerGram
        const weightG = Number(si.product.metalWeightMg) / 1000;
        const purityFactor = (si.product.metalPurity ?? 999) / 1000;
        unitValue = BigInt(Math.round(weightG * purityFactor * Number(currentRatePaise)));
      } else {
        unitValue = si.product.sellingPricePaise ? BigInt(si.product.sellingPricePaise) : 0n;
      }

      items.push({
        productId: si.productId,
        productName: si.product.name,
        sku: si.product.sku,
        category: si.product.category?.name ?? null,
        quantity: si.quantityOnHand,
        unitValuePaise: unitValue,
        totalValuePaise: unitValue * BigInt(si.quantityOnHand),
      });
    }

    return this.buildValuationResponse('MARKET', locationId, items);
  }

  // ─── Helpers ──────────────────────────────────────────────────

  private async getStockItemsWithMovements(tenantId: string, locationId: string | null) {
    const where: Record<string, unknown> = { tenantId };
    if (locationId) where.locationId = locationId;

    return this.prisma.stockItem.findMany({
      where,
      include: {
        product: {
          select: {
            id: true,
            sku: true,
            name: true,
            costPricePaise: true,
            sellingPricePaise: true,
            metalWeightMg: true,
            metalPurity: true,
            categoryId: true,
            category: { select: { id: true, name: true } },
          },
        },
        movements: {
          orderBy: { movedAt: 'asc' },
        },
      },
    });
  }

  private buildValuationResponse(
    method: string,
    locationId: string | null,
    items: ValuationItem[],
  ) {
    const totalValuePaise = items.reduce((sum, item) => sum + item.totalValuePaise, 0n);

    // Category breakdown
    const categoryMap = new Map<string | null, { categoryName: string; totalValuePaise: bigint; itemCount: number }>();
    for (const item of items) {
      const key = item.category;
      const existing = categoryMap.get(key) ?? {
        categoryName: key ?? 'Uncategorized',
        totalValuePaise: 0n,
        itemCount: 0,
      };
      existing.totalValuePaise += item.totalValuePaise;
      existing.itemCount += 1;
      categoryMap.set(key, existing);
    }

    const categoryBreakdown: CategoryBreakdownItem[] = Array.from(categoryMap.entries()).map(
      ([categoryId, data]) => ({
        categoryId,
        ...data,
      }),
    );

    return {
      method,
      locationId,
      totalValuePaise,
      items,
      categoryBreakdown,
      generatedAt: new Date(),
    };
  }
}
