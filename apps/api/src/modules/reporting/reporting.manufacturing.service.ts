// ─── Reporting Manufacturing Service ──────────────────────────
// Job summary, karigar performance, material usage, wastage, timelines, cost analysis.

import { Injectable } from '@nestjs/common';
import { TenantAwareService } from '../../common/base.service';
import { PrismaService } from '../../common/prisma.service';
import type {
  JobSummaryRow,
  KarigarPerformanceRow,
  MaterialUsageRow,
  WastageRow,
  ProductionTimelineRow,
  CostAnalysisRow,
  ManufacturingReportResponse,
  DateRange,
} from '@caratflow/shared-types';

@Injectable()
export class ReportingManufacturingService extends TenantAwareService {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  /**
   * Job summary: completed, in progress, overdue.
   */
  async jobSummary(
    tenantId: string,
    dateRange: DateRange,
    locationId?: string,
  ): Promise<ManufacturingReportResponse> {
    const where = {
      tenantId,
      createdAt: { gte: dateRange.from, lte: dateRange.to },
      ...(locationId ? { locationId } : {}),
    };

    const jobs = await this.prisma.jobOrder.groupBy({
      by: ['status'],
      where,
      _count: { id: true },
    });

    const allJobs = await this.prisma.jobOrder.findMany({
      where,
      select: {
        status: true,
        bom: { select: { estimatedCostPaise: true } },
      },
    });

    const statusMap = new Map<string, { count: number; estimatedCostPaise: number }>();
    for (const job of allJobs) {
      const existing = statusMap.get(job.status) ?? { count: 0, estimatedCostPaise: 0 };
      existing.count += 1;
      existing.estimatedCostPaise += Number(job.bom?.estimatedCostPaise ?? 0);
      statusMap.set(job.status, existing);
    }

    const jobSummary: JobSummaryRow[] = Array.from(statusMap.entries()).map(
      ([status, data]) => ({
        status,
        count: data.count,
        totalEstimatedCostPaise: data.estimatedCostPaise,
      }),
    );

    const totalJobs = jobs.reduce((sum, j) => sum + j._count.id, 0);
    const completedJobs =
      jobs.find((j) => j.status === 'COMPLETED')?._count.id ?? 0;

    // Count overdue: jobs with estimated_end_date < now and status not completed/cancelled
    const overdueJobs = await this.prisma.jobOrder.count({
      where: {
        ...where,
        estimatedEndDate: { lt: new Date() },
        status: { notIn: ['COMPLETED', 'CANCELLED'] },
      },
    });

    return {
      jobSummary,
      totalJobs,
      completedJobs,
      overdueJobs,
    };
  }

  /**
   * Karigar performance: jobs completed, wastage %, on-time %.
   */
  async karigarPerformance(
    tenantId: string,
    dateRange: DateRange,
  ): Promise<KarigarPerformanceRow[]> {
    const karigars = await this.prisma.karigar.findMany({
      where: { tenantId, isActive: true },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        jobOrders: {
          where: {
            createdAt: { gte: dateRange.from, lte: dateRange.to },
          },
          select: {
            status: true,
            estimatedEndDate: true,
            actualEndDate: true,
            items: {
              select: {
                issuedWeightMg: true,
                returnedWeightMg: true,
                wastedWeightMg: true,
              },
            },
          },
        },
      },
    });

    return karigars
      .filter((k) => k.jobOrders.length > 0)
      .map((karigar) => {
        const completed = karigar.jobOrders.filter(
          (j) => j.status === 'COMPLETED',
        );

        let totalIssued = 0;
        let totalWasted = 0;
        let totalProcessed = 0;

        for (const job of karigar.jobOrders) {
          for (const item of job.items) {
            totalIssued += Number(item.issuedWeightMg);
            totalWasted += Number(item.wastedWeightMg);
            totalProcessed += Number(item.issuedWeightMg);
          }
        }

        // Calculate on-time %
        let onTimeCount = 0;
        let totalCompletionDays = 0;
        for (const job of completed) {
          if (job.actualEndDate && job.estimatedEndDate) {
            if (job.actualEndDate <= job.estimatedEndDate) {
              onTimeCount++;
            }
            totalCompletionDays += Math.ceil(
              (job.actualEndDate.getTime() - job.estimatedEndDate.getTime()) / 86400000,
            );
          }
        }

        return {
          karigarId: karigar.id,
          karigarName: `${karigar.firstName} ${karigar.lastName}`,
          jobsCompleted: completed.length,
          totalWeightProcessedMg: totalProcessed,
          totalWastageMg: totalWasted,
          wastagePercent:
            totalIssued > 0
              ? Math.round((totalWasted / totalIssued) * 10000) / 100
              : 0,
          avgCompletionDays:
            completed.length > 0
              ? Math.round(totalCompletionDays / completed.length)
              : 0,
          onTimePercent:
            completed.length > 0
              ? Math.round((onTimeCount / completed.length) * 10000) / 100
              : 0,
        };
      })
      .sort((a, b) => b.jobsCompleted - a.jobsCompleted);
  }

  /**
   * Material usage: metal issued vs returned vs wasted.
   */
  async materialUsageReport(
    tenantId: string,
    dateRange: DateRange,
  ): Promise<MaterialUsageRow[]> {
    const transactions = await this.prisma.karigarTransaction.findMany({
      where: {
        tenantId,
        createdAt: { gte: dateRange.from, lte: dateRange.to },
      },
      select: {
        transactionType: true,
        metalType: true,
        purityFineness: true,
        weightMg: true,
      },
    });

    const materialMap = new Map<
      string,
      { metalType: string; purity: number; issued: number; returned: number; wasted: number }
    >();

    for (const txn of transactions) {
      const key = `${txn.metalType}-${txn.purityFineness}`;
      const existing = materialMap.get(key) ?? {
        metalType: txn.metalType,
        purity: txn.purityFineness,
        issued: 0,
        returned: 0,
        wasted: 0,
      };

      const weight = Number(txn.weightMg);
      switch (txn.transactionType) {
        case 'ISSUE':
          existing.issued += weight;
          break;
        case 'RETURN':
          existing.returned += weight;
          break;
        case 'WASTAGE':
          existing.wasted += weight;
          break;
      }
      materialMap.set(key, existing);
    }

    return Array.from(materialMap.values()).map((m) => ({
      metalType: m.metalType,
      purityFineness: m.purity,
      issuedWeightMg: m.issued,
      returnedWeightMg: m.returned,
      wastedWeightMg: m.wasted,
      utilizationPercent:
        m.issued > 0
          ? Math.round(((m.issued - m.wasted) / m.issued) * 10000) / 100
          : 0,
    }));
  }

  /**
   * Wastage report: wastage by karigar, by product type.
   */
  async wastageReport(
    tenantId: string,
    dateRange: DateRange,
  ): Promise<WastageRow[]> {
    const transactions = await this.prisma.karigarTransaction.findMany({
      where: {
        tenantId,
        createdAt: { gte: dateRange.from, lte: dateRange.to },
      },
      select: {
        karigarId: true,
        transactionType: true,
        metalType: true,
        weightMg: true,
        karigar: { select: { firstName: true, lastName: true } },
      },
    });

    const wastageMap = new Map<
      string,
      { karigarId: string; name: string; metal: string; issued: number; wasted: number }
    >();

    for (const txn of transactions) {
      const key = `${txn.karigarId}-${txn.metalType}`;
      const existing = wastageMap.get(key) ?? {
        karigarId: txn.karigarId,
        name: `${txn.karigar.firstName} ${txn.karigar.lastName}`,
        metal: txn.metalType,
        issued: 0,
        wasted: 0,
      };

      const weight = Number(txn.weightMg);
      if (txn.transactionType === 'ISSUE') existing.issued += weight;
      if (txn.transactionType === 'WASTAGE') existing.wasted += weight;
      wastageMap.set(key, existing);
    }

    return Array.from(wastageMap.values())
      .map((w) => ({
        karigarId: w.karigarId,
        karigarName: w.name,
        metalType: w.metal,
        issuedWeightMg: w.issued,
        wastedWeightMg: w.wasted,
        wastagePercent:
          w.issued > 0
            ? Math.round((w.wasted / w.issued) * 10000) / 100
            : 0,
      }))
      .sort((a, b) => b.wastagePercent - a.wastagePercent);
  }

  /**
   * Production timeline: planned vs actual dates.
   */
  async productionTimeline(
    tenantId: string,
    dateRange: DateRange,
  ): Promise<ProductionTimelineRow[]> {
    const jobs = await this.prisma.jobOrder.findMany({
      where: {
        tenantId,
        createdAt: { gte: dateRange.from, lte: dateRange.to },
      },
      select: {
        id: true,
        jobNumber: true,
        estimatedStartDate: true,
        estimatedEndDate: true,
        actualStartDate: true,
        actualEndDate: true,
        product: { select: { name: true } },
        assignedKarigar: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return jobs.map((job) => {
      let daysVariance: number | null = null;
      if (job.actualEndDate && job.estimatedEndDate) {
        daysVariance = Math.ceil(
          (job.actualEndDate.getTime() - job.estimatedEndDate.getTime()) / 86400000,
        );
      }

      return {
        jobOrderId: job.id,
        jobNumber: job.jobNumber,
        productName: job.product.name,
        karigarName: job.assignedKarigar
          ? `${job.assignedKarigar.firstName} ${job.assignedKarigar.lastName}`
          : null,
        estimatedStartDate: job.estimatedStartDate?.toISOString().split('T')[0] ?? null,
        estimatedEndDate: job.estimatedEndDate?.toISOString().split('T')[0] ?? null,
        actualStartDate: job.actualStartDate?.toISOString().split('T')[0] ?? null,
        actualEndDate: job.actualEndDate?.toISOString().split('T')[0] ?? null,
        daysVariance,
      };
    });
  }

  /**
   * Cost analysis: actual vs estimated cost by job.
   */
  async costAnalysis(
    tenantId: string,
    dateRange: DateRange,
  ): Promise<CostAnalysisRow[]> {
    const jobs = await this.prisma.jobOrder.findMany({
      where: {
        tenantId,
        status: 'COMPLETED',
        createdAt: { gte: dateRange.from, lte: dateRange.to },
      },
      select: {
        id: true,
        jobNumber: true,
        product: { select: { name: true } },
        bom: { select: { estimatedCostPaise: true } },
        costs: { select: { amountPaise: true } },
      },
    });

    return jobs
      .map((job) => {
        const estimatedCost = Number(job.bom?.estimatedCostPaise ?? 0);
        const actualCost = job.costs.reduce(
          (sum, c) => sum + Number(c.amountPaise),
          0,
        );
        const variance = actualCost - estimatedCost;

        return {
          jobOrderId: job.id,
          jobNumber: job.jobNumber,
          productName: job.product.name,
          estimatedCostPaise: estimatedCost,
          actualCostPaise: actualCost,
          variancePaise: variance,
          variancePercent:
            estimatedCost > 0
              ? Math.round((variance / estimatedCost) * 10000) / 100
              : 0,
        };
      })
      .sort((a, b) => Math.abs(b.variancePercent) - Math.abs(a.variancePercent));
  }
}
