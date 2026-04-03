// ─── Retail Custom Order Service ───────────────────────────────
// Bespoke / custom jewelry order lifecycle management.

import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import type { CustomOrderInput, CustomOrderResponse } from '@caratflow/shared-types';
import type { PaginatedResult, Pagination } from '@caratflow/shared-types';
import { CustomOrderStatus } from '@caratflow/shared-types';
import { PrismaService } from '../../common/prisma.service';
import { TenantAwareService } from '../../common/base.service';
import { EventBusService } from '../../event-bus/event-bus.service';
import { v4 as uuidv4 } from 'uuid';

const CUSTOM_ORDER_TRANSITIONS: Record<string, string[]> = {
  INQUIRY: ['DESIGNED', 'CANCELLED'],
  DESIGNED: ['QUOTED', 'CANCELLED'],
  QUOTED: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['DEPOSIT_PAID', 'CANCELLED'],
  DEPOSIT_PAID: ['IN_PRODUCTION', 'CANCELLED'],
  IN_PRODUCTION: ['READY', 'CANCELLED'],
  READY: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};

@Injectable()
export class RetailCustomOrderService extends TenantAwareService {
  constructor(
    prisma: PrismaService,
    private readonly eventBus: EventBusService,
  ) {
    super(prisma);
  }

  private async generateOrderNumber(tenantId: string, locationId: string): Promise<string> {
    const location = await this.prisma.location.findFirst({
      where: { id: locationId, tenantId },
      select: { city: true },
    });
    const locCode = (location?.city ?? 'LOC').substring(0, 3).toUpperCase();
    const now = new Date();
    const yymm = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}`;

    const count = await this.prisma.customOrder.count({
      where: {
        tenantId,
        locationId,
        orderNumber: { contains: `/${locCode}/${yymm}/` },
      },
    });

    const seq = String(count + 1).padStart(4, '0');
    return `CO/${locCode}/${yymm}/${seq}`;
  }

  async createCustomOrder(tenantId: string, userId: string, input: CustomOrderInput): Promise<CustomOrderResponse> {
    const orderNumber = await this.generateOrderNumber(tenantId, input.locationId);

    const order = await this.prisma.customOrder.create({
      data: {
        id: uuidv4(),
        tenantId,
        orderNumber,
        customerId: input.customerId,
        locationId: input.locationId,
        status: 'INQUIRY',
        description: input.description,
        designNotes: input.designNotes ?? null,
        designImages: input.designImages ?? null,
        estimatePaise: input.estimatePaise ? BigInt(input.estimatePaise) : null,
        expectedDate: input.expectedDate ?? null,
        createdBy: userId,
        updatedBy: userId,
      },
    });

    await this.eventBus.publish({
      id: uuidv4(),
      tenantId,
      userId,
      timestamp: new Date().toISOString(),
      type: 'retail.custom_order.created',
      payload: {
        orderId: order.id,
        customerId: input.customerId,
        description: input.description,
        estimatePaise: input.estimatePaise ?? 0,
      },
    });

    return this.mapToResponse(order);
  }

  async updateStatus(
    tenantId: string,
    userId: string,
    orderId: string,
    newStatus: CustomOrderStatus,
  ): Promise<CustomOrderResponse> {
    const order = await this.prisma.customOrder.findFirst({
      where: this.tenantWhere(tenantId, { id: orderId }) as { tenantId: string; id: string },
    });

    if (!order) throw new NotFoundException('Custom order not found');

    const allowed = CUSTOM_ORDER_TRANSITIONS[order.status] ?? [];
    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition from ${order.status} to ${newStatus}. Allowed: ${allowed.join(', ')}`,
      );
    }

    const updated = await this.prisma.customOrder.update({
      where: { id: orderId },
      data: { status: newStatus, updatedBy: userId },
    });

    return this.mapToResponse(updated);
  }

  async recordDeposit(
    tenantId: string,
    userId: string,
    orderId: string,
    depositPaise: number,
  ): Promise<CustomOrderResponse> {
    const order = await this.prisma.customOrder.findFirst({
      where: this.tenantWhere(tenantId, { id: orderId }) as { tenantId: string; id: string },
    });

    if (!order) throw new NotFoundException('Custom order not found');

    const newDeposit = Number(order.depositPaise) + depositPaise;
    const finalPrice = Number(order.finalPricePaise ?? order.estimatePaise ?? 0);
    const balance = Math.max(0, finalPrice - newDeposit);

    const updated = await this.prisma.customOrder.update({
      where: { id: orderId },
      data: {
        depositPaise: BigInt(newDeposit),
        balancePaise: BigInt(balance),
        status: order.status === 'CONFIRMED' ? 'DEPOSIT_PAID' : order.status,
        updatedBy: userId,
      },
    });

    return this.mapToResponse(updated);
  }

  async updateOrder(
    tenantId: string,
    userId: string,
    orderId: string,
    data: Partial<CustomOrderInput> & { finalPricePaise?: number },
  ): Promise<CustomOrderResponse> {
    const order = await this.prisma.customOrder.findFirst({
      where: this.tenantWhere(tenantId, { id: orderId }) as { tenantId: string; id: string },
    });

    if (!order) throw new NotFoundException('Custom order not found');

    const updateData: Record<string, unknown> = { updatedBy: userId };
    if (data.description !== undefined) updateData.description = data.description;
    if (data.designNotes !== undefined) updateData.designNotes = data.designNotes;
    if (data.designImages !== undefined) updateData.designImages = data.designImages;
    if (data.estimatePaise !== undefined) updateData.estimatePaise = BigInt(data.estimatePaise);
    if (data.expectedDate !== undefined) updateData.expectedDate = data.expectedDate;
    if (data.finalPricePaise !== undefined) {
      updateData.finalPricePaise = BigInt(data.finalPricePaise);
      updateData.balancePaise = BigInt(Math.max(0, data.finalPricePaise - Number(order.depositPaise)));
    }

    const updated = await this.prisma.customOrder.update({
      where: { id: orderId },
      data: updateData,
    });

    return this.mapToResponse(updated);
  }

  async getCustomOrder(tenantId: string, orderId: string): Promise<CustomOrderResponse> {
    const order = await this.prisma.customOrder.findFirst({
      where: this.tenantWhere(tenantId, { id: orderId }) as { tenantId: string; id: string },
    });

    if (!order) throw new NotFoundException('Custom order not found');
    return this.mapToResponse(order);
  }

  async listCustomOrders(
    tenantId: string,
    filters: { status?: string; customerId?: string },
    pagination: Pagination,
  ): Promise<PaginatedResult<CustomOrderResponse>> {
    const where: Record<string, unknown> = { tenantId };
    if (filters.status) where.status = filters.status;
    if (filters.customerId) where.customerId = filters.customerId;

    const [items, total] = await Promise.all([
      this.prisma.customOrder.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      }),
      this.prisma.customOrder.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pagination.limit);

    return {
      items: items.map((o) => this.mapToResponse(o)),
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages,
      hasNext: pagination.page < totalPages,
      hasPrevious: pagination.page > 1,
    };
  }

  private mapToResponse(order: Record<string, unknown>): CustomOrderResponse {
    return {
      id: order.id as string,
      tenantId: order.tenantId as string,
      orderNumber: order.orderNumber as string,
      customerId: order.customerId as string,
      locationId: order.locationId as string,
      status: order.status as CustomOrderStatus,
      description: order.description as string,
      designNotes: (order.designNotes as string) ?? null,
      designImages: order.designImages ?? null,
      estimatePaise: order.estimatePaise ? Number(order.estimatePaise) : null,
      finalPricePaise: order.finalPricePaise ? Number(order.finalPricePaise) : null,
      depositPaise: Number(order.depositPaise ?? 0),
      balancePaise: Number(order.balancePaise ?? 0),
      expectedDate: order.expectedDate ? new Date(order.expectedDate as string) : null,
      createdAt: new Date(order.createdAt as string),
      updatedAt: new Date(order.updatedAt as string),
    };
  }
}
