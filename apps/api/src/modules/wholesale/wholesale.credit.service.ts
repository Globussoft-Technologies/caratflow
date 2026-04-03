// ─── Wholesale Credit & Outstanding Service ────────────────────
// Credit limit CRUD, credit check before order, outstanding balance
// tracking, aging calculation.

import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import type {
  CreditLimitInput,
  CreditLimitResponse,
  OutstandingBalanceResponse,
} from '@caratflow/shared-types';
import {
  WholesaleCreditEntityType,
  WholesaleOutstandingStatus,
} from '@caratflow/shared-types';
import type { PaginatedResult, Pagination } from '@caratflow/shared-types';
import { PrismaService } from '../../common/prisma.service';
import { TenantAwareService } from '../../common/base.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class WholesaleCreditService extends TenantAwareService {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  // ─── Credit Limit CRUD ─────────────────────────────────────────

  async setCreditLimit(
    tenantId: string,
    userId: string,
    input: CreditLimitInput,
  ): Promise<CreditLimitResponse> {
    const existing = await this.prisma.creditLimit.findFirst({
      where: { tenantId, entityType: input.entityType, entityId: input.entityId },
    });

    let creditLimit;
    if (existing) {
      creditLimit = await this.prisma.creditLimit.update({
        where: { id: existing.id },
        data: {
          creditLimitPaise: BigInt(input.creditLimitPaise),
          availablePaise: BigInt(input.creditLimitPaise) - existing.usedPaise,
          updatedBy: userId,
        },
      });
    } else {
      creditLimit = await this.prisma.creditLimit.create({
        data: {
          id: uuidv4(),
          tenantId,
          entityType: input.entityType,
          entityId: input.entityId,
          creditLimitPaise: BigInt(input.creditLimitPaise),
          usedPaise: 0n,
          availablePaise: BigInt(input.creditLimitPaise),
          createdBy: userId,
          updatedBy: userId,
        },
      });
    }

    return this.mapCreditLimitToResponse(creditLimit, tenantId);
  }

  async getCreditLimit(
    tenantId: string,
    entityType: string,
    entityId: string,
  ): Promise<CreditLimitResponse | null> {
    const creditLimit = await this.prisma.creditLimit.findFirst({
      where: { tenantId, entityType: entityType as 'CUSTOMER' | 'SUPPLIER', entityId },
    });
    if (!creditLimit) return null;
    return this.mapCreditLimitToResponse(creditLimit, tenantId);
  }

  async listCreditLimits(
    tenantId: string,
    filters: { entityType?: string },
    pagination: Pagination,
  ): Promise<PaginatedResult<CreditLimitResponse>> {
    const where: Record<string, unknown> = { tenantId };
    if (filters.entityType) where.entityType = filters.entityType;

    const [items, total] = await Promise.all([
      this.prisma.creditLimit.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      }),
      this.prisma.creditLimit.count({ where }),
    ]);

    const mapped = await Promise.all(
      items.map((c) => this.mapCreditLimitToResponse(c, tenantId)),
    );

    const totalPages = Math.ceil(total / pagination.limit);
    return {
      items: mapped,
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages,
      hasNext: pagination.page < totalPages,
      hasPrevious: pagination.page > 1,
    };
  }

  // ─── Credit Check ──────────────────────────────────────────────

  async checkCredit(
    tenantId: string,
    entityType: string,
    entityId: string,
    requiredAmountPaise: number,
  ): Promise<{ allowed: boolean; availablePaise: number; limitPaise: number; usedPaise: number }> {
    const creditLimit = await this.prisma.creditLimit.findFirst({
      where: { tenantId, entityType: entityType as 'CUSTOMER' | 'SUPPLIER', entityId },
    });

    if (!creditLimit) {
      return { allowed: false, availablePaise: 0, limitPaise: 0, usedPaise: 0 };
    }

    const limitPaise = Number(creditLimit.creditLimitPaise);
    const usedPaise = Number(creditLimit.usedPaise);
    const availablePaise = Number(creditLimit.availablePaise);

    return {
      allowed: availablePaise >= requiredAmountPaise,
      availablePaise,
      limitPaise,
      usedPaise,
    };
  }

  // ─── Outstanding Balance Tracking ──────────────────────────────

  async addOutstandingBalance(
    tenantId: string,
    userId: string,
    params: {
      entityType: string;
      entityId: string;
      invoiceId: string;
      invoiceNumber: string;
      invoiceDate: Date;
      dueDate: Date;
      originalPaise: number;
    },
  ): Promise<OutstandingBalanceResponse> {
    const outstanding = await this.prisma.outstandingBalance.create({
      data: {
        id: uuidv4(),
        tenantId,
        entityType: params.entityType as 'CUSTOMER' | 'SUPPLIER',
        entityId: params.entityId,
        invoiceId: params.invoiceId,
        invoiceNumber: params.invoiceNumber,
        invoiceDate: params.invoiceDate,
        dueDate: params.dueDate,
        originalPaise: BigInt(params.originalPaise),
        paidPaise: 0n,
        balancePaise: BigInt(params.originalPaise),
        status: 'CURRENT',
        daysOverdue: 0,
        createdBy: userId,
        updatedBy: userId,
      },
    });

    // Update credit limit used amount
    await this.recalculateUsedCredit(tenantId, params.entityType, params.entityId);

    return this.mapOutstandingToResponse(outstanding, tenantId);
  }

  async recordPaymentOnOutstanding(
    tenantId: string,
    userId: string,
    outstandingId: string,
    paymentPaise: number,
  ): Promise<OutstandingBalanceResponse> {
    const outstanding = await this.prisma.outstandingBalance.findFirst({
      where: this.tenantWhere(tenantId, { id: outstandingId }) as { tenantId: string; id: string },
    });
    if (!outstanding) throw new NotFoundException('Outstanding balance not found');

    const newPaid = Number(outstanding.paidPaise) + paymentPaise;
    const newBalance = Number(outstanding.originalPaise) - newPaid;

    if (newBalance < 0) {
      throw new BadRequestException('Payment exceeds outstanding balance');
    }

    const newStatus = newBalance === 0 ? 'PAID' : outstanding.status;

    await this.prisma.outstandingBalance.update({
      where: { id: outstandingId },
      data: {
        paidPaise: BigInt(newPaid),
        balancePaise: BigInt(newBalance),
        status: newStatus as 'CURRENT' | 'OVERDUE' | 'PAID',
        updatedBy: userId,
      },
    });

    await this.recalculateUsedCredit(tenantId, outstanding.entityType, outstanding.entityId);

    const updated = await this.prisma.outstandingBalance.findUnique({ where: { id: outstandingId } });
    return this.mapOutstandingToResponse(updated!, tenantId);
  }

  async listOutstandingBalances(
    tenantId: string,
    filters: { entityType?: string; entityId?: string; status?: string },
    pagination: Pagination,
  ): Promise<PaginatedResult<OutstandingBalanceResponse>> {
    const where: Record<string, unknown> = { tenantId };
    if (filters.entityType) where.entityType = filters.entityType;
    if (filters.entityId) where.entityId = filters.entityId;
    if (filters.status) where.status = filters.status;
    else where.status = { not: 'PAID' };

    const [items, total] = await Promise.all([
      this.prisma.outstandingBalance.findMany({
        where,
        orderBy: { dueDate: 'asc' },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      }),
      this.prisma.outstandingBalance.count({ where }),
    ]);

    const mapped = await Promise.all(
      items.map((o) => this.mapOutstandingToResponse(o, tenantId)),
    );

    const totalPages = Math.ceil(total / pagination.limit);
    return {
      items: mapped,
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages,
      hasNext: pagination.page < totalPages,
      hasPrevious: pagination.page > 1,
    };
  }

  // ─── Aging Calculation ─────────────────────────────────────────

  async updateAgingStatuses(tenantId: string): Promise<number> {
    const now = new Date();
    const balances = await this.prisma.outstandingBalance.findMany({
      where: { tenantId, status: { not: 'PAID' } },
    });

    let updatedCount = 0;
    for (const balance of balances) {
      const daysOverdue = Math.max(
        0,
        Math.ceil((now.getTime() - balance.dueDate.getTime()) / (1000 * 60 * 60 * 24)),
      );

      const newStatus = daysOverdue > 0 ? 'OVERDUE' : 'CURRENT';

      if (newStatus !== balance.status || daysOverdue !== balance.daysOverdue) {
        await this.prisma.outstandingBalance.update({
          where: { id: balance.id },
          data: {
            status: newStatus as 'CURRENT' | 'OVERDUE',
            daysOverdue,
          },
        });
        updatedCount++;
      }
    }

    return updatedCount;
  }

  async getAgingSummary(tenantId: string, entityType?: string) {
    const where: Record<string, unknown> = { tenantId, status: { not: 'PAID' } };
    if (entityType) where.entityType = entityType;

    const balances = await this.prisma.outstandingBalance.findMany({ where });

    const summary = {
      current: { count: 0, totalPaise: 0 },
      overdue1to30: { count: 0, totalPaise: 0 },
      overdue31to60: { count: 0, totalPaise: 0 },
      overdue61to90: { count: 0, totalPaise: 0 },
      overdue90Plus: { count: 0, totalPaise: 0 },
    };

    for (const b of balances) {
      const bal = Number(b.balancePaise);
      const days = b.daysOverdue;
      if (days <= 0) {
        summary.current.count++;
        summary.current.totalPaise += bal;
      } else if (days <= 30) {
        summary.overdue1to30.count++;
        summary.overdue1to30.totalPaise += bal;
      } else if (days <= 60) {
        summary.overdue31to60.count++;
        summary.overdue31to60.totalPaise += bal;
      } else if (days <= 90) {
        summary.overdue61to90.count++;
        summary.overdue61to90.totalPaise += bal;
      } else {
        summary.overdue90Plus.count++;
        summary.overdue90Plus.totalPaise += bal;
      }
    }

    return summary;
  }

  // ─── Private Helpers ───────────────────────────────────────────

  private async recalculateUsedCredit(
    tenantId: string,
    entityType: string,
    entityId: string,
  ): Promise<void> {
    const result = await this.prisma.outstandingBalance.aggregate({
      where: { tenantId, entityType: entityType as 'CUSTOMER' | 'SUPPLIER', entityId, status: { not: 'PAID' } },
      _sum: { balancePaise: true },
    });

    const totalUsed = result._sum.balancePaise ?? 0n;

    const creditLimit = await this.prisma.creditLimit.findFirst({
      where: { tenantId, entityType: entityType as 'CUSTOMER' | 'SUPPLIER', entityId },
    });

    if (creditLimit) {
      const available = creditLimit.creditLimitPaise - totalUsed;
      await this.prisma.creditLimit.update({
        where: { id: creditLimit.id },
        data: { usedPaise: totalUsed, availablePaise: available > 0n ? available : 0n },
      });
    }
  }

  private async mapCreditLimitToResponse(
    creditLimit: Record<string, unknown>,
    tenantId: string,
  ): Promise<CreditLimitResponse> {
    const cl = creditLimit as Record<string, unknown>;
    const entityType = cl.entityType as string;
    const entityId = cl.entityId as string;

    let entityName: string | undefined;
    if (entityType === 'CUSTOMER') {
      const customer = await this.prisma.customer.findFirst({
        where: { id: entityId, tenantId },
        select: { firstName: true, lastName: true },
      });
      entityName = customer ? `${customer.firstName} ${customer.lastName}` : undefined;
    } else {
      const supplier = await this.prisma.supplier.findFirst({
        where: { id: entityId, tenantId },
        select: { name: true },
      });
      entityName = supplier?.name;
    }

    return {
      id: cl.id as string,
      tenantId: cl.tenantId as string,
      entityType: entityType as WholesaleCreditEntityType,
      entityId,
      entityName,
      creditLimitPaise: Number(cl.creditLimitPaise),
      usedPaise: Number(cl.usedPaise),
      availablePaise: Number(cl.availablePaise),
      createdAt: new Date(cl.createdAt as string).toISOString(),
      updatedAt: new Date(cl.updatedAt as string).toISOString(),
    };
  }

  private async mapOutstandingToResponse(
    outstanding: Record<string, unknown>,
    tenantId: string,
  ): Promise<OutstandingBalanceResponse> {
    const o = outstanding as Record<string, unknown>;
    const entityType = o.entityType as string;
    const entityId = o.entityId as string;

    let entityName: string | undefined;
    if (entityType === 'CUSTOMER') {
      const customer = await this.prisma.customer.findFirst({
        where: { id: entityId, tenantId },
        select: { firstName: true, lastName: true },
      });
      entityName = customer ? `${customer.firstName} ${customer.lastName}` : undefined;
    } else {
      const supplier = await this.prisma.supplier.findFirst({
        where: { id: entityId, tenantId },
        select: { name: true },
      });
      entityName = supplier?.name;
    }

    const dueDate = new Date(o.dueDate as string);
    const now = new Date();
    const daysOverdue = Math.max(
      0,
      Math.ceil((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)),
    );

    return {
      id: o.id as string,
      tenantId: o.tenantId as string,
      entityType: entityType as WholesaleCreditEntityType,
      entityId,
      entityName,
      invoiceId: o.invoiceId as string,
      invoiceNumber: o.invoiceNumber as string,
      invoiceDate: new Date(o.invoiceDate as string).toISOString(),
      dueDate: dueDate.toISOString(),
      originalPaise: Number(o.originalPaise),
      paidPaise: Number(o.paidPaise),
      balancePaise: Number(o.balancePaise),
      status: o.status as WholesaleOutstandingStatus,
      daysOverdue,
      createdAt: new Date(o.createdAt as string).toISOString(),
      updatedAt: new Date(o.updatedAt as string).toISOString(),
    };
  }
}
