import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { TenantAwareService } from '../../common/base.service';
import { PrismaService } from '../../common/prisma.service';
import { EventBusService } from '../../event-bus/event-bus.service';
import {
  type BomInput,
  type BomUpdate,
  type JobOrderInput,
  type JobOrderStatusUpdate,
  type MaterialRequisition,
  type MaterialRequisitionItem,
  type ManufacturingDashboardResponse,
  type JobOrderFilter,
  type BomFilter,
  MfgJobOrderStatus,
  BomStatus,
  JOB_ORDER_TRANSITIONS,
  type JobCostType,
} from '@caratflow/shared-types';
import type { PaginatedResult, Pagination } from '@caratflow/shared-types';

@Injectable()
export class ManufacturingService extends TenantAwareService {
  constructor(
    prisma: PrismaService,
    private readonly eventBus: EventBusService,
  ) {
    super(prisma);
  }

  // ─── BOM ──────────────────────────────────────────────────────

  async createBom(tenantId: string, userId: string, input: BomInput) {
    const { items, ...header } = input;

    const bom = await this.prisma.billOfMaterials.create({
      data: {
        ...header,
        tenantId,
        createdBy: userId,
        updatedBy: userId,
        items: {
          create: items.map((item) => ({
            tenantId,
            itemType: item.itemType,
            productId: item.productId ?? undefined,
            description: item.description,
            quantityRequired: item.quantityRequired,
            unitOfMeasure: item.unitOfMeasure,
            weightMg: item.weightMg ?? undefined,
            estimatedCostPaise: BigInt(item.estimatedCostPaise),
            wastagePercent: item.wastagePercent,
            sortOrder: item.sortOrder,
            createdBy: userId,
            updatedBy: userId,
          })),
        },
      },
      include: { items: { orderBy: { sortOrder: 'asc' } }, product: true },
    });

    return bom;
  }

  async updateBom(tenantId: string, userId: string, bomId: string, input: BomUpdate) {
    const existing = await this.prisma.billOfMaterials.findFirst({
      where: this.tenantWhere(tenantId, { id: bomId }),
    });
    if (!existing) throw new NotFoundException('BOM not found');
    if (existing.status === 'ARCHIVED') throw new BadRequestException('Cannot update an archived BOM');

    const { items, ...header } = input;

    // If items are provided, delete old and recreate
    if (items) {
      await this.prisma.bomItem.deleteMany({ where: { bomId, tenantId } });
    }

    const bom = await this.prisma.billOfMaterials.update({
      where: { id: bomId },
      data: {
        ...header,
        updatedBy: userId,
        ...(items
          ? {
              items: {
                create: items.map((item) => ({
                  tenantId,
                  itemType: item.itemType,
                  productId: item.productId ?? undefined,
                  description: item.description,
                  quantityRequired: item.quantityRequired,
                  unitOfMeasure: item.unitOfMeasure,
                  weightMg: item.weightMg ?? undefined,
                  estimatedCostPaise: BigInt(item.estimatedCostPaise),
                  wastagePercent: item.wastagePercent,
                  sortOrder: item.sortOrder,
                  createdBy: userId,
                  updatedBy: userId,
                })),
              },
            }
          : {}),
      },
      include: { items: { orderBy: { sortOrder: 'asc' } }, product: true },
    });

    return bom;
  }

  async activateBom(tenantId: string, userId: string, bomId: string) {
    const bom = await this.prisma.billOfMaterials.findFirst({
      where: this.tenantWhere(tenantId, { id: bomId }),
      include: { items: true },
    });
    if (!bom) throw new NotFoundException('BOM not found');
    if (bom.items.length === 0) throw new BadRequestException('BOM must have at least one item');

    return this.prisma.billOfMaterials.update({
      where: { id: bomId },
      data: { status: 'ACTIVE', updatedBy: userId },
      include: { items: { orderBy: { sortOrder: 'asc' } }, product: true },
    });
  }

  async archiveBom(tenantId: string, userId: string, bomId: string) {
    const bom = await this.prisma.billOfMaterials.findFirst({
      where: this.tenantWhere(tenantId, { id: bomId }),
    });
    if (!bom) throw new NotFoundException('BOM not found');

    return this.prisma.billOfMaterials.update({
      where: { id: bomId },
      data: { status: 'ARCHIVED', updatedBy: userId },
      include: { items: { orderBy: { sortOrder: 'asc' } }, product: true },
    });
  }

  async cloneBom(tenantId: string, userId: string, bomId: string) {
    const source = await this.prisma.billOfMaterials.findFirst({
      where: this.tenantWhere(tenantId, { id: bomId }),
      include: { items: true },
    });
    if (!source) throw new NotFoundException('BOM not found');

    return this.prisma.billOfMaterials.create({
      data: {
        tenantId,
        name: `${source.name} (Copy)`,
        version: source.version + 1,
        productId: source.productId,
        outputQuantity: source.outputQuantity,
        status: 'DRAFT',
        notes: source.notes,
        estimatedCostPaise: source.estimatedCostPaise,
        estimatedTimeMins: source.estimatedTimeMins,
        createdBy: userId,
        updatedBy: userId,
        items: {
          create: source.items.map((item) => ({
            tenantId,
            itemType: item.itemType,
            productId: item.productId,
            description: item.description,
            quantityRequired: item.quantityRequired,
            unitOfMeasure: item.unitOfMeasure,
            weightMg: item.weightMg,
            estimatedCostPaise: item.estimatedCostPaise,
            wastagePercent: item.wastagePercent,
            sortOrder: item.sortOrder,
            createdBy: userId,
            updatedBy: userId,
          })),
        },
      },
      include: { items: { orderBy: { sortOrder: 'asc' } }, product: true },
    });
  }

  async findAllBoms(tenantId: string, pagination: Pagination, filter?: BomFilter) {
    const where: Record<string, unknown> = { tenantId };
    if (filter?.status) where.status = filter.status;
    if (filter?.productId) where.productId = filter.productId;
    if (filter?.search) {
      where.name = { contains: filter.search };
    }

    const [items, total] = await Promise.all([
      this.prisma.billOfMaterials.findMany({
        where,
        include: { items: { orderBy: { sortOrder: 'asc' } }, product: true },
        orderBy: { [pagination.sortBy ?? 'createdAt']: pagination.sortOrder },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      }),
      this.prisma.billOfMaterials.count({ where }),
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

  async findBomById(tenantId: string, bomId: string) {
    const bom = await this.prisma.billOfMaterials.findFirst({
      where: this.tenantWhere(tenantId, { id: bomId }),
      include: {
        items: { orderBy: { sortOrder: 'asc' }, include: { product: true } },
        product: true,
      },
    });
    if (!bom) throw new NotFoundException('BOM not found');
    return bom;
  }

  async explodeBom(tenantId: string, bomId: string, quantity: number): Promise<MaterialRequisition> {
    const bom = await this.findBomById(tenantId, bomId);

    const items: MaterialRequisitionItem[] = bom.items.map((item) => {
      const baseWeightMg = item.weightMg ?? BigInt(0);
      const requiredWeightMg = baseWeightMg * BigInt(quantity);
      const wastageAddMg = (requiredWeightMg * BigInt(item.wastagePercent)) / BigInt(10000);
      const totalWithWastageMg = requiredWeightMg + wastageAddMg;

      return {
        productId: item.productId,
        productName: item.product?.name,
        description: item.description,
        itemType: item.itemType as any,
        requiredWeightMg,
        requiredQuantity: Number(item.quantityRequired) * quantity,
        unitOfMeasure: item.unitOfMeasure,
        wastagePercent: item.wastagePercent,
        totalWithWastageMg,
      };
    });

    return {
      bomId: bom.id,
      bomName: bom.name,
      quantity,
      items,
      totalEstimatedCostPaise: bom.estimatedCostPaise * BigInt(quantity),
    };
  }

  // ─── Job Orders ───────────────────────────────────────────────

  async createJobOrder(tenantId: string, userId: string, input: JobOrderInput) {
    // Generate job number
    const count = await this.prisma.jobOrder.count({ where: { tenantId } });
    const jobNumber = `JO-${String(count + 1).padStart(6, '0')}`;

    const job = await this.prisma.jobOrder.create({
      data: {
        tenantId,
        jobNumber,
        bomId: input.bomId ?? undefined,
        productId: input.productId,
        customerId: input.customerId ?? undefined,
        locationId: input.locationId,
        priority: input.priority,
        quantity: input.quantity,
        estimatedStartDate: input.estimatedStartDate ?? undefined,
        estimatedEndDate: input.estimatedEndDate ?? undefined,
        assignedKarigarId: input.assignedKarigarId ?? undefined,
        notes: input.notes ?? undefined,
        specialInstructions: input.specialInstructions ?? undefined,
        createdBy: userId,
        updatedBy: userId,
      },
      include: {
        product: true,
        customer: true,
        location: true,
        assignedKarigar: true,
        items: true,
        costs: true,
      },
    });

    // If BOM is specified, create job order items from BOM
    if (input.bomId) {
      const bom = await this.findBomById(tenantId, input.bomId);
      await this.prisma.jobOrderItem.createMany({
        data: bom.items.map((item) => ({
          tenantId,
          jobOrderId: job.id,
          bomItemId: item.id,
          productId: item.productId,
          description: item.description,
          requiredWeightMg: (item.weightMg ?? BigInt(0)) * BigInt(input.quantity),
          costPaise: item.estimatedCostPaise * BigInt(input.quantity),
          createdBy: userId,
          updatedBy: userId,
        })),
      });
    }

    await this.eventBus.publish({
      id: crypto.randomUUID(),
      tenantId,
      userId,
      timestamp: new Date().toISOString(),
      type: 'manufacturing.job.created',
      payload: {
        jobOrderId: job.id,
        productType: job.product.productType,
        estimatedCompletionDate: job.estimatedEndDate?.toISOString() ?? '',
      },
    });

    return this.findJobOrderById(tenantId, job.id);
  }

  async updateJobOrderStatus(tenantId: string, userId: string, jobId: string, input: JobOrderStatusUpdate) {
    const job = await this.prisma.jobOrder.findFirst({
      where: this.tenantWhere(tenantId, { id: jobId }),
    });
    if (!job) throw new NotFoundException('Job order not found');

    const currentStatus = job.status as MfgJobOrderStatus;
    const allowedTransitions = JOB_ORDER_TRANSITIONS[currentStatus];
    if (!allowedTransitions.includes(input.status)) {
      throw new BadRequestException(
        `Cannot transition from ${currentStatus} to ${input.status}. Allowed: ${allowedTransitions.join(', ') || 'none'}`,
      );
    }

    const updateData: Record<string, unknown> = {
      status: input.status,
      updatedBy: userId,
    };

    // Track actual dates based on status
    if (input.status === MfgJobOrderStatus.IN_PROGRESS && !job.actualStartDate) {
      updateData.actualStartDate = new Date();
    }
    if (input.status === MfgJobOrderStatus.COMPLETED) {
      updateData.actualEndDate = new Date();
    }

    if (input.notes) {
      updateData.notes = input.notes;
    }

    const updated = await this.prisma.jobOrder.update({
      where: { id: jobId },
      data: updateData,
      include: { product: true },
    });

    if (input.status === MfgJobOrderStatus.COMPLETED) {
      await this.eventBus.publish({
        id: crypto.randomUUID(),
        tenantId,
        userId,
        timestamp: new Date().toISOString(),
        type: 'manufacturing.job.completed',
        payload: {
          jobOrderId: job.id,
          outputProductId: job.productId,
          actualWeightMg: 0, // Will be set by QC
        },
      });
    }

    return this.findJobOrderById(tenantId, jobId);
  }

  async assignKarigar(tenantId: string, userId: string, jobId: string, karigarId: string) {
    const job = await this.prisma.jobOrder.findFirst({
      where: this.tenantWhere(tenantId, { id: jobId }),
    });
    if (!job) throw new NotFoundException('Job order not found');

    const karigar = await this.prisma.karigar.findFirst({
      where: this.tenantWhere(tenantId, { id: karigarId, isActive: true }),
    });
    if (!karigar) throw new NotFoundException('Karigar not found or inactive');

    return this.prisma.jobOrder.update({
      where: { id: jobId },
      data: { assignedKarigarId: karigarId, updatedBy: userId },
      include: { product: true, assignedKarigar: true, location: true },
    });
  }

  async cancelJobOrder(tenantId: string, userId: string, jobId: string, reason?: string) {
    return this.updateJobOrderStatus(tenantId, userId, jobId, {
      status: MfgJobOrderStatus.CANCELLED,
      notes: reason,
    });
  }

  async findAllJobOrders(tenantId: string, pagination: Pagination, filter?: JobOrderFilter) {
    const where: Record<string, unknown> = { tenantId };
    if (filter?.status) where.status = filter.status;
    if (filter?.priority) where.priority = filter.priority;
    if (filter?.locationId) where.locationId = filter.locationId;
    if (filter?.karigarId) where.assignedKarigarId = filter.karigarId;
    if (filter?.customerId) where.customerId = filter.customerId;
    if (filter?.search) {
      where.OR = [
        { jobNumber: { contains: filter.search } },
        { notes: { contains: filter.search } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.jobOrder.findMany({
        where,
        include: {
          product: true,
          customer: true,
          location: true,
          assignedKarigar: true,
        },
        orderBy: { [pagination.sortBy ?? 'createdAt']: pagination.sortOrder },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      }),
      this.prisma.jobOrder.count({ where }),
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

  async findJobOrderById(tenantId: string, jobId: string) {
    const job = await this.prisma.jobOrder.findFirst({
      where: this.tenantWhere(tenantId, { id: jobId }),
      include: {
        product: true,
        customer: true,
        location: true,
        assignedKarigar: true,
        bom: { include: { items: true } },
        items: { include: { product: true } },
        costs: true,
        qualityCheckpoints: { orderBy: { checkedAt: 'desc' } },
        karigarTransactions: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!job) throw new NotFoundException('Job order not found');
    return job;
  }

  async getJobCost(tenantId: string, jobId: string) {
    const job = await this.prisma.jobOrder.findFirst({
      where: this.tenantWhere(tenantId, { id: jobId }),
      include: { costs: true, items: true },
    });
    if (!job) throw new NotFoundException('Job order not found');

    const costsByType = job.costs.reduce(
      (acc, cost) => {
        const type = cost.costType as string;
        acc[type] = (acc[type] ?? BigInt(0)) + cost.amountPaise;
        return acc;
      },
      {} as Record<string, bigint>,
    );

    const totalCostPaise = Object.values(costsByType).reduce((a, b) => a + b, BigInt(0));

    return {
      jobOrderId: jobId,
      jobNumber: job.jobNumber,
      costsByType,
      totalCostPaise,
      itemCount: job.items.length,
      costEntryCount: job.costs.length,
    };
  }

  async addJobCost(
    tenantId: string,
    userId: string,
    jobId: string,
    costType: JobCostType,
    description: string,
    amountPaise: bigint,
    weightMg?: bigint,
  ) {
    const job = await this.prisma.jobOrder.findFirst({
      where: this.tenantWhere(tenantId, { id: jobId }),
    });
    if (!job) throw new NotFoundException('Job order not found');

    return this.prisma.jobCost.create({
      data: {
        tenantId,
        jobOrderId: jobId,
        costType,
        description,
        amountPaise,
        weightMg: weightMg ?? undefined,
        createdBy: userId,
        updatedBy: userId,
      },
    });
  }

  // ─── Material Requisition ─────────────────────────────────────

  async generateRequisitionFromBom(tenantId: string, bomId: string, quantity: number) {
    return this.explodeBom(tenantId, bomId, quantity);
  }

  async generateRequisitionFromPlan(tenantId: string, planId: string) {
    const plan = await this.prisma.productionPlan.findFirst({
      where: this.tenantWhere(tenantId, { id: planId }),
      include: { items: { include: { product: true } } },
    });
    if (!plan) throw new NotFoundException('Production plan not found');

    const requisitions: MaterialRequisition[] = [];
    for (const item of plan.items) {
      if (item.bomId) {
        const req = await this.explodeBom(tenantId, item.bomId, item.quantity);
        requisitions.push(req);
      }
    }
    return requisitions;
  }

  // ─── Dashboard ────────────────────────────────────────────────

  async getDashboard(tenantId: string): Promise<ManufacturingDashboardResponse> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const activeStatuses: MfgJobOrderStatus[] = [
      MfgJobOrderStatus.PLANNED,
      MfgJobOrderStatus.MATERIAL_ISSUED,
      MfgJobOrderStatus.IN_PROGRESS,
      MfgJobOrderStatus.QC_PENDING,
    ];

    const [activeJobs, pendingQc, completedToday, allJobs, totalKarigars, busyKarigars] =
      await Promise.all([
        this.prisma.jobOrder.count({
          where: { tenantId, status: { in: activeStatuses } },
        }),
        this.prisma.jobOrder.count({
          where: { tenantId, status: MfgJobOrderStatus.QC_PENDING },
        }),
        this.prisma.jobOrder.count({
          where: {
            tenantId,
            status: MfgJobOrderStatus.COMPLETED,
            actualEndDate: { gte: today, lt: tomorrow },
          },
        }),
        this.prisma.jobOrder.groupBy({
          by: ['status'],
          where: { tenantId },
          _count: true,
        }),
        this.prisma.karigar.count({
          where: { tenantId, isActive: true },
        }),
        this.prisma.karigar.count({
          where: {
            tenantId,
            isActive: true,
            jobOrders: { some: { status: { in: activeStatuses } } },
          },
        }),
      ]);

    // Calculate WIP value from active job costs
    const wipCosts = await this.prisma.jobCost.aggregate({
      where: {
        tenantId,
        jobOrder: { status: { in: activeStatuses } },
      },
      _sum: { amountPaise: true },
    });

    const jobsByStatus = Object.values(MfgJobOrderStatus).reduce(
      (acc, status) => {
        const found = allJobs.find((j) => j.status === status);
        acc[status] = found?._count ?? 0;
        return acc;
      },
      {} as Record<MfgJobOrderStatus, number>,
    );

    const karigarUtilization = totalKarigars > 0
      ? Math.round((busyKarigars / totalKarigars) * 100)
      : 0;

    return {
      activeJobs,
      karigarUtilization,
      wipValuePaise: wipCosts._sum.amountPaise ?? BigInt(0),
      pendingQc,
      completedToday,
      jobsByStatus,
    };
  }
}
