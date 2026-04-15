// ─── Retail Appraisal Service ──────────────────────────────────
// Item valuation and appraisal certificate management.

import { Injectable, NotFoundException } from '@nestjs/common';
import type { AppraisalInput, AppraisalResponse } from '@caratflow/shared-types';
import type { PaginatedResult, Pagination } from '@caratflow/shared-types';
import { Prisma } from '@caratflow/db';
import { PrismaService } from '../../common/prisma.service';
import { TenantAwareService } from '../../common/base.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class RetailAppraisalService extends TenantAwareService {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  private async generateAppraisalNumber(tenantId: string): Promise<string> {
    const now = new Date();
    const yymm = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}`;

    const count = await this.prisma.appraisal.count({
      where: {
        tenantId,
        appraisalNumber: { contains: `AP/${yymm}/` },
      },
    });

    const seq = String(count + 1).padStart(4, '0');
    return `AP/${yymm}/${seq}`;
  }

  async createAppraisal(tenantId: string, userId: string, input: AppraisalInput): Promise<AppraisalResponse> {
    const appraisalNumber = await this.generateAppraisalNumber(tenantId);

    const appraisal = await this.prisma.appraisal.create({
      data: {
        id: uuidv4(),
        tenantId,
        appraisalNumber,
        customerId: input.customerId,
        locationId: input.locationId,
        itemDescription: input.itemDescription,
        metalType: input.metalType ?? null,
        weightMg: input.weightMg ? BigInt(input.weightMg) : null,
        purityFineness: input.purityFineness ?? null,
        stoneDetails: (input.stoneDetails ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        appraisedValuePaise: BigInt(input.appraisedValuePaise),
        appraisedBy: input.appraisedBy,
        appraisedAt: new Date(),
        validUntil: input.validUntil ?? null,
        certificateUrl: input.certificateUrl ?? null,
        notes: input.notes ?? null,
        createdBy: userId,
        updatedBy: userId,
      },
    });

    return this.mapToResponse(appraisal);
  }

  async getAppraisal(tenantId: string, appraisalId: string): Promise<AppraisalResponse> {
    const appraisal = await this.prisma.appraisal.findFirst({
      where: this.tenantWhere(tenantId, { id: appraisalId }) as { tenantId: string; id: string },
    });

    if (!appraisal) throw new NotFoundException('Appraisal not found');
    return this.mapToResponse(appraisal);
  }

  async listAppraisals(
    tenantId: string,
    filters: { customerId?: string },
    pagination: Pagination,
  ): Promise<PaginatedResult<AppraisalResponse>> {
    const where: Record<string, unknown> = { tenantId };
    if (filters.customerId) where.customerId = filters.customerId;

    const [items, total] = await Promise.all([
      this.prisma.appraisal.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      }),
      this.prisma.appraisal.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pagination.limit);

    return {
      items: items.map((a) => this.mapToResponse(a)),
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages,
      hasNext: pagination.page < totalPages,
      hasPrevious: pagination.page > 1,
    };
  }

  private mapToResponse(appraisal: Record<string, unknown>): AppraisalResponse {
    return {
      id: appraisal.id as string,
      tenantId: appraisal.tenantId as string,
      appraisalNumber: appraisal.appraisalNumber as string,
      customerId: appraisal.customerId as string,
      locationId: appraisal.locationId as string,
      itemDescription: appraisal.itemDescription as string,
      metalType: (appraisal.metalType as string) ?? null,
      weightMg: appraisal.weightMg ? Number(appraisal.weightMg) : null,
      purityFineness: (appraisal.purityFineness as number) ?? null,
      stoneDetails: appraisal.stoneDetails ?? null,
      appraisedValuePaise: Number(appraisal.appraisedValuePaise),
      appraisedBy: appraisal.appraisedBy as string,
      appraisedAt: new Date(appraisal.appraisedAt as string),
      validUntil: appraisal.validUntil ? new Date(appraisal.validUntil as string) : null,
      certificateUrl: (appraisal.certificateUrl as string) ?? null,
      notes: (appraisal.notes as string) ?? null,
      createdAt: new Date(appraisal.createdAt as string),
      updatedAt: new Date(appraisal.updatedAt as string),
    };
  }
}
