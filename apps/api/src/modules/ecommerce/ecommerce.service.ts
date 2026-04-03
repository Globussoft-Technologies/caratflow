// ─── E-Commerce Order Service ──────────────────────────────────
// Core order management: create, list, get, update status,
// fulfill, cancel, refund. Dashboard data.

import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import type {
  OnlineOrderInput,
  OnlineOrderResponse,
  OnlineOrderListFilter,
  OrderStatusUpdate,
  EcommerceDashboardResponse,
} from '@caratflow/shared-types';
import type { PaginatedResult, Pagination } from '@caratflow/shared-types';
import { OnlineOrderStatus, SalesChannelType } from '@caratflow/shared-types';
import { PrismaService } from '../../common/prisma.service';
import { TenantAwareService } from '../../common/base.service';
import { EventBusService } from '../../event-bus/event-bus.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class EcommerceService extends TenantAwareService {
  constructor(
    prisma: PrismaService,
    private readonly eventBus: EventBusService,
  ) {
    super(prisma);
  }

  /**
   * Generate order number in format: ON/CH/YYMM/SEQ
   */
  private async generateOrderNumber(tenantId: string, channelId: string): Promise<string> {
    const channel = await this.prisma.salesChannel.findFirst({
      where: { id: channelId, tenantId },
      select: { channelType: true, name: true },
    });

    const chCode = (channel?.channelType ?? 'WEB').substring(0, 3).toUpperCase();
    const now = new Date();
    const yymm = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}`;

    const count = await this.prisma.onlineOrder.count({
      where: {
        tenantId,
        channelId,
        orderNumber: { contains: `/${chCode}/${yymm}/` },
      },
    });

    const seq = String(count + 1).padStart(4, '0');
    return `ON/${chCode}/${yymm}/${seq}`;
  }

  /**
   * Create an online order (from webhook or manual entry).
   */
  async createOrder(tenantId: string, userId: string, input: OnlineOrderInput): Promise<OnlineOrderResponse> {
    // Check for idempotency: if externalOrderId exists, don't create duplicate
    if (input.externalOrderId) {
      const existing = await this.prisma.onlineOrder.findFirst({
        where: {
          tenantId,
          channelId: input.channelId,
          externalOrderId: input.externalOrderId,
        },
        include: { items: true },
      });
      if (existing) {
        return this.mapOrderToResponse(existing);
      }
    }

    const orderNumber = await this.generateOrderNumber(tenantId, input.channelId);
    const orderId = uuidv4();

    const order = await this.prisma.$transaction(async (tx) => {
      const created = await tx.onlineOrder.create({
        data: {
          id: orderId,
          tenantId,
          orderNumber,
          channelId: input.channelId,
          externalOrderId: input.externalOrderId ?? null,
          customerId: input.customerId ?? null,
          customerEmail: input.customerEmail ?? null,
          customerPhone: input.customerPhone ?? null,
          customerName: input.customerName ?? null,
          status: input.status ?? 'PENDING',
          subtotalPaise: BigInt(input.subtotalPaise),
          shippingPaise: BigInt(input.shippingPaise ?? 0),
          taxPaise: BigInt(input.taxPaise ?? 0),
          discountPaise: BigInt(input.discountPaise ?? 0),
          totalPaise: BigInt(input.totalPaise),
          currencyCode: input.currencyCode ?? 'INR',
          shippingAddress: input.shippingAddress ?? undefined,
          billingAddress: input.billingAddress ?? undefined,
          notes: input.notes ?? null,
          placedAt: input.placedAt ?? new Date(),
          createdBy: userId,
          updatedBy: userId,
        },
      });

      // Create order items
      for (const item of input.items) {
        await tx.onlineOrderItem.create({
          data: {
            id: uuidv4(),
            tenantId,
            orderId,
            catalogItemId: item.catalogItemId ?? null,
            productId: item.productId ?? null,
            externalLineItemId: item.externalLineItemId ?? null,
            title: item.title,
            quantity: item.quantity,
            unitPricePaise: BigInt(item.unitPricePaise),
            totalPaise: BigInt(item.totalPaise),
            sku: item.sku ?? null,
            weightMg: item.weightMg ? BigInt(item.weightMg) : null,
          },
        });
      }

      return created;
    });

    // Publish domain event
    await this.eventBus.publish({
      id: uuidv4(),
      tenantId,
      userId,
      timestamp: new Date().toISOString(),
      type: 'ecommerce.order.received',
      payload: {
        orderId: order.id,
        channel: input.channelId,
        totalPaise: input.totalPaise,
        customerEmail: input.customerEmail ?? '',
      },
    });

    return this.getOrder(tenantId, order.id);
  }

  /**
   * Get a single online order with items.
   */
  async getOrder(tenantId: string, orderId: string): Promise<OnlineOrderResponse> {
    const order = await this.prisma.onlineOrder.findFirst({
      where: this.tenantWhere(tenantId, { id: orderId }) as { tenantId: string; id: string },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundException('Online order not found');
    }

    return this.mapOrderToResponse(order);
  }

  /**
   * List online orders with filters and pagination.
   */
  async listOrders(
    tenantId: string,
    filters: OnlineOrderListFilter,
    pagination: Pagination,
  ): Promise<PaginatedResult<OnlineOrderResponse>> {
    const where: Record<string, unknown> = { tenantId };

    if (filters.status) where.status = filters.status;
    if (filters.channelId) where.channelId = filters.channelId;
    if (filters.customerId) where.customerId = filters.customerId;

    if (filters.dateFrom || filters.dateTo) {
      where.placedAt = {};
      if (filters.dateFrom) (where.placedAt as Record<string, unknown>).gte = filters.dateFrom;
      if (filters.dateTo) (where.placedAt as Record<string, unknown>).lte = filters.dateTo;
    }

    if (filters.search) {
      where.OR = [
        { orderNumber: { contains: filters.search } },
        { externalOrderId: { contains: filters.search } },
        { customerName: { contains: filters.search } },
        { customerEmail: { contains: filters.search } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.onlineOrder.findMany({
        where,
        include: { items: true },
        orderBy: { [pagination.sortBy ?? 'createdAt']: pagination.sortOrder ?? 'desc' },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      }),
      this.prisma.onlineOrder.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pagination.limit);

    return {
      items: items.map((o) => this.mapOrderToResponse(o)),
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages,
      hasNext: pagination.page < totalPages,
      hasPrevious: pagination.page > 1,
    };
  }

  /**
   * Update order status with timestamp tracking.
   */
  async updateOrderStatus(
    tenantId: string,
    userId: string,
    update: OrderStatusUpdate,
  ): Promise<OnlineOrderResponse> {
    const order = await this.prisma.onlineOrder.findFirst({
      where: this.tenantWhere(tenantId, { id: update.orderId }) as { tenantId: string; id: string },
    });

    if (!order) {
      throw new NotFoundException('Online order not found');
    }

    const statusTimestamps: Record<string, unknown> = {};
    switch (update.status) {
      case OnlineOrderStatus.CONFIRMED:
        statusTimestamps.confirmedAt = new Date();
        break;
      case OnlineOrderStatus.SHIPPED:
        statusTimestamps.shippedAt = new Date();
        break;
      case OnlineOrderStatus.DELIVERED:
        statusTimestamps.deliveredAt = new Date();
        break;
      case OnlineOrderStatus.CANCELLED:
        if (!update.cancelReason) {
          throw new BadRequestException('Cancel reason is required');
        }
        statusTimestamps.cancelReason = update.cancelReason;
        break;
    }

    await this.prisma.onlineOrder.update({
      where: { id: update.orderId },
      data: {
        status: update.status,
        ...statusTimestamps,
        updatedBy: userId,
      },
    });

    // Publish sync event
    await this.eventBus.publish({
      id: uuidv4(),
      tenantId,
      userId,
      timestamp: new Date().toISOString(),
      type: 'ecommerce.order.synced',
      payload: {
        orderId: update.orderId,
        externalOrderId: order.externalOrderId ?? '',
        channel: order.channelId,
        status: update.status,
      },
    });

    return this.getOrder(tenantId, update.orderId);
  }

  /**
   * Cancel an order.
   */
  async cancelOrder(tenantId: string, userId: string, orderId: string, reason: string): Promise<OnlineOrderResponse> {
    return this.updateOrderStatus(tenantId, userId, {
      orderId,
      status: OnlineOrderStatus.CANCELLED,
      cancelReason: reason,
    });
  }

  /**
   * Refund an order.
   */
  async refundOrder(tenantId: string, userId: string, orderId: string): Promise<OnlineOrderResponse> {
    return this.updateOrderStatus(tenantId, userId, {
      orderId,
      status: OnlineOrderStatus.REFUNDED,
    });
  }

  /**
   * Get e-commerce dashboard data.
   */
  async getDashboard(tenantId: string): Promise<EcommerceDashboardResponse> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const [
      todayOrders,
      monthRevenue,
      pendingShipments,
      pendingOrders,
      channels,
      recentOrders,
    ] = await Promise.all([
      this.prisma.onlineOrder.count({
        where: { tenantId, placedAt: { gte: today, lt: tomorrow } },
      }),
      this.prisma.onlineOrder.aggregate({
        where: {
          tenantId,
          status: { in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'] },
          placedAt: { gte: monthStart, lt: tomorrow },
        },
        _sum: { totalPaise: true },
      }),
      this.prisma.onlineOrder.count({
        where: {
          tenantId,
          status: { in: ['CONFIRMED', 'PROCESSING'] },
        },
      }),
      this.prisma.onlineOrder.count({
        where: { tenantId, status: 'PENDING' },
      }),
      this.prisma.salesChannel.findMany({
        where: { tenantId, isActive: true },
        include: {
          onlineOrders: {
            where: {
              placedAt: { gte: monthStart, lt: tomorrow },
              status: { notIn: ['CANCELLED', 'REFUNDED'] },
            },
            select: { id: true, totalPaise: true },
          },
        },
      }),
      this.prisma.onlineOrder.findMany({
        where: { tenantId },
        include: { channel: { select: { channelType: true } } },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    const channelBreakdown = channels.map((ch) => ({
      channelId: ch.id,
      channelName: ch.name,
      channelType: ch.channelType as SalesChannelType,
      orderCount: ch.onlineOrders.length,
      revenuePaise: ch.onlineOrders.reduce((sum, o) => sum + Number(o.totalPaise), 0),
    }));

    const totalVisitors = 0; // Placeholder -- would come from analytics integration
    const conversionRate = totalVisitors > 0 ? (todayOrders / totalVisitors) * 100 : 0;

    return {
      totalOnlineOrders: todayOrders,
      onlineRevenuePaise: Number(monthRevenue._sum.totalPaise ?? 0n),
      pendingShipments,
      pendingOrders,
      channelBreakdown,
      conversionRate,
      recentOrders: recentOrders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        customerName: o.customerName,
        channelType: o.channel.channelType as SalesChannelType,
        totalPaise: Number(o.totalPaise),
        status: o.status as OnlineOrderStatus,
        placedAt: o.placedAt,
      })),
    };
  }

  // ─── Private Helpers ──────────────────────────────────────────

  private mapOrderToResponse(order: Record<string, unknown>): OnlineOrderResponse {
    const o = order as Record<string, unknown>;
    const items = (o.items as Array<Record<string, unknown>>) ?? [];

    return {
      id: o.id as string,
      tenantId: o.tenantId as string,
      orderNumber: o.orderNumber as string,
      channelId: o.channelId as string,
      externalOrderId: (o.externalOrderId as string) ?? null,
      customerId: (o.customerId as string) ?? null,
      customerEmail: (o.customerEmail as string) ?? null,
      customerPhone: (o.customerPhone as string) ?? null,
      customerName: (o.customerName as string) ?? null,
      status: o.status as OnlineOrderStatus,
      subtotalPaise: Number(o.subtotalPaise),
      shippingPaise: Number(o.shippingPaise),
      taxPaise: Number(o.taxPaise),
      discountPaise: Number(o.discountPaise),
      totalPaise: Number(o.totalPaise),
      currencyCode: o.currencyCode as string,
      shippingAddress: o.shippingAddress ?? null,
      billingAddress: o.billingAddress ?? null,
      notes: (o.notes as string) ?? null,
      cancelReason: (o.cancelReason as string) ?? null,
      placedAt: o.placedAt ? new Date(o.placedAt as string) : null,
      confirmedAt: o.confirmedAt ? new Date(o.confirmedAt as string) : null,
      shippedAt: o.shippedAt ? new Date(o.shippedAt as string) : null,
      deliveredAt: o.deliveredAt ? new Date(o.deliveredAt as string) : null,
      items: items.map((item) => ({
        id: item.id as string,
        catalogItemId: (item.catalogItemId as string) ?? null,
        productId: (item.productId as string) ?? null,
        externalLineItemId: (item.externalLineItemId as string) ?? null,
        title: item.title as string,
        quantity: item.quantity as number,
        unitPricePaise: Number(item.unitPricePaise),
        totalPaise: Number(item.totalPaise),
        sku: (item.sku as string) ?? null,
        weightMg: item.weightMg ? Number(item.weightMg) : null,
      })),
      createdAt: new Date(o.createdAt as string),
      updatedAt: new Date(o.updatedAt as string),
    };
  }
}
