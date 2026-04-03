import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { TenantAwareService } from '../../common/base.service';
import { PrismaService } from '../../common/prisma.service';
import {
  type QualityCheckpointInput,
  QcStatus,
  MfgJobOrderStatus,
  JOB_ORDER_TRANSITIONS,
} from '@caratflow/shared-types';

@Injectable()
export class ManufacturingQcService extends TenantAwareService {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async recordCheckpoint(tenantId: string, userId: string, input: QualityCheckpointInput) {
    const job = await this.prisma.jobOrder.findFirst({
      where: this.tenantWhere(tenantId, { id: input.jobOrderId }),
    });
    if (!job) throw new NotFoundException('Job order not found');

    const checkpoint = await this.prisma.qualityCheckpoint.create({
      data: {
        tenantId,
        jobOrderId: input.jobOrderId,
        checkpointType: input.checkpointType,
        checkedBy: input.checkedBy,
        status: input.status,
        weightMg: input.weightMg ? BigInt(input.weightMg) : undefined,
        purityFineness: input.purityFineness ?? undefined,
        findings: input.findings ?? undefined,
        images: input.images ?? undefined,
        createdBy: userId,
        updatedBy: userId,
      },
      include: {
        jobOrder: { select: { id: true, jobNumber: true } },
      },
    });

    return checkpoint;
  }

  async passJob(tenantId: string, userId: string, jobId: string) {
    const job = await this.prisma.jobOrder.findFirst({
      where: this.tenantWhere(tenantId, { id: jobId }),
    });
    if (!job) throw new NotFoundException('Job order not found');

    const currentStatus = job.status as MfgJobOrderStatus;
    if (currentStatus !== MfgJobOrderStatus.QC_PENDING) {
      throw new BadRequestException(`Job must be in QC_PENDING status, currently: ${currentStatus}`);
    }

    return this.prisma.jobOrder.update({
      where: { id: jobId },
      data: { status: MfgJobOrderStatus.QC_PASSED, updatedBy: userId },
      include: { product: true },
    });
  }

  async failJob(tenantId: string, userId: string, jobId: string, findings?: string) {
    const job = await this.prisma.jobOrder.findFirst({
      where: this.tenantWhere(tenantId, { id: jobId }),
    });
    if (!job) throw new NotFoundException('Job order not found');

    const currentStatus = job.status as MfgJobOrderStatus;
    if (currentStatus !== MfgJobOrderStatus.QC_PENDING) {
      throw new BadRequestException(`Job must be in QC_PENDING status, currently: ${currentStatus}`);
    }

    return this.prisma.jobOrder.update({
      where: { id: jobId },
      data: {
        status: MfgJobOrderStatus.QC_FAILED,
        notes: findings ? `QC Failed: ${findings}` : 'QC Failed',
        updatedBy: userId,
      },
      include: { product: true },
    });
  }

  async getQcHistory(tenantId: string, jobId: string) {
    const job = await this.prisma.jobOrder.findFirst({
      where: this.tenantWhere(tenantId, { id: jobId }),
    });
    if (!job) throw new NotFoundException('Job order not found');

    return this.prisma.qualityCheckpoint.findMany({
      where: { tenantId, jobOrderId: jobId },
      orderBy: { checkedAt: 'desc' },
    });
  }

  async getPendingQcJobs(tenantId: string) {
    return this.prisma.jobOrder.findMany({
      where: {
        tenantId,
        status: MfgJobOrderStatus.QC_PENDING,
      },
      include: {
        product: true,
        assignedKarigar: true,
        location: true,
        qualityCheckpoints: { orderBy: { checkedAt: 'desc' }, take: 1 },
      },
      orderBy: { updatedAt: 'asc' },
    });
  }

  async getRecentQcResults(tenantId: string, limit: number = 20) {
    return this.prisma.qualityCheckpoint.findMany({
      where: { tenantId },
      include: {
        jobOrder: {
          select: { id: true, jobNumber: true, product: { select: { name: true } } },
        },
      },
      orderBy: { checkedAt: 'desc' },
      take: limit,
    });
  }
}
