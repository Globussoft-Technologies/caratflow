// ─── Wholesale Rate Contract Service ────────────────────────────
// CRUD for supplier rate contracts, find applicable rate for supplier+category.

import { Injectable, NotFoundException } from '@nestjs/common';
import type { RateContractInput, RateContractResponse } from '@caratflow/shared-types';
import type { PaginatedResult, Pagination } from '@caratflow/shared-types';
import { PrismaService } from '../../common/prisma.service';
import { TenantAwareService } from '../../common/base.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class WholesaleRateContractService extends TenantAwareService {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async createRateContract(
    tenantId: string,
    userId: string,
    input: RateContractInput,
  ): Promise<RateContractResponse> {
    const contract = await this.prisma.rateContract.create({
      data: {
        id: uuidv4(),
        tenantId,
        supplierId: input.supplierId,
        productCategoryId: input.productCategoryId ?? null,
        metalType: input.metalType ?? null,
        ratePerGramPaise: input.ratePerGramPaise != null ? BigInt(input.ratePerGramPaise) : null,
        makingChargesPercent: input.makingChargesPercent ?? null,
        validFrom: input.validFrom,
        validTo: input.validTo,
        isActive: input.isActive ?? true,
        terms: input.terms ?? null,
        createdBy: userId,
        updatedBy: userId,
      },
      include: { supplier: { select: { name: true } } },
    });

    return this.mapToResponse(contract);
  }

  async getRateContract(tenantId: string, id: string): Promise<RateContractResponse> {
    const contract = await this.prisma.rateContract.findFirst({
      where: { id, tenantId },
      include: { supplier: { select: { name: true } } },
    });
    if (!contract) throw new NotFoundException('Rate contract not found');
    return this.mapToResponse(contract);
  }

  async listRateContracts(
    tenantId: string,
    filters: { supplierId?: string; isActive?: boolean },
    pagination: Pagination,
  ): Promise<PaginatedResult<RateContractResponse>> {
    const where: Record<string, unknown> = { tenantId };
    if (filters.supplierId) where.supplierId = filters.supplierId;
    if (filters.isActive !== undefined) where.isActive = filters.isActive;

    const [items, total] = await Promise.all([
      this.prisma.rateContract.findMany({
        where,
        include: { supplier: { select: { name: true } } },
        orderBy: { validFrom: 'desc' },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      }),
      this.prisma.rateContract.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pagination.limit);
    return {
      items: items.map((c) => this.mapToResponse(c)),
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
    const existing = await this.prisma.rateContract.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Rate contract not found');

    await this.prisma.rateContract.update({
      where: { id },
      data: {
        ...(data.metalType !== undefined && { metalType: data.metalType }),
        ...(data.ratePerGramPaise !== undefined && {
          ratePerGramPaise: data.ratePerGramPaise != null ? BigInt(data.ratePerGramPaise) : null,
        }),
        ...(data.makingChargesPercent !== undefined && { makingChargesPercent: data.makingChargesPercent }),
        ...(data.validFrom !== undefined && { validFrom: data.validFrom }),
        ...(data.validTo !== undefined && { validTo: data.validTo }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.terms !== undefined && { terms: data.terms }),
        updatedBy: userId,
      },
    });

    return this.getRateContract(tenantId, id);
  }

  async findApplicableRate(
    tenantId: string,
    supplierId: string,
    categoryId?: string,
    metalType?: string,
  ): Promise<RateContractResponse | null> {
    const now = new Date();

    const contract = await this.prisma.rateContract.findFirst({
      where: {
        tenantId,
        supplierId,
        isActive: true,
        validFrom: { lte: now },
        validTo: { gte: now },
        ...(categoryId && { productCategoryId: categoryId }),
        ...(metalType && { metalType }),
      },
      include: { supplier: { select: { name: true } } },
      orderBy: { validFrom: 'desc' },
    });

    if (!contract) return null;
    return this.mapToResponse(contract);
  }

  // ─── Mapper ────────────────────────────────────────────────────

  private mapToResponse(contract: Record<string, unknown>): RateContractResponse {
    const c = contract as Record<string, unknown>;
    const supplier = c.supplier as Record<string, unknown> | undefined;

    return {
      id: c.id as string,
      tenantId: c.tenantId as string,
      supplierId: c.supplierId as string,
      supplierName: supplier?.name as string | undefined,
      productCategoryId: (c.productCategoryId as string) ?? null,
      metalType: (c.metalType as string) ?? null,
      ratePerGramPaise: c.ratePerGramPaise != null ? Number(c.ratePerGramPaise) : null,
      makingChargesPercent: (c.makingChargesPercent as number) ?? null,
      validFrom: new Date(c.validFrom as string).toISOString(),
      validTo: new Date(c.validTo as string).toISOString(),
      isActive: c.isActive as boolean,
      terms: (c.terms as string) ?? null,
      createdAt: new Date(c.createdAt as string).toISOString(),
      updatedAt: new Date(c.updatedAt as string).toISOString(),
    };
  }
}
