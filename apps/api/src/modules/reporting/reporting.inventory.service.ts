// ─── Reporting Inventory Service ──────────────────────────────
// Stock reports: summary, low stock, dead stock, fast/slow movers,
// aging, valuation, metal stock summary.

import { Injectable } from '@nestjs/common';
import { TenantAwareService } from '../../common/base.service';
import { PrismaService } from '../../common/prisma.service';
import type {
  StockSummaryRow,
  StockByLocationRow,
  LowStockItem,
  DeadStockItem,
  StockMoverItem,
  StockAgingRow,
  MetalStockSummaryRow,
  InventoryReportResponse,
} from '@caratflow/shared-types';

@Injectable()
export class ReportingInventoryService extends TenantAwareService {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  /**
   * Stock summary: total value, quantity breakdown by category.
   */
  async stockSummary(
    tenantId: string,
    locationId?: string,
  ): Promise<InventoryReportResponse> {
    const stockItems = await this.prisma.stockItem.findMany({
      where: {
        tenantId,
        ...(locationId ? { locationId } : {}),
      },
      select: {
        quantityOnHand: true,
        product: {
          select: {
            costPricePaise: true,
            category: { select: { name: true } },
          },
        },
      },
    });

    const categoryMap = new Map<string, StockSummaryRow>();
    let totalValuePaise = 0;
    let totalItems = 0;
    let totalQuantity = 0;

    for (const item of stockItems) {
      const catName = item.product.category?.name ?? 'Uncategorized';
      const valuePaise = Number(item.product.costPricePaise ?? 0) * item.quantityOnHand;
      totalValuePaise += valuePaise;
      totalItems += 1;
      totalQuantity += item.quantityOnHand;

      const existing = categoryMap.get(catName);
      if (existing) {
        existing.totalItems += 1;
        existing.totalQuantity += item.quantityOnHand;
        existing.totalValuePaise += valuePaise;
      } else {
        categoryMap.set(catName, {
          category: catName,
          totalItems: 1,
          totalQuantity: item.quantityOnHand,
          totalValuePaise: valuePaise,
        });
      }
    }

    return {
      stockSummary: Array.from(categoryMap.values()).sort(
        (a, b) => b.totalValuePaise - a.totalValuePaise,
      ),
      totalValuePaise,
      totalItems,
      totalQuantity,
    };
  }

  /**
   * Stock by location: value and quantity per location.
   */
  async stockByLocation(
    tenantId: string,
  ): Promise<StockByLocationRow[]> {
    const stockItems = await this.prisma.stockItem.findMany({
      where: { tenantId },
      select: {
        locationId: true,
        quantityOnHand: true,
        location: { select: { name: true } },
        product: { select: { costPricePaise: true } },
      },
    });

    const locationMap = new Map<string, StockByLocationRow>();
    for (const item of stockItems) {
      const valuePaise = Number(item.product.costPricePaise ?? 0) * item.quantityOnHand;
      const existing = locationMap.get(item.locationId);
      if (existing) {
        existing.totalItems += 1;
        existing.totalQuantity += item.quantityOnHand;
        existing.totalValuePaise += valuePaise;
      } else {
        locationMap.set(item.locationId, {
          locationId: item.locationId,
          locationName: item.location.name,
          totalItems: 1,
          totalQuantity: item.quantityOnHand,
          totalValuePaise: valuePaise,
        });
      }
    }

    return Array.from(locationMap.values()).sort(
      (a, b) => b.totalValuePaise - a.totalValuePaise,
    );
  }

  /**
   * Low stock alert: items below reorder level.
   */
  async lowStockAlert(tenantId: string): Promise<LowStockItem[]> {
    const items = await this.prisma.$queryRawUnsafe<
      Array<{
        product_id: string;
        product_name: string;
        sku: string;
        location_name: string;
        quantity_on_hand: number;
        reorder_level: number;
      }>
    >(
      `SELECT si.product_id, p.name AS product_name, p.sku, l.name AS location_name,
              si.quantity_on_hand, si.reorder_level
       FROM stock_items si
       JOIN products p ON p.id = si.product_id
       JOIN locations l ON l.id = si.location_id
       WHERE si.tenant_id = ?
         AND si.quantity_on_hand < si.reorder_level
         AND si.reorder_level > 0
       ORDER BY (si.reorder_level - si.quantity_on_hand) DESC`,
      tenantId,
    );

    return items.map((row) => ({
      productId: row.product_id,
      productName: row.product_name,
      sku: row.sku,
      locationName: row.location_name,
      quantityOnHand: row.quantity_on_hand,
      reorderLevel: row.reorder_level,
      deficit: row.reorder_level - row.quantity_on_hand,
    }));
  }

  /**
   * Dead stock: items with no movement in N days.
   */
  async deadStockReport(
    tenantId: string,
    daysSinceLastMovement: number = 90,
  ): Promise<DeadStockItem[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysSinceLastMovement);

    const items = await this.prisma.$queryRawUnsafe<
      Array<{
        product_id: string;
        product_name: string;
        sku: string;
        location_name: string;
        quantity_on_hand: number;
        cost_price_paise: bigint | null;
        last_moved_at: Date | null;
      }>
    >(
      `SELECT si.product_id, p.name AS product_name, p.sku, l.name AS location_name,
              si.quantity_on_hand, p.cost_price_paise,
              (SELECT MAX(sm.moved_at) FROM stock_movements sm WHERE sm.stock_item_id = si.id) AS last_moved_at
       FROM stock_items si
       JOIN products p ON p.id = si.product_id
       JOIN locations l ON l.id = si.location_id
       WHERE si.tenant_id = ?
         AND si.quantity_on_hand > 0
       HAVING last_moved_at IS NULL OR last_moved_at < ?
       ORDER BY si.quantity_on_hand DESC`,
      tenantId,
      cutoffDate,
    );

    const now = new Date();
    return items.map((row) => ({
      productId: row.product_id,
      productName: row.product_name,
      sku: row.sku,
      locationName: row.location_name,
      quantityOnHand: row.quantity_on_hand,
      valuePaise: Number(row.cost_price_paise ?? 0) * row.quantity_on_hand,
      daysSinceLastMovement: row.last_moved_at
        ? Math.floor((now.getTime() - new Date(row.last_moved_at).getTime()) / 86400000)
        : -1,
      lastMovementDate: row.last_moved_at
        ? new Date(row.last_moved_at).toISOString().split('T')[0]!
        : null,
    }));
  }

  /**
   * Fast/slow movers: by total movement count in date range.
   */
  async fastSlowMovers(
    tenantId: string,
    dateRange: { from: Date; to: Date },
    limit: number = 20,
  ): Promise<{ fastMovers: StockMoverItem[]; slowMovers: StockMoverItem[] }> {
    const movements = await this.prisma.stockMovement.findMany({
      where: {
        tenantId,
        movedAt: { gte: dateRange.from, lte: dateRange.to },
        movementType: { in: ['IN', 'OUT'] },
      },
      select: {
        stockItem: {
          select: {
            productId: true,
            quantityOnHand: true,
            product: {
              select: {
                name: true,
                sku: true,
                category: { select: { name: true } },
              },
            },
          },
        },
        quantityChange: true,
      },
    });

    const productMap = new Map<
      string,
      { name: string; sku: string; category: string | null; movements: number; totalQty: number }
    >();

    for (const mov of movements) {
      const pid = mov.stockItem.productId;
      const existing = productMap.get(pid);
      if (existing) {
        existing.movements += 1;
        existing.totalQty += Math.abs(mov.quantityChange);
      } else {
        productMap.set(pid, {
          name: mov.stockItem.product.name,
          sku: mov.stockItem.product.sku,
          category: mov.stockItem.product.category?.name ?? null,
          movements: 1,
          totalQty: Math.abs(mov.quantityChange),
        });
      }
    }

    const allItems = Array.from(productMap.entries()).map(([pid, data]) => ({
      productId: pid,
      productName: data.name,
      sku: data.sku,
      categoryName: data.category,
      totalMovements: data.movements,
      turnoverRate: data.totalQty,
    }));

    const sorted = allItems.sort((a, b) => b.turnoverRate - a.turnoverRate);

    return {
      fastMovers: sorted.slice(0, limit),
      slowMovers: sorted.slice(-limit).reverse(),
    };
  }

  /**
   * Stock aging report: items grouped by age (0-30, 31-60, 61-90, 90+ days).
   */
  async stockAgingReport(
    tenantId: string,
    locationId?: string,
  ): Promise<StockAgingRow[]> {
    const stockItems = await this.prisma.stockItem.findMany({
      where: {
        tenantId,
        quantityOnHand: { gt: 0 },
        ...(locationId ? { locationId } : {}),
      },
      select: {
        id: true,
        quantityOnHand: true,
        createdAt: true,
        product: { select: { costPricePaise: true } },
      },
    });

    const now = new Date();
    const aging: Record<string, { count: number; quantity: number; value: number }> = {
      '0-30 days': { count: 0, quantity: 0, value: 0 },
      '31-60 days': { count: 0, quantity: 0, value: 0 },
      '61-90 days': { count: 0, quantity: 0, value: 0 },
      '90+ days': { count: 0, quantity: 0, value: 0 },
    };

    for (const item of stockItems) {
      const ageDays = Math.floor(
        (now.getTime() - item.createdAt.getTime()) / 86400000,
      );
      const valuePaise = Number(item.product.costPricePaise ?? 0) * item.quantityOnHand;

      let bucket: string;
      if (ageDays <= 30) bucket = '0-30 days';
      else if (ageDays <= 60) bucket = '31-60 days';
      else if (ageDays <= 90) bucket = '61-90 days';
      else bucket = '90+ days';

      aging[bucket]!.count += 1;
      aging[bucket]!.quantity += item.quantityOnHand;
      aging[bucket]!.value += valuePaise;
    }

    return Object.entries(aging).map(([ageRange, data]) => ({
      ageRange,
      itemCount: data.count,
      totalQuantity: data.quantity,
      totalValuePaise: data.value,
    }));
  }

  /**
   * Stock valuation report by method (cost / market).
   */
  async stockValuationReport(
    tenantId: string,
    method: 'cost' | 'market' = 'cost',
    locationId?: string,
  ): Promise<{
    items: Array<{
      productId: string;
      productName: string;
      sku: string;
      quantityOnHand: number;
      unitValuePaise: number;
      totalValuePaise: number;
    }>;
    grandTotalPaise: number;
  }> {
    const stockItems = await this.prisma.stockItem.findMany({
      where: {
        tenantId,
        quantityOnHand: { gt: 0 },
        ...(locationId ? { locationId } : {}),
      },
      select: {
        quantityOnHand: true,
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            costPricePaise: true,
            sellingPricePaise: true,
          },
        },
      },
    });

    let grandTotal = 0;
    const items = stockItems.map((item) => {
      const unitValue =
        method === 'cost'
          ? Number(item.product.costPricePaise ?? 0)
          : Number(item.product.sellingPricePaise ?? 0);
      const totalValue = unitValue * item.quantityOnHand;
      grandTotal += totalValue;
      return {
        productId: item.product.id,
        productName: item.product.name,
        sku: item.product.sku,
        quantityOnHand: item.quantityOnHand,
        unitValuePaise: unitValue,
        totalValuePaise: totalValue,
      };
    });

    return {
      items: items.sort((a, b) => b.totalValuePaise - a.totalValuePaise),
      grandTotalPaise: grandTotal,
    };
  }

  /**
   * Metal stock summary: gold/silver/platinum by purity by location.
   */
  async metalStockSummary(tenantId: string): Promise<MetalStockSummaryRow[]> {
    const metalStocks = await this.prisma.metalStock.findMany({
      where: { tenantId },
      select: {
        metalType: true,
        purityFineness: true,
        weightMg: true,
        valuePaise: true,
        location: { select: { name: true } },
      },
      orderBy: [{ metalType: 'asc' }, { purityFineness: 'desc' }],
    });

    return metalStocks.map((ms) => ({
      metalType: ms.metalType,
      purityFineness: ms.purityFineness,
      locationName: ms.location.name,
      weightMg: Number(ms.weightMg),
      valuePaise: Number(ms.valuePaise),
    }));
  }
}
