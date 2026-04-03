// ─── Retail Layaway Service ────────────────────────────────────
// Installment payment plans for jewelry purchases.

import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import type { LayawayInput, LayawayPaymentInput, LayawayResponse } from '@caratflow/shared-types';
import type { PaginatedResult, Pagination } from '@caratflow/shared-types';
import { LayawayStatus } from '@caratflow/shared-types';
import { PrismaService } from '../../common/prisma.service';
import { TenantAwareService } from '../../common/base.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class RetailLayawayService extends TenantAwareService {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  private async generateLayawayNumber(tenantId: string): Promise<string> {
    const now = new Date();
    const yymm = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}`;

    const count = await this.prisma.layaway.count({
      where: {
        tenantId,
        layawayNumber: { contains: `LY/${yymm}/` },
      },
    });

    const seq = String(count + 1).padStart(4, '0');
    return `LY/${yymm}/${seq}`;
  }

  async createLayaway(tenantId: string, userId: string, input: LayawayInput): Promise<LayawayResponse> {
    // Verify sale exists
    const sale = await this.prisma.sale.findFirst({
      where: this.tenantWhere(tenantId, { id: input.saleId }) as { tenantId: string; id: string },
    });

    if (!sale) throw new NotFoundException('Sale not found');

    const layawayNumber = await this.generateLayawayNumber(tenantId);

    // Calculate next payment date (first installment due in 30 days)
    const nextPaymentDate = new Date();
    nextPaymentDate.setDate(nextPaymentDate.getDate() + 30);

    const layaway = await this.prisma.layaway.create({
      data: {
        id: uuidv4(),
        tenantId,
        layawayNumber,
        saleId: input.saleId,
        customerId: input.customerId,
        totalPaise: BigInt(input.totalPaise),
        paidPaise: BigInt(0),
        remainingPaise: BigInt(input.totalPaise),
        status: 'ACTIVE',
        dueDate: input.dueDate ?? null,
        installmentCount: input.installmentCount,
        nextPaymentDate,
        createdBy: userId,
        updatedBy: userId,
      },
    });

    return this.getLayaway(tenantId, layaway.id);
  }

  async recordPayment(tenantId: string, userId: string, input: LayawayPaymentInput): Promise<LayawayResponse> {
    const layaway = await this.prisma.layaway.findFirst({
      where: this.tenantWhere(tenantId, { id: input.layawayId }) as { tenantId: string; id: string },
    });

    if (!layaway) throw new NotFoundException('Layaway not found');
    if (layaway.status !== 'ACTIVE') throw new BadRequestException('Layaway is not active');

    if (input.amountPaise > Number(layaway.remainingPaise)) {
      throw new BadRequestException('Payment amount exceeds remaining balance');
    }

    const newPaid = Number(layaway.paidPaise) + input.amountPaise;
    const newRemaining = Number(layaway.totalPaise) - newPaid;
    const isComplete = newRemaining <= 0;

    await this.prisma.$transaction(async (tx) => {
      await tx.layawayPayment.create({
        data: {
          id: uuidv4(),
          tenantId,
          layawayId: input.layawayId,
          amountPaise: BigInt(input.amountPaise),
          method: input.method,
          reference: input.reference ?? null,
          paidAt: new Date(),
        },
      });

      const nextPaymentDate = isComplete ? null : new Date();
      if (nextPaymentDate) {
        nextPaymentDate.setDate(nextPaymentDate.getDate() + 30);
      }

      await tx.layaway.update({
        where: { id: input.layawayId },
        data: {
          paidPaise: BigInt(newPaid),
          remainingPaise: BigInt(Math.max(0, newRemaining)),
          status: isComplete ? 'COMPLETED' : 'ACTIVE',
          nextPaymentDate,
          updatedBy: userId,
        },
      });
    });

    return this.getLayaway(tenantId, input.layawayId);
  }

  async cancelLayaway(tenantId: string, userId: string, layawayId: string): Promise<LayawayResponse> {
    const layaway = await this.prisma.layaway.findFirst({
      where: this.tenantWhere(tenantId, { id: layawayId }) as { tenantId: string; id: string },
    });

    if (!layaway) throw new NotFoundException('Layaway not found');
    if (layaway.status !== 'ACTIVE') throw new BadRequestException('Only active layaways can be cancelled');

    await this.prisma.layaway.update({
      where: { id: layawayId },
      data: { status: 'CANCELLED', updatedBy: userId },
    });

    return this.getLayaway(tenantId, layawayId);
  }

  async forfeitLayaway(tenantId: string, userId: string, layawayId: string): Promise<LayawayResponse> {
    const layaway = await this.prisma.layaway.findFirst({
      where: this.tenantWhere(tenantId, { id: layawayId }) as { tenantId: string; id: string },
    });

    if (!layaway) throw new NotFoundException('Layaway not found');
    if (layaway.status !== 'ACTIVE') throw new BadRequestException('Only active layaways can be forfeited');

    await this.prisma.layaway.update({
      where: { id: layawayId },
      data: { status: 'FORFEITED', updatedBy: userId },
    });

    return this.getLayaway(tenantId, layawayId);
  }

  async getLayaway(tenantId: string, layawayId: string): Promise<LayawayResponse> {
    const layaway = await this.prisma.layaway.findFirst({
      where: this.tenantWhere(tenantId, { id: layawayId }) as { tenantId: string; id: string },
      include: { payments: { orderBy: { paidAt: 'desc' } } },
    });

    if (!layaway) throw new NotFoundException('Layaway not found');

    return {
      id: layaway.id,
      tenantId: layaway.tenantId,
      layawayNumber: layaway.layawayNumber,
      saleId: layaway.saleId,
      customerId: layaway.customerId,
      totalPaise: Number(layaway.totalPaise),
      paidPaise: Number(layaway.paidPaise),
      remainingPaise: Number(layaway.remainingPaise),
      status: layaway.status as LayawayStatus,
      dueDate: layaway.dueDate,
      installmentCount: layaway.installmentCount,
      nextPaymentDate: layaway.nextPaymentDate,
      payments: layaway.payments.map((p) => ({
        id: p.id,
        amountPaise: Number(p.amountPaise),
        method: p.method,
        reference: p.reference,
        paidAt: p.paidAt,
      })),
      createdAt: layaway.createdAt,
      updatedAt: layaway.updatedAt,
    };
  }

  async listLayaways(
    tenantId: string,
    filters: { status?: string; customerId?: string },
    pagination: Pagination,
  ): Promise<PaginatedResult<LayawayResponse>> {
    const where: Record<string, unknown> = { tenantId };
    if (filters.status) where.status = filters.status;
    if (filters.customerId) where.customerId = filters.customerId;

    const [items, total] = await Promise.all([
      this.prisma.layaway.findMany({
        where,
        include: { payments: { orderBy: { paidAt: 'desc' } } },
        orderBy: { createdAt: 'desc' },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      }),
      this.prisma.layaway.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pagination.limit);

    return {
      items: items.map((l) => ({
        id: l.id,
        tenantId: l.tenantId,
        layawayNumber: l.layawayNumber,
        saleId: l.saleId,
        customerId: l.customerId,
        totalPaise: Number(l.totalPaise),
        paidPaise: Number(l.paidPaise),
        remainingPaise: Number(l.remainingPaise),
        status: l.status as LayawayStatus,
        dueDate: l.dueDate,
        installmentCount: l.installmentCount,
        nextPaymentDate: l.nextPaymentDate,
        payments: l.payments.map((p) => ({
          id: p.id,
          amountPaise: Number(p.amountPaise),
          method: p.method,
          reference: p.reference,
          paidAt: p.paidAt,
        })),
        createdAt: l.createdAt,
        updatedAt: l.updatedAt,
      })),
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages,
      hasNext: pagination.page < totalPages,
      hasPrevious: pagination.page > 1,
    };
  }
}
