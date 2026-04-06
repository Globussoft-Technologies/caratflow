// ─── AML Alert Service ─────────────────────────────────────────
// Alert lifecycle management: create, review, escalate, clear, report.

import { Injectable, Logger } from '@nestjs/common';
import { TenantAwareService } from '../../common/base.service';
import { PrismaService } from '../../common/prisma.service';
import { EventBusService } from '../../event-bus/event-bus.service';
import type { AmlSarReportInput } from '@caratflow/shared-types';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AmlAlertService extends TenantAwareService {
  private readonly logger = new Logger(AmlAlertService.name);

  constructor(
    prisma: PrismaService,
    private readonly eventBus: EventBusService,
  ) {
    super(prisma);
  }

  // ─── Alert Management ───────────────────────────────────────────

  async getAlert(tenantId: string, alertId: string) {
    return this.prisma.amlAlert.findFirstOrThrow({
      where: { id: alertId, tenantId },
      include: {
        rule: { select: { ruleName: true, ruleType: true } },
      },
    });
  }

  async listAlerts(
    tenantId: string,
    page = 1,
    limit = 20,
    status?: string,
    severity?: string,
    customerId?: string,
  ) {
    const where: Record<string, unknown> = { tenantId };
    if (status) where.status = status;
    if (severity) where.severity = severity;
    if (customerId) where.customerId = customerId;

    const [items, total] = await Promise.all([
      this.prisma.amlAlert.findMany({
        where: where as Parameters<typeof this.prisma.amlAlert.findMany>[0]['where'],
        orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
        include: {
          rule: { select: { ruleName: true, ruleType: true } },
        },
      }),
      this.prisma.amlAlert.count({
        where: where as Parameters<typeof this.prisma.amlAlert.count>[0]['where'],
      }),
    ]);

    // Enrich with customer names
    const customerIds = [...new Set(items.map((i) => i.customerId))];
    const customers = await this.prisma.customer.findMany({
      where: { id: { in: customerIds }, tenantId },
      select: { id: true, firstName: true, lastName: true },
    });
    const customerMap = new Map(customers.map((c) => [c.id, `${c.firstName} ${c.lastName}`]));

    const enrichedItems = items.map((item) => ({
      ...item,
      customerName: customerMap.get(item.customerId) ?? 'Unknown',
      amountPaise: Number(item.amountPaise),
    }));

    const totalPages = Math.ceil(total / limit);
    return { items: enrichedItems, total, page, limit, totalPages, hasNext: page < totalPages, hasPrevious: page > 1 };
  }

  /** Review an alert -- set it to UNDER_REVIEW */
  async reviewAlert(tenantId: string, userId: string, alertId: string, notes?: string) {
    const alert = await this.prisma.amlAlert.findFirstOrThrow({
      where: { id: alertId, tenantId },
    });

    if (alert.status !== 'NEW' && alert.status !== 'UNDER_REVIEW') {
      throw new Error(`Alert cannot be reviewed in status: ${alert.status}`);
    }

    return this.prisma.amlAlert.update({
      where: { id: alertId },
      data: {
        status: 'UNDER_REVIEW',
        reviewedBy: userId,
        reviewedAt: new Date(),
        reviewNotes: notes ?? null,
      },
    });
  }

  /** Escalate an alert */
  async escalateAlert(tenantId: string, userId: string, alertId: string, notes?: string) {
    await this.prisma.amlAlert.findFirstOrThrow({
      where: { id: alertId, tenantId },
    });

    const updated = await this.prisma.amlAlert.update({
      where: { id: alertId },
      data: {
        status: 'ESCALATED',
        reviewedBy: userId,
        reviewedAt: new Date(),
        reviewNotes: notes ?? null,
      },
    });

    await this.eventBus.publish({
      id: uuidv4(),
      tenantId,
      userId,
      timestamp: new Date().toISOString(),
      type: 'compliance.aml.alert_escalated',
      payload: {
        alertId,
        customerId: updated.customerId,
        severity: updated.severity,
      },
    });

    return updated;
  }

  /** Clear an alert (false positive / resolved) */
  async clearAlert(tenantId: string, userId: string, alertId: string, notes: string) {
    await this.prisma.amlAlert.findFirstOrThrow({
      where: { id: alertId, tenantId },
    });

    return this.prisma.amlAlert.update({
      where: { id: alertId },
      data: {
        status: 'CLEARED',
        reviewedBy: userId,
        reviewedAt: new Date(),
        reviewNotes: notes,
      },
    });
  }

  /** Report alert to FIU (Financial Intelligence Unit) */
  async reportToFiu(tenantId: string, userId: string, alertId: string) {
    await this.prisma.amlAlert.findFirstOrThrow({
      where: { id: alertId, tenantId },
    });

    return this.prisma.amlAlert.update({
      where: { id: alertId },
      data: {
        status: 'REPORTED',
        reportedToFiu: true,
        reportedAt: new Date(),
        reviewedBy: userId,
        reviewedAt: new Date(),
      },
    });
  }

  // ─── SAR Reports ────────────────────────────────────────────────

  async createSarReport(tenantId: string, userId: string, input: AmlSarReportInput) {
    return this.prisma.amlSarReport.create({
      data: {
        tenantId,
        alertId: input.alertId,
        customerId: input.customerId,
        reportType: input.reportType,
        reportData: input.reportData as Record<string, unknown>,
        notes: input.notes ?? null,
        filingStatus: 'DRAFT',
      },
    });
  }

  async fileSarReport(tenantId: string, userId: string, reportId: string, referenceNumber: string) {
    await this.prisma.amlSarReport.findFirstOrThrow({
      where: { id: reportId, tenantId },
    });

    return this.prisma.amlSarReport.update({
      where: { id: reportId },
      data: {
        filingStatus: 'FILED',
        filedAt: new Date(),
        filedBy: userId,
        referenceNumber,
      },
    });
  }

  async acknowledgeSarReport(tenantId: string, reportId: string) {
    await this.prisma.amlSarReport.findFirstOrThrow({
      where: { id: reportId, tenantId },
    });

    return this.prisma.amlSarReport.update({
      where: { id: reportId },
      data: { filingStatus: 'ACKNOWLEDGED' },
    });
  }

  async listSarReports(tenantId: string, page = 1, limit = 20, filingStatus?: string) {
    const where: Record<string, unknown> = { tenantId };
    if (filingStatus) where.filingStatus = filingStatus;

    const [items, total] = await Promise.all([
      this.prisma.amlSarReport.findMany({
        where: where as Parameters<typeof this.prisma.amlSarReport.findMany>[0]['where'],
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          alert: { select: { alertType: true, severity: true, description: true } },
        },
      }),
      this.prisma.amlSarReport.count({
        where: where as Parameters<typeof this.prisma.amlSarReport.count>[0]['where'],
      }),
    ]);

    // Enrich with customer names
    const customerIds = [...new Set(items.map((i) => i.customerId))];
    const customers = await this.prisma.customer.findMany({
      where: { id: { in: customerIds }, tenantId },
      select: { id: true, firstName: true, lastName: true },
    });
    const customerMap = new Map(customers.map((c) => [c.id, `${c.firstName} ${c.lastName}`]));

    const enrichedItems = items.map((item) => ({
      ...item,
      customerName: customerMap.get(item.customerId) ?? 'Unknown',
    }));

    const totalPages = Math.ceil(total / limit);
    return { items: enrichedItems, total, page, limit, totalPages, hasNext: page < totalPages, hasPrevious: page > 1 };
  }

  // ─── Dashboard ──────────────────────────────────────────────────

  async getAlertsDashboard(tenantId: string) {
    const statuses = ['NEW', 'UNDER_REVIEW', 'ESCALATED', 'CLEARED', 'REPORTED'] as const;
    const severities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;

    const [alertsByStatus, alertsBySeverity, pendingReviews] = await Promise.all([
      Promise.all(
        statuses.map(async (status) => ({
          status,
          count: await this.prisma.amlAlert.count({ where: { tenantId, status } }),
        })),
      ),
      Promise.all(
        severities.map(async (severity) => ({
          severity,
          count: await this.prisma.amlAlert.count({ where: { tenantId, severity } }),
        })),
      ),
      this.prisma.amlAlert.count({
        where: { tenantId, status: { in: ['NEW', 'UNDER_REVIEW'] } },
      }),
    ]);

    // Recent high-value alerts
    const recentHighValue = await this.prisma.amlAlert.findMany({
      where: {
        tenantId,
        alertType: 'HIGH_VALUE',
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
      orderBy: { amountPaise: 'desc' },
      take: 10,
    });

    const customerIds = [...new Set(recentHighValue.map((a) => a.customerId))];
    const customers = await this.prisma.customer.findMany({
      where: { id: { in: customerIds }, tenantId },
      select: { id: true, firstName: true, lastName: true },
    });
    const customerMap = new Map(customers.map((c) => [c.id, `${c.firstName} ${c.lastName}`]));

    // Alerts trend (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentAlerts = await this.prisma.amlAlert.findMany({
      where: { tenantId, createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const trendMap = new Map<string, number>();
    for (const alert of recentAlerts) {
      const dateKey = alert.createdAt.toISOString().slice(0, 10);
      trendMap.set(dateKey, (trendMap.get(dateKey) ?? 0) + 1);
    }
    const alertsTrend = Array.from(trendMap.entries()).map(([date, count]) => ({ date, count }));

    return {
      alertsByStatus: Object.fromEntries(alertsByStatus.map((a) => [a.status, a.count])),
      alertsBySeverity: Object.fromEntries(alertsBySeverity.map((a) => [a.severity, a.count])),
      pendingReviews,
      recentHighValueTransactions: recentHighValue.map((a) => ({
        customerId: a.customerId,
        customerName: customerMap.get(a.customerId) ?? 'Unknown',
        amountPaise: Number(a.amountPaise),
        date: a.createdAt,
      })),
      alertsTrend,
    };
  }
}
