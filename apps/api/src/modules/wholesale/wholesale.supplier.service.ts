// ─── Wholesale Supplier Service ────────────────────────────────
// Rate contracts CRUD, supplier performance metrics.

import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  RateContractInput,
  RateContractResponse,
  SupplierPerformance,
} from '@caratflow/shared-types';
import type { PaginatedResult, Pagination } from '@caratflow/shared-types';
import { PrismaService } from '../../common/prisma.service';
import { TenantAwareService } from '../../common/base.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class WholesaleSupplierService extends TenantAwareService {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  // ─── Rate Contracts ────────────────────────────────────────────

  async createRateContract(
    tenantId: string,
    userId: string,
    input: RateContractInput,
  ): Promise<RateContractResponse> {
    const supplier = await this.prisma.supplier.findFirst({
      where: this.tenantWhere(tenantId, { id: input.supplierId }) as { tenantId: string; id: string },
    });
    if (!supplier) throw new NotFoundException('Supplier not found');

    const contract = await this.prisma.supplierRateContract.create({
      data: {
        id: uuidv4(),
        tenantId,
        supplierId: input.supplierId,
        metalType: input.metalType,
        purityFineness: input.purityFineness,
        ratePaisePer10g: BigInt(input.ratePaisePer10g),
        validFrom: input.validFrom,
        validTo: input.validTo,
        isActive: input.isActive ?? true,
        notes: input.notes ?? null,
        createdBy: userId,
        updatedBy: userId,
      },
      include: { supplier: { select: { name: true } } },
    });

    return this.mapRateContractToResponse(contract);
  }

  async getRateContract(tenantId: string, id: string): Promise<RateContractResponse> {
    const contract = await this.prisma.supplierRateContract.findFirst({
      where: this.tenantWhere(tenantId, { id }) as { tenantId: string; id: string },
      include: { supplier: { select: { name: true } } },
    });
    if (!contract) throw new NotFoundException('Rate contract not found');
    return this.mapRateContractToResponse(contract);
  }

  async listRateContracts(
    tenantId: string,
    filters: { supplierId?: string; isActive?: boolean; metalType?: string },
    pagination: Pagination,
  ): Promise<PaginatedResult<RateContractResponse>> {
    const where: Record<string, unknown> = { tenantId };
    if (filters.supplierId) where.supplierId = filters.supplierId;
    if (filters.isActive !== undefined) where.isActive = filters.isActive;
    if (filters.metalType) where.metalType = filters.metalType;

    const [items, total] = await Promise.all([
      this.prisma.supplierRateContract.findMany({
        where,
        include: { supplier: { select: { name: true } } },
        orderBy: { validFrom: 'desc' },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      }),
      this.prisma.supplierRateContract.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pagination.limit);
    return {
      items: items.map((c) => this.mapRateContractToResponse(c)),
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages,
      hasNext: pagination.page < totalPages,
      hasPrevious: pagination.page > 1,
    };
  }

  async updateRateContract(
    tenantId: string,
    userId: string,
    id: string,
    data: Partial<RateContractInput>,
  ): Promise<RateContractResponse> {
    const existing = await this.prisma.supplierRateContract.findFirst({
      where: this.tenantWhere(tenantId, { id }) as { tenantId: string; id: string },
    });
    if (!existing) throw new NotFoundException('Rate contract not found');

    await this.prisma.supplierRateContract.update({
      where: { id },
      data: {
        ...(data.metalType !== undefined && { metalType: data.metalType }),
        ...(data.purityFineness !== undefined && { purityFineness: data.purityFineness }),
        ...(data.ratePaisePer10g !== undefined && { ratePaisePer10g: BigInt(data.ratePaisePer10g) }),
        ...(data.validFrom !== undefined && { validFrom: data.validFrom }),
        ...(data.validTo !== undefined && { validTo: data.validTo }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.notes !== undefined && { notes: data.notes }),
        updatedBy: userId,
      },
    });

    return this.getRateContract(tenantId, id);
  }

  async deactivateRateContract(
    tenantId: string,
    userId: string,
    id: string,
  ): Promise<RateContractResponse> {
    return this.updateRateContract(tenantId, userId, id, { isActive: false });
  }

  // ─── Active Rate Lookup ────────────────────────────────────────

  async getActiveRate(
    tenantId: string,
    supplierId: string,
    metalType: string,
    purityFineness: number,
  ): Promise<RateContractResponse | null> {
    const now = new Date();
    const contract = await this.prisma.supplierRateContract.findFirst({
      where: {
        tenantId,
        supplierId,
        metalType,
        purityFineness,
        isActive: true,
        validFrom: { lte: now },
        validTo: { gte: now },
      },
      include: { supplier: { select: { name: true } } },
      orderBy: { validFrom: 'desc' },
    });

    return contract ? this.mapRateContractToResponse(contract) : null;
  }

  // ─── Supplier Performance ──────────────────────────────────────

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
    const completedOrders = purchaseOrders.filter((po) => po.status === 'RECEIVED').length;

    // On-time delivery: received before expected date
    let onTimeCount = 0;
    let deliveredWithDateCount = 0;
    for (const po of purchaseOrders) {
      if (po.status === 'RECEIVED' && po.expectedDate) {
        deliveredWithDateCount++;
        const lastReceipt = po.items
          .flatMap((i) => i.goodsReceiptItems)
          .map((gri) => gri.goodsReceipt.createdAt)
          .sort((a, b) => b.getTime() - a.getTime())[0];

        if (lastReceipt && lastReceipt <= po.expectedDate) {
          onTimeCount++;
        }
      }
    }

    // Quality rejection rate
    let totalReceived = 0;
    let totalRejected = 0;
    for (const po of purchaseOrders) {
      for (const item of po.items) {
        for (const gri of item.goodsReceiptItems) {
          totalReceived += gri.receivedQuantity;
          totalRejected += gri.rejectedQuantity;
        }
      }
    }

    // Total purchase value
    const totalPurchaseValuePaise = purchaseOrders.reduce(
      (sum, po) => sum + Number(po.totalPaise),
      0,
    );

    // Average lead time (days between PO sent and receipt)
    let totalLeadDays = 0;
    let leadTimeCount = 0;
    for (const po of purchaseOrders) {
      if (po.status === 'RECEIVED' && po.approvedAt) {
        const lastReceipt = po.items
          .flatMap((i) => i.goodsReceiptItems)
          .map((gri) => gri.goodsReceipt.createdAt)
          .sort((a, b) => b.getTime() - a.getTime())[0];

        if (lastReceipt) {
          const days = Math.ceil(
            (lastReceipt.getTime() - po.approvedAt.getTime()) / (1000 * 60 * 60 * 24),
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
      onTimeDeliveryPercent: deliveredWithDateCount > 0
        ? Math.round((onTimeCount / deliveredWithDateCount) * 100)
        : 0,
      qualityRejectionPercent: totalReceived > 0
        ? Math.round((totalRejected / totalReceived) * 100)
        : 0,
      priceCompliancePercent: 100, // Would compare PO prices against rate contracts
      averageLeadTimeDays: leadTimeCount > 0
        ? Math.round(totalLeadDays / leadTimeCount)
        : 0,
      totalPurchaseValuePaise,
    };
  }

  async listSuppliersWithPerformance(
    tenantId: string,
    pagination: Pagination,
  ): Promise<PaginatedResult<SupplierPerformance>> {
    const [suppliers, total] = await Promise.all([
      this.prisma.supplier.findMany({
        where: { tenantId, isActive: true },
        orderBy: { name: 'asc' },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      }),
      this.prisma.supplier.count({ where: { tenantId, isActive: true } }),
    ]);

    const items = await Promise.all(
      suppliers.map((s) => this.getSupplierPerformance(tenantId, s.id)),
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

  private mapRateContractToResponse(contract: Record<string, unknown>): RateContractResponse {
    const c = contract as Record<string, unknown>;
    const supplier = c.supplier as Record<string, unknown> | undefined;

    return {
      id: c.id as string,
      tenantId: c.tenantId as string,
      supplierId: c.supplierId as string,
      supplierName: supplier?.name as string | undefined,
      metalType: c.metalType as string,
      purityFineness: c.purityFineness as number,
      ratePaisePer10g: Number(c.ratePaisePer10g),
      validFrom: new Date(c.validFrom as string).toISOString(),
      validTo: new Date(c.validTo as string).toISOString(),
      isActive: c.isActive as boolean,
      notes: (c.notes as string) ?? null,
      createdAt: new Date(c.createdAt as string).toISOString(),
      updatedAt: new Date(c.updatedAt as string).toISOString(),
    };
  }
}
