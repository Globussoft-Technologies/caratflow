import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { TenantAwareService } from '../../common/base.service';
import { PrismaService } from '../../common/prisma.service';
import {
  type KarigarInput,
  type KarigarAttendanceInput,
  type KarigarTransactionInput,
  type KarigarFilter,
  type KarigarMetalBalanceResponse,
  KarigarTransactionType,
  AttendanceStatus,
} from '@caratflow/shared-types';
import type { Pagination, PaginatedResult } from '@caratflow/shared-types';

@Injectable()
export class ManufacturingKarigarService extends TenantAwareService {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  // ─── CRUD ─────────────────────────────────────────────────────

  async createKarigar(tenantId: string, userId: string, input: KarigarInput) {
    const existing = await this.prisma.karigar.findFirst({
      where: this.tenantWhere(tenantId, { employeeCode: input.employeeCode }),
    });
    if (existing) throw new BadRequestException('Employee code already exists');

    return this.prisma.karigar.create({
      data: {
        tenantId,
        ...input,
        joiningDate: input.joiningDate ?? undefined,
        dailyWagePaise: BigInt(input.dailyWagePaise),
        createdBy: userId,
        updatedBy: userId,
      },
      include: { location: true },
    });
  }

  async updateKarigar(tenantId: string, userId: string, karigarId: string, input: Partial<KarigarInput>) {
    const karigar = await this.prisma.karigar.findFirst({
      where: this.tenantWhere(tenantId, { id: karigarId }),
    });
    if (!karigar) throw new NotFoundException('Karigar not found');

    const data: Record<string, unknown> = { ...input, updatedBy: userId };
    if (input.dailyWagePaise !== undefined) {
      data.dailyWagePaise = BigInt(input.dailyWagePaise);
    }

    return this.prisma.karigar.update({
      where: { id: karigarId },
      data,
      include: { location: true },
    });
  }

  async findKarigarById(tenantId: string, karigarId: string) {
    const karigar = await this.prisma.karigar.findFirst({
      where: this.tenantWhere(tenantId, { id: karigarId }),
      include: {
        location: true,
        jobOrders: {
          where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } },
          include: { product: true },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        metalBalances: true,
      },
    });
    if (!karigar) throw new NotFoundException('Karigar not found');
    return karigar;
  }

  async findAllKarigars(tenantId: string, pagination: Pagination, filter?: KarigarFilter) {
    const where: Record<string, unknown> = { tenantId };
    if (filter?.locationId) where.locationId = filter.locationId;
    if (filter?.skillLevel) where.skillLevel = filter.skillLevel;
    if (filter?.isActive !== undefined) where.isActive = filter.isActive;
    if (filter?.search) {
      where.OR = [
        { firstName: { contains: filter.search } },
        { lastName: { contains: filter.search } },
        { employeeCode: { contains: filter.search } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.karigar.findMany({
        where,
        include: {
          location: true,
          jobOrders: {
            where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } },
            take: 1,
            select: { id: true, jobNumber: true },
          },
        },
        orderBy: { [pagination.sortBy ?? 'firstName']: pagination.sortOrder },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      }),
      this.prisma.karigar.count({ where }),
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

  // ─── Attendance ───────────────────────────────────────────────

  async recordAttendance(tenantId: string, userId: string, input: KarigarAttendanceInput) {
    const karigar = await this.prisma.karigar.findFirst({
      where: this.tenantWhere(tenantId, { id: input.karigarId }),
    });
    if (!karigar) throw new NotFoundException('Karigar not found');

    // Calculate wage based on attendance status
    let wagePaidPaise = BigInt(input.wagePaidPaise);
    if (wagePaidPaise === BigInt(0)) {
      switch (input.status) {
        case AttendanceStatus.PRESENT:
          wagePaidPaise = karigar.dailyWagePaise;
          break;
        case AttendanceStatus.HALF_DAY:
          wagePaidPaise = karigar.dailyWagePaise / BigInt(2);
          break;
        default:
          wagePaidPaise = BigInt(0);
      }
    }

    return this.prisma.karigarAttendance.upsert({
      where: {
        tenantId_karigarId_date: {
          tenantId,
          karigarId: input.karigarId,
          date: input.date,
        },
      },
      create: {
        tenantId,
        karigarId: input.karigarId,
        date: input.date,
        status: input.status,
        checkInTime: input.checkInTime ?? undefined,
        checkOutTime: input.checkOutTime ?? undefined,
        overtimeMinutes: input.overtimeMinutes,
        wagePaidPaise,
        createdBy: userId,
        updatedBy: userId,
      },
      update: {
        status: input.status,
        checkInTime: input.checkInTime ?? undefined,
        checkOutTime: input.checkOutTime ?? undefined,
        overtimeMinutes: input.overtimeMinutes,
        wagePaidPaise,
        updatedBy: userId,
      },
    });
  }

  async getAttendanceReport(tenantId: string, karigarId: string, from: Date, to: Date) {
    const records = await this.prisma.karigarAttendance.findMany({
      where: {
        tenantId,
        karigarId,
        date: { gte: from, lte: to },
      },
      orderBy: { date: 'asc' },
    });

    const summary = {
      present: 0,
      absent: 0,
      halfDay: 0,
      leave: 0,
      totalOvertimeMinutes: 0,
      totalWagePaidPaise: BigInt(0),
    };

    for (const record of records) {
      switch (record.status) {
        case 'PRESENT':
          summary.present++;
          break;
        case 'ABSENT':
          summary.absent++;
          break;
        case 'HALF_DAY':
          summary.halfDay++;
          break;
        case 'LEAVE':
          summary.leave++;
          break;
      }
      summary.totalOvertimeMinutes += record.overtimeMinutes;
      summary.totalWagePaidPaise += record.wagePaidPaise;
    }

    return { records, summary };
  }

  // ─── Metal Transactions ───────────────────────────────────────

  async issueMetal(tenantId: string, userId: string, input: KarigarTransactionInput) {
    if (input.transactionType !== KarigarTransactionType.ISSUE) {
      throw new BadRequestException('Transaction type must be ISSUE');
    }

    return this.prisma.$transaction(async (tx) => {
      // Create transaction record
      const transaction = await tx.karigarTransaction.create({
        data: {
          tenantId,
          karigarId: input.karigarId,
          transactionType: input.transactionType,
          jobOrderId: input.jobOrderId ?? undefined,
          metalType: input.metalType,
          purityFineness: input.purityFineness,
          weightMg: BigInt(input.weightMg),
          notes: input.notes ?? undefined,
          createdBy: userId,
          updatedBy: userId,
        },
      });

      // Upsert metal balance
      const balanceKey = {
        tenantId_karigarId_metalType_purityFineness: {
          tenantId,
          karigarId: input.karigarId,
          metalType: input.metalType,
          purityFineness: input.purityFineness,
        },
      };

      await tx.karigarMetalBalance.upsert({
        where: balanceKey,
        create: {
          tenantId,
          karigarId: input.karigarId,
          metalType: input.metalType,
          purityFineness: input.purityFineness,
          issuedWeightMg: BigInt(input.weightMg),
          balanceWeightMg: BigInt(input.weightMg),
          createdBy: userId,
          updatedBy: userId,
        },
        update: {
          issuedWeightMg: { increment: BigInt(input.weightMg) },
          balanceWeightMg: { increment: BigInt(input.weightMg) },
          updatedBy: userId,
        },
      });

      return transaction;
    });
  }

  async recordReturn(tenantId: string, userId: string, input: KarigarTransactionInput) {
    if (input.transactionType !== KarigarTransactionType.RETURN) {
      throw new BadRequestException('Transaction type must be RETURN');
    }

    return this.prisma.$transaction(async (tx) => {
      // Verify balance
      const balance = await tx.karigarMetalBalance.findUnique({
        where: {
          tenantId_karigarId_metalType_purityFineness: {
            tenantId,
            karigarId: input.karigarId,
            metalType: input.metalType,
            purityFineness: input.purityFineness,
          },
        },
      });

      if (!balance || balance.balanceWeightMg < BigInt(input.weightMg)) {
        throw new BadRequestException('Return weight exceeds balance');
      }

      const transaction = await tx.karigarTransaction.create({
        data: {
          tenantId,
          karigarId: input.karigarId,
          transactionType: input.transactionType,
          jobOrderId: input.jobOrderId ?? undefined,
          metalType: input.metalType,
          purityFineness: input.purityFineness,
          weightMg: BigInt(input.weightMg),
          notes: input.notes ?? undefined,
          createdBy: userId,
          updatedBy: userId,
        },
      });

      await tx.karigarMetalBalance.update({
        where: {
          tenantId_karigarId_metalType_purityFineness: {
            tenantId,
            karigarId: input.karigarId,
            metalType: input.metalType,
            purityFineness: input.purityFineness,
          },
        },
        data: {
          returnedWeightMg: { increment: BigInt(input.weightMg) },
          balanceWeightMg: { decrement: BigInt(input.weightMg) },
          updatedBy: userId,
        },
      });

      return transaction;
    });
  }

  async recordWastage(tenantId: string, userId: string, input: KarigarTransactionInput) {
    if (input.transactionType !== KarigarTransactionType.WASTAGE) {
      throw new BadRequestException('Transaction type must be WASTAGE');
    }

    return this.prisma.$transaction(async (tx) => {
      const balance = await tx.karigarMetalBalance.findUnique({
        where: {
          tenantId_karigarId_metalType_purityFineness: {
            tenantId,
            karigarId: input.karigarId,
            metalType: input.metalType,
            purityFineness: input.purityFineness,
          },
        },
      });

      if (!balance || balance.balanceWeightMg < BigInt(input.weightMg)) {
        throw new BadRequestException('Wastage weight exceeds balance');
      }

      const transaction = await tx.karigarTransaction.create({
        data: {
          tenantId,
          karigarId: input.karigarId,
          transactionType: input.transactionType,
          jobOrderId: input.jobOrderId ?? undefined,
          metalType: input.metalType,
          purityFineness: input.purityFineness,
          weightMg: BigInt(input.weightMg),
          notes: input.notes ?? undefined,
          createdBy: userId,
          updatedBy: userId,
        },
      });

      await tx.karigarMetalBalance.update({
        where: {
          tenantId_karigarId_metalType_purityFineness: {
            tenantId,
            karigarId: input.karigarId,
            metalType: input.metalType,
            purityFineness: input.purityFineness,
          },
        },
        data: {
          wastedWeightMg: { increment: BigInt(input.weightMg) },
          balanceWeightMg: { decrement: BigInt(input.weightMg) },
          updatedBy: userId,
        },
      });

      return transaction;
    });
  }

  async getMetalBalanceSummary(tenantId: string, karigarId: string): Promise<KarigarMetalBalanceResponse[]> {
    const karigar = await this.prisma.karigar.findFirst({
      where: this.tenantWhere(tenantId, { id: karigarId }),
    });
    if (!karigar) throw new NotFoundException('Karigar not found');

    const balances = await this.prisma.karigarMetalBalance.findMany({
      where: { tenantId, karigarId },
      orderBy: [{ metalType: 'asc' }, { purityFineness: 'desc' }],
    });

    return balances.map((b) => ({
      id: b.id,
      karigarId: b.karigarId,
      karigarName: `${karigar.firstName} ${karigar.lastName}`,
      metalType: b.metalType as any,
      purityFineness: b.purityFineness,
      issuedWeightMg: b.issuedWeightMg,
      returnedWeightMg: b.returnedWeightMg,
      wastedWeightMg: b.wastedWeightMg,
      balanceWeightMg: b.balanceWeightMg,
      lastReconciledAt: b.lastReconciledAt,
    }));
  }

  async getTransactionHistory(tenantId: string, karigarId: string, from?: Date, to?: Date) {
    const where: Record<string, unknown> = { tenantId, karigarId };
    if (from || to) {
      where.createdAt = {};
      if (from) (where.createdAt as Record<string, unknown>).gte = from;
      if (to) (where.createdAt as Record<string, unknown>).lte = to;
    }

    return this.prisma.karigarTransaction.findMany({
      where,
      include: { jobOrder: { select: { id: true, jobNumber: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── Payment Calculation ──────────────────────────────────────

  async calculatePayment(tenantId: string, karigarId: string, from: Date, to: Date) {
    const { summary } = await this.getAttendanceReport(tenantId, karigarId, from, to);
    return {
      karigarId,
      from,
      to,
      daysPresent: summary.present,
      daysHalfDay: summary.halfDay,
      daysAbsent: summary.absent,
      daysLeave: summary.leave,
      totalOvertimeMinutes: summary.totalOvertimeMinutes,
      totalWagePaidPaise: summary.totalWagePaidPaise,
    };
  }

  // ─── Performance Metrics ──────────────────────────────────────

  async getPerformanceMetrics(tenantId: string, karigarId: string) {
    const [completedJobs, totalJobs, transactions] = await Promise.all([
      this.prisma.jobOrder.count({
        where: { tenantId, assignedKarigarId: karigarId, status: 'COMPLETED' },
      }),
      this.prisma.jobOrder.count({
        where: { tenantId, assignedKarigarId: karigarId },
      }),
      this.prisma.karigarTransaction.findMany({
        where: { tenantId, karigarId },
      }),
    ]);

    let totalIssuedMg = BigInt(0);
    let totalWastedMg = BigInt(0);

    for (const tx of transactions) {
      if (tx.transactionType === 'ISSUE') totalIssuedMg += tx.weightMg;
      if (tx.transactionType === 'WASTAGE') totalWastedMg += tx.weightMg;
    }

    const wastagePercent =
      totalIssuedMg > BigInt(0)
        ? Number((totalWastedMg * BigInt(10000)) / totalIssuedMg) / 100
        : 0;

    // Calculate average completion time for completed jobs
    const completedJobsList = await this.prisma.jobOrder.findMany({
      where: {
        tenantId,
        assignedKarigarId: karigarId,
        status: 'COMPLETED',
        actualStartDate: { not: null },
        actualEndDate: { not: null },
      },
      select: { actualStartDate: true, actualEndDate: true },
    });

    let avgCompletionDays = 0;
    if (completedJobsList.length > 0) {
      const totalDays = completedJobsList.reduce((sum, job) => {
        const start = job.actualStartDate!.getTime();
        const end = job.actualEndDate!.getTime();
        return sum + (end - start) / (1000 * 60 * 60 * 24);
      }, 0);
      avgCompletionDays = Math.round((totalDays / completedJobsList.length) * 10) / 10;
    }

    return {
      karigarId,
      totalJobs,
      completedJobs,
      completionRate: totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : 0,
      wastagePercent,
      avgCompletionDays,
      totalIssuedMg,
      totalWastedMg,
    };
  }
}
