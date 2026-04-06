// ─── Reorder Service ──────────────────────────────────────────
// One-click reorder: save order items as templates, check stock
// availability, and provide cart-ready item lists with warnings.

import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import type {
  ReorderTemplateResponse,
  ReorderResult,
  ReorderableOrder,
  ReorderTemplateItem,
} from '@caratflow/shared-types';
import type { PaginatedResult, Pagination } from '@caratflow/shared-types';
import { PrismaService } from '../../common/prisma.service';
import { TenantAwareService } from '../../common/base.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ReorderService extends TenantAwareService {
  private readonly logger = new Logger(ReorderService.name);

  constructor(prisma: PrismaService) {
    super(prisma);
  }

  /**
   * Create a reorder template from a completed order.
   */
  async createReorderTemplate(
    tenantId: string,
    userId: string,
    customerId: string,
    orderId: string,
    name?: string,
  ): Promise<ReorderTemplateResponse> {
    const order = await this.prisma.onlineOrder.findFirst({
      where: this.tenantWhere(tenantId, { id: orderId }) as { tenantId: string; id: string },
      include: { items: true },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const items: ReorderTemplateItem[] = order.items
      .filter((item) => item.productId != null)
      .map((item) => ({
        productId: item.productId as string,
        quantity: item.quantity,
      }));

    if (items.length === 0) {
      throw new NotFoundException('No reorderable items found in this order');
    }

    const templateId = uuidv4();
    await this.prisma.reorderTemplate.create({
      data: {
        id: templateId,
        tenantId,
        customerId,
        name: name ?? 'Previous Order',
        sourceOrderId: orderId,
        items: items as unknown as object,
        createdBy: userId,
        updatedBy: userId,
      },
    });

    this.logger.log(`[Reorder] Template created: id=${templateId}, order=${orderId}`);
    return this.getTemplate(tenantId, templateId);
  }

  /**
   * Reorder from a template or directly from an order ID.
   * Checks stock availability and returns a cart-ready result.
   */
  async reorder(
    tenantId: string,
    customerId: string,
    sourceOrderId: string,
    templateId?: string,
  ): Promise<ReorderResult> {
    let items: ReorderTemplateItem[];

    if (templateId) {
      // Use existing template
      const template = await this.prisma.reorderTemplate.findFirst({
        where: this.tenantWhere(tenantId, { id: templateId }) as { tenantId: string; id: string },
      });
      if (!template) {
        throw new NotFoundException('Reorder template not found');
      }
      items = template.items as unknown as ReorderTemplateItem[];

      // Update last used timestamp
      await this.prisma.reorderTemplate.update({
        where: { id: templateId },
        data: { lastUsedAt: new Date() },
      });
    } else {
      // Create items from order directly
      const order = await this.prisma.onlineOrder.findFirst({
        where: this.tenantWhere(tenantId, { id: sourceOrderId }) as { tenantId: string; id: string },
        include: { items: true },
      });
      if (!order) {
        throw new NotFoundException('Order not found');
      }
      items = order.items
        .filter((item) => item.productId != null)
        .map((item) => ({
          productId: item.productId as string,
          quantity: item.quantity,
        }));
    }

    // Check availability for each item
    const availableItems: ReorderResult['availableItems'] = [];
    const unavailableItems: ReorderResult['unavailableItems'] = [];
    let totalAvailablePaise = 0;

    for (const item of items) {
      const product = await this.prisma.product.findFirst({
        where: this.tenantWhere(tenantId, { id: item.productId, isActive: true }) as {
          tenantId: string;
          id: string;
          isActive: boolean;
        },
      });

      if (!product) {
        unavailableItems.push({
          productId: item.productId,
          productName: 'Unknown Product',
          requestedQty: item.quantity,
          reason: 'Product no longer available',
        });
        continue;
      }

      // Check stock across all locations
      const stockAgg = await this.prisma.stockItem.aggregate({
        where: { tenantId, productId: item.productId },
        _sum: { quantityOnHand: true, quantityReserved: true },
      });

      const availableQty =
        (stockAgg._sum.quantityOnHand ?? 0) - (stockAgg._sum.quantityReserved ?? 0);

      const unitPricePaise = Number(product.sellingPricePaise ?? 0);

      if (availableQty >= item.quantity) {
        availableItems.push({
          productId: item.productId,
          productName: product.name,
          quantity: item.quantity,
          unitPricePaise,
          available: true,
          availableQty,
        });
        totalAvailablePaise += unitPricePaise * item.quantity;
      } else if (availableQty > 0) {
        // Partially available
        availableItems.push({
          productId: item.productId,
          productName: product.name,
          quantity: availableQty,
          unitPricePaise,
          available: true,
          availableQty,
        });
        totalAvailablePaise += unitPricePaise * availableQty;
        unavailableItems.push({
          productId: item.productId,
          productName: product.name,
          requestedQty: item.quantity - availableQty,
          reason: `Only ${availableQty} of ${item.quantity} available`,
        });
      } else {
        unavailableItems.push({
          productId: item.productId,
          productName: product.name,
          requestedQty: item.quantity,
          reason: 'Out of stock',
        });
      }
    }

    this.logger.log(
      `[Reorder] Result: ${availableItems.length} available, ${unavailableItems.length} unavailable`,
    );

    return {
      availableItems,
      unavailableItems,
      totalAvailablePaise,
    };
  }

  /**
   * List past orders that can be reordered (products still exist and active).
   */
  async getReorderableOrders(
    tenantId: string,
    customerId: string,
    pagination: Pagination,
  ): Promise<PaginatedResult<ReorderableOrder>> {
    const where = {
      tenantId,
      customerId,
      status: { in: ['DELIVERED', 'CONFIRMED', 'SHIPPED'] as string[] },
    };

    const [orders, total] = await Promise.all([
      this.prisma.onlineOrder.findMany({
        where,
        include: { items: { select: { productId: true, quantity: true } } },
        orderBy: { placedAt: 'desc' },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      }),
      this.prisma.onlineOrder.count({ where }),
    ]);

    const reorderableOrders: ReorderableOrder[] = [];

    for (const order of orders) {
      const productIds = order.items
        .filter((i) => i.productId != null)
        .map((i) => i.productId as string);

      if (productIds.length === 0) continue;

      // Check how many products are still active
      const activeProducts = await this.prisma.product.count({
        where: { tenantId, id: { in: productIds }, isActive: true },
      });

      reorderableOrders.push({
        orderId: order.id,
        orderNumber: order.orderNumber,
        placedAt: order.placedAt,
        totalPaise: Number(order.totalPaise),
        itemCount: order.items.length,
        allItemsAvailable: activeProducts === productIds.length,
      });
    }

    const totalPages = Math.ceil(total / pagination.limit);

    return {
      items: reorderableOrders,
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages,
      hasNext: pagination.page < totalPages,
      hasPrevious: pagination.page > 1,
    };
  }

  /**
   * Get a single reorder template.
   */
  async getTemplate(tenantId: string, templateId: string): Promise<ReorderTemplateResponse> {
    const template = await this.prisma.reorderTemplate.findFirst({
      where: this.tenantWhere(tenantId, { id: templateId }) as { tenantId: string; id: string },
    });
    if (!template) {
      throw new NotFoundException('Reorder template not found');
    }
    return this.mapTemplateToResponse(template);
  }

  /**
   * List reorder templates for a customer.
   */
  async getTemplates(
    tenantId: string,
    customerId: string,
  ): Promise<ReorderTemplateResponse[]> {
    const templates = await this.prisma.reorderTemplate.findMany({
      where: { tenantId, customerId },
      orderBy: { lastUsedAt: { sort: 'desc', nulls: 'last' } },
    });
    return templates.map((t) => this.mapTemplateToResponse(t));
  }

  /**
   * Delete a reorder template.
   */
  async deleteTemplate(
    tenantId: string,
    customerId: string,
    templateId: string,
  ): Promise<{ success: boolean }> {
    const template = await this.prisma.reorderTemplate.findFirst({
      where: { id: templateId, tenantId, customerId },
    });
    if (!template) {
      throw new NotFoundException('Reorder template not found');
    }
    await this.prisma.reorderTemplate.delete({ where: { id: templateId } });
    return { success: true };
  }

  // ─── Private Helpers ──────────────────────────────────────────

  private mapTemplateToResponse(template: Record<string, unknown>): ReorderTemplateResponse {
    const t = template as Record<string, unknown>;
    return {
      id: t.id as string,
      tenantId: t.tenantId as string,
      customerId: t.customerId as string,
      name: t.name as string,
      sourceOrderId: t.sourceOrderId as string,
      items: t.items as ReorderTemplateItem[],
      lastUsedAt: t.lastUsedAt ? new Date(t.lastUsedAt as string) : null,
      createdAt: new Date(t.createdAt as string),
      updatedAt: new Date(t.updatedAt as string),
    };
  }
}
