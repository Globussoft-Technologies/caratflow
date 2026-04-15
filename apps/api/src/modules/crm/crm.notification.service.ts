// ─── CRM Notification Service ──────────────────────────────────
// Template CRUD, send notifications (WhatsApp/SMS/Email),
// occasion reminders, bulk send, delivery tracking.

import { Injectable, Logger } from '@nestjs/common';
import { TenantAwareService } from '../../common/base.service';
import { PrismaService } from '../../common/prisma.service';
import { Prisma } from '@caratflow/db';
import { EventBusService } from '../../event-bus/event-bus.service';
import type {
  NotificationTemplateInput,
  SendNotificationInput,
} from '@caratflow/shared-types';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class CrmNotificationService extends TenantAwareService {
  private readonly logger = new Logger(CrmNotificationService.name);

  constructor(
    prisma: PrismaService,
    private readonly eventBus: EventBusService,
  ) {
    super(prisma);
  }

  // ─── Template CRUD ─────────────────────────────────────────────

  async createTemplate(tenantId: string, userId: string, input: NotificationTemplateInput) {
    return this.prisma.notificationTemplate.create({
      data: {
        tenantId,
        name: input.name,
        channel: input.channel,
        subject: input.subject,
        body: input.body,
        variables: input.variables ?? [],
        category: input.category,
        isActive: input.isActive,
        createdBy: userId,
        updatedBy: userId,
      },
    });
  }

  async updateTemplate(tenantId: string, userId: string, templateId: string, input: Partial<NotificationTemplateInput>) {
    await this.prisma.notificationTemplate.findFirstOrThrow({
      where: { id: templateId, tenantId },
    });
    return this.prisma.notificationTemplate.update({
      where: { id: templateId },
      data: {
        ...input,
        variables: input.variables ?? undefined,
        updatedBy: userId,
      },
    });
  }

  async getTemplate(tenantId: string, templateId: string) {
    return this.prisma.notificationTemplate.findFirstOrThrow({
      where: { id: templateId, tenantId },
    });
  }

  async listTemplates(tenantId: string, channel?: string) {
    return this.prisma.notificationTemplate.findMany({
      where: {
        tenantId,
        ...(channel ? { channel: channel as 'WHATSAPP' | 'SMS' | 'EMAIL' } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteTemplate(tenantId: string, templateId: string) {
    await this.prisma.notificationTemplate.findFirstOrThrow({
      where: { id: templateId, tenantId },
    });
    return this.prisma.notificationTemplate.delete({
      where: { id: templateId },
    });
  }

  // ─── Send Notification ─────────────────────────────────────────

  async sendNotification(tenantId: string, userId: string, input: SendNotificationInput) {
    let body = input.body ?? '';
    let subject = input.subject;

    // If template is provided, resolve it
    if (input.templateId) {
      const template = await this.prisma.notificationTemplate.findFirstOrThrow({
        where: { id: input.templateId, tenantId },
      });
      body = this.interpolateTemplate(template.body, input.variables ?? {});
      subject = template.subject
        ? this.interpolateTemplate(template.subject, input.variables ?? {})
        : subject;
    }

    if (!body) throw new Error('Notification body is required');

    // Create notification log entry (QUEUED)
    const log = await this.prisma.notificationLog.create({
      data: {
        tenantId,
        customerId: input.customerId,
        templateId: input.templateId,
        channel: input.channel,
        subject,
        body,
        status: 'QUEUED',
        metadata: input.variables ? (input.variables as Prisma.InputJsonValue) : undefined,
        createdBy: userId,
        updatedBy: userId,
      },
    });

    // Send via provider (placeholder -- integrate Twilio, MSG91, SendGrid)
    try {
      await this.dispatchToProvider(input.channel, {
        customerId: input.customerId,
        subject,
        body,
        tenantId,
      });

      // Update status to SENT
      await this.prisma.notificationLog.update({
        where: { id: log.id },
        data: { status: 'SENT', sentAt: new Date() },
      });

      // Emit event
      await this.eventBus.publish({
        id: uuidv4(),
        tenantId,
        userId,
        timestamp: new Date().toISOString(),
        type: 'crm.notification.sent',
        payload: {
          customerId: input.customerId,
          channel: input.channel,
          templateId: input.templateId ?? '',
          status: 'SENT',
        },
      });
    } catch (err) {
      this.logger.error(`Failed to send notification ${log.id}: ${err}`);
      await this.prisma.notificationLog.update({
        where: { id: log.id },
        data: {
          status: 'FAILED',
          failureReason: err instanceof Error ? err.message : 'Unknown error',
        },
      });
    }

    return log;
  }

  /** Bulk send for campaigns */
  async bulkSend(
    tenantId: string,
    userId: string,
    customerIds: string[],
    channel: 'WHATSAPP' | 'SMS' | 'EMAIL',
    templateId: string,
    variables: Record<string, string>,
  ): Promise<{ queued: number; failed: number }> {
    let queued = 0;
    let failed = 0;

    for (const customerId of customerIds) {
      try {
        await this.sendNotification(tenantId, userId, {
          customerId,
          channel,
          templateId,
          variables,
        });
        queued++;
      } catch {
        failed++;
      }
    }

    return { queued, failed };
  }

  /** Check and send occasion reminders (BullMQ cron job) */
  async sendOccasionReminders(tenantId: string): Promise<number> {
    const now = new Date();
    let sentCount = 0;

    // Find occasions where (date - reminderDaysBefore) is today
    // This is simplified; in production use a more efficient query
    const occasions = await this.prisma.customerOccasion.findMany({
      where: { tenantId },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
      },
    });

    for (const occasion of occasions) {
      const reminderDate = new Date(occasion.date);
      reminderDate.setDate(reminderDate.getDate() - occasion.reminderDaysBefore);

      // Check if today is the reminder date (compare year, month, day)
      if (
        reminderDate.getFullYear() === now.getFullYear() &&
        reminderDate.getMonth() === now.getMonth() &&
        reminderDate.getDate() === now.getDate()
      ) {
        try {
          // Find a reminder template
          const template = await this.prisma.notificationTemplate.findFirst({
            where: { tenantId, category: 'REMINDER', isActive: true },
          });

          if (template && occasion.customer.phone) {
            await this.sendNotification(tenantId, 'SYSTEM', {
              customerId: occasion.customer.id,
              channel: template.channel,
              templateId: template.id,
              variables: {
                firstName: occasion.customer.firstName,
                lastName: occasion.customer.lastName,
                occasionType: occasion.occasionType,
                date: occasion.date.toLocaleDateString('en-IN'),
              },
            });
            sentCount++;
          }
        } catch (err) {
          this.logger.error(`Failed to send occasion reminder for ${occasion.id}: ${err}`);
        }
      }
    }

    return sentCount;
  }

  /** Get notification logs for a customer */
  async getCustomerNotifications(tenantId: string, customerId: string, page = 1, limit = 20) {
    const [items, total] = await Promise.all([
      this.prisma.notificationLog.findMany({
        where: { tenantId, customerId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.notificationLog.count({
        where: { tenantId, customerId },
      }),
    ]);

    const totalPages = Math.ceil(total / limit);
    return { items, total, page, limit, totalPages, hasNext: page < totalPages, hasPrevious: page > 1 };
  }

  /** Get all notification logs */
  async listNotificationLogs(tenantId: string, page = 1, limit = 20, status?: string) {
    const where: Record<string, unknown> = { tenantId };
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      this.prisma.notificationLog.findMany({
        where: where as Prisma.NotificationLogWhereInput,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { customer: { select: { firstName: true, lastName: true } } },
      }),
      this.prisma.notificationLog.count({
        where: where as Prisma.NotificationLogWhereInput,
      }),
    ]);

    const totalPages = Math.ceil(total / limit);
    return { items, total, page, limit, totalPages, hasNext: page < totalPages, hasPrevious: page > 1 };
  }

  /** Interpolate {{variable}} placeholders in template text */
  private interpolateTemplate(text: string, variables: Record<string, string>): string {
    return text.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
      return variables[key] ?? match;
    });
  }

  /** Placeholder for actual provider dispatch */
  private async dispatchToProvider(
    channel: string,
    _payload: { customerId: string; subject?: string; body: string; tenantId: string },
  ): Promise<void> {
    // Provider integration point:
    // - WHATSAPP: Twilio WhatsApp API / WhatsApp Business API
    // - SMS: Twilio / MSG91
    // - EMAIL: SendGrid / AWS SES
    this.logger.log(`[${channel}] Dispatching notification (provider integration pending)`);
    // In production, this would call the actual provider SDK
    // and throw on failure.
  }
}
