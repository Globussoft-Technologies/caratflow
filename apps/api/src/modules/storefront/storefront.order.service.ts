// ─── Storefront Order Service ──────────────────────────────────
// Customer-facing order management: list orders, get detail,
// request return, reorder.

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import type { OrderResponse } from '@caratflow/shared-types';
import type { PaginatedResult, Pagination } from '@caratflow/shared-types';
import { PrismaService } from '../../common/prisma.service';
import { TenantAwareService } from '../../common/base.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class StorefrontOrderService extends TenantAwareService {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  /**
   * List orders for a customer with pagination.
   */
  async getMyOrders(
    tenantId: string,
    customerId: string,
    pagination: Pagination,
  ): Promise<PaginatedResult<OrderResponse>> {
    const where = { tenantId, customerId };

    const [orders, total] = await Promise.all([
      this.prisma.onlineOrder.findMany({
        where,
        include: {
          items: true,
          shipments: true,
          payments: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      }),
      this.prisma.onlineOrder.count({ where }),
    ]);

    // Collect product images
    const productIds = orders
      .flatMap((o) => o.items.map((i) => i.productId))
      .filter(Boolean) as string[];
    const products = await this.prisma.product.findMany({
      where: { id: { in: [...new Set(productIds)] } },
      select: { id: true, images: true },
    });
    const imgMap = new Map<string, string | null>();
    for (const p of products) {
      const imgs = p.images as unknown;
      imgMap.set(p.id, Array.isArray(imgs) && imgs.length > 0 ? (imgs[0] as string) : null);
    }

    const items: OrderResponse[] = orders.map((order) =>
      this.mapToOrderResponse(order, imgMap),
    );

    const totalPages = Math.ceil(total / pagination.limit);

    return {
      items,
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages,
      hasNext: pagination.page < totalPages,
      hasPrevious: pagination.page > 1,
    };
  }

  /**
   * Get a specific order for the customer.
   */
  async getOrderById(
    tenantId: string,
    customerId: string,
    orderId: string,
  ): Promise<OrderResponse> {
    const order = await this.prisma.onlineOrder.findFirst({
      where: { id: orderId, tenantId, customerId },
      include: {
        items: true,
        shipments: true,
        payments: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const productIds = order.items.map((i) => i.productId).filter(Boolean) as string[];
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, images: true },
    });
    const imgMap = new Map<string, string | null>();
    for (const p of products) {
      const imgs = p.images as unknown;
      imgMap.set(p.id, Array.isArray(imgs) && imgs.length > 0 ? (imgs[0] as string) : null);
    }

    return this.mapToOrderResponse(order, imgMap);
  }

  /**
   * Request a return for specific items in an order.
   */
  async requestReturn(
    tenantId: string,
    customerId: string,
    orderId: string,
    items: Array<{ orderItemId: string; quantity: number; reason: string }>,
    reason: string,
  ): Promise<void> {
    const order = await this.prisma.onlineOrder.findFirst({
      where: { id: orderId, tenantId, customerId },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== 'DELIVERED') {
      throw new BadRequestException('Returns can only be requested for delivered orders');
    }

    // Validate item IDs belong to this order
    const orderItemIds = new Set(order.items.map((i) => i.id));
    for (const item of items) {
      if (!orderItemIds.has(item.orderItemId)) {
        throw new BadRequestException(`Order item ${item.orderItemId} not found in this order`);
      }
    }

    // Update order status to indicate return is in progress
    await this.prisma.onlineOrder.update({
      where: { id: orderId },
      data: {
        status: 'RETURNED',
        notes: `Return requested: ${reason}. Items: ${items.map((i) => i.orderItemId).join(', ')}`,
      },
    });
  }

  /**
   * Reorder: create a new cart with the same items as a previous order.
   * Returns the cart ID for the caller to redirect to.
   */
  async reorder(
    tenantId: string,
    customerId: string,
    orderId: string,
  ): Promise<string> {
    const order = await this.prisma.onlineOrder.findFirst({
      where: { id: orderId, tenantId, customerId },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Create a new cart
    const cartId = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await this.prisma.cart.create({
      data: {
        id: cartId,
        tenantId,
        customerId,
        sessionId: `reorder-${uuidv4()}`,
        currencyCode: order.currencyCode,
        expiresAt,
      },
    });

    // Add items to cart (skip items without productId)
    for (const item of order.items) {
      if (!item.productId) continue;

      // Check product is still active
      const product = await this.prisma.product.findFirst({
        where: { id: item.productId, tenantId, isActive: true },
      });
      if (!product) continue;

      await this.prisma.cartItem.create({
        data: {
          id: uuidv4(),
          tenantId,
          cartId,
          productId: item.productId,
          quantity: item.quantity,
        },
      });
    }

    return cartId;
  }

  // ─── Private Helpers ──────────────────────────────────────────

  private mapToOrderResponse(
    order: Record<string, unknown>,
    imgMap: Map<string, string | null>,
  ): OrderResponse {
    const o = order as Record<string, unknown>;
    const items = (o.items as Array<Record<string, unknown>>) ?? [];
    const shipments = (o.shipments as Array<Record<string, unknown>>) ?? [];
    const payments = (o.payments as Array<Record<string, unknown>>) ?? [];

    return {
      id: o.id as string,
      orderNumber: o.orderNumber as string,
      status: o.status as string,
      subtotalPaise: Number(o.subtotalPaise),
      shippingPaise: Number(o.shippingPaise),
      taxPaise: Number(o.taxPaise),
      discountPaise: Number(o.discountPaise),
      totalPaise: Number(o.totalPaise),
      currencyCode: o.currencyCode as string,
      shippingAddress: (o.shippingAddress as Record<string, unknown>) ?? null,
      items: items.map((item) => ({
        id: item.id as string,
        productId: (item.productId as string) ?? null,
        title: item.title as string,
        quantity: item.quantity as number,
        unitPricePaise: Number(item.unitPricePaise),
        totalPaise: Number(item.totalPaise),
        sku: (item.sku as string) ?? null,
        weightMg: item.weightMg ? Number(item.weightMg) : null,
        productImage: item.productId ? (imgMap.get(item.productId as string) ?? null) : null,
      })),
      shipments: shipments.map((s) => ({
        id: s.id as string,
        shipmentNumber: s.shipmentNumber as string,
        carrier: (s.carrier as string) ?? null,
        trackingNumber: (s.trackingNumber as string) ?? null,
        trackingUrl: (s.trackingUrl as string) ?? null,
        status: s.status as string,
        estimatedDeliveryDate: s.estimatedDeliveryDate
          ? new Date(s.estimatedDeliveryDate as string)
          : null,
        actualDeliveryDate: s.actualDeliveryDate
          ? new Date(s.actualDeliveryDate as string)
          : null,
      })),
      payments: payments.map((p) => ({
        id: p.id as string,
        method: (p.method as string) ?? null,
        amountPaise: Number(p.amountPaise),
        status: p.status as string,
        completedAt: p.completedAt ? new Date(p.completedAt as string) : null,
      })),
      placedAt: o.placedAt ? new Date(o.placedAt as string) : null,
      confirmedAt: o.confirmedAt ? new Date(o.confirmedAt as string) : null,
      shippedAt: o.shippedAt ? new Date(o.shippedAt as string) : null,
      deliveredAt: o.deliveredAt ? new Date(o.deliveredAt as string) : null,
      cancelReason: (o.cancelReason as string) ?? null,
      createdAt: new Date(o.createdAt as string),
      updatedAt: new Date(o.updatedAt as string),
    };
  }
}
