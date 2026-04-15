// ─── Platform Shared Types ────────────────────────────────────
// Schemas for platform-level configuration (settings, integrations).

import { z } from 'zod';

// ─── WhatsApp Business Cloud API Config ──────────────────────
// Each tenant brings their own Meta WABA credentials. These are
// stored in the Setting table under keys:
//   - whatsapp_phone_number_id
//   - whatsapp_access_token
//   - whatsapp_business_account_id

export const WhatsAppConfigSchema = z.object({
  phoneNumberId: z
    .string()
    .min(5, 'Phone Number ID is required')
    .max(64)
    .describe('Meta WhatsApp Phone Number ID (from Meta Business Manager)'),
  accessToken: z
    .string()
    .min(20, 'Access token must be a valid Meta system user token')
    .describe('Long-lived system user access token for Meta Graph API'),
  businessAccountId: z
    .string()
    .min(5, 'Business Account ID is required')
    .max(64)
    .describe('Meta WhatsApp Business Account (WABA) ID'),
  webhookVerifyToken: z
    .string()
    .min(8)
    .max(128)
    .optional()
    .describe('Shared secret echoed during Meta webhook verification handshake'),
  defaultLanguage: z
    .string()
    .min(2)
    .max(10)
    .default('en_US')
    .describe('Default template language code (e.g. en_US, hi_IN)'),
});

export type WhatsAppConfig = z.infer<typeof WhatsAppConfigSchema>;

/** Settings keys used by the WhatsApp integration. */
export const WHATSAPP_SETTING_KEYS = {
  phoneNumberId: 'whatsapp_phone_number_id',
  accessToken: 'whatsapp_access_token',
  businessAccountId: 'whatsapp_business_account_id',
  webhookVerifyToken: 'whatsapp_webhook_verify_token',
  defaultLanguage: 'whatsapp_default_language',
} as const;

export type WhatsAppSettingKey =
  (typeof WHATSAPP_SETTING_KEYS)[keyof typeof WHATSAPP_SETTING_KEYS];
