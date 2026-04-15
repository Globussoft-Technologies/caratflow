// ─── Export Order Service ────────────────────────────────────────
// Core export order operations: create, confirm, update status,
// cancel, list, getById. Dashboard aggregation.

import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import type {
  ExportOrderInput,
  ExportOrderResponse,
  ExportOrderItemResponse,
  ExportOrderListFilter,
  ExportDashboardResponse,
} from '@caratflow/shared-types';
import { ExportOrderStatus } from '@caratflow/shared-types';
import type { PaginatedResult, Pagination } from '@caratflow/shared-types';
import { PrismaService } from '../../common/prisma.service';
import { TenantAwareService } from '../../common/base.service';
import { EventBusService } from '../../event-bus/event-bus.service';
import { v4 as uuidv4 } from 'uuid';

/** Valid status transitions for export orders */
const STATUS_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['IN_PRODUCTION', 'CANCELLED'],
  IN_PRODUCTION: ['READY', 'CANCELLED'],
  READY: ['CUSTOMS_CLEARED', 'CANCELLED'],
  CUSTOMS_CLEARED: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};

@Injectable()
export class ExportService extends TenantAwareService {
  constructor(
    prisma: PrismaService,
    private readonly eventBus: EventBusService,
  ) {
    super(prisma);
  }

  // ─── Order Number Generation ────────────────────────────────────

  private async generateOrderNumber(tenantId: string): Promise<string> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { slug: true },
    });
    const prefix = (tenant?.slug ?? 'CF').substring(0, 4).toUpperCase();
    const now = new Date();
    const yymm = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}`;

    const count = await this.prisma.exportOrder.count({
      where: { tenantId, orderNumber: { contains: `/${yymm}/` } },
    });

    const seq = String(count + 1).padStart(4, '0');
    return `EXP/${prefix}/${yymm}/${seq}`;
  }

  // ─── Create Export Order ────────────────────────────────────────

  async createExportOrder(
    tenantId: string,
    userId: string,
    input: ExportOrderInput,
  ): Promise<ExportOrderResponse> {
    // Validate buyer exists
    const buyer = await this.prisma.customer.findFirst({
      where: this.tenantWhere(tenantId, { id: input.buyerId }) as { tenantId: string; id: string },
    });
    if (!buyer) throw new NotFoundException('Buyer not found');

    // Validate location exists
    const location = await this.prisma.location.findFirst({
      where: this.tenantWhere(tenantId, { id: input.locationId }) as { tenantId: string; id: string },
    });
    if (!location) throw new NotFoundException('Location not found');

    // Calculate totals
    let subtotalPaise = 0n;
    const itemsData = input.items.map((item) => {
      const itemTotal = BigInt(item.unitPricePaise) * BigInt(item.quantity);
      subtotalPaise += itemTotal;
      return {
        id: uuidv4(),
        tenantId,
        description: item.description,
        productId: item.productId ?? null,
        quantity: item.quantity,
        unitPricePaise: BigInt(item.unitPricePaise),
        totalPricePaise: itemTotal,
        hsCode: item.hsCode,
        weightMg: BigInt(item.weightMg),
        metalPurity: item.metalPurity ?? null,
        countryOfOrigin: item.countryOfOrigin ?? 'IN',
        createdBy: userId,
        updatedBy: userId,
      };
    });

    const shippingPaise = BigInt(input.shippingPaise ?? 0);
    const insurancePaise = BigInt(input.insurancePaise ?? 0);
    const totalPaise = subtotalPaise + shippingPaise + insurancePaise;
    const orderNumber = await this.generateOrderNumber(tenantId);
    const orderId = uuidv4();

    await this.prisma.$transaction(async (tx) => {
      await tx.exportOrder.create({
        data: {
          id: orderId,
          tenantId,
          orderNumber,
          buyerId: input.buyerId,
          buyerCountry: input.buyerCountry,
          locationId: input.locationId,
          status: 'DRAFT',
          currencyCode: input.currencyCode ?? 'USD',
          exchangeRate: input.exchangeRate,
          subtotalPaise,
          dutyPaise: 0n,
          shippingPaise,
          insurancePaise,
          totalPaise,
          incoterms: input.incoterms,
          paymentTerms: input.paymentTerms,
          notes: input.notes ?? null,
          expectedShipDate: input.expectedShipDate ?? null,
          createdBy: userId,
          updatedBy: userId,
        },
      });

      for (const item of itemsData) {
        await tx.exportOrderItem.create({
          data: {
            ...item,
            exportOrderId: orderId,
          },
        });
      }
    });

    // Publish event
    await this.eventBus.publish({
      id: uuidv4(),
      tenantId,
      userId,
      timestamp: new Date().toISOString(),
      type: 'export.order.created',
      payload: {
        exportOrderId: orderId,
        buyerId: input.buyerId,
        buyerCountry: input.buyerCountry,
        totalPaise: Number(totalPaise),
      },
    });

    return this.getExportOrder(tenantId, orderId);
  }

  // ─── Get Export Order ───────────────────────────────────────────

  async getExportOrder(tenantId: string, orderId: string): Promise<ExportOrderResponse> {
    const order = await this.prisma.exportOrder.findFirst({
      where: this.tenantWhere(tenantId, { id: orderId }) as { tenantId: string; id: string },
      include: {
        items: true,
        buyer: { select: { firstName: true, lastName: true } },
        location: { select: { name: true } },
      },
    });

    if (!order) throw new NotFoundException('Export order not found');
    return this.mapOrderToResponse(order);
  }

  // ─── List Export Orders ─────────────────────────────────────────

  async listExportOrders(
    tenantId: string,
    filters: ExportOrderListFilter,
    pagination: Pagination,
  ): Promise<PaginatedResult<ExportOrderResponse>> {
    const where: Record<string, unknown> = { tenantId };

    if (filters.status) where.status = filters.status;
    if (filters.buyerId) where.buyerId = filters.buyerId;
    if (filters.buyerCountry) where.buyerCountry = filters.buyerCountry;
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) (where.createdAt as Record<string, unknown>).gte = filters.dateFrom;
      if (filters.dateTo) (where.createdAt as Record<string, unknown>).lte = filters.dateTo;
    }
    if (filters.search) {
      where.OR = [{ orderNumber: { contains: filters.search } }];
    }

    const [items, total] = await Promise.all([
      this.prisma.exportOrder.findMany({
        where,
        include: {
          items: true,
          buyer: { select: { firstName: true, lastName: true } },
          location: { select: { name: true } },
        },
        orderBy: { createdAt: pagination.sortOrder ?? 'desc' },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      }),
      this.prisma.exportOrder.count({ where }),
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

  // ─── Confirm Export Order ───────────────────────────────────────

  async confirmOrder(tenantId: string, userId: string, orderId: string): Promise<ExportOrderResponse> {
    return this.updateOrderStatus(tenantId, userId, orderId, ExportOrderStatus.CONFIRMED);
  }

  // ─── Update Status ──────────────────────────────────────────────

  async updateOrderStatus(
    tenantId: string,
    userId: string,
    orderId: string,
    newStatus: ExportOrderStatus,
  ): Promise<ExportOrderResponse> {
    const order = await this.prisma.exportOrder.findFirst({
      where: this.tenantWhere(tenantId, { id: orderId }) as { tenantId: string; id: string },
    });
    if (!order) throw new NotFoundException('Export order not found');

    const allowed = STATUS_TRANSITIONS[order.status] ?? [];
    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition from ${order.status} to ${newStatus}. Allowed: ${allowed.join(', ')}`,
      );
    }

    const updateData: Record<string, unknown> = {
      status: newStatus,
      updatedBy: userId,
    };

    if (newStatus === 'SHIPPED') {
      updateData.actualShipDate = new Date();
    }

    await this.prisma.exportOrder.update({
      where: { id: orderId },
      data: updateData,
    });

    // Publish events for key transitions
    if (newStatus === 'SHIPPED') {
      await this.eventBus.publish({
        id: uuidv4(),
        tenantId,
        userId,
        timestamp: new Date().toISOString(),
        type: 'export.order.shipped',
        payload: {
          exportOrderId: orderId,
          orderNumber: order.orderNumber,
          buyerCountry: order.buyerCountry,
        },
      });
    }

    if (newStatus === 'DELIVERED') {
      await this.eventBus.publish({
        id: uuidv4(),
        tenantId,
        userId,
        timestamp: new Date().toISOString(),
        type: 'export.order.delivered',
        payload: {
          exportOrderId: orderId,
          orderNumber: order.orderNumber,
          totalPaise: Number(order.totalPaise),
        },
      });
    }

    return this.getExportOrder(tenantId, orderId);
  }

  // ─── Cancel Export Order ────────────────────────────────────────

  async cancelOrder(
    tenantId: string,
    userId: string,
    orderId: string,
    reason: string,
  ): Promise<ExportOrderResponse> {
    const order = await this.prisma.exportOrder.findFirst({
      where: this.tenantWhere(tenantId, { id: orderId }) as { tenantId: string; id: string },
    });
    if (!order) throw new NotFoundException('Export order not found');

    const allowed = STATUS_TRANSITIONS[order.status] ?? [];
    if (!allowed.includes('CANCELLED')) {
      throw new BadRequestException(`Cannot cancel an order in ${order.status} status`);
    }

    await this.prisma.exportOrder.update({
      where: { id: orderId },
      data: {
        status: 'CANCELLED',
        notes: order.notes ? `${order.notes}\nCANCELLED: ${reason}` : `CANCELLED: ${reason}`,
        updatedBy: userId,
      },
    });

    return this.getExportOrder(tenantId, orderId);
  }

  // ─── Dashboard ──────────────────────────────────────────────────

  async getDashboard(tenantId: string): Promise<ExportDashboardResponse> {
    const activeStatuses: ExportOrderStatus[] = [
      ExportOrderStatus.DRAFT,
      ExportOrderStatus.CONFIRMED,
      ExportOrderStatus.IN_PRODUCTION,
      ExportOrderStatus.READY,
      ExportOrderStatus.CUSTOMS_CLEARED,
    ];
    const shippedStatuses: ExportOrderStatus[] = [ExportOrderStatus.SHIPPED];

    const [
      activeOrders,
      pendingShipments,
      totalExportValue,
      topDestinationsRaw,
      activeLicenses,
      recentOrdersRaw,
    ] = await Promise.all([
      this.prisma.exportOrder.count({
        where: { tenantId, status: { in: activeStatuses } },
      }),
      this.prisma.exportOrder.count({
        where: { tenantId, status: { in: ['READY', 'CUSTOMS_CLEARED'] } },
      }),
      this.prisma.exportOrder.aggregate({
        where: { tenantId, status: { notIn: ['CANCELLED', 'DRAFT'] } },
        _sum: { totalPaise: true },
      }),
      this.prisma.exportOrder.groupBy({
        by: ['buyerCountry'],
        where: { tenantId, status: { notIn: ['CANCELLED'] } },
        _count: { id: true },
        _sum: { totalPaise: true },
        orderBy: { _count: { id: 'desc' } },
        take: 5,
      }),
      this.prisma.dgftLicense.findMany({
        where: { tenantId, status: 'ACTIVE' },
        orderBy: { expiryDate: 'asc' },
        take: 5,
      }),
      this.prisma.exportOrder.findMany({
        where: { tenantId },
        include: {
          items: true,
          buyer: { select: { firstName: true, lastName: true } },
          location: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    const topDestinations = topDestinationsRaw.map((d) => ({
      country: d.buyerCountry,
      orderCount: d._count.id,
      totalValuePaise: Number(d._sum.totalPaise ?? 0n),
    }));

    const licenseUtilization = activeLicenses.map((l) => {
      const value = Number(l.valuePaise);
      const used = Number(l.usedValuePaise);
      return {
        licenseNumber: l.licenseNumber,
        licenseType: l.licenseType as DgftLicenseType,
        valuePaise: value,
        usedValuePaise: used,
        utilizationPercent: value > 0 ? Math.round((used / value) * 100) : 0,
        status: l.status as DgftLicenseStatus,
      };
    });

    return {
      activeOrders,
      pendingShipments,
      totalExportValuePaise: Number(totalExportValue._sum.totalPaise ?? 0n),
      totalExportValueCurrency: 'INR',
      topDestinations,
      licenseUtilization,
      recentOrders: recentOrdersRaw.map((o) => this.mapOrderToResponse(o)),
      recentInvoices: [], // Populated by invoice service
    };
  }

  // ─── Mapper ─────────────────────────────────────────────────────

  private mapOrderToResponse(order: Record<string, unknown>): ExportOrderResponse {
    const o = order as Record<string, unknown>;
    const items = (o.items as Array<Record<string, unknown>>) ?? [];
    const buyer = o.buyer as Record<string, unknown> | undefined;
    const location = o.location as Record<string, unknown> | undefined;

    return {
      id: o.id as string,
      tenantId: o.tenantId as string,
      orderNumber: o.orderNumber as string,
      buyerId: o.buyerId as string,
      buyerName: buyer ? `${buyer.firstName as string} ${buyer.lastName as string}` : undefined,
      buyerCountry: o.buyerCountry as string,
      locationId: o.locationId as string,
      locationName: location?.name as string | undefined,
      status: o.status as ExportOrderStatus,
      currencyCode: o.currencyCode as string,
      exchangeRate: o.exchangeRate as number,
      subtotalPaise: Number(o.subtotalPaise),
      dutyPaise: Number(o.dutyPaise),
      shippingPaise: Number(o.shippingPaise),
      insurancePaise: Number(o.insurancePaise),
      totalPaise: Number(o.totalPaise),
      incoterms: o.incoterms as string,
      paymentTerms: o.paymentTerms as string,
      notes: (o.notes as string) ?? null,
      expectedShipDate: o.expectedShipDate ? new Date(o.expectedShipDate as string).toISOString() : null,
      actualShipDate: o.actualShipDate ? new Date(o.actualShipDate as string).toISOString() : null,
      items: items.map((item) => ({
        id: item.id as string,
        productId: (item.productId as string) ?? null,
        description: item.description as string,
        quantity: item.quantity as number,
        unitPricePaise: Number(item.unitPricePaise),
        totalPricePaise: Number(item.totalPricePaise),
        hsCode: item.hsCode as string,
        weightMg: Number(item.weightMg),
        metalPurity: (item.metalPurity as number) ?? null,
        countryOfOrigin: item.countryOfOrigin as string,
      })),
      createdAt: new Date(o.createdAt as string).toISOString(),
      updatedAt: new Date(o.updatedAt as string).toISOString(),
    };
  }
}

// Re-export for dashboard type reference
import type { DgftLicenseType, DgftLicenseStatus } from '@caratflow/shared-types';
