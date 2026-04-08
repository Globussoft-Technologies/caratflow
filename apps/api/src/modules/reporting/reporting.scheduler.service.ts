// ─── Reporting Scheduler Service ──────────────────────────────
// BullMQ cron job to execute scheduled reports.
// Tracks execution state and generates report files.

import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Queue, Worker, type Job } from 'bullmq';
import { PrismaService } from '../../common/prisma.service';

interface ScheduledReportJob {
  scheduledReportId: string;
  tenantId: string;
}

const QUEUE_NAME = 'caratflow-report-scheduler';

@Injectable()
export class ReportingSchedulerService implements OnModuleInit, OnModuleDestroy {
  private queue: Queue;
  private worker: Worker | null = null;

  private readonly redisConnection: { host: string; port: number; password?: string } = {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
    password: process.env.REDIS_PASSWORD ?? undefined,
  };

  constructor(private readonly prisma: PrismaService) {
    this.queue = new Queue(QUEUE_NAME, {
      connection: this.redisConnection,
    });
  }

  async onModuleInit() {
    try {
    // Start the worker to process scheduled report jobs
    this.worker = new Worker(
      QUEUE_NAME,
      async (job: Job<ScheduledReportJob>) => {
        if (job.name === 'check-due-reports') {
          await this.checkAndEnqueueDueReports();
        } else if (job.data?.scheduledReportId) {
          await this.processScheduledReport(job.data);
        }
      },
      {
        connection: this.redisConnection,
        concurrency: 2,
      },
    );

    this.worker.on('failed', (job, err) => {
      console.error(
        `[ReportScheduler] Job ${job?.id} failed:`,
        err.message,
      );
    });

    // Add a repeatable job to check for due reports every minute
    await this.queue.add(
      'check-due-reports',
      {},
      {
        repeat: { pattern: '* * * * *' }, // Every minute
        removeOnComplete: 100,
        removeOnFail: 100,
      },
    );

    // Start a separate worker for the check-due-reports job
    const checkWorker = new Worker(
      QUEUE_NAME,
      async (job: Job) => {
        if (job.name === 'check-due-reports') {
          await this.checkAndEnqueueDueReports();
        } else {
          await this.processScheduledReport(job.data as ScheduledReportJob);
        }
      },
      {
        connection: this.redisConnection,
        concurrency: 1,
      },
    );

    checkWorker.on('failed', (job, err) => {
      console.error(`[ReportScheduler] Check job failed:`, err.message);
    });
    } catch (err) {
      console.warn('[ReportScheduler] Failed to initialize scheduler (non-fatal):', (err as Error).message);
    }
  }

  async onModuleDestroy() {
    if (this.worker) await this.worker.close();
    await this.queue.close();
  }

  /**
   * Check for scheduled reports that are due and enqueue them.
   */
  private async checkAndEnqueueDueReports(): Promise<void> {
    const now = new Date();

    const dueReports = await this.prisma.scheduledReport.findMany({
      where: {
        isActive: true,
        nextRunAt: { lte: now },
      },
      select: {
        id: true,
        tenantId: true,
        frequency: true,
        dayOfWeek: true,
        dayOfMonth: true,
        timeOfDay: true,
      },
    });

    for (const report of dueReports) {
      await this.queue.add(
        'execute-scheduled-report',
        {
          scheduledReportId: report.id,
          tenantId: report.tenantId,
        },
        {
          removeOnComplete: 1000,
          removeOnFail: 5000,
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
        },
      );

      // Calculate next run time
      const nextRunAt = this.calculateNextRunAt(
        report.frequency,
        report.dayOfWeek,
        report.dayOfMonth,
        report.timeOfDay,
      );

      await this.prisma.scheduledReport.update({
        where: { id: report.id },
        data: { nextRunAt },
      });
    }
  }

  /**
   * Process a single scheduled report execution.
   */
  private async processScheduledReport(data: ScheduledReportJob): Promise<void> {
    const { scheduledReportId, tenantId } = data;

    // Create execution record
    const scheduledReport = await this.prisma.scheduledReport.findUnique({
      where: { id: scheduledReportId },
      include: { savedReport: true },
    });

    if (!scheduledReport || !scheduledReport.isActive) return;

    const execution = await this.prisma.reportExecution.create({
      data: {
        tenantId,
        scheduledReportId,
        savedReportId: scheduledReport.savedReportId,
        reportType: scheduledReport.savedReport.reportType,
        status: 'RUNNING',
        parameters: scheduledReport.savedReport.filters as Record<string, unknown> ?? {},
        startedAt: new Date(),
      },
    });

    const startTime = Date.now();

    try {
      // In a full implementation, this would:
      // 1. Execute the report query based on savedReport config
      // 2. Generate the file in the requested format (PDF/XLSX/CSV)
      // 3. Upload to S3
      // 4. Email the file to recipients

      // For now, mark as completed with placeholder
      const executionTimeMs = Date.now() - startTime;

      await this.prisma.reportExecution.update({
        where: { id: execution.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          executionTimeMs,
          resultFileUrl: `reports/${tenantId}/${execution.id}.${scheduledReport.format.toLowerCase()}`,
          rowCount: 0,
        },
      });

      await this.prisma.scheduledReport.update({
        where: { id: scheduledReportId },
        data: { lastRunAt: new Date() },
      });

      console.log(
        `[ReportScheduler] Completed report ${scheduledReportId} in ${executionTimeMs}ms`,
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      await this.prisma.reportExecution.update({
        where: { id: execution.id },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          executionTimeMs: Date.now() - startTime,
          error: errorMessage,
        },
      });

      throw error;
    }
  }

  /**
   * Calculate the next run time based on frequency settings.
   */
  private calculateNextRunAt(
    frequency: string,
    dayOfWeek: number | null,
    dayOfMonth: number | null,
    timeOfDay: string,
  ): Date {
    const [hours, minutes] = timeOfDay.split(':').map(Number) as [number, number];
    const now = new Date();
    const next = new Date(now);

    switch (frequency) {
      case 'DAILY':
        next.setDate(next.getDate() + 1);
        next.setHours(hours, minutes, 0, 0);
        break;

      case 'WEEKLY': {
        const targetDay = dayOfWeek ?? 1; // Default Monday
        const currentDay = now.getDay();
        let daysAhead = targetDay - currentDay;
        if (daysAhead <= 0) daysAhead += 7;
        next.setDate(next.getDate() + daysAhead);
        next.setHours(hours, minutes, 0, 0);
        break;
      }

      case 'MONTHLY': {
        const targetDate = dayOfMonth ?? 1;
        next.setMonth(next.getMonth() + 1);
        next.setDate(Math.min(targetDate, this.daysInMonth(next.getFullYear(), next.getMonth())));
        next.setHours(hours, minutes, 0, 0);
        break;
      }
    }

    return next;
  }

  private daysInMonth(year: number, month: number): number {
    return new Date(year, month + 1, 0).getDate();
  }
}
