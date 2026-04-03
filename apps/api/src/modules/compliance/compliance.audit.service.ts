// ─── Compliance Audit Service ─────────────────────────────────
// Audit scheduling, findings tracking, and resolution.

import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantAwareService } from '../../common/base.service';
import { PrismaService } from '../../common/prisma.service';
import type {
  ComplianceAuditInput,
  ComplianceAuditListInput,
  AuditResolveInput,
} from '@caratflow/shared-types';
import type { PaginatedResult } from '@caratflow/shared-types';
import { v4 as uuid } from 'uuid';

@Injectable()
export class ComplianceAuditService extends TenantAwareService {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async create(tenantId: string, userId: string, input: ComplianceAuditInput) {
    return this.prisma.complianceAudit.create({
      data: {
        id: uuid(),
        tenantId,
        auditType: input.auditType,
        auditDate: input.auditDate,
        auditorName: input.auditorName,
        locationId: input.locationId ?? null,
        status: 'SCHEDULED',
        findings: input.findings ?? null,
        recommendations: input.recommendations ?? null,
        createdBy: userId,
        updatedBy: userId,
      },
    });
  }

  async update(tenantId: string, userId: string, id: string, input: Partial<ComplianceAuditInput>) {
    const audit = await this.prisma.complianceAudit.findFirst({
      where: this.tenantWhere(tenantId, { id }),
    });
    if (!audit) throw new NotFoundException('Audit not found.');

    return this.prisma.complianceAudit.update({
      where: { id },
      data: {
        ...input,
        updatedBy: userId,
      },
    });
  }

  async startAudit(tenantId: string, userId: string, id: string) {
    const audit = await this.prisma.complianceAudit.findFirst({
      where: this.tenantWhere(tenantId, { id }),
    });
    if (!audit) throw new NotFoundException('Audit not found.');

    return this.prisma.complianceAudit.update({
      where: { id },
      data: { status: 'IN_PROGRESS', updatedBy: userId },
    });
  }

  async recordFindings(tenantId: string, userId: string, id: string, findings: string, recommendations?: string) {
    const audit = await this.prisma.complianceAudit.findFirst({
      where: this.tenantWhere(tenantId, { id }),
    });
    if (!audit) throw new NotFoundException('Audit not found.');

    return this.prisma.complianceAudit.update({
      where: { id },
      data: {
        status: 'FINDINGS_OPEN',
        findings,
        recommendations: recommendations ?? audit.recommendations,
        updatedBy: userId,
      },
    });
  }

  async resolve(tenantId: string, userId: string, input: AuditResolveInput) {
    const audit = await this.prisma.complianceAudit.findFirst({
      where: this.tenantWhere(tenantId, { id: input.auditId }),
    });
    if (!audit) throw new NotFoundException('Audit not found.');

    return this.prisma.complianceAudit.update({
      where: { id: input.auditId },
      data: {
        status: 'RESOLVED',
        findings: input.findings ?? audit.findings,
        recommendations: input.recommendations ?? audit.recommendations,
        resolvedAt: new Date(),
        resolvedBy: userId,
        updatedBy: userId,
      },
    });
  }

  async completeAudit(tenantId: string, userId: string, id: string) {
    const audit = await this.prisma.complianceAudit.findFirst({
      where: this.tenantWhere(tenantId, { id }),
    });
    if (!audit) throw new NotFoundException('Audit not found.');

    return this.prisma.complianceAudit.update({
      where: { id },
      data: { status: 'COMPLETED', updatedBy: userId },
    });
  }

  async findById(tenantId: string, id: string) {
    const audit = await this.prisma.complianceAudit.findFirst({
      where: this.tenantWhere(tenantId, { id }),
    });
    if (!audit) throw new NotFoundException('Audit not found.');
    return audit;
  }

  async list(tenantId: string, input: ComplianceAuditListInput): Promise<PaginatedResult<unknown>> {
    const { page, limit, sortBy, sortOrder, auditType, status } = input;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { tenantId };
    if (auditType) where.auditType = auditType;
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      this.prisma.complianceAudit.findMany({
        where,
        orderBy: { [sortBy ?? 'auditDate']: sortOrder },
        skip,
        take: limit,
      }),
      this.prisma.complianceAudit.count({ where }),
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

  async getUpcomingAudits(tenantId: string, limit = 5) {
    return this.prisma.complianceAudit.findMany({
      where: {
        tenantId,
        status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
        auditDate: { gte: new Date() },
      },
      orderBy: { auditDate: 'asc' },
      take: limit,
    });
  }
}
