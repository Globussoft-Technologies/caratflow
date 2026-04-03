import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { TenantAwareService } from '../../common/base.service';
import { PrismaService } from '../../common/prisma.service';
import {
  type ProductionPlanInput,
  type ProductionPlanItemInput,
  ProductionPlanStatus,
} from '@caratflow/shared-types';
import type { Pagination, PaginatedResult } from '@caratflow/shared-types';
import { ManufacturingService } from './manufacturing.service';

@Injectable()
export class ManufacturingPlanningService extends TenantAwareService {
  constructor(
    prisma: PrismaService,
    private readonly manufacturingService: ManufacturingService,
  ) {
    super(prisma);
  }

  async createPlan(tenantId: string, userId: string, input: ProductionPlanInput) {
    if (input.endDate <= input.startDate) {
      throw new BadRequestException('End date must be after start date');
    }

    return this.prisma.productionPlan.create({
      data: {
        tenantId,
        name: input.name,
        locationId: input.locationId,
        startDate: input.startDate,
        endDate: input.endDate,
        notes: input.notes ?? undefined,
        createdBy: userId,
        updatedBy: userId,
      },
      include: { location: true, items: { include: { product: true } } },
    });
  }

  async updatePlan(tenantId: string, userId: string, planId: string, input: Partial<ProductionPlanInput>) {
    const plan = await this.prisma.productionPlan.findFirst({
      where: this.tenantWhere(tenantId, { id: planId }),
    });
    if (!plan) throw new NotFoundException('Production plan not found');
    if (plan.status === 'COMPLETED') throw new BadRequestException('Cannot update a completed plan');

    return this.prisma.productionPlan.update({
      where: { id: planId },
      data: { ...input, updatedBy: userId },
      include: { location: true, items: { include: { product: true } } },
    });
  }

  async addPlanItem(tenantId: string, userId: string, planId: string, input: ProductionPlanItemInput) {
    const plan = await this.prisma.productionPlan.findFirst({
      where: this.tenantWhere(tenantId, { id: planId }),
    });
    if (!plan) throw new NotFoundException('Production plan not found');
    if (plan.status === 'COMPLETED') throw new BadRequestException('Cannot modify a completed plan');

    return this.prisma.productionPlanItem.create({
      data: {
        tenantId,
        planId,
        productId: input.productId,
        quantity: input.quantity,
        bomId: input.bomId ?? undefined,
        priority: input.priority,
        estimatedStartDate: input.estimatedStartDate ?? undefined,
        estimatedEndDate: input.estimatedEndDate ?? undefined,
        createdBy: userId,
        updatedBy: userId,
      },
      include: { product: true },
    });
  }

  async removePlanItem(tenantId: string, userId: string, planId: string, itemId: string) {
    const item = await this.prisma.productionPlanItem.findFirst({
      where: { id: itemId, planId, tenantId },
    });
    if (!item) throw new NotFoundException('Plan item not found');
    if (item.jobOrderId) throw new BadRequestException('Cannot remove item with linked job order');

    await this.prisma.productionPlanItem.delete({ where: { id: itemId } });
  }

  async generateJobOrdersFromPlan(tenantId: string, userId: string, planId: string) {
    const plan = await this.prisma.productionPlan.findFirst({
      where: this.tenantWhere(tenantId, { id: planId }),
      include: { items: { where: { jobOrderId: null } } },
    });
    if (!plan) throw new NotFoundException('Production plan not found');

    const createdJobs: string[] = [];

    for (const item of plan.items) {
      const job = await this.manufacturingService.createJobOrder(tenantId, userId, {
        bomId: item.bomId,
        productId: item.productId,
        locationId: plan.locationId,
        priority: item.priority as any,
        quantity: item.quantity,
        estimatedStartDate: item.estimatedStartDate,
        estimatedEndDate: item.estimatedEndDate,
      });

      await this.prisma.productionPlanItem.update({
        where: { id: item.id },
        data: { jobOrderId: job.id, updatedBy: userId },
      });

      createdJobs.push(job.id);
    }

    // Activate plan if it's in draft
    if (plan.status === 'DRAFT') {
      await this.prisma.productionPlan.update({
        where: { id: planId },
        data: { status: 'ACTIVE', updatedBy: userId },
      });
    }

    return { planId, jobOrderIds: createdJobs, count: createdJobs.length };
  }

  async findAllPlans(tenantId: string, pagination: Pagination) {
    const where = { tenantId };

    const [items, total] = await Promise.all([
      this.prisma.productionPlan.findMany({
        where,
        include: {
          location: true,
          items: { include: { product: true, jobOrder: { select: { id: true, jobNumber: true, status: true } } } },
        },
        orderBy: { [pagination.sortBy ?? 'createdAt']: pagination.sortOrder },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      }),
      this.prisma.productionPlan.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pagination.limit);
    return {
      items,
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages,
      hasNext: pagination.page < totalPages,
      hasPrevious: pagination.page > 1,
    } satisfies PaginatedResult<(typeof items)[0]>;
  }

  async findPlanById(tenantId: string, planId: string) {
    const plan = await this.prisma.productionPlan.findFirst({
      where: this.tenantWhere(tenantId, { id: planId }),
      include: {
        location: true,
        items: {
          include: {
            product: true,
            jobOrder: { select: { id: true, jobNumber: true, status: true } },
          },
        },
      },
    });
    if (!plan) throw new NotFoundException('Production plan not found');
    return plan;
  }

  async getCapacityAnalysis(tenantId: string, locationId: string) {
    const activeJobs = await this.prisma.jobOrder.count({
      where: {
        tenantId,
        locationId,
        status: { in: ['PLANNED', 'MATERIAL_ISSUED', 'IN_PROGRESS', 'QC_PENDING'] },
      },
    });

    const totalKarigars = await this.prisma.karigar.count({
      where: { tenantId, locationId, isActive: true },
    });

    const busyKarigars = await this.prisma.karigar.count({
      where: {
        tenantId,
        locationId,
        isActive: true,
        jobOrders: {
          some: { status: { in: ['IN_PROGRESS', 'QC_PENDING'] } },
        },
      },
    });

    return {
      locationId,
      activeJobs,
      totalKarigars,
      availableKarigars: totalKarigars - busyKarigars,
      busyKarigars,
      utilizationPercent: totalKarigars > 0 ? Math.round((busyKarigars / totalKarigars) * 100) : 0,
    };
  }
}
