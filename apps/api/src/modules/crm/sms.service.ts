// ─── SMS Service (MSG91 + Twilio) ──────────────────────────────
// Single service, per-tenant provider selection via Settings:
//   sms_provider = "MSG91" | "TWILIO"   (default: MSG91)

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

export type SmsProvider = 'MSG91' | 'TWILIO';

export interface SendSmsInput {
  /** E.164 recipient, e.g. +919812345678 */
  to: string;
  body: string;
  /** MSG91 flow/template id — only meaningful for MSG91 flow API */
  templateId?: string;
  /** Variables injected into the MSG91 flow recipient */
  templateVars?: Record<string, string>;
}

export interface SmsSendResult {
  success: true;
  provider: SmsProvider;
  externalId: string | null;
  statusCode: number;
}

interface Msg91Config {
  provider: 'MSG91';
  authKey: string;
  senderId: string;
  flowId: string;
}

interface TwilioConfig {
  provider: 'TWILIO';
  accountSid: string;
  authToken: string;
  fromNumber: string;
}

type SmsConfig = Msg91Config | TwilioConfig;

const MSG91_URL = 'https://api.msg91.com/api/v5/flow/';
const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 200;

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async sendSms(tenantId: string, input: SendSmsInput): Promise<SmsSendResult> {
    if (!input.to) throw new Error('SmsService: "to" is required');
    if (!input.body && !input.templateId) {
      throw new Error('SmsService: one of { body, templateId } is required');
    }

    const cfg = await this.loadConfig(tenantId);
    if (cfg.provider === 'MSG91') {
      return this.sendViaMsg91(cfg, input);
    }
    return this.sendViaTwilio(cfg, input);
  }

  // ─── Config loader ──────────────────────────────────────────

  private async loadConfig(tenantId: string): Promise<SmsConfig> {
    const keys = [
      'sms_provider',
      'msg91_auth_key',
      'msg91_sender_id',
      'msg91_flow_id',
      'twilio_account_sid',
      'twilio_auth_token',
      'twilio_from_number',
    ];
    const rows = await this.prisma.setting.findMany({
      where: { tenantId, settingKey: { in: keys } },
    });
    const map = new Map<string, unknown>();
    for (const r of rows) map.set(r.settingKey, this.unwrap(r.settingValue));

    const rawProvider = (map.get('sms_provider') as string | undefined) ?? 'MSG91';
    const provider: SmsProvider =
      rawProvider.toUpperCase() === 'TWILIO' ? 'TWILIO' : 'MSG91';

    if (provider === 'MSG91') {
      const authKey = map.get('msg91_auth_key') as string | undefined;
      const senderId = map.get('msg91_sender_id') as string | undefined;
      const flowId = map.get('msg91_flow_id') as string | undefined;
      if (!authKey) throw new Error('SmsService: missing setting "msg91_auth_key" for tenant');
      if (!senderId) throw new Error('SmsService: missing setting "msg91_sender_id" for tenant');
      if (!flowId) throw new Error('SmsService: missing setting "msg91_flow_id" for tenant');
      return { provider: 'MSG91', authKey, senderId, flowId };
    }

    const accountSid = map.get('twilio_account_sid') as string | undefined;
    const authToken = map.get('twilio_auth_token') as string | undefined;
    const fromNumber = map.get('twilio_from_number') as string | undefined;
    if (!accountSid) throw new Error('SmsService: missing setting "twilio_account_sid" for tenant');
    if (!authToken) throw new Error('SmsService: missing setting "twilio_auth_token" for tenant');
    if (!fromNumber) throw new Error('SmsService: missing setting "twilio_from_number" for tenant');
    return { provider: 'TWILIO', accountSid, authToken, fromNumber };
  }

  private unwrap(value: unknown): unknown {
    if (value && typeof value === 'object' && 'value' in (value as Record<string, unknown>)) {
      return (value as Record<string, unknown>).value;
    }
    return value;
  }

  // ─── MSG91 ──────────────────────────────────────────────────

  private async sendViaMsg91(cfg: Msg91Config, input: SendSmsInput): Promise<SmsSendResult> {
    // Strip leading "+" for MSG91 mobile numbers
    const mobile = input.to.replace(/^\+/, '');
    const recipient: Record<string, string> = { mobiles: mobile };
    if (input.templateVars) {
      for (const [k, v] of Object.entries(input.templateVars)) recipient[k] = v;
    }
    // Provide body under a generic "body" var in case the flow references it
    if (input.body && !('body' in recipient)) recipient.body = input.body;

    const body = {
      template_id: input.templateId ?? cfg.flowId,
      sender: cfg.senderId,
      short_url: '0',
      recipients: [recipient],
    };

    const res = await this.postWithRetry(MSG91_URL, {
      method: 'POST',
      headers: {
        authkey: cfg.authKey,
        'Content-Type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify(body),
    });
    const json = await this.safeJson(res);
    const externalId =
      (json && (json.request_id as string)) ??
      (json && (json.message as string)) ??
      null;
    return { success: true, provider: 'MSG91', externalId, statusCode: res.status };
  }

  // ─── Twilio ─────────────────────────────────────────────────

  private async sendViaTwilio(cfg: TwilioConfig, input: SendSmsInput): Promise<SmsSendResult> {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${cfg.accountSid}/Messages.json`;
    const form = new URLSearchParams();
    form.set('To', input.to);
    form.set('From', cfg.fromNumber);
    form.set('Body', input.body);

    const auth = Buffer.from(`${cfg.accountSid}:${cfg.authToken}`).toString('base64');
    const res = await this.postWithRetry(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form.toString(),
    });
    const json = await this.safeJson(res);
    const externalId = json && typeof json.sid === 'string' ? (json.sid as string) : null;
    return { success: true, provider: 'TWILIO', externalId, statusCode: res.status };
  }

  // ─── HTTP + retry helpers ───────────────────────────────────

  private async postWithRetry(url: string, init: RequestInit): Promise<Response> {
    let lastErr: unknown;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      let res: Response | undefined;
      try {
        res = await fetch(url, init);
      } catch (err) {
        lastErr = err;
      }

      if (res) {
        if (res.status >= 200 && res.status < 300) return res;
        const text = await res.text().catch(() => '');
        const err = new Error(`SMS provider ${res.status}: ${text}`);
        if (res.status < 500 && res.status !== 429) {
          throw err;
        }
        lastErr = err;
      }

      if (attempt < MAX_RETRIES - 1) {
        await this.sleep(BASE_BACKOFF_MS * Math.pow(2, attempt));
      }
    }
    throw lastErr instanceof Error ? lastErr : new Error('SmsService: send failed');
  }

  private async safeJson(res: Response): Promise<Record<string, unknown> | null> {
    try {
      return (await res.clone().json()) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
