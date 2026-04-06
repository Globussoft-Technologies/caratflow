import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { PlatformSettingsService } from '../platform.settings.service';
import {
  createMockPrismaService,
  createMockEventBus,
  TEST_TENANT_ID,
  TEST_USER_ID,
  resetAllMocks,
} from '../../../__tests__/setup';

function extendPrisma(base: ReturnType<typeof createMockPrismaService>) {
  return {
    ...base,
    setting: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      upsert: vi.fn(),
    },
  };
}

describe('PlatformSettingsService (Unit)', () => {
  let service: PlatformSettingsService;
  let mockPrisma: ReturnType<typeof extendPrisma>;
  let mockEventBus: ReturnType<typeof createMockEventBus>;
  const audit = { userId: TEST_USER_ID };

  beforeEach(() => {
    mockPrisma = extendPrisma(createMockPrismaService());
    mockEventBus = createMockEventBus();
    service = new PlatformSettingsService(mockPrisma as any, mockEventBus as any);
  });

  describe('initializeDefaults', () => {
    it('creates default settings for a new tenant', async () => {
      mockPrisma.setting.findUnique.mockResolvedValue(null);
      mockPrisma.setting.create.mockResolvedValue({});

      const result = await service.initializeDefaults(TEST_TENANT_ID);

      expect(result.created).toBeGreaterThan(0);
      expect(result.existing).toBe(0);
    });

    it('is idempotent - skips existing settings', async () => {
      mockPrisma.setting.findUnique.mockResolvedValue({ id: 'exists' });

      const result = await service.initializeDefaults(TEST_TENANT_ID);

      expect(result.created).toBe(0);
      expect(result.existing).toBeGreaterThan(0);
    });
  });

  describe('getSettings', () => {
    it('returns all settings grouped by category', async () => {
      mockPrisma.setting.findMany.mockResolvedValue([
        { category: 'tax', settingKey: 'tax.gstin', settingValue: 'GST123' },
        { category: 'tax', settingKey: 'tax.pan', settingValue: 'PAN456' },
        { category: 'general', settingKey: 'company.name', settingValue: 'Test Store' },
      ]);

      const result = await service.getSettings(TEST_TENANT_ID);

      expect(result.grouped.tax).toBeDefined();
      expect(result.grouped.general).toBeDefined();
      expect(result.grouped.tax['tax.gstin']).toBe('GST123');
    });

    it('filters by category when provided', async () => {
      mockPrisma.setting.findMany.mockResolvedValue([]);

      await service.getSettings(TEST_TENANT_ID, 'tax');

      expect(mockPrisma.setting.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: TEST_TENANT_ID, category: 'tax' },
        }),
      );
    });
  });

  describe('getSetting', () => {
    it('returns a single setting by key', async () => {
      mockPrisma.setting.findUnique.mockResolvedValue({
        settingKey: 'tax.gstin',
        settingValue: 'GST123',
      });

      const result = await service.getSetting(TEST_TENANT_ID, 'tax.gstin');
      expect(result.settingValue).toBe('GST123');
    });

    it('throws NotFoundException when key not found', async () => {
      mockPrisma.setting.findUnique.mockResolvedValue(null);

      await expect(
        service.getSetting(TEST_TENANT_ID, 'missing.key'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('setSettings', () => {
    it('upserts settings and publishes events', async () => {
      mockPrisma.setting.findUnique.mockResolvedValue(null);
      mockPrisma.setting.upsert.mockResolvedValue({ settingKey: 'tax.gstin', settingValue: 'NEW' });

      const results = await service.setSettings(TEST_TENANT_ID, [
        { key: 'tax.gstin', value: 'NEW', category: 'tax' },
      ], audit);

      expect(results).toHaveLength(1);
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'platform.settings.updated',
          payload: expect.objectContaining({ settingKey: 'tax.gstin' }),
        }),
      );
    });

    it('captures old value in event payload', async () => {
      mockPrisma.setting.findUnique.mockResolvedValue({ settingValue: 'OLD' });
      mockPrisma.setting.upsert.mockResolvedValue({ settingKey: 'tax.gstin' });

      await service.setSettings(TEST_TENANT_ID, [
        { key: 'tax.gstin', value: 'NEW', category: 'tax' },
      ], audit);

      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({ oldValue: 'OLD', newValue: 'NEW' }),
        }),
      );
    });

    it('stores JSON values correctly', async () => {
      mockPrisma.setting.findUnique.mockResolvedValue(null);
      mockPrisma.setting.upsert.mockResolvedValue({});

      await service.setSettings(TEST_TENANT_ID, [
        { key: 'pos.config', value: { roundingMethod: 'nearest', precision: 100 }, category: 'pos' },
      ], audit);

      expect(mockPrisma.setting.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            settingValue: { roundingMethod: 'nearest', precision: 100 },
          }),
        }),
      );
    });
  });

  describe('getSettingsMap', () => {
    it('returns flat key-value map for a category', async () => {
      mockPrisma.setting.findMany.mockResolvedValue([
        { settingKey: 'pos.roundingMethod', settingValue: 'nearest' },
        { settingKey: 'pos.printOnSale', settingValue: true },
      ]);

      const result = await service.getSettingsMap(TEST_TENANT_ID, 'pos');

      expect(result['pos.roundingMethod']).toBe('nearest');
      expect(result['pos.printOnSale']).toBe(true);
    });
  });
});
