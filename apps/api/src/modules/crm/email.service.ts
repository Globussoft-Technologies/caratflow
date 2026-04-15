// ─── Email Service (SendGrid) ──────────────────────────────────
// Real SendGrid integration for transactional + templated email.
// Per-tenant config in platform Settings table.

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

export interface EmailAttachment {
  /** Base64-encoded content */
  content: string;
  filename: string;
  /** MIME type, e.g. application/pdf */
  type: string;
  /** Optional disposition; defaults to "attachment" */
  disposition?: 'attachment' | 'inline';
  contentId?: string;
}

export interface SendEmailInput {
  to: string | string[];
  from?: string;
  fromName?: string;
  subject?: string;
  html?: string;
  text?: string;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
  attachments?: EmailAttachment[];
  /** SendGrid Dynamic Template id (starts with "d-") */
  templateId?: string;
  /** Variables passed to the dynamic template */
  dynamicTemplateData?: Record<string, unknown>;
}

export interface EmailSendResult {
  success: true;
  externalId: string | null;
  statusCode: number;
}

interface SendGridConfig {
  apiKey: string;
  fromEmail: string;
  fromName?: string;
}

const SENDGRID_URL = 'https://api.sendgrid.com/v3/mail/send';
const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 200;

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly prisma: PrismaService) {}

  async sendEmail(tenantId: string, input: SendEmailInput): Promise<EmailSendResult> {
    const cfg = await this.loadConfig(tenantId);

    if (!input.html && !input.text && !input.templateId) {
      throw new Error('EmailService: one of { html, text, templateId } is required');
    }
    if (!input.to || (Array.isArray(input.to) && input.to.length === 0)) {
      throw new Error('EmailService: recipient "to" is required');
    }

    const body = this.buildPayload(cfg, input);
    return this.postWithRetry(cfg.apiKey, body);
  }

  /** Read SendGrid config from Settings table; throw clear error if missing. */
  private async loadConfig(tenantId: string): Promise<SendGridConfig> {
    const keys = ['sendgrid_api_key', 'sendgrid_from_email', 'sendgrid_from_name'];
    const rows = await this.prisma.setting.findMany({
      where: { tenantId, settingKey: { in: keys } },
    });
    const map = new Map<string, unknown>();
    for (const r of rows) map.set(r.settingKey, this.unwrap(r.settingValue));

    const apiKey = map.get('sendgrid_api_key') as string | undefined;
    const fromEmail = map.get('sendgrid_from_email') as string | undefined;
    const fromName = map.get('sendgrid_from_name') as string | undefined;

    if (!apiKey) throw new Error('EmailService: missing setting "sendgrid_api_key" for tenant');
    if (!fromEmail) throw new Error('EmailService: missing setting "sendgrid_from_email" for tenant');

    return { apiKey, fromEmail, fromName };
  }

  private unwrap(value: unknown): unknown {
    if (value && typeof value === 'object' && 'value' in (value as Record<string, unknown>)) {
      return (value as Record<string, unknown>).value;
    }
    return value;
  }

  private toAddressArray(value: string | string[] | undefined): { email: string }[] | undefined {
    if (!value) return undefined;
    const arr = Array.isArray(value) ? value : [value];
    return arr.filter(Boolean).map((email) => ({ email }));
  }

  /** Build SendGrid v3 /mail/send payload. */
  private buildPayload(cfg: SendGridConfig, input: SendEmailInput): Record<string, unknown> {
    const to = this.toAddressArray(input.to)!;
    const cc = this.toAddressArray(input.cc);
    const bcc = this.toAddressArray(input.bcc);

    const personalization: Record<string, unknown> = { to };
    if (cc && cc.length) personalization.cc = cc;
    if (bcc && bcc.length) personalization.bcc = bcc;

    if (input.templateId && input.dynamicTemplateData) {
      personalization.dynamic_template_data = input.dynamicTemplateData;
    } else if (input.subject) {
      personalization.subject = input.subject;
    }

    const payload: Record<string, unknown> = {
      personalizations: [personalization],
      from: {
        email: input.from ?? cfg.fromEmail,
        name: input.fromName ?? cfg.fromName,
      },
    };

    if (input.replyTo) {
      payload.reply_to = { email: input.replyTo };
    }

    if (input.templateId) {
      payload.template_id = input.templateId;
    } else {
      if (input.subject) payload.subject = input.subject;
      const content: { type: string; value: string }[] = [];
      if (input.text) content.push({ type: 'text/plain', value: input.text });
      if (input.html) content.push({ type: 'text/html', value: input.html });
      if (content.length === 0) content.push({ type: 'text/plain', value: '' });
      payload.content = content;
    }

    if (input.attachments && input.attachments.length > 0) {
      payload.attachments = input.attachments.map((a) => ({
        content: a.content,
        filename: a.filename,
        type: a.type,
        disposition: a.disposition ?? 'attachment',
        ...(a.contentId ? { content_id: a.contentId } : {}),
      }));
    }

    return payload;
  }

  private async postWithRetry(apiKey: string, body: Record<string, unknown>): Promise<EmailSendResult> {
    let lastErr: unknown;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      let res: Response | undefined;
      try {
        res = await fetch(SENDGRID_URL, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });
      } catch (err) {
        // Network error -- retryable
        lastErr = err;
      }

      if (res) {
        if (res.status >= 200 && res.status < 300) {
          const messageId =
            res.headers.get('x-message-id') ??
            res.headers.get('X-Message-Id') ??
            null;
          return { success: true, externalId: messageId, statusCode: res.status };
        }

        const text = await res.text().catch(() => '');
        const err = new Error(`SendGrid ${res.status}: ${text}`);

        // Fail fast on non-retryable 4xx
        if (res.status < 500 && res.status !== 429) {
          throw err;
        }
        lastErr = err;
      }

      if (attempt < MAX_RETRIES - 1) {
        await this.sleep(BASE_BACKOFF_MS * Math.pow(2, attempt));
      }
    }
    throw lastErr instanceof Error ? lastErr : new Error('EmailService: send failed');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
