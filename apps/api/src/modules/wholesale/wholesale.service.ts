// ─── Wholesale Purchase Order & Goods Receipt Service ──────────
// Core PO operations: create, send, receive (partial/full), cancel.
// Goods receipt: create, inspect, accept/reject.
// Dashboard aggregation.

import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import type {
  PurchaseOrderInput,
  PurchaseOrderResponse,
  PurchaseOrderListFilter,
  PurchaseOrderItemResponse,
  GoodsReceiptInput,
  GoodsReceiptResponse,
  GoodsReceiptItemResponse,
  WholesaleDashboardResponse,
  ConsignmentOutResponse,
  ConsignmentOutItemResponse,
} from '@caratflow/shared-types';
import {
  WholesalePOStatus,
  WholesaleGRStatus,
  WholesaleConsignmentOutStatus,
  WholesaleConsignmentOutItemStatus,
} from '@caratflow/shared-types';
import type { PaginatedResult, Pagination } from '@caratflow/shared-types';
import { PrismaService } from '../../common/prisma.service';
import { TenantAwareService } from '../../common/base.service';
import { EventBusService } from '../../event-bus/event-bus.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class WholesaleService extends TenantAwareService {
  constructor(
    prisma: PrismaService,
    private readonly eventBus: EventBusService,
  ) {
    super(prisma);
  }

  // ─── PO Number Generation ──────────────────────────────────────

  private async generatePoNumber(tenantId: string): Promise<string> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { slug: true },
    });
    const prefix = (tenant?.slug ?? 'CF').substring(0, 4).toUpperCase();
    const now = new Date();
    const yymm = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}`;

    const count = await this.prisma.purchaseOrder.count({
      where: { tenantId, poNumber: { contains: `/${yymm}/` } },
    });

    const seq = String(count + 1).padStart(4, '0');
    return `PO/${prefix}/${yymm}/${seq}`;
  }

  private async generateReceiptNumber(tenantId: string): Promise<string> {
    const now = new Date();
    const yymm = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}`;

    const count = await this.prisma.goodsReceipt.count({
      where: { tenantId, receiptNumber: { contains: `/${yymm}/` } },
    });

    const seq = String(count + 1).padStart(4, '0');
    return `GR/${yymm}/${seq}`;
  }

  // ─── Purchase Order CRUD ───────────────────────────────────────

  async createPurchaseOrder(
    tenantId: string,
    userId: string,
    input: PurchaseOrderInput,
  ): Promise<PurchaseOrderResponse> {
    // Validate supplier exists
    const supplier = await this.prisma.supplier.findFirst({
      where: this.tenantWhere(tenantId, { id: input.supplierId }) as { tenantId: string; id: string },
    });
    if (!supplier) throw new NotFoundException('Supplier not found');

    // Validate location exists
    const location = await this.prisma.location.findFirst({
      where: this.tenantWhere(tenantId, { id: input.locationId }) as { tenantId: string; id: string },
    });
    if (!location) throw new NotFoundException('Location not found');

    // Calculate totals from items
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
        weightMg: item.weightMg != null ? BigInt(item.weightMg) : null,
        purityFineness: item.purityFineness ?? null,
        receivedQuantity: 0,
        totalPaise: itemTotal,
        createdBy: userId,
        updatedBy: userId,
      };
    });

    const totalPaise = subtotalPaise;
    const poNumber = await this.generatePoNumber(tenantId);
    const poId = uuidv4();

    await this.prisma.$transaction(async (tx) => {
      await tx.purchaseOrder.create({
        data: {
          id: poId,
          tenantId,
          poNumber,
          supplierId: input.supplierId,
          locationId: input.locationId,
          status: 'DRAFT',
          subtotalPaise,
          taxPaise: 0n,
          totalPaise,
          currencyCode: input.currencyCode ?? 'INR',
          expectedDate: input.expectedDate ?? null,
          notes: input.notes ?? null,
          createdBy: userId,
          updatedBy: userId,
        },
      });

      for (const item of itemsData) {
        await tx.purchaseOrderItem.create({
          data: {
            ...item,
            purchaseOrderId: poId,
          },
        });
      }
    });

    return this.getPurchaseOrder(tenantId, poId);
  }

  async getPurchaseOrder(tenantId: string, poId: string): Promise<PurchaseOrderResponse> {
    const po = await this.prisma.purchaseOrder.findFirst({
      where: this.tenantWhere(tenantId, { id: poId }) as { tenantId: string; id: string },
      include: {
        items: true,
        supplier: { select: { name: true } },
        location: { select: { name: true } },
      },
    });

    if (!po) throw new NotFoundException('Purchase order not found');
    return this.mapPoToResponse(po);
  }

  async listPurchaseOrders(
    tenantId: string,
    filters: PurchaseOrderListFilter,
    pagination: Pagination,
  ): Promise<PaginatedResult<PurchaseOrderResponse>> {
    const where: Record<string, unknown> = { tenantId };

    if (filters.status) where.status = filters.status;
    if (filters.supplierId) where.supplierId = filters.supplierId;
    if (filters.locationId) where.locationId = filters.locationId;
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) (where.createdAt as Record<string, unknown>).gte = filters.dateFrom;
      if (filters.dateTo) (where.createdAt as Record<string, unknown>).lte = filters.dateTo;
    }
    if (filters.search) {
      where.OR = [{ poNumber: { contains: filters.search } }];
    }

    const [items, total] = await Promise.all([
      this.prisma.purchaseOrder.findMany({
        where,
        include: {
          items: true,
          supplier: { select: { name: true } },
          location: { select: { name: true } },
        },
        orderBy: { createdAt: pagination.sortOrder ?? 'desc' },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      }),
      this.prisma.purchaseOrder.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pagination.limit);

    return {
      items: items.map((po) => this.mapPoToResponse(po)),
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages,
      hasNext: pagination.page < totalPages,
      hasPrevious: pagination.page > 1,
    };
  }

  async sendPurchaseOrder(tenantId: string, userId: string, poId: string): Promise<PurchaseOrderResponse> {
    const po = await this.prisma.purchaseOrder.findFirst({
      where: this.tenantWhere(tenantId, { id: poId }) as { tenantId: string; id: string },
    });
    if (!po) throw new NotFoundException('Purchase order not found');
    if (po.status !== 'DRAFT') {
      throw new BadRequestException('Only draft purchase orders can be sent');
    }

    await this.prisma.purchaseOrder.update({
      where: { id: poId },
      data: {
        status: 'SENT',
        approvedBy: userId,
        approvedAt: new Date(),
        updatedBy: userId,
      },
    });

    return this.getPurchaseOrder(tenantId, poId);
  }

  async cancelPurchaseOrder(
    tenantId: string,
    userId: string,
    poId: string,
    reason: string,
  ): Promise<PurchaseOrderResponse> {
    const po = await this.prisma.purchaseOrder.findFirst({
      where: this.tenantWhere(tenantId, { id: poId }) as { tenantId: string; id: string },
    });
    if (!po) throw new NotFoundException('Purchase order not found');
    if (po.status === 'RECEIVED' || po.status === 'CANCELLED') {
      throw new BadRequestException(`Cannot cancel a ${po.status.toLowerCase()} purchase order`);
    }

    await this.prisma.purchaseOrder.update({
      where: { id: poId },
      data: {
        status: 'CANCELLED',
        notes: po.notes ? `${po.notes}\nCANCELLED: ${reason}` : `CANCELLED: ${reason}`,
        updatedBy: userId,
      },
    });

    return this.getPurchaseOrder(tenantId, poId);
  }

  // ─── Goods Receipt ─────────────────────────────────────────────

  async createGoodsReceipt(
    tenantId: string,
    userId: string,
    input: GoodsReceiptInput,
  ): Promise<GoodsReceiptResponse> {
    const po = await this.prisma.purchaseOrder.findFirst({
      where: this.tenantWhere(tenantId, { id: input.purchaseOrderId }) as { tenantId: string; id: string },
      include: { items: true },
    });
    if (!po) throw new NotFoundException('Purchase order not found');
    if (po.status === 'CANCELLED') {
      throw new BadRequestException('Cannot create receipt for cancelled PO');
    }
    if (po.status === 'RECEIVED') {
      throw new BadRequestException('PO is already fully received');
    }

    const receiptNumber = await this.generateReceiptNumber(tenantId);
    const receiptId = uuidv4();

    await this.prisma.$transaction(async (tx) => {
      await tx.goodsReceipt.create({
        data: {
          id: receiptId,
          tenantId,
          receiptNumber,
          purchaseOrderId: po.id,
          supplierId: po.supplierId,
          locationId: po.locationId,
          status: 'DRAFT',
          receivedDate: input.receivedDate ?? new Date(),
          notes: input.notes ?? null,
          createdBy: userId,
          updatedBy: userId,
        },
      });

      for (const item of input.items) {
        await tx.goodsReceiptItem.create({
          data: {
            id: uuidv4(),
            tenantId,
            goodsReceiptId: receiptId,
            poItemId: item.poItemId ?? null,
            productId: item.productId,
            receivedQuantity: item.receivedQuantity,
            acceptedQuantity: item.acceptedQuantity ?? 0,
            rejectedQuantity: item.rejectedQuantity ?? 0,
            weightMg: BigInt(item.weightMg),
            notes: item.notes ?? null,
            createdBy: userId,
            updatedBy: userId,
          },
        });

        // Update PO item received quantity
        if (item.poItemId) {
          const poItem = po.items.find((pi) => pi.id === item.poItemId);
          if (poItem) {
            await tx.purchaseOrderItem.update({
              where: { id: item.poItemId },
              data: {
                receivedQuantity: poItem.receivedQuantity + item.receivedQuantity,
                updatedBy: userId,
              },
            });
          }
        }
      }

      // Check if PO is fully received
      const updatedItems = await tx.purchaseOrderItem.findMany({
        where: { purchaseOrderId: po.id, tenantId },
      });

      const allReceived = updatedItems.every((i) => i.receivedQuantity >= i.quantity);
      const anyReceived = updatedItems.some((i) => i.receivedQuantity > 0);

      let newPoStatus = po.status;
      if (allReceived) {
        newPoStatus = 'RECEIVED';
      } else if (anyReceived) {
        newPoStatus = 'PARTIALLY_RECEIVED';
      }

      if (newPoStatus !== po.status) {
        await tx.purchaseOrder.update({
          where: { id: po.id },
          data: { status: newPoStatus, updatedBy: userId },
        });
      }
    });

    // If fully received, publish event
    const updatedPo = await this.prisma.purchaseOrder.findUnique({ where: { id: po.id } });
    if (updatedPo?.status === 'RECEIVED') {
      await this.eventBus.publish({
        id: uuidv4(),
        tenantId,
        userId,
        timestamp: new Date().toISOString(),
        type: 'wholesale.purchase.completed',
        payload: {
          purchaseOrderId: po.id,
          supplierId: po.supplierId,
          totalPaise: Number(po.totalPaise),
        },
      });
    }

    return this.getGoodsReceipt(tenantId, receiptId);
  }

  async getGoodsReceipt(tenantId: string, receiptId: string): Promise<GoodsReceiptResponse> {
    const receipt = await this.prisma.goodsReceipt.findFirst({
      where: this.tenantWhere(tenantId, { id: receiptId }) as { tenantId: string; id: string },
      include: { items: true },
    });
    if (!receipt) throw new NotFoundException('Goods receipt not found');
    return this.mapReceiptToResponse(receipt);
  }

  async listGoodsReceipts(
    tenantId: string,
    poId?: string,
    pagination?: Pagination,
  ): Promise<PaginatedResult<GoodsReceiptResponse>> {
    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 20;
    const where: Record<string, unknown> = { tenantId };
    if (poId) where.purchaseOrderId = poId;

    const [items, total] = await Promise.all([
      this.prisma.goodsReceipt.findMany({
        where,
        include: { items: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.goodsReceipt.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);
    return {
      items: items.map((r) => this.mapReceiptToResponse(r)),
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    };
  }

  async inspectGoodsReceipt(tenantId: string, userId: string, receiptId: string): Promise<GoodsReceiptResponse> {
    const receipt = await this.prisma.goodsReceipt.findFirst({
      where: this.tenantWhere(tenantId, { id: receiptId }) as { tenantId: string; id: string },
    });
    if (!receipt) throw new NotFoundException('Goods receipt not found');
    if (receipt.status !== 'DRAFT') {
      throw new BadRequestException('Only draft receipts can be inspected');
    }

    await this.prisma.goodsReceipt.update({
      where: { id: receiptId },
      data: { status: 'INSPECTED', updatedBy: userId },
    });

    return this.getGoodsReceipt(tenantId, receiptId);
  }

  async acceptGoodsReceipt(tenantId: string, userId: string, receiptId: string): Promise<GoodsReceiptResponse> {
    const receipt = await this.prisma.goodsReceipt.findFirst({
      where: this.tenantWhere(tenantId, { id: receiptId }) as { tenantId: string; id: string },
      include: { items: true },
    });
    if (!receipt) throw new NotFoundException('Goods receipt not found');
    if (receipt.status !== 'INSPECTED' && receipt.status !== 'DRAFT') {
      throw new BadRequestException('Only draft or inspected receipts can be accepted');
    }

    await this.prisma.$transaction(async (tx) => {
      for (const item of receipt.items) {
        await tx.goodsReceiptItem.update({
          where: { id: item.id },
          data: {
            acceptedQuantity: item.receivedQuantity,
            rejectedQuantity: 0,
            updatedBy: userId,
          },
        });
      }

      await tx.goodsReceipt.update({
        where: { id: receiptId },
        data: { status: 'ACCEPTED', updatedBy: userId },
      });
    });

    return this.getGoodsReceipt(tenantId, receiptId);
  }

  async rejectGoodsReceipt(
    tenantId: string,
    userId: string,
    receiptId: string,
    reason: string,
  ): Promise<GoodsReceiptResponse> {
    const receipt = await this.prisma.goodsReceipt.findFirst({
      where: this.tenantWhere(tenantId, { id: receiptId }) as { tenantId: string; id: string },
      include: { items: true },
    });
    if (!receipt) throw new NotFoundException('Goods receipt not found');
    if (receipt.status !== 'INSPECTED' && receipt.status !== 'DRAFT') {
      throw new BadRequestException('Only draft or inspected receipts can be rejected');
    }

    await this.prisma.$transaction(async (tx) => {
      for (const item of receipt.items) {
        await tx.goodsReceiptItem.update({
          where: { id: item.id },
          data: {
            acceptedQuantity: 0,
            rejectedQuantity: item.receivedQuantity,
            updatedBy: userId,
          },
        });

        // Revert received quantity on PO item
        if (item.poItemId) {
          await tx.purchaseOrderItem.update({
            where: { id: item.poItemId },
            data: {
              receivedQuantity: { decrement: item.receivedQuantity },
              updatedBy: userId,
            },
          });
        }
      }

      await tx.goodsReceipt.update({
        where: { id: receiptId },
        data: {
          status: 'REJECTED',
          notes: receipt.notes ? `${receipt.notes}\nREJECTED: ${reason}` : `REJECTED: ${reason}`,
          updatedBy: userId,
        },
      });
    });

    return this.getGoodsReceipt(tenantId, receiptId);
  }

  // ─── Dashboard ─────────────────────────────────────────────────

  async getDashboard(tenantId: string): Promise<WholesaleDashboardResponse> {
    const [
      pendingPOs,
      activeConsOut,
      activeConsIn,
      receivables,
      payables,
      pendingCommissions,
      recentPOs,
      recentConsOut,
    ] = await Promise.all([
      this.prisma.purchaseOrder.count({
        where: { tenantId, status: { in: ['DRAFT', 'SENT', 'PARTIALLY_RECEIVED'] } },
      }),
      this.prisma.consignmentOut.count({
        where: { tenantId, status: { in: ['DRAFT', 'ISSUED', 'PARTIALLY_RETURNED'] } },
      }),
      this.prisma.consignmentIn.count({
        where: { tenantId, status: { in: ['RECEIVED', 'PARTIALLY_RETURNED'] } },
      }),
      this.prisma.outstandingBalance.aggregate({
        where: { tenantId, entityType: 'CUSTOMER', status: { not: 'PAID' } },
        _sum: { balancePaise: true },
      }),
      this.prisma.outstandingBalance.aggregate({
        where: { tenantId, entityType: 'SUPPLIER', status: { not: 'PAID' } },
        _sum: { balancePaise: true },
      }),
      this.prisma.agentCommission.aggregate({
        where: { tenantId, status: 'PENDING' },
        _sum: { amountPaise: true },
      }),
      this.prisma.purchaseOrder.findMany({
        where: { tenantId },
        include: {
          items: true,
          supplier: { select: { name: true } },
          location: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      this.prisma.consignmentOut.findMany({
        where: { tenantId },
        include: {
          items: true,
          customer: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    return {
      pendingPOs,
      activeConsignmentsOut: activeConsOut,
      activeConsignmentsIn: activeConsIn,
      totalOutstandingReceivablePaise: Number(receivables._sum.balancePaise ?? 0n),
      totalOutstandingPayablePaise: Number(payables._sum.balancePaise ?? 0n),
      commissionsPendingPaise: Number(pendingCommissions._sum.amountPaise ?? 0n),
      recentPOs: recentPOs.map((po) => this.mapPoToResponse(po)),
      recentConsignmentsOut: recentConsOut.map((c) => this.mapConsignmentOutToResponse(c)),
    };
  }

  // ─── Mappers ───────────────────────────────────────────────────

  private mapPoToResponse(po: Record<string, unknown>): PurchaseOrderResponse {
    const p = po as Record<string, unknown>;
    const items = (p.items as Array<Record<string, unknown>>) ?? [];
    const supplier = p.supplier as Record<string, unknown> | undefined;
    const location = p.location as Record<string, unknown> | undefined;

    return {
      id: p.id as string,
      tenantId: p.tenantId as string,
      poNumber: p.poNumber as string,
      supplierId: p.supplierId as string,
      supplierName: supplier?.name as string | undefined,
      locationId: p.locationId as string,
      locationName: location?.name as string | undefined,
      status: p.status as WholesalePOStatus,
      subtotalPaise: Number(p.subtotalPaise),
      taxPaise: Number(p.taxPaise),
      totalPaise: Number(p.totalPaise),
      currencyCode: p.currencyCode as string,
      expectedDate: p.expectedDate ? new Date(p.expectedDate as string).toISOString() : null,
      notes: (p.notes as string) ?? null,
      approvedBy: (p.approvedBy as string) ?? null,
      approvedAt: p.approvedAt ? new Date(p.approvedAt as string).toISOString() : null,
      items: items.map((item) => ({
        id: item.id as string,
        productId: (item.productId as string) ?? null,
        description: item.description as string,
        quantity: item.quantity as number,
        unitPricePaise: Number(item.unitPricePaise),
        weightMg: item.weightMg != null ? Number(item.weightMg) : null,
        purityFineness: (item.purityFineness as number) ?? null,
        totalPaise: Number(item.totalPaise),
        receivedQuantity: item.receivedQuantity as number,
      })),
      createdAt: new Date(p.createdAt as string).toISOString(),
      updatedAt: new Date(p.updatedAt as string).toISOString(),
    };
  }

  private mapReceiptToResponse(receipt: Record<string, unknown>): GoodsReceiptResponse {
    const r = receipt as Record<string, unknown>;
    const items = (r.items as Array<Record<string, unknown>>) ?? [];

    return {
      id: r.id as string,
      tenantId: r.tenantId as string,
      receiptNumber: r.receiptNumber as string,
      purchaseOrderId: r.purchaseOrderId as string,
      supplierId: r.supplierId as string,
      locationId: r.locationId as string,
      status: r.status as WholesaleGRStatus,
      receivedDate: new Date(r.receivedDate as string).toISOString(),
      notes: (r.notes as string) ?? null,
      items: items.map((item) => ({
        id: item.id as string,
        poItemId: (item.poItemId as string) ?? null,
        productId: item.productId as string,
        receivedQuantity: item.receivedQuantity as number,
        acceptedQuantity: item.acceptedQuantity as number,
        rejectedQuantity: item.rejectedQuantity as number,
        weightMg: Number(item.weightMg),
        notes: (item.notes as string) ?? null,
      })),
      createdAt: new Date(r.createdAt as string).toISOString(),
      updatedAt: new Date(r.updatedAt as string).toISOString(),
    };
  }

  mapConsignmentOutToResponse(c: Record<string, unknown>): ConsignmentOutResponse {
    const co = c as Record<string, unknown>;
    const items = (co.items as Array<Record<string, unknown>>) ?? [];
    const customer = co.customer as Record<string, unknown> | undefined;

    return {
      id: co.id as string,
      tenantId: co.tenantId as string,
      consignmentNumber: co.consignmentNumber as string,
      customerId: co.customerId as string,
      customerName: customer
        ? `${customer.firstName as string} ${customer.lastName as string}`
        : undefined,
      locationId: co.locationId as string,
      status: co.status as WholesaleConsignmentOutStatus,
      issuedDate: co.issuedDate ? new Date(co.issuedDate as string).toISOString() : null,
      dueDate: co.dueDate ? new Date(co.dueDate as string).toISOString() : null,
      totalWeightMg: Number(co.totalWeightMg),
      totalValuePaise: Number(co.totalValuePaise),
      notes: (co.notes as string) ?? null,
      items: items.map((item) => ({
        id: item.id as string,
        productId: item.productId as string,
        quantity: item.quantity as number,
        weightMg: Number(item.weightMg),
        valuePaise: Number(item.valuePaise),
        returnedQuantity: (item.returnedQuantity as number) ?? 0,
        soldQuantity: (item.soldQuantity as number) ?? 0,
        status: item.status as WholesaleConsignmentOutItemStatus,
      })),
      createdAt: new Date(co.createdAt as string).toISOString(),
      updatedAt: new Date(co.updatedAt as string).toISOString(),
    };
  }
}
