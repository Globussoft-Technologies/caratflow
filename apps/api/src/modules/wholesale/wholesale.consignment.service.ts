// ─── Wholesale Consignment Service ─────────────────────────────
// Outgoing (to customer): create, issue, record returns, convert to sale, expire.
// Incoming (from supplier): create, record returns, purchase, expire.
// Track aging/expiry. Every gram issued must be accounted for.

import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import type {
  ConsignmentOutInput,
  ConsignmentOutResponse,
  ConsignmentInInput,
  ConsignmentInResponse,
} from '@caratflow/shared-types';
import {
  WholesaleConsignmentOutStatus,
  WholesaleConsignmentOutItemStatus,
  WholesaleConsignmentInStatus,
  WholesaleConsignmentInItemStatus,
} from '@caratflow/shared-types';
import type { PaginatedResult, Pagination } from '@caratflow/shared-types';
import { PrismaService } from '../../common/prisma.service';
import { TenantAwareService } from '../../common/base.service';
import { EventBusService } from '../../event-bus/event-bus.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class WholesaleConsignmentService extends TenantAwareService {
  constructor(
    prisma: PrismaService,
    private readonly eventBus: EventBusService,
  ) {
    super(prisma);
  }

  // ─── Number Generation ─────────────────────────────────────────

  private async generateConsignmentOutNumber(tenantId: string): Promise<string> {
    const now = new Date();
    const yymm = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}`;

    const count = await this.prisma.consignmentOut.count({
      where: { tenantId, consignmentNumber: { contains: `/${yymm}/` } },
    });

    return `CO/${yymm}/${String(count + 1).padStart(4, '0')}`;
  }

  private async generateConsignmentInNumber(tenantId: string): Promise<string> {
    const now = new Date();
    const yymm = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}`;

    const count = await this.prisma.consignmentIn.count({
      where: { tenantId, consignmentNumber: { contains: `/${yymm}/` } },
    });

    return `CI/${yymm}/${String(count + 1).padStart(4, '0')}`;
  }

  // ─── Consignment Out (Outgoing to Customer) ───────────────────

  async createConsignmentOut(
    tenantId: string,
    userId: string,
    input: ConsignmentOutInput,
  ): Promise<ConsignmentOutResponse> {
    const customer = await this.prisma.customer.findFirst({
      where: this.tenantWhere(tenantId, { id: input.customerId }) as { tenantId: string; id: string },
    });
    if (!customer) throw new NotFoundException('Customer not found');

    let totalWeightMg = 0n;
    let totalValuePaise = 0n;
    for (const item of input.items) {
      totalWeightMg += BigInt(item.weightMg);
      totalValuePaise += BigInt(item.valuePaise);
    }

    const consignmentNumber = await this.generateConsignmentOutNumber(tenantId);
    const consignmentId = uuidv4();

    await this.prisma.$transaction(async (tx) => {
      await tx.consignmentOut.create({
        data: {
          id: consignmentId,
          tenantId,
          consignmentNumber,
          customerId: input.customerId,
          locationId: input.locationId,
          status: 'DRAFT',
          dueDate: input.dueDate ?? null,
          totalWeightMg,
          totalValuePaise,
          notes: input.notes ?? null,
          createdBy: userId,
          updatedBy: userId,
        },
      });

      for (const item of input.items) {
        await tx.consignmentOutItem.create({
          data: {
            id: uuidv4(),
            tenantId,
            consignmentOutId: consignmentId,
            productId: item.productId,
            quantity: item.quantity,
            weightMg: BigInt(item.weightMg),
            valuePaise: BigInt(item.valuePaise),
            returnedQuantity: 0,
            soldQuantity: 0,
            status: 'ISSUED',
            createdBy: userId,
            updatedBy: userId,
          },
        });
      }
    });

    return this.getConsignmentOut(tenantId, consignmentId);
  }

  async getConsignmentOut(tenantId: string, id: string): Promise<ConsignmentOutResponse> {
    const consignment = await this.prisma.consignmentOut.findFirst({
      where: this.tenantWhere(tenantId, { id }) as { tenantId: string; id: string },
      include: {
        items: true,
        customer: { select: { firstName: true, lastName: true } },
      },
    });
    if (!consignment) throw new NotFoundException('Consignment not found');
    return this.mapConsignmentOutToResponse(consignment);
  }

  async listConsignmentsOut(
    tenantId: string,
    filters: { status?: string; customerId?: string },
    pagination: Pagination,
  ): Promise<PaginatedResult<ConsignmentOutResponse>> {
    const where: Record<string, unknown> = { tenantId };
    if (filters.status) where.status = filters.status;
    if (filters.customerId) where.customerId = filters.customerId;

    const [items, total] = await Promise.all([
      this.prisma.consignmentOut.findMany({
        where,
        include: {
          items: true,
          customer: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: pagination.sortOrder ?? 'desc' },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      }),
      this.prisma.consignmentOut.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pagination.limit);
    return {
      items: items.map((c) => this.mapConsignmentOutToResponse(c)),
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages,
      hasNext: pagination.page < totalPages,
      hasPrevious: pagination.page > 1,
    };
  }

  async issueConsignmentOut(tenantId: string, userId: string, id: string): Promise<ConsignmentOutResponse> {
    const co = await this.prisma.consignmentOut.findFirst({ where: { id, tenantId } });
    if (!co) throw new NotFoundException('Consignment not found');
    if (co.status !== 'DRAFT') {
      throw new BadRequestException('Only draft consignments can be issued');
    }

    await this.prisma.consignmentOut.update({
      where: { id },
      data: { status: 'ISSUED', issuedDate: new Date(), updatedBy: userId },
    });

    await this.eventBus.publish({
      id: uuidv4(),
      tenantId,
      userId,
      timestamp: new Date().toISOString(),
      type: 'wholesale.consignment.created',
      payload: {
        consignmentId: id,
        supplierId: co.customerId,
        items: [],
      },
    });

    return this.getConsignmentOut(tenantId, id);
  }

  async returnConsignmentOutItems(
    tenantId: string,
    userId: string,
    consignmentId: string,
    itemReturns: Array<{ itemId: string; returnedQuantity: number }>,
  ): Promise<ConsignmentOutResponse> {
    const consignment = await this.prisma.consignmentOut.findFirst({
      where: this.tenantWhere(tenantId, { id: consignmentId }) as { tenantId: string; id: string },
      include: { items: true },
    });
    if (!consignment) throw new NotFoundException('Consignment not found');
    if (consignment.status === 'RETURNED' || consignment.status === 'CONVERTED_TO_SALE' || consignment.status === 'EXPIRED') {
      throw new BadRequestException(`Cannot return items from a ${consignment.status} consignment`);
    }

    await this.prisma.$transaction(async (tx) => {
      for (const ret of itemReturns) {
        const item = consignment.items.find((i) => i.id === ret.itemId);
        if (!item) throw new BadRequestException(`Item ${ret.itemId} not found`);

        const newReturnedQty = item.returnedQuantity + ret.returnedQuantity;
        const totalAccounted = newReturnedQty + item.soldQuantity;
        if (totalAccounted > item.quantity) {
          throw new BadRequestException(
            `Cannot return more than outstanding quantity for item ${ret.itemId}`,
          );
        }

        const newStatus: 'RETURNED' | 'ISSUED' =
          totalAccounted === item.quantity ? 'RETURNED' : 'ISSUED';

        await tx.consignmentOutItem.update({
          where: { id: ret.itemId },
          data: {
            returnedQuantity: newReturnedQty,
            status: newStatus,
            updatedBy: userId,
          },
        });
      }

      await this.recalculateConsignmentOutStatus(tx, tenantId, consignmentId, userId);
    });

    return this.getConsignmentOut(tenantId, consignmentId);
  }

  async convertConsignmentOutToSale(
    tenantId: string,
    userId: string,
    consignmentId: string,
    itemSales: Array<{ itemId: string; soldQuantity: number }>,
  ): Promise<ConsignmentOutResponse> {
    const consignment = await this.prisma.consignmentOut.findFirst({
      where: this.tenantWhere(tenantId, { id: consignmentId }) as { tenantId: string; id: string },
      include: { items: true },
    });
    if (!consignment) throw new NotFoundException('Consignment not found');

    await this.prisma.$transaction(async (tx) => {
      for (const sale of itemSales) {
        const item = consignment.items.find((i) => i.id === sale.itemId);
        if (!item) throw new BadRequestException(`Item ${sale.itemId} not found`);
        if (item.status !== 'ISSUED') {
          throw new BadRequestException(`Item ${sale.itemId} is not in ISSUED status`);
        }

        const newSoldQty = item.soldQuantity + sale.soldQuantity;
        const totalAccounted = item.returnedQuantity + newSoldQty;
        if (totalAccounted > item.quantity) {
          throw new BadRequestException(`Cannot sell more than outstanding quantity for item ${sale.itemId}`);
        }

        const newStatus: 'SOLD' | 'ISSUED' =
          totalAccounted === item.quantity ? 'SOLD' : 'ISSUED';

        await tx.consignmentOutItem.update({
          where: { id: sale.itemId },
          data: { soldQuantity: newSoldQty, status: newStatus, updatedBy: userId },
        });
      }

      await this.recalculateConsignmentOutStatus(tx, tenantId, consignmentId, userId);
    });

    return this.getConsignmentOut(tenantId, consignmentId);
  }

  async expireConsignmentOut(tenantId: string, userId: string, id: string): Promise<ConsignmentOutResponse> {
    const co = await this.prisma.consignmentOut.findFirst({ where: { id, tenantId } });
    if (!co) throw new NotFoundException('Consignment not found');

    await this.prisma.consignmentOut.update({
      where: { id },
      data: { status: 'EXPIRED', updatedBy: userId },
    });

    return this.getConsignmentOut(tenantId, id);
  }

  private async recalculateConsignmentOutStatus(
    tx: Parameters<Parameters<typeof this.prisma.$transaction>[0]>[0],
    tenantId: string,
    consignmentId: string,
    userId: string,
  ): Promise<void> {
    const updatedItems = await (tx as unknown as PrismaService).consignmentOutItem.findMany({
      where: { consignmentOutId: consignmentId, tenantId },
    });

    const allFullyAccountedFor = updatedItems.every(
      (i) => i.returnedQuantity + i.soldQuantity >= i.quantity,
    );
    const anyReturned = updatedItems.some((i) => i.returnedQuantity > 0);
    const allSold = updatedItems.every((i) => i.soldQuantity >= i.quantity);

    let newStatus: string;
    if (allSold) {
      newStatus = 'CONVERTED_TO_SALE';
    } else if (allFullyAccountedFor) {
      newStatus = 'RETURNED';
    } else if (anyReturned) {
      newStatus = 'PARTIALLY_RETURNED';
    } else {
      newStatus = 'ISSUED';
    }

    await (tx as unknown as PrismaService).consignmentOut.update({
      where: { id: consignmentId },
      data: { status: newStatus as 'ISSUED' | 'PARTIALLY_RETURNED' | 'RETURNED' | 'CONVERTED_TO_SALE', updatedBy: userId },
    });
  }

  // ─── Consignment In (Incoming from Supplier) ──────────────────

  async createConsignmentIn(
    tenantId: string,
    userId: string,
    input: ConsignmentInInput,
  ): Promise<ConsignmentInResponse> {
    const supplier = await this.prisma.supplier.findFirst({
      where: this.tenantWhere(tenantId, { id: input.supplierId }) as { tenantId: string; id: string },
    });
    if (!supplier) throw new NotFoundException('Supplier not found');

    let totalWeightMg = 0n;
    let totalValuePaise = 0n;
    for (const item of input.items) {
      totalWeightMg += BigInt(item.weightMg);
      totalValuePaise += BigInt(item.valuePaise);
    }

    const consignmentNumber = await this.generateConsignmentInNumber(tenantId);
    const consignmentId = uuidv4();

    await this.prisma.$transaction(async (tx) => {
      await tx.consignmentIn.create({
        data: {
          id: consignmentId,
          tenantId,
          consignmentNumber,
          supplierId: input.supplierId,
          locationId: input.locationId,
          status: 'RECEIVED',
          receivedDate: new Date(),
          dueDate: input.dueDate ?? null,
          totalWeightMg,
          totalValuePaise,
          notes: input.notes ?? null,
          createdBy: userId,
          updatedBy: userId,
        },
      });

      for (const item of input.items) {
        await tx.consignmentInItem.create({
          data: {
            id: uuidv4(),
            tenantId,
            consignmentInId: consignmentId,
            productId: item.productId,
            quantity: item.quantity,
            weightMg: BigInt(item.weightMg),
            valuePaise: BigInt(item.valuePaise),
            returnedQuantity: 0,
            purchasedQuantity: 0,
            status: 'RECEIVED',
            createdBy: userId,
            updatedBy: userId,
          },
        });
      }
    });

    return this.getConsignmentIn(tenantId, consignmentId);
  }

  async getConsignmentIn(tenantId: string, id: string): Promise<ConsignmentInResponse> {
    const consignment = await this.prisma.consignmentIn.findFirst({
      where: this.tenantWhere(tenantId, { id }) as { tenantId: string; id: string },
      include: {
        items: true,
        supplier: { select: { name: true } },
      },
    });
    if (!consignment) throw new NotFoundException('Consignment not found');
    return this.mapConsignmentInToResponse(consignment);
  }

  async listConsignmentsIn(
    tenantId: string,
    filters: { status?: string; supplierId?: string },
    pagination: Pagination,
  ): Promise<PaginatedResult<ConsignmentInResponse>> {
    const where: Record<string, unknown> = { tenantId };
    if (filters.status) where.status = filters.status;
    if (filters.supplierId) where.supplierId = filters.supplierId;

    const [items, total] = await Promise.all([
      this.prisma.consignmentIn.findMany({
        where,
        include: {
          items: true,
          supplier: { select: { name: true } },
        },
        orderBy: { createdAt: pagination.sortOrder ?? 'desc' },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      }),
      this.prisma.consignmentIn.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pagination.limit);
    return {
      items: items.map((c) => this.mapConsignmentInToResponse(c)),
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages,
      hasNext: pagination.page < totalPages,
      hasPrevious: pagination.page > 1,
    };
  }

  async returnConsignmentInItems(
    tenantId: string,
    userId: string,
    consignmentId: string,
    itemReturns: Array<{ itemId: string; returnedQuantity: number }>,
  ): Promise<ConsignmentInResponse> {
    const consignment = await this.prisma.consignmentIn.findFirst({
      where: this.tenantWhere(tenantId, { id: consignmentId }) as { tenantId: string; id: string },
      include: { items: true },
    });
    if (!consignment) throw new NotFoundException('Consignment not found');

    await this.prisma.$transaction(async (tx) => {
      for (const ret of itemReturns) {
        const item = consignment.items.find((i) => i.id === ret.itemId);
        if (!item) throw new BadRequestException(`Item ${ret.itemId} not found`);

        const newReturnedQty = item.returnedQuantity + ret.returnedQuantity;
        const totalAccounted = newReturnedQty + item.purchasedQuantity;
        if (totalAccounted > item.quantity) {
          throw new BadRequestException(`Cannot return more than outstanding quantity`);
        }

        const newStatus: 'RETURNED' | 'RECEIVED' =
          totalAccounted === item.quantity ? 'RETURNED' : 'RECEIVED';

        await tx.consignmentInItem.update({
          where: { id: ret.itemId },
          data: { returnedQuantity: newReturnedQty, status: newStatus, updatedBy: userId },
        });
      }

      // Recalculate consignment status
      const updatedItems = await tx.consignmentInItem.findMany({
        where: { consignmentInId: consignmentId, tenantId },
      });

      const allFullyAccountedFor = updatedItems.every(
        (i) => i.returnedQuantity + i.purchasedQuantity >= i.quantity,
      );
      const anyReturned = updatedItems.some((i) => i.returnedQuantity > 0);
      const allReturned = updatedItems.every((i) => i.returnedQuantity >= i.quantity);

      let newStatus: string;
      if (allReturned) {
        newStatus = 'RETURNED';
      } else if (allFullyAccountedFor) {
        newStatus = 'RETURNED';
      } else if (anyReturned) {
        newStatus = 'PARTIALLY_RETURNED';
      } else {
        newStatus = 'RECEIVED';
      }

      await tx.consignmentIn.update({
        where: { id: consignmentId },
        data: { status: newStatus as 'RECEIVED' | 'PARTIALLY_RETURNED' | 'RETURNED', updatedBy: userId },
      });
    });

    await this.eventBus.publish({
      id: uuidv4(),
      tenantId,
      userId,
      timestamp: new Date().toISOString(),
      type: 'wholesale.consignment.returned',
      payload: {
        consignmentId,
        returnedItems: itemReturns.map((r) => {
          const item = consignment.items.find((i) => i.id === r.itemId);
          return { productId: item?.productId ?? '', weightMg: Number(item?.weightMg ?? 0) };
        }),
      },
    });

    return this.getConsignmentIn(tenantId, consignmentId);
  }

  async purchaseConsignmentInItems(
    tenantId: string,
    userId: string,
    consignmentId: string,
    itemPurchases: Array<{ itemId: string; purchasedQuantity: number }>,
  ): Promise<ConsignmentInResponse> {
    const consignment = await this.prisma.consignmentIn.findFirst({
      where: this.tenantWhere(tenantId, { id: consignmentId }) as { tenantId: string; id: string },
      include: { items: true },
    });
    if (!consignment) throw new NotFoundException('Consignment not found');

    await this.prisma.$transaction(async (tx) => {
      for (const purchase of itemPurchases) {
        const item = consignment.items.find((i) => i.id === purchase.itemId);
        if (!item) throw new BadRequestException(`Item ${purchase.itemId} not found`);

        const newPurchasedQty = item.purchasedQuantity + purchase.purchasedQuantity;
        const totalAccounted = item.returnedQuantity + newPurchasedQty;
        if (totalAccounted > item.quantity) {
          throw new BadRequestException(`Cannot purchase more than outstanding quantity`);
        }

        const newStatus: 'PURCHASED' | 'RECEIVED' =
          totalAccounted === item.quantity ? 'PURCHASED' : 'RECEIVED';

        await tx.consignmentInItem.update({
          where: { id: purchase.itemId },
          data: { purchasedQuantity: newPurchasedQty, status: newStatus, updatedBy: userId },
        });
      }

      // Recalculate consignment status
      const updatedItems = await tx.consignmentInItem.findMany({
        where: { consignmentInId: consignmentId, tenantId },
      });

      const allFullyAccountedFor = updatedItems.every(
        (i) => i.returnedQuantity + i.purchasedQuantity >= i.quantity,
      );
      const allPurchased = updatedItems.every((i) => i.purchasedQuantity >= i.quantity);

      if (allPurchased) {
        await tx.consignmentIn.update({
          where: { id: consignmentId },
          data: { status: 'PURCHASED', updatedBy: userId },
        });
      } else if (allFullyAccountedFor) {
        await tx.consignmentIn.update({
          where: { id: consignmentId },
          data: { status: 'RETURNED', updatedBy: userId },
        });
      }
    });

    return this.getConsignmentIn(tenantId, consignmentId);
  }

  async expireConsignmentIn(tenantId: string, userId: string, id: string): Promise<ConsignmentInResponse> {
    await this.prisma.consignmentIn.update({
      where: { id },
      data: { status: 'EXPIRED', updatedBy: userId },
    });
    return this.getConsignmentIn(tenantId, id);
  }

  // ─── Aging / Expiry ────────────────────────────────────────────

  async getExpiredConsignments(tenantId: string) {
    const now = new Date();

    const [expiredOut, expiredIn] = await Promise.all([
      this.prisma.consignmentOut.findMany({
        where: {
          tenantId,
          status: { in: ['ISSUED', 'PARTIALLY_RETURNED'] },
          dueDate: { lt: now },
        },
        include: { items: true, customer: { select: { firstName: true, lastName: true } } },
        orderBy: { dueDate: 'asc' },
      }),
      this.prisma.consignmentIn.findMany({
        where: {
          tenantId,
          status: { in: ['RECEIVED', 'PARTIALLY_RETURNED'] },
          dueDate: { lt: now },
        },
        include: { items: true, supplier: { select: { name: true } } },
        orderBy: { dueDate: 'asc' },
      }),
    ]);

    return {
      expiredOut: expiredOut.map((c) => this.mapConsignmentOutToResponse(c)),
      expiredIn: expiredIn.map((c) => this.mapConsignmentInToResponse(c)),
    };
  }

  // ─── Mappers ───────────────────────────────────────────────────

  private mapConsignmentOutToResponse(c: Record<string, unknown>): ConsignmentOutResponse {
    const co = c as Record<string, unknown>;
    const items = (co.items as Array<Record<string, unknown>>) ?? [];
    const customer = co.customer as Record<string, unknown> | undefined;

    return {
      id: co.id as string,
      tenantId: co.tenantId as string,
      consignmentNumber: co.consignmentNumber as string,
      customerId: co.customerId as string,
      customerName: customer ? `${customer.firstName} ${customer.lastName}` : undefined,
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

  private mapConsignmentInToResponse(c: Record<string, unknown>): ConsignmentInResponse {
    const ci = c as Record<string, unknown>;
    const items = (ci.items as Array<Record<string, unknown>>) ?? [];
    const supplier = ci.supplier as Record<string, unknown> | undefined;

    return {
      id: ci.id as string,
      tenantId: ci.tenantId as string,
      consignmentNumber: ci.consignmentNumber as string,
      supplierId: ci.supplierId as string,
      supplierName: supplier?.name as string | undefined,
      locationId: ci.locationId as string,
      status: ci.status as WholesaleConsignmentInStatus,
      receivedDate: ci.receivedDate ? new Date(ci.receivedDate as string).toISOString() : null,
      dueDate: ci.dueDate ? new Date(ci.dueDate as string).toISOString() : null,
      totalWeightMg: Number(ci.totalWeightMg),
      totalValuePaise: Number(ci.totalValuePaise),
      notes: (ci.notes as string) ?? null,
      items: items.map((item) => ({
        id: item.id as string,
        productId: item.productId as string,
        quantity: item.quantity as number,
        weightMg: Number(item.weightMg),
        valuePaise: Number(item.valuePaise),
        returnedQuantity: (item.returnedQuantity as number) ?? 0,
        purchasedQuantity: (item.purchasedQuantity as number) ?? 0,
        status: item.status as WholesaleConsignmentInItemStatus,
      })),
      createdAt: new Date(ci.createdAt as string).toISOString(),
      updatedAt: new Date(ci.updatedAt as string).toISOString(),
    };
  }
}
