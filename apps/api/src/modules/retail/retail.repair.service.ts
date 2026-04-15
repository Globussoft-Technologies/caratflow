// ─── Retail Repair Service ─────────────────────────────────────
// Repair order lifecycle: receive, diagnose, quote, approve, work, complete, deliver.

import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import type { RepairOrderInput, RepairOrderResponse, RepairStatusUpdate, RepairListFilter } from '@caratflow/shared-types';
import type { PaginatedResult, Pagination } from '@caratflow/shared-types';
import { RepairOrderStatus } from '@caratflow/shared-types';
import { Prisma } from '@caratflow/db';
import { PrismaService } from '../../common/prisma.service';
import { TenantAwareService } from '../../common/base.service';
import { EventBusService } from '../../event-bus/event-bus.service';
import { v4 as uuidv4 } from 'uuid';

/** Valid state transitions for repair orders */
const REPAIR_TRANSITIONS: Record<string, string[]> = {
  RECEIVED: ['DIAGNOSED', 'CANCELLED'],
  DIAGNOSED: ['QUOTED', 'CANCELLED'],
  QUOTED: ['APPROVED', 'CANCELLED'],
  APPROVED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};

@Injectable()
export class RetailRepairService extends TenantAwareService {
  constructor(
    prisma: PrismaService,
    private readonly eventBus: EventBusService,
  ) {
    super(prisma);
  }

  private async generateRepairNumber(tenantId: string, locationId: string): Promise<string> {
    const location = await this.prisma.location.findFirst({
      where: { id: locationId, tenantId },
      select: { city: true },
    });
    const locCode = (location?.city ?? 'LOC').substring(0, 3).toUpperCase();
    const now = new Date();
    const yymm = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}`;

    const count = await this.prisma.repairOrder.count({
      where: {
        tenantId,
        locationId,
        repairNumber: { contains: `/${locCode}/${yymm}/` },
      },
    });

    const seq = String(count + 1).padStart(4, '0');
    return `RP/${locCode}/${yymm}/${seq}`;
  }

  async createRepairOrder(tenantId: string, userId: string, input: RepairOrderInput): Promise<RepairOrderResponse> {
    const repairNumber = await this.generateRepairNumber(tenantId, input.locationId);

    const repair = await this.prisma.repairOrder.create({
      data: {
        id: uuidv4(),
        tenantId,
        repairNumber,
        customerId: input.customerId,
        locationId: input.locationId,
        status: 'RECEIVED',
        itemDescription: input.itemDescription,
        itemWeightMg: input.itemWeightMg ? BigInt(input.itemWeightMg) : null,
        itemImages: (input.itemImages ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        diagnosticNotes: input.diagnosticNotes ?? null,
        estimatePaise: input.estimatePaise ? BigInt(input.estimatePaise) : null,
        promisedDate: input.promisedDate ?? null,
        createdBy: userId,
        updatedBy: userId,
      },
    });

    await this.eventBus.publish({
      id: uuidv4(),
      tenantId,
      userId,
      timestamp: new Date().toISOString(),
      type: 'retail.repair.created',
      payload: {
        repairId: repair.id,
        customerId: input.customerId,
        description: input.itemDescription,
      },
    });

    return this.mapRepairToResponse(repair);
  }

  async updateRepairStatus(
    tenantId: string,
    userId: string,
    repairId: string,
    update: RepairStatusUpdate,
  ): Promise<RepairOrderResponse> {
    const repair = await this.prisma.repairOrder.findFirst({
      where: this.tenantWhere(tenantId, { id: repairId }) as { tenantId: string; id: string },
    });

    if (!repair) throw new NotFoundException('Repair order not found');

    // Validate state transition
    const allowedTransitions = REPAIR_TRANSITIONS[repair.status] ?? [];
    if (!allowedTransitions.includes(update.status)) {
      throw new BadRequestException(
        `Cannot transition from ${repair.status} to ${update.status}. Allowed: ${allowedTransitions.join(', ')}`,
      );
    }

    const updateData: Record<string, unknown> = {
      status: update.status,
      updatedBy: userId,
    };

    if (update.diagnosticNotes !== undefined) updateData.diagnosticNotes = update.diagnosticNotes;
    if (update.estimatePaise !== undefined) updateData.estimatePaise = BigInt(update.estimatePaise);
    if (update.actualCostPaise !== undefined) updateData.actualCostPaise = BigInt(update.actualCostPaise);
    if (update.laborPaise !== undefined) updateData.laborPaise = BigInt(update.laborPaise);
    if (update.materialPaise !== undefined) updateData.materialPaise = BigInt(update.materialPaise);
    if (update.completedDate) updateData.completedDate = update.completedDate;
    if (update.deliveredDate) updateData.deliveredDate = update.deliveredDate;

    // Auto-set dates on specific transitions
    if (update.status === 'COMPLETED' && !update.completedDate) {
      updateData.completedDate = new Date();
    }
    if (update.status === 'DELIVERED' && !update.deliveredDate) {
      updateData.deliveredDate = new Date();
    }

    const updated = await this.prisma.repairOrder.update({
      where: { id: repairId },
      data: updateData,
    });

    return this.mapRepairToResponse(updated);
  }

  async getRepairOrder(tenantId: string, repairId: string): Promise<RepairOrderResponse> {
    const repair = await this.prisma.repairOrder.findFirst({
      where: this.tenantWhere(tenantId, { id: repairId }) as { tenantId: string; id: string },
    });

    if (!repair) throw new NotFoundException('Repair order not found');
    return this.mapRepairToResponse(repair);
  }

  async listRepairOrders(
    tenantId: string,
    filters: RepairListFilter,
    pagination: Pagination,
  ): Promise<PaginatedResult<RepairOrderResponse>> {
    const where: Record<string, unknown> = { tenantId };
    if (filters.status) where.status = filters.status;
    if (filters.customerId) where.customerId = filters.customerId;
    if (filters.locationId) where.locationId = filters.locationId;

    const [items, total] = await Promise.all([
      this.prisma.repairOrder.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      }),
      this.prisma.repairOrder.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pagination.limit);

    return {
      items: items.map((r) => this.mapRepairToResponse(r)),
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages,
      hasNext: pagination.page < totalPages,
      hasPrevious: pagination.page > 1,
    };
  }

  /**
   * Get repair queue grouped by status for a specific location (board view).
   */
  async getRepairQueue(tenantId: string, locationId: string): Promise<Record<string, RepairOrderResponse[]>> {
    const repairs = await this.prisma.repairOrder.findMany({
      where: {
        tenantId,
        locationId,
        status: { notIn: ['DELIVERED', 'CANCELLED'] },
      },
      orderBy: { createdAt: 'asc' },
    });

    const queue: Record<string, RepairOrderResponse[]> = {
      RECEIVED: [],
      DIAGNOSED: [],
      QUOTED: [],
      APPROVED: [],
      IN_PROGRESS: [],
      COMPLETED: [],
    };

    for (const repair of repairs) {
      const status = repair.status;
      if (queue[status]) {
        queue[status].push(this.mapRepairToResponse(repair));
      }
    }

    return queue;
  }

  private mapRepairToResponse(repair: Record<string, unknown>): RepairOrderResponse {
    return {
      id: repair.id as string,
      tenantId: repair.tenantId as string,
      repairNumber: repair.repairNumber as string,
      customerId: repair.customerId as string,
      locationId: repair.locationId as string,
      status: repair.status as RepairOrderStatus,
      itemDescription: repair.itemDescription as string,
      itemWeightMg: repair.itemWeightMg ? Number(repair.itemWeightMg) : null,
      itemImages: repair.itemImages ?? null,
      diagnosticNotes: (repair.diagnosticNotes as string) ?? null,
      estimatePaise: repair.estimatePaise ? Number(repair.estimatePaise) : null,
      actualCostPaise: repair.actualCostPaise ? Number(repair.actualCostPaise) : null,
      laborPaise: repair.laborPaise ? Number(repair.laborPaise) : null,
      materialPaise: repair.materialPaise ? Number(repair.materialPaise) : null,
      promisedDate: repair.promisedDate ? new Date(repair.promisedDate as string) : null,
      completedDate: repair.completedDate ? new Date(repair.completedDate as string) : null,
      deliveredDate: repair.deliveredDate ? new Date(repair.deliveredDate as string) : null,
      createdAt: new Date(repair.createdAt as string),
      updatedAt: new Date(repair.updatedAt as string),
    };
  }
}
