// ─── Wholesale Supplier Service ────────────────────────────────
// Supplier CRUD + aggregated performance metrics (on-time delivery,
// quality rejection, avg lead time, total purchase value).

import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  SupplierInput,
  SupplierListFilter,
  SupplierResponse,
  SupplierPerformance,
  PaginatedResult,
  Pagination,
} from '@caratflow/shared-types';
import { PrismaService } from '../../common/prisma.service';
import { TenantAwareService } from '../../common/base.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class WholesaleSupplierService extends TenantAwareService {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  // ─── CRUD ──────────────────────────────────────────────────────

  async createSupplier(
    tenantId: string,
    userId: string,
    input: SupplierInput,
  ): Promise<SupplierResponse> {
    const supplier = await this.prisma.supplier.create({
      data: {
        id: uuidv4(),
        tenantId,
        name: input.name,
        contactPerson: input.contactPerson ?? null,
        email: input.email ?? null,
        phone: input.phone ?? null,
        address: input.address ?? null,
        city: input.city ?? null,
        state: input.state ?? null,
        country: input.country ?? null,
        postalCode: input.postalCode ?? null,
        gstinNumber: input.gstinNumber ?? null,
        panNumber: input.panNumber ?? null,
        supplierType: input.supplierType ?? null,
        rating: input.rating ?? 0,
        isActive: input.isActive ?? true,
        createdBy: userId,
        updatedBy: userId,
      },
    });
    return this.mapToResponse(supplier);
  }

  async getSupplier(tenantId: string, id: string): Promise<SupplierResponse> {
    const supplier = await this.prisma.supplier.findFirst({
      where: this.tenantWhere(tenantId, { id }) as { tenantId: string; id: string },
    });
    if (!supplier) throw new NotFoundException('Supplier not found');
    return this.mapToResponse(supplier);
  }

  async listSuppliers(
    tenantId: string,
    filters: SupplierListFilter,
    pagination: Pagination,
  ): Promise<PaginatedResult<SupplierResponse>> {
    const where: Record<string, unknown> = { tenantId };
    if (filters.isActive !== undefined) where.isActive = filters.isActive;
    if (filters.supplierType) where.supplierType = filters.supplierType;
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search } },
        { gstinNumber: { contains: filters.search } },
        { panNumber: { contains: filters.search } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.supplier.findMany({
        where,
        orderBy: { name: pagination.sortOrder ?? 'asc' },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      }),
      this.prisma.supplier.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pagination.limit);
    return {
      items: items.map((s) => this.mapToResponse(s)),
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages,
      hasNext: pagination.page < totalPages,
      hasPrevious: pagination.page > 1,
    };
  }

  async updateSupplier(
    tenantId: string,
    userId: string,
    id: string,
    data: Partial<SupplierInput>,
  ): Promise<SupplierResponse> {
    const existing = await this.prisma.supplier.findFirst({
      where: this.tenantWhere(tenantId, { id }) as { tenantId: string; id: string },
    });
    if (!existing) throw new NotFoundException('Supplier not found');

    await this.prisma.supplier.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.contactPerson !== undefined && { contactPerson: data.contactPerson }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.address !== undefined && { address: data.address }),
        ...(data.city !== undefined && { city: data.city }),
        ...(data.state !== undefined && { state: data.state }),
        ...(data.country !== undefined && { country: data.country }),
        ...(data.postalCode !== undefined && { postalCode: data.postalCode }),
        ...(data.gstinNumber !== undefined && { gstinNumber: data.gstinNumber }),
        ...(data.panNumber !== undefined && { panNumber: data.panNumber }),
        ...(data.supplierType !== undefined && { supplierType: data.supplierType }),
        ...(data.rating !== undefined && { rating: data.rating }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        updatedBy: userId,
      },
    });

    return this.getSupplier(tenantId, id);
  }

  async deactivateSupplier(
    tenantId: string,
    userId: string,
    id: string,
  ): Promise<SupplierResponse> {
    return this.updateSupplier(tenantId, userId, id, { isActive: false });
  }

  // ─── Performance Metrics ───────────────────────────────────────

  async getSupplierPerformance(
    tenantId: string,
    supplierId: string,
  ): Promise<SupplierPerformance> {
    const supplier = await this.prisma.supplier.findFirst({
      where: this.tenantWhere(tenantId, { id: supplierId }) as { tenantId: string; id: string },
    });
    if (!supplier) throw new NotFoundException('Supplier not found');

    const purchaseOrders = await this.prisma.purchaseOrder.findMany({
      where: { tenantId, supplierId },
      include: {
        items: {
          include: {
            goodsReceiptItems: {
              include: { goodsReceipt: true },
            },
          },
        },
      },
    });

    const totalOrders = purchaseOrders.length;
    const completedOrders = purchaseOrders.filter(
      (po: { status: string }) => po.status === 'RECEIVED',
    ).length;

    let onTimeCount = 0;
    let deliveredWithDateCount = 0;
    for (const po of purchaseOrders) {
      const poAny = po as unknown as {
        status: string;
        expectedDate: Date | null;
        approvedAt: Date | null;
        items: Array<{ goodsReceiptItems: Array<{ goodsReceipt: { createdAt: Date } }> }>;
      };
      if (poAny.status === 'RECEIVED' && poAny.expectedDate) {
        deliveredWithDateCount++;
        const receipts = poAny.items
          .flatMap((i) => i.goodsReceiptItems)
          .map((gri) => gri.goodsReceipt.createdAt)
          .sort((a, b) => b.getTime() - a.getTime());
        const lastReceipt = receipts[0];
        if (lastReceipt && lastReceipt <= poAny.expectedDate) onTimeCount++;
      }
    }

    let totalReceived = 0;
    let totalRejected = 0;
    for (const po of purchaseOrders) {
      const poAny = po as unknown as {
        items: Array<{
          goodsReceiptItems: Array<{ receivedQuantity: number; rejectedQuantity: number }>;
        }>;
      };
      for (const item of poAny.items) {
        for (const gri of item.goodsReceiptItems) {
          totalReceived += gri.receivedQuantity;
          totalRejected += gri.rejectedQuantity;
        }
      }
    }

    const totalPurchaseValuePaise = purchaseOrders.reduce(
      (sum: number, po) => sum + Number((po as unknown as { totalPaise: bigint }).totalPaise),
      0,
    );

    let totalLeadDays = 0;
    let leadTimeCount = 0;
    for (const po of purchaseOrders) {
      const poAny = po as unknown as {
        status: string;
        approvedAt: Date | null;
        items: Array<{ goodsReceiptItems: Array<{ goodsReceipt: { createdAt: Date } }> }>;
      };
      if (poAny.status === 'RECEIVED' && poAny.approvedAt) {
        const receipts = poAny.items
          .flatMap((i) => i.goodsReceiptItems)
          .map((gri) => gri.goodsReceipt.createdAt)
          .sort((a, b) => b.getTime() - a.getTime());
        const lastReceipt = receipts[0];
        if (lastReceipt) {
          const days = Math.ceil(
            (lastReceipt.getTime() - poAny.approvedAt.getTime()) / (1000 * 60 * 60 * 24),
          );
          totalLeadDays += days;
          leadTimeCount++;
        }
      }
    }

    return {
      supplierId,
      supplierName: supplier.name,
      totalOrders,
      completedOrders,
      onTimeDeliveryPercent:
        deliveredWithDateCount > 0
          ? Math.round((onTimeCount / deliveredWithDateCount) * 100)
          : 0,
      qualityRejectionPercent:
        totalReceived > 0 ? Math.round((totalRejected / totalReceived) * 100) : 0,
      priceCompliancePercent: 100,
      averageLeadTimeDays: leadTimeCount > 0 ? Math.round(totalLeadDays / leadTimeCount) : 0,
      totalPurchaseValuePaise,
    };
  }

  async listSuppliersWithPerformance(
    tenantId: string,
    filters: SupplierListFilter,
    pagination: Pagination,
  ): Promise<PaginatedResult<SupplierPerformance>> {
    const where: Record<string, unknown> = { tenantId };
    if (filters.isActive !== undefined) where.isActive = filters.isActive;
    if (filters.supplierType) where.supplierType = filters.supplierType;
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search } },
        { gstinNumber: { contains: filters.search } },
      ];
    }

    const [suppliers, total] = await Promise.all([
      this.prisma.supplier.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      }),
      this.prisma.supplier.count({ where }),
    ]);

    const items = await Promise.all(
      suppliers.map((s: { id: string }) => this.getSupplierPerformance(tenantId, s.id)),
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

  // ─── Mapper ────────────────────────────────────────────────────

  private mapToResponse(supplier: Record<string, unknown>): SupplierResponse {
    const s = supplier;
    return {
      id: s.id as string,
      tenantId: s.tenantId as string,
      name: s.name as string,
      contactPerson: (s.contactPerson as string) ?? null,
      email: (s.email as string) ?? null,
      phone: (s.phone as string) ?? null,
      address: (s.address as string) ?? null,
      city: (s.city as string) ?? null,
      state: (s.state as string) ?? null,
      country: (s.country as string) ?? null,
      postalCode: (s.postalCode as string) ?? null,
      gstinNumber: (s.gstinNumber as string) ?? null,
      panNumber: (s.panNumber as string) ?? null,
      supplierType: (s.supplierType as string) ?? null,
      rating: (s.rating as number) ?? null,
      isActive: s.isActive as boolean,
      createdAt: new Date(s.createdAt as string).toISOString(),
      updatedAt: new Date(s.updatedAt as string).toISOString(),
    };
  }
}
