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
import { WhatsAppService, WhatsAppNotConfiguredError } from './whatsapp.service';
import { EmailService } from './email.service';
import { SmsService } from './sms.service';

@Injectable()
export class CrmNotificationService extends TenantAwareService {
  private readonly logger = new Logger(CrmNotificationService.name);

  constructor(
    prisma: PrismaService,
    private readonly eventBus: EventBusService,
    private readonly whatsapp: WhatsAppService,
    private readonly emailService: EmailService,
    private readonly smsService: SmsService,
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

    // Send via provider
    try {
      await this.dispatchToProvider(input.channel, {
        customerId: input.customerId,
        subject,
        body,
        tenantId,
        logId: log.id,
      });

      // Providers (WhatsApp/SMS/Email) update the log themselves with
      // their externalId + SENT status. Re-fetch to see the authoritative
      // state; only mark SENT here if the dispatcher left it QUEUED
      // (e.g. the stub PUSH branch).
      const current = await this.prisma.notificationLog.findUnique({
        where: { id: log.id },
      });
      if (current && current.status === 'QUEUED') {
        await this.prisma.notificationLog.update({
          where: { id: log.id },
          data: { status: 'SENT', sentAt: new Date() },
        });
      }

      // Re-read final status so the event payload reflects reality
      // (e.g. provider may have set FAILED without throwing).
      const finalLog =
        current?.status !== 'QUEUED'
          ? current
          : await this.prisma.notificationLog.findUnique({ where: { id: log.id } });

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
          status: finalLog?.status ?? 'SENT',
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

  /** Dispatch notification to the correct provider based on channel. */
  private async dispatchToProvider(
    channel: string,
    payload: {
      customerId: string;
      subject?: string;
      body: string;
      tenantId: string;
      logId: string;
    },
  ): Promise<void> {
    switch (channel) {
      case 'WHATSAPP': {
        // Resolve customer phone
        const customer = await this.prisma.customer.findFirst({
          where: { id: payload.customerId, tenantId: payload.tenantId },
          select: { phone: true },
        });
        if (!customer?.phone) {
          throw new Error(`Customer ${payload.customerId} has no phone for WhatsApp`);
        }
        try {
          await this.whatsapp.sendTextMessage(
            payload.tenantId,
            customer.phone,
            payload.body,
            payload.logId,
          );
        } catch (err) {
          if (err instanceof WhatsAppNotConfiguredError) {
            this.logger.error(
              `WhatsApp not configured for tenant ${payload.tenantId}`,
            );
          }
          throw err;
        }
        return;
      }
      case 'SMS': {
        const customer = await this.prisma.customer.findFirst({
          where: { id: payload.customerId, tenantId: payload.tenantId },
          select: { phone: true },
        });
        if (!customer?.phone) {
          throw new Error(`Customer ${payload.customerId} has no phone for SMS`);
        }
        const result = await this.smsService.sendSms(payload.tenantId, {
          to: customer.phone,
          body: payload.body,
        });
        await this.prisma.notificationLog.update({
          where: { id: payload.logId },
          data: {
            status: 'SENT',
            sentAt: new Date(),
            metadata: {
              externalId: result.externalId,
              provider: result.provider,
            } as Prisma.InputJsonValue,
          },
        });
        return;
      }
      case 'EMAIL': {
        const customer = await this.prisma.customer.findFirst({
          where: { id: payload.customerId, tenantId: payload.tenantId },
          select: { email: true },
        });
        if (!customer?.email) {
          throw new Error(`Customer ${payload.customerId} has no email`);
        }
        const result = await this.emailService.sendEmail(payload.tenantId, {
          to: customer.email,
          subject: payload.subject ?? '(no subject)',
          html: payload.body,
        });
        await this.prisma.notificationLog.update({
          where: { id: payload.logId },
          data: {
            status: 'SENT',
            sentAt: new Date(),
            metadata: {
              externalId: result.externalId,
              provider: 'SENDGRID',
            } as Prisma.InputJsonValue,
          },
        });
        return;
      }
      case 'PUSH': {
        await this.dispatchPush(payload);
        return;
      }
      default:
        throw new Error(`Unsupported notification channel: ${channel}`);
    }
  }

  // ─── FCM Push Notifications ─────────────────────────────────────

  /**
   * Dispatch a push notification via Firebase Cloud Messaging (legacy HTTP API).
   *
   * Credentials resolution order:
   *   1. tenant Setting row with settingKey='fcm_server_key'
   *   2. process.env.FCM_SERVER_KEY
   * If neither is set, the dispatch is skipped (log and return success=false).
   *
   * Device tokens are stored on Customer.preferences JSON under the key
   * `fcm_tokens: string[]`. Canonical id remaps (from FCM's `registration_id`
   * field) and dead-token removals (`NotRegistered`, `InvalidRegistration`)
   * are persisted back to the customer record.
   */
  private async dispatchPush(payload: {
    customerId: string;
    subject?: string;
    body: string;
    tenantId: string;
    logId: string;
  }): Promise<void> {
    const serverKey = await this.resolveFcmServerKey(payload.tenantId);
    if (!serverKey) {
      this.logger.warn(
        `[PUSH] FCM server key not configured for tenant ${payload.tenantId}; skipping log=${payload.logId}`,
      );
      await this.prisma.notificationLog.update({
        where: { id: payload.logId },
        data: {
          status: 'FAILED',
          failureReason: 'FCM server key not configured',
          metadata: {
            errorCode: 'FCM_NOT_CONFIGURED',
          } as Prisma.InputJsonValue,
        },
      });
      return;
    }

    const customer = await this.prisma.customer.findFirst({
      where: { id: payload.customerId, tenantId: payload.tenantId },
      select: { id: true, preferences: true },
    });

    if (!customer) {
      throw new Error(`Customer ${payload.customerId} not found`);
    }

    const tokens = this.extractFcmTokens(customer.preferences);
    if (tokens.length === 0) {
      this.logger.log(
        `[PUSH] Customer ${payload.customerId} has no fcm_tokens; skipping log=${payload.logId}`,
      );
      await this.prisma.notificationLog.update({
        where: { id: payload.logId },
        data: {
          status: 'FAILED',
          failureReason: 'No FCM tokens registered for customer',
          metadata: {
            errorCode: 'NO_DEVICE_TOKENS',
          } as Prisma.InputJsonValue,
        },
      });
      return;
    }

    const requestBody = {
      registration_ids: tokens,
      notification: {
        title: payload.subject ?? 'CaratFlow',
        body: payload.body,
      },
      data: {
        logId: payload.logId,
        customerId: payload.customerId,
        tenantId: payload.tenantId,
      },
    };

    const { response, rawJson } = await this.fcmSendWithRetry(serverKey, requestBody);

    // FCM legacy: HTTP 200 even for per-token failures. Per-token results are
    // in `results[]`. We mark the log SENT iff at least one token accepted it.
    const results = Array.isArray(rawJson?.results)
      ? (rawJson.results as Array<Record<string, unknown>>)
      : [];
    const successCount = Number(rawJson?.success ?? 0);
    const failureCount = Number(rawJson?.failure ?? 0);
    const externalId =
      typeof rawJson?.multicast_id === 'number' || typeof rawJson?.multicast_id === 'string'
        ? String(rawJson.multicast_id)
        : undefined;

    // Reconcile per-token outcomes: canonical remaps + dead token removal.
    const tokenUpdate = this.reconcileFcmTokens(tokens, results);
    if (tokenUpdate.changed) {
      try {
        await this.prisma.customer.update({
          where: { id: customer.id },
          data: {
            preferences: this.writeFcmTokens(
              customer.preferences,
              tokenUpdate.nextTokens,
            ) as Prisma.InputJsonValue,
          },
        });
        this.logger.log(
          `[PUSH] Updated fcm_tokens for customer ${customer.id}: ` +
            `before=${tokens.length}, after=${tokenUpdate.nextTokens.length} ` +
            `(removed=${tokenUpdate.removed.length}, remapped=${tokenUpdate.remapped})`,
        );
      } catch (err) {
        this.logger.warn(
          `[PUSH] Failed to persist fcm_tokens update for ${customer.id}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }

    if (successCount > 0) {
      await this.prisma.notificationLog.update({
        where: { id: payload.logId },
        data: {
          status: 'SENT',
          sentAt: new Date(),
          metadata: {
            provider: 'FCM',
            externalId: externalId ?? null,
            successCount,
            failureCount,
            targetedTokens: tokens.length,
          } as Prisma.InputJsonValue,
        },
      });
      this.logger.log(
        `[PUSH] FCM dispatch SENT for log ${payload.logId}: success=${successCount}, failure=${failureCount}`,
      );
    } else {
      const firstError =
        (results[0]?.error as string | undefined) ?? `HTTP ${response.status}`;
      await this.prisma.notificationLog.update({
        where: { id: payload.logId },
        data: {
          status: 'FAILED',
          failureReason: `FCM: ${firstError}`.slice(0, 500),
          metadata: {
            provider: 'FCM',
            errorCode: firstError,
            successCount: 0,
            failureCount: failureCount || tokens.length,
            httpStatus: response.status,
          } as Prisma.InputJsonValue,
        },
      });
      this.logger.error(
        `[PUSH] FCM dispatch FAILED for log ${payload.logId}: ${firstError}`,
      );
    }
  }

  private async resolveFcmServerKey(tenantId: string): Promise<string | null> {
    try {
      const row = await this.prisma.setting.findFirst({
        where: { tenantId, settingKey: 'fcm_server_key' },
      });
      if (row) {
        const raw = row.settingValue as unknown;
        const value =
          typeof raw === 'string'
            ? raw
            : raw && typeof raw === 'object' && 'value' in (raw as Record<string, unknown>)
              ? String((raw as Record<string, unknown>).value)
              : null;
        if (value && value.length > 0) return value;
      }
    } catch (err) {
      this.logger.warn(
        `[PUSH] Setting lookup failed for fcm_server_key: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
    const envKey = process.env.FCM_SERVER_KEY;
    return envKey && envKey.length > 0 ? envKey : null;
  }

  private extractFcmTokens(preferences: unknown): string[] {
    if (!preferences || typeof preferences !== 'object' || Array.isArray(preferences)) {
      return [];
    }
    const rec = preferences as Record<string, unknown>;
    const raw = rec.fcm_tokens;
    if (!Array.isArray(raw)) return [];
    return raw.filter((t): t is string => typeof t === 'string' && t.length > 0);
  }

  private writeFcmTokens(preferences: unknown, nextTokens: string[]): Record<string, unknown> {
    const base =
      preferences && typeof preferences === 'object' && !Array.isArray(preferences)
        ? { ...(preferences as Record<string, unknown>) }
        : {};
    base.fcm_tokens = nextTokens;
    return base;
  }

  private reconcileFcmTokens(
    tokens: string[],
    results: Array<Record<string, unknown>>,
  ): { nextTokens: string[]; removed: string[]; remapped: number; changed: boolean } {
    // FCM legacy result schema: each entry aligns with registration_ids[i].
    // Possible fields: message_id (success), registration_id (canonical swap),
    // error: 'NotRegistered' | 'InvalidRegistration' | ...
    const removed: string[] = [];
    const next: string[] = [];
    let remapped = 0;

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (!token) continue;
      const r = results[i];
      if (!r) {
        next.push(token);
        continue;
      }
      const error = typeof r.error === 'string' ? r.error : undefined;
      const canonical =
        typeof r.registration_id === 'string' ? r.registration_id : undefined;

      if (error === 'NotRegistered' || error === 'InvalidRegistration') {
        removed.push(token);
        continue;
      }
      if (canonical && canonical !== token) {
        next.push(canonical);
        remapped++;
        continue;
      }
      next.push(token);
    }

    // Dedupe in case canonical collides with another registered token.
    const deduped = Array.from(new Set(next));
    const changed =
      removed.length > 0 ||
      remapped > 0 ||
      deduped.length !== tokens.length ||
      deduped.some((t, i) => t !== tokens[i]);

    return { nextTokens: deduped, removed, remapped, changed };
  }

  private async fcmSendWithRetry(
    serverKey: string,
    body: unknown,
  ): Promise<{ response: Response; rawJson: Record<string, unknown> }> {
    const url = 'https://fcm.googleapis.com/fcm/send';
    const delays = [500, 2000, 8000];
    let lastErr: unknown;

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            // Never log this header — it is a bearer-equivalent credential.
            Authorization: `key=${serverKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });
        const rawJson = (await response.json().catch(() => ({}))) as Record<string, unknown>;

        if (response.status >= 500 || response.status === 429) {
          lastErr = new Error(`FCM HTTP ${response.status}`);
          this.logger.warn(
            `[PUSH] FCM transient failure (attempt ${attempt + 1}/3): HTTP ${response.status}`,
          );
        } else {
          return { response, rawJson };
        }
      } catch (err) {
        lastErr = err;
        this.logger.warn(
          `[PUSH] FCM network error (attempt ${attempt + 1}/3): ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }

      const delay = delays[attempt];
      if (attempt < 2 && delay) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastErr instanceof Error
      ? lastErr
      : new Error('FCM send failed after 3 retries');
  }
}
