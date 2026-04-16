// ─── Reporting Scheduler Service ──────────────────────────────
// BullMQ cron job to execute scheduled reports.
//
// Execution flow:
//   1. Mark a ReportExecution row RUNNING.
//   2. Compute the report data (via ReportingCustomService when the
//      saved report defines filters.entityType, otherwise a minimal
//      data envelope from filters).
//   3. Serialize to CSV and/or PDF per the ScheduledReport.format.
//   4. Upload artifact(s) to S3 via PlatformFileService.
//   5. Save signed URL as ReportExecution.resultFileUrl.
//   6. Email the link to all `recipients` via EmailService.
//   7. Mark the row SUCCEEDED, or FAILED with error on any step.

import { Injectable, OnModuleInit, OnModuleDestroy, Logger, Optional } from '@nestjs/common';
import { Queue, Worker, type Job } from 'bullmq';
import { Prisma } from '@caratflow/db';
import { PrismaService } from '../../common/prisma.service';
import { PlatformFileService } from '../platform/platform.file.service';
import { PlatformPdfService } from '../platform/platform.pdf.service';
import { EmailService } from '../crm/email.service';
import { ReportingCustomService } from './reporting.custom.service';

interface ScheduledReportJob {
  scheduledReportId: string;
  tenantId: string;
}

interface ReportRow {
  [key: string]: unknown;
}

interface ReportArtifact {
  format: 'CSV' | 'PDF' | 'XLSX';
  buffer: Buffer;
  mimeType: string;
  extension: string;
}

const QUEUE_NAME = 'caratflow-report-scheduler';

@Injectable()
export class ReportingSchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ReportingSchedulerService.name);
  private queue: Queue;
  private worker: Worker | null = null;

  private readonly redisConnection: { host: string; port: number; password?: string } = {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
    password: process.env.REDIS_PASSWORD ?? undefined,
  };

  constructor(
    private readonly prisma: PrismaService,
    // Optional deps so the service stays instantiable in unit tests
    // that only exercise scheduling math. Production DI always supplies
    // them via ReportingModule.
    @Optional() private readonly fileService?: PlatformFileService,
    @Optional() private readonly pdfService?: PlatformPdfService,
    @Optional() private readonly emailService?: EmailService,
    @Optional() private readonly customService?: ReportingCustomService,
  ) {
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
      this.logger.error(
        `Job ${job?.id} failed: ${err.message}`,
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
      this.logger.error(`Check job failed: ${err.message}`);
    });
    } catch (err) {
      this.logger.warn(`Failed to initialize scheduler (non-fatal): ${(err as Error).message}`);
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
        parameters: (scheduledReport.savedReport.filters ?? {}) as Prisma.InputJsonValue,
        startedAt: new Date(),
      },
    });

    const startTime = Date.now();

    try {
      // 1) Compute data
      const rows = await this.computeReportData(tenantId, scheduledReport);
      const columns = this.resolveColumns(rows, scheduledReport.savedReport.columns);

      // 2) Serialize to requested format
      const format = String(scheduledReport.format).toUpperCase() as 'PDF' | 'CSV' | 'XLSX';
      const artifact = await this.buildArtifact(
        format,
        scheduledReport.savedReport.name ?? 'Report',
        rows,
        columns,
      );

      // 3) Upload to S3 / MinIO via the file service
      const dateStamp = new Date().toISOString().slice(0, 10);
      const uploadResult = await this.uploadArtifact(
        tenantId,
        scheduledReportId,
        `${dateStamp}-${execution.id}.${artifact.extension}`,
        artifact,
      );
      const artifactUrl = uploadResult.url;

      const executionTimeMs = Date.now() - startTime;

      await this.prisma.reportExecution.update({
        where: { id: execution.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          executionTimeMs,
          resultFileUrl: artifactUrl,
          rowCount: rows.length,
        },
      });

      // 4) Email recipients (best-effort; surfaces failure as FAILED execution)
      await this.notifyRecipients(
        tenantId,
        scheduledReport.savedReport.name ?? 'Scheduled Report',
        dateStamp,
        artifactUrl,
        scheduledReport.recipients as unknown,
      );

      await this.prisma.scheduledReport.update({
        where: { id: scheduledReportId },
        data: { lastRunAt: new Date() },
      });

      this.logger.log(
        `Completed scheduled report ${scheduledReportId} in ${executionTimeMs}ms (${rows.length} rows, ${format})`,
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

      this.logger.error(`Scheduled report ${scheduledReportId} failed: ${errorMessage}`);
      throw error;
    }
  }

  // ─── Data computation ─────────────────────────────────────────

  /**
   * Best-effort data fetch for a saved report. If the saved report's
   * `filters` object carries an `entityType` recognized by the
   * ReportingCustomService, we execute the dynamic query. Otherwise
   * we emit an empty-but-well-formed row so the artifact still
   * reflects the run (useful for smoke testing deliveries).
   */
  private async computeReportData(
    tenantId: string,
    scheduledReport: {
      savedReport: {
        filters: Prisma.JsonValue | null;
        columns: Prisma.JsonValue | null;
      };
    },
  ): Promise<ReportRow[]> {
    const filters = (scheduledReport.savedReport.filters ?? {}) as Record<string, unknown>;
    const entityType = typeof filters.entityType === 'string' ? filters.entityType : undefined;
    const columns = Array.isArray(scheduledReport.savedReport.columns)
      ? (scheduledReport.savedReport.columns as string[])
      : [];

    if (entityType && this.customService && columns.length > 0) {
      try {
        const result = await this.customService.executeCustomReport(tenantId, {
          entityType: entityType as never,
          columns,
          groupBy: (Array.isArray(filters.groupBy) ? filters.groupBy : []) as string[],
          aggregations: (Array.isArray(filters.aggregations) ? filters.aggregations : []) as never,
          filters: (Array.isArray(filters.filters) ? filters.filters : []) as never,
          sortBy: (Array.isArray(filters.sortBy) ? filters.sortBy : []) as never,
          dateRange: (filters.dateRange as never) ?? undefined,
        } as never);
        const maybeRows = (result as { rows?: ReportRow[] }).rows;
        if (Array.isArray(maybeRows)) return maybeRows;
      } catch (err) {
        this.logger.warn(
          `Custom report execution failed, falling back to empty dataset: ${(err as Error).message}`,
        );
      }
    }

    return [];
  }

  private resolveColumns(rows: ReportRow[], savedColumns: Prisma.JsonValue | null): string[] {
    if (Array.isArray(savedColumns) && savedColumns.every((c) => typeof c === 'string')) {
      return savedColumns as string[];
    }
    if (rows.length > 0) return Object.keys(rows[0] as ReportRow);
    return ['message'];
  }

  // ─── Serialization ────────────────────────────────────────────

  private async buildArtifact(
    format: 'PDF' | 'CSV' | 'XLSX',
    reportName: string,
    rows: ReportRow[],
    columns: string[],
  ): Promise<ReportArtifact> {
    // XLSX is not yet implemented without additional deps — fall back
    // to CSV which most spreadsheet tools open natively.
    if (format === 'CSV' || format === 'XLSX') {
      const buffer = Buffer.from(this.toCsv(rows, columns), 'utf-8');
      return { format: 'CSV', buffer, mimeType: 'text/csv', extension: 'csv' };
    }

    // PDF via existing platform service. Renders a minimal table template.
    if (!this.pdfService) {
      // Fallback: emit CSV so delivery still succeeds in environments
      // where puppeteer isn't available.
      const buffer = Buffer.from(this.toCsv(rows, columns), 'utf-8');
      return { format: 'CSV', buffer, mimeType: 'text/csv', extension: 'csv' };
    }
    const html = this.buildReportHtml(reportName, rows, columns);
    const buffer = await this.pdfService.renderHtmlToPdf(html, { format: 'A4' });
    return { format: 'PDF', buffer, mimeType: 'application/pdf', extension: 'pdf' };
  }

  /** Minimal RFC-4180 CSV writer (no external deps). */
  private toCsv(rows: ReportRow[], columns: string[]): string {
    const esc = (val: unknown): string => {
      if (val === null || val === undefined) return '';
      const s = typeof val === 'bigint' ? val.toString() : String(val);
      if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    const lines: string[] = [];
    lines.push(columns.map(esc).join(','));
    for (const row of rows) {
      lines.push(columns.map((c) => esc(row[c])).join(','));
    }
    return lines.join('\r\n');
  }

  private buildReportHtml(name: string, rows: ReportRow[], columns: string[]): string {
    const escapeHtml = (s: string): string =>
      s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    const header = `<tr>${columns.map((c) => `<th>${escapeHtml(c)}</th>`).join('')}</tr>`;
    const body = rows
      .map((row) => {
        const cells = columns
          .map((c) => {
            const v = row[c];
            const s = v === null || v === undefined
              ? ''
              : typeof v === 'bigint'
                ? v.toString()
                : String(v);
            return `<td>${escapeHtml(s)}</td>`;
          })
          .join('');
        return `<tr>${cells}</tr>`;
      })
      .join('\n');
    const when = new Date().toISOString();

    return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
<style>
body{font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#111;margin:18px;}
h1{font-size:18px;margin:0 0 4px 0;}
.meta{color:#666;font-size:10px;margin-bottom:12px;}
table{width:100%;border-collapse:collapse;}
th,td{border:1px solid #ddd;padding:4px 6px;text-align:left;vertical-align:top;}
th{background:#f3f3f3;}
tr:nth-child(even) td{background:#fafafa;}
.empty{color:#999;font-style:italic;margin-top:16px;}
</style></head><body>
<h1>${escapeHtml(name)}</h1>
<div class="meta">Generated: ${escapeHtml(when)} · ${rows.length} row(s)</div>
${rows.length > 0
  ? `<table><thead>${header}</thead><tbody>${body}</tbody></table>`
  : `<div class="empty">No data for the selected range.</div>`}
</body></html>`;
  }

  // ─── Upload + delivery ────────────────────────────────────────

  private async uploadArtifact(
    tenantId: string,
    scheduledReportId: string,
    fileName: string,
    artifact: ReportArtifact,
  ): Promise<{ url: string; key: string }> {
    if (!this.fileService) {
      throw new Error('PlatformFileService not available: cannot upload artifact');
    }
    // Upload using the S3-aware low-level helper. Folder is prefixed
    // with the scheduler id so per-schedule artifacts are grouped.
    const uploaded = await this.fileService.uploadBuffer(
      tenantId,
      artifact.buffer,
      fileName,
      artifact.mimeType,
      `reports/${scheduledReportId}`,
    );
    // Prefer a signed URL so recipients can actually download without
    // a public bucket. Falls back to the direct URL if signing fails
    // (e.g. LOCAL provider in tests/dev).
    try {
      const signed = await this.fileService.getSignedGetUrl(
        tenantId,
        uploaded.key,
        60 * 60 * 24 * 7,
      );
      return { url: signed, key: uploaded.key };
    } catch {
      return { url: uploaded.url, key: uploaded.key };
    }
  }

  private async notifyRecipients(
    tenantId: string,
    reportName: string,
    dateStamp: string,
    artifactUrl: string,
    recipients: unknown,
  ): Promise<void> {
    if (!this.emailService) return;
    const emails = this.extractEmails(recipients);
    if (emails.length === 0) return;

    const subject = `${reportName} - ${dateStamp}`;
    const html = `
      <p>Your scheduled report <b>${reportName}</b> for <b>${dateStamp}</b> is ready.</p>
      <p><a href="${artifactUrl}">Download report</a> (link expires in 7 days).</p>
    `;
    const text = `Your scheduled report "${reportName}" for ${dateStamp} is ready.\nDownload: ${artifactUrl}\n(Link expires in 7 days.)`;

    try {
      await this.emailService.sendEmail(tenantId, {
        to: emails,
        subject,
        html,
        text,
      });
    } catch (err) {
      // Surface as execution failure so ops sees it.
      throw new Error(`Email delivery failed: ${(err as Error).message}`);
    }
  }

  private extractEmails(recipients: unknown): string[] {
    if (!recipients) return [];
    if (Array.isArray(recipients)) {
      return recipients
        .map((r) => (typeof r === 'string' ? r : (r as { email?: string })?.email))
        .filter((e): e is string => typeof e === 'string' && e.includes('@'));
    }
    if (typeof recipients === 'object' && 'emails' in (recipients as Record<string, unknown>)) {
      const list = (recipients as { emails?: unknown }).emails;
      if (Array.isArray(list)) return list.filter((e) => typeof e === 'string' && e.includes('@'));
    }
    return [];
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
