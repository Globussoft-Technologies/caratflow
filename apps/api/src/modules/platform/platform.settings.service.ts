import { Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { TenantAwareService } from '../../common/base.service';
import { PrismaService } from '../../common/prisma.service';
import { EventBusService } from '../../event-bus/event-bus.service';
import type { AuditMeta } from '@caratflow/shared-types';
import { Prisma } from '@caratflow/db';

type SettingCategory = 'general' | 'billing' | 'tax' | 'pos' | 'notifications' | 'display';

interface SetSettingInput {
  key: string;
  value: unknown;
  category: SettingCategory;
  description?: string;
}

/** Default settings applied when a new tenant is initialized. */
const DEFAULT_SETTINGS: Array<{ key: string; value: unknown; category: SettingCategory; description: string }> = [
  // General
  { key: 'company.name', value: '', category: 'general', description: 'Company display name' },
  { key: 'company.logo', value: '', category: 'general', description: 'Company logo URL' },
  { key: 'company.address', value: '', category: 'general', description: 'Company address' },
  { key: 'company.phone', value: '', category: 'general', description: 'Company phone number' },
  { key: 'company.email', value: '', category: 'general', description: 'Company email address' },
  { key: 'company.website', value: '', category: 'general', description: 'Company website URL' },

  // Billing
  { key: 'billing.invoicePrefix', value: 'INV', category: 'billing', description: 'Invoice number prefix' },
  { key: 'billing.invoiceNumberStart', value: 1, category: 'billing', description: 'Starting invoice number' },
  { key: 'billing.creditNotePrefix', value: 'CN', category: 'billing', description: 'Credit note prefix' },
  { key: 'billing.debitNotePrefix', value: 'DN', category: 'billing', description: 'Debit note prefix' },
  { key: 'billing.estimatePrefix', value: 'EST', category: 'billing', description: 'Estimate prefix' },
  { key: 'billing.termsAndConditions', value: '', category: 'billing', description: 'Default invoice T&C' },

  // Tax
  { key: 'tax.gstin', value: '', category: 'tax', description: 'GSTIN number' },
  { key: 'tax.pan', value: '', category: 'tax', description: 'PAN number' },
  { key: 'tax.stateCode', value: '', category: 'tax', description: 'State code for GST' },
  { key: 'tax.defaultGstRate', value: 3, category: 'tax', description: 'Default GST rate for jewelry (%)' },
  { key: 'tax.makingChargesGstRate', value: 5, category: 'tax', description: 'GST rate for making charges (%)' },
  { key: 'tax.tdsEnabled', value: false, category: 'tax', description: 'Enable TDS deduction' },
  { key: 'tax.tcsEnabled', value: false, category: 'tax', description: 'Enable TCS collection' },
  { key: 'tax.tdsThresholdPaise', value: 5000000, category: 'tax', description: 'TDS 194Q threshold in paise' },
  { key: 'tax.tcsThresholdPaise', value: 5000000, category: 'tax', description: 'TCS 206C threshold in paise' },

  // POS
  { key: 'pos.roundingMethod', value: 'nearest', category: 'pos', description: 'Rounding method: nearest, up, down' },
  { key: 'pos.roundingPrecision', value: 100, category: 'pos', description: 'Round to nearest X paise (100=1 rupee)' },
  { key: 'pos.receiptFormat', value: 'standard', category: 'pos', description: 'Receipt template: standard, compact, detailed' },
  { key: 'pos.defaultPaymentMethod', value: 'CASH', category: 'pos', description: 'Default payment method' },
  { key: 'pos.printOnSale', value: true, category: 'pos', description: 'Auto-print receipt on sale completion' },
  { key: 'pos.showBarcode', value: true, category: 'pos', description: 'Show barcode scanner in POS' },

  // Notifications
  { key: 'notifications.whatsappApiKey', value: '', category: 'notifications', description: 'WhatsApp Business API key' },
  { key: 'notifications.whatsappPhoneId', value: '', category: 'notifications', description: 'WhatsApp phone number ID' },
  { key: 'notifications.smsProvider', value: '', category: 'notifications', description: 'SMS provider (msg91, twilio)' },
  { key: 'notifications.smsApiKey', value: '', category: 'notifications', description: 'SMS provider API key' },
  { key: 'notifications.smtpHost', value: '', category: 'notifications', description: 'SMTP server host' },
  { key: 'notifications.smtpPort', value: 587, category: 'notifications', description: 'SMTP server port' },
  { key: 'notifications.smtpUser', value: '', category: 'notifications', description: 'SMTP username' },
  { key: 'notifications.smtpPassword', value: '', category: 'notifications', description: 'SMTP password' },
  { key: 'notifications.fromEmail', value: '', category: 'notifications', description: 'Sender email address' },

  // Display
  { key: 'display.weightUnit', value: 'g', category: 'display', description: 'Default weight display unit' },
  { key: 'display.currency', value: 'INR', category: 'display', description: 'Display currency' },
  { key: 'display.dateFormat', value: 'DD/MM/YYYY', category: 'display', description: 'Date format' },
  { key: 'display.timezone', value: 'Asia/Kolkata', category: 'display', description: 'Timezone' },
  { key: 'display.language', value: 'en', category: 'display', description: 'Default language' },
  { key: 'display.purityFormat', value: 'karat', category: 'display', description: 'Purity display: karat, fineness, percentage' },
];

@Injectable()
export class PlatformSettingsService extends TenantAwareService {
  constructor(
    prisma: PrismaService,
    private readonly eventBus: EventBusService,
  ) {
    super(prisma);
  }

  /** Initialize default settings for a new tenant. Idempotent. */
  async initializeDefaults(tenantId: string): Promise<{ created: number; existing: number }> {
    let created = 0;
    let existing = 0;

    for (const s of DEFAULT_SETTINGS) {
      const exists = await this.prisma.setting.findUnique({
        where: { tenantId_settingKey: { tenantId, settingKey: s.key } },
      });
      if (exists) {
        existing++;
        continue;
      }
      await this.prisma.setting.create({
        data: {
          id: uuid(),
          tenantId,
          settingKey: s.key,
          settingValue: s.value as unknown as Prisma.InputJsonValue,
          category: s.category,
          description: s.description,
        },
      });
      created++;
    }

    return { created, existing };
  }

  /** Get all settings for a tenant, optionally filtered by category. */
  async getSettings(tenantId: string, category?: SettingCategory) {
    const where: Record<string, unknown> = { tenantId };
    if (category) {
      where.category = category;
    }
    const settings = await this.prisma.setting.findMany({
      where,
      orderBy: [{ category: 'asc' }, { settingKey: 'asc' }],
    });

    // Group by category for easy frontend consumption
    const grouped: Record<string, Record<string, unknown>> = {};
    for (const s of settings) {
      const bucket = grouped[s.category] ?? (grouped[s.category] = {});
      bucket[s.settingKey] = s.settingValue;
    }

    return { settings, grouped };
  }

  /** Get a single setting value. */
  async getSetting(tenantId: string, key: string) {
    const setting = await this.prisma.setting.findUnique({
      where: { tenantId_settingKey: { tenantId, settingKey: key } },
    });
    if (!setting) {
      throw new NotFoundException(`Setting "${key}" not found`);
    }
    return setting;
  }

  /** Set one or more settings. Upserts each key. */
  async setSettings(tenantId: string, inputs: SetSettingInput[], audit: AuditMeta) {
    const results = [];

    for (const input of inputs) {
      const existing = await this.prisma.setting.findUnique({
        where: { tenantId_settingKey: { tenantId, settingKey: input.key } },
      });

      const oldValue = existing?.settingValue ?? null;

      const setting = await this.prisma.setting.upsert({
        where: { tenantId_settingKey: { tenantId, settingKey: input.key } },
        create: {
          id: uuid(),
          tenantId,
          settingKey: input.key,
          settingValue: input.value as unknown as Prisma.InputJsonValue,
          category: input.category,
          description: input.description ?? null,
        },
        update: {
          settingValue: input.value as unknown as Prisma.InputJsonValue,
          ...(input.description !== undefined && { description: input.description }),
        },
      });

      results.push(setting);

      await this.eventBus.publish({
        id: uuid(),
        tenantId,
        userId: audit.userId,
        timestamp: new Date().toISOString(),
        type: 'platform.settings.updated',
        payload: { settingKey: input.key, oldValue, newValue: input.value },
      });
    }

    return results;
  }

  /** Get settings formatted as a flat key-value map for a given category. */
  async getSettingsMap(tenantId: string, category: SettingCategory): Promise<Record<string, unknown>> {
    const settings = await this.prisma.setting.findMany({
      where: { tenantId, category },
    });
    const map: Record<string, unknown> = {};
    for (const s of settings) {
      map[s.settingKey] = s.settingValue;
    }
    return map;
  }
}
