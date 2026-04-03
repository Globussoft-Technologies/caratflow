// ─── Compliance Document Service ──────────────────────────────
// CRUD for compliance documents, expiry alerts, Kimberley Process certs.

import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { TenantAwareService } from '../../common/base.service';
import { PrismaService } from '../../common/prisma.service';
import type {
  ComplianceDocumentInput,
  ComplianceDocumentListInput,
} from '@caratflow/shared-types';
import type { PaginatedResult } from '@caratflow/shared-types';
import { v4 as uuid } from 'uuid';

@Injectable()
export class ComplianceDocumentService extends TenantAwareService {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async create(tenantId: string, userId: string, input: ComplianceDocumentInput) {
    return this.prisma.complianceDocument.create({
      data: {
        id: uuid(),
        tenantId,
        productId: input.productId ?? null,
        supplierId: input.supplierId ?? null,
        documentType: input.documentType,
        documentNumber: input.documentNumber,
        issuedBy: input.issuedBy ?? null,
        issuedDate: input.issuedDate ?? null,
        expiryDate: input.expiryDate ?? null,
        fileUrl: input.fileUrl ?? null,
        status: 'ACTIVE',
        notes: input.notes ?? null,
        createdBy: userId,
        updatedBy: userId,
      },
    });
  }

  async update(tenantId: string, userId: string, id: string, input: Partial<ComplianceDocumentInput>) {
    const doc = await this.prisma.complianceDocument.findFirst({
      where: this.tenantWhere(tenantId, { id }),
    });
    if (!doc) throw new NotFoundException('Document not found.');

    return this.prisma.complianceDocument.update({
      where: { id },
      data: {
        ...input,
        updatedBy: userId,
      },
    });
  }

  async findById(tenantId: string, id: string) {
    const doc = await this.prisma.complianceDocument.findFirst({
      where: this.tenantWhere(tenantId, { id }),
    });
    if (!doc) throw new NotFoundException('Document not found.');
    return doc;
  }

  async list(tenantId: string, input: ComplianceDocumentListInput): Promise<PaginatedResult<unknown>> {
    const { page, limit, sortBy, sortOrder, documentType, status, expiringWithinDays } = input;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { tenantId };
    if (documentType) where.documentType = documentType;
    if (status) where.status = status;
    if (expiringWithinDays) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + expiringWithinDays);
      where.expiryDate = { lte: futureDate, gte: new Date() };
      where.status = 'ACTIVE';
    }

    const [items, total] = await Promise.all([
      this.prisma.complianceDocument.findMany({
        where,
        orderBy: { [sortBy ?? 'createdAt']: sortOrder },
        skip,
        take: limit,
      }),
      this.prisma.complianceDocument.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);
    return {
      items,
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    };
  }

  async revoke(tenantId: string, userId: string, id: string) {
    const doc = await this.prisma.complianceDocument.findFirst({
      where: this.tenantWhere(tenantId, { id }),
    });
    if (!doc) throw new NotFoundException('Document not found.');

    return this.prisma.complianceDocument.update({
      where: { id },
      data: { status: 'REVOKED', updatedBy: userId },
    });
  }

  /**
   * Get count of documents expiring within the given number of days.
   * Used for dashboard alerts and BullMQ weekly check.
   */
  async getExpiringCount(tenantId: string, withinDays = 30): Promise<number> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + withinDays);

    return this.prisma.complianceDocument.count({
      where: {
        tenantId,
        status: 'ACTIVE',
        expiryDate: { lte: futureDate, gte: new Date() },
      },
    });
  }

  /**
   * Mark expired documents. Intended to be called by a BullMQ scheduled job.
   */
  async markExpiredDocuments(tenantId: string) {
    const result = await this.prisma.complianceDocument.updateMany({
      where: {
        tenantId,
        status: 'ACTIVE',
        expiryDate: { lt: new Date() },
      },
      data: { status: 'EXPIRED' },
    });
    return { updated: result.count };
  }
}
