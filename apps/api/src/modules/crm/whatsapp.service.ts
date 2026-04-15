// ─── WhatsApp Business Cloud API Service ──────────────────────
// Wires Meta's WhatsApp Business Cloud API (graph.facebook.com/v18.0)
// for real message delivery. Credentials are stored per-tenant in the
// Setting table so each tenant brings their own WABA.
//
// Settings keys (per tenant, category = 'notifications'):
//   - whatsapp_phone_number_id
//   - whatsapp_access_token
//   - whatsapp_business_account_id

import { Injectable, Logger } from '@nestjs/common';
import { TenantAwareService } from '../../common/base.service';
import { PrismaService } from '../../common/prisma.service';
import { Prisma } from '@caratflow/db';

export const WHATSAPP_GRAPH_BASE = 'https://graph.facebook.com/v18.0';

export interface WhatsAppCredentials {
  phoneNumberId: string;
  accessToken: string;
  businessAccountId: string;
}

export interface WhatsAppTemplateComponent {
  type: 'header' | 'body' | 'button' | 'footer';
  parameters?: Array<{
    type: 'text' | 'currency' | 'date_time' | 'image' | 'document';
    text?: string;
    currency?: { fallback_value: string; code: string; amount_1000: number };
    date_time?: { fallback_value: string };
    image?: { link: string };
    document?: { link: string; filename?: string };
  }>;
  sub_type?: 'quick_reply' | 'url';
  index?: number;
}

export interface WhatsAppButton {
  id: string;
  title: string;
}

export interface WhatsAppSendResult {
  messageId: string;
  waId: string;
  logId?: string;
}

export class WhatsAppNotConfiguredError extends Error {
  constructor(tenantId: string) {
    super(`WhatsApp not configured for tenant ${tenantId}. Missing credentials in settings.`);
    this.name = 'WhatsAppNotConfiguredError';
  }
}

export class WhatsAppApiError extends Error {
  constructor(
    message: string,
    public readonly code: string | number,
    public readonly type?: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'WhatsAppApiError';
  }
}

const RETRY_DELAYS_MS = [500, 2000, 8000];

@Injectable()
export class WhatsAppService extends TenantAwareService {
  private readonly logger = new Logger(WhatsAppService.name);

  constructor(prisma: PrismaService) {
    super(prisma);
  }

  // ─── Credentials ───────────────────────────────────────────────

  async getCredentials(tenantId: string): Promise<WhatsAppCredentials> {
    const rows = await this.prisma.setting.findMany({
      where: {
        tenantId,
        settingKey: {
          in: [
            'whatsapp_phone_number_id',
            'whatsapp_access_token',
            'whatsapp_business_account_id',
          ],
        },
      },
    });

    const map: Record<string, string> = {};
    for (const r of rows) {
      const raw = r.settingValue as unknown;
      const value =
        typeof raw === 'string'
          ? raw
          : raw && typeof raw === 'object' && 'value' in (raw as Record<string, unknown>)
            ? String((raw as Record<string, unknown>).value)
            : String(raw ?? '');
      map[r.settingKey] = value;
    }

    const phoneNumberId = map.whatsapp_phone_number_id;
    const accessToken = map.whatsapp_access_token;
    const businessAccountId = map.whatsapp_business_account_id;

    if (!phoneNumberId || !accessToken || !businessAccountId) {
      throw new WhatsAppNotConfiguredError(tenantId);
    }

    return { phoneNumberId, accessToken, businessAccountId };
  }

  // ─── Public Send Methods ───────────────────────────────────────

  async sendTextMessage(
    tenantId: string,
    to: string,
    text: string,
    logId?: string,
  ): Promise<WhatsAppSendResult> {
    const body = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: this.normalizeE164(to),
      type: 'text',
      text: { preview_url: false, body: text },
    };
    return this.send(tenantId, body, logId);
  }

  async sendTemplateMessage(
    tenantId: string,
    to: string,
    templateName: string,
    languageCode: string,
    components: WhatsAppTemplateComponent[] = [],
    logId?: string,
  ): Promise<WhatsAppSendResult> {
    const body = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: this.normalizeE164(to),
      type: 'template',
      template: {
        name: templateName,
        language: { code: languageCode },
        components,
      },
    };
    return this.send(tenantId, body, logId);
  }

  async sendDocument(
    tenantId: string,
    to: string,
    documentUrl: string,
    filename: string,
    caption?: string,
    logId?: string,
  ): Promise<WhatsAppSendResult> {
    const body = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: this.normalizeE164(to),
      type: 'document',
      document: {
        link: documentUrl,
        filename,
        ...(caption ? { caption } : {}),
      },
    };
    return this.send(tenantId, body, logId);
  }

  async sendInteractive(
    tenantId: string,
    to: string,
    bodyText: string,
    buttons: WhatsAppButton[],
    logId?: string,
  ): Promise<WhatsAppSendResult> {
    if (buttons.length === 0 || buttons.length > 3) {
      throw new Error('Interactive button messages must have 1-3 buttons');
    }
    const body = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: this.normalizeE164(to),
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: bodyText },
        action: {
          buttons: buttons.map((b) => ({
            type: 'reply',
            reply: { id: b.id, title: b.title.slice(0, 20) },
          })),
        },
      },
    };
    return this.send(tenantId, body, logId);
  }

  /** Query Meta for delivery status of a given message id. */
  async getMessageStatus(tenantId: string, externalId: string): Promise<unknown> {
    const creds = await this.getCredentials(tenantId);
    const url = `${WHATSAPP_GRAPH_BASE}/${encodeURIComponent(externalId)}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${creds.accessToken}`,
      },
    });
    const json = (await res.json().catch(() => ({}))) as unknown;
    if (!res.ok) {
      const err = this.extractMetaError(json);
      throw new WhatsAppApiError(err.message, err.code, err.type, json);
    }
    return json;
  }

  // ─── Core Send With Retry + Log Update ─────────────────────────

  private async send(
    tenantId: string,
    requestBody: unknown,
    logId?: string,
  ): Promise<WhatsAppSendResult> {
    const creds = await this.getCredentials(tenantId);
    const url = `${WHATSAPP_GRAPH_BASE}/${creds.phoneNumberId}/messages`;

    try {
      const result = await this.fetchWithRetry(url, creds.accessToken, requestBody);

      if (logId) {
        await this.updateLogSuccess(logId, result.messageId);
      }
      return { ...result, logId };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const code =
        err instanceof WhatsAppApiError ? String(err.code) : 'unknown';
      this.logger.error(`WhatsApp send failed for tenant ${tenantId}: ${message}`);
      if (logId) {
        await this.updateLogFailure(logId, code, message);
      }
      throw err;
    }
  }

  private async fetchWithRetry(
    url: string,
    accessToken: string,
    body: unknown,
  ): Promise<{ messageId: string; waId: string }> {
    let lastError: unknown;
    for (let attempt = 0; attempt < RETRY_DELAYS_MS.length; attempt++) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });
        const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;

        if (!res.ok) {
          const err = this.extractMetaError(json);
          // Do not retry 4xx client errors (except 429)
          if (res.status >= 400 && res.status < 500 && res.status !== 429) {
            throw new WhatsAppApiError(err.message, err.code, err.type, json);
          }
          lastError = new WhatsAppApiError(err.message, err.code, err.type, json);
        } else {
          const messages = json.messages as Array<{ id: string }> | undefined;
          const contacts = json.contacts as Array<{ wa_id: string }> | undefined;
          if (!messages || messages.length === 0) {
            throw new WhatsAppApiError(
              'Meta response missing messages[0].id',
              'invalid_response',
              undefined,
              json,
            );
          }
          const first = messages[0];
          if (!first) {
            throw new WhatsAppApiError(
              'Meta response missing messages[0].id',
              'invalid_response',
              undefined,
              json,
            );
          }
          return {
            messageId: first.id,
            waId: contacts?.[0]?.wa_id ?? '',
          };
        }
      } catch (err) {
        lastError = err;
        if (err instanceof WhatsAppApiError && err.code !== 429 && err.code !== 'network') {
          // Non-retryable
          throw err;
        }
      }

      if (attempt < RETRY_DELAYS_MS.length - 1) {
        const delay = RETRY_DELAYS_MS[attempt] ?? 1000;
        await this.sleep(delay);
      }
    }
    throw lastError instanceof Error
      ? lastError
      : new WhatsAppApiError('WhatsApp send failed after retries', 'retry_exhausted');
  }

  private extractMetaError(json: unknown): { message: string; code: string | number; type?: string } {
    const obj = json as { error?: { message?: string; code?: number; type?: string; error_subcode?: number } };
    if (obj?.error) {
      return {
        message: obj.error.message ?? 'Unknown Meta API error',
        code: obj.error.code ?? 'unknown',
        type: obj.error.type,
      };
    }
    return { message: 'Unknown Meta API error', code: 'unknown' };
  }

  private async updateLogSuccess(logId: string, externalId: string): Promise<void> {
    const existing = await this.prisma.notificationLog.findUnique({ where: { id: logId } });
    const metadata = this.mergeMetadata(existing?.metadata, { externalId });
    await this.prisma.notificationLog.update({
      where: { id: logId },
      data: {
        status: 'SENT',
        sentAt: new Date(),
        metadata: metadata as Prisma.InputJsonValue,
      },
    });
  }

  private async updateLogFailure(
    logId: string,
    code: string,
    errorMessage: string,
  ): Promise<void> {
    const existing = await this.prisma.notificationLog.findUnique({ where: { id: logId } });
    const metadata = this.mergeMetadata(existing?.metadata, {
      errorCode: code,
      errorMessage,
    });
    await this.prisma.notificationLog.update({
      where: { id: logId },
      data: {
        status: 'FAILED',
        failureReason: errorMessage.slice(0, 500),
        metadata: metadata as Prisma.InputJsonValue,
      },
    });
  }

  private mergeMetadata(
    existing: unknown,
    patch: Record<string, unknown>,
  ): Record<string, unknown> {
    const base =
      existing && typeof existing === 'object' && !Array.isArray(existing)
        ? (existing as Record<string, unknown>)
        : {};
    return { ...base, ...patch };
  }

  private normalizeE164(phone: string): string {
    // Meta expects E.164 without leading '+'
    const trimmed = phone.trim();
    return trimmed.startsWith('+') ? trimmed.slice(1) : trimmed;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }
}
