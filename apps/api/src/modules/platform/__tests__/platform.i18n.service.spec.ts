import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { PlatformI18nService } from '../platform.i18n.service';
import { createMockPrismaService } from '../../../__tests__/setup';

function extendPrisma(base: ReturnType<typeof createMockPrismaService>) {
  return {
    ...base,
    translationKey: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
  };
}

describe('PlatformI18nService (Unit)', () => {
  let service: PlatformI18nService;
  let mockPrisma: ReturnType<typeof extendPrisma>;

  beforeEach(() => {
    mockPrisma = extendPrisma(createMockPrismaService());
    service = new PlatformI18nService(mockPrisma as any);
  });

  describe('getSupportedLocales', () => {
    it('returns array of supported locale codes', () => {
      const locales = service.getSupportedLocales();
      expect(locales).toContain('en');
      expect(locales).toContain('hi');
      expect(locales).toContain('gu');
    });
  });

  describe('createTranslationKey', () => {
    it('creates a new translation key', async () => {
      mockPrisma.translationKey.findUnique.mockResolvedValue(null);
      mockPrisma.translationKey.create.mockResolvedValue({
        id: 'tk-1',
        namespace: 'common',
        key: 'save',
        defaultValue: 'Save',
      });

      const result = await service.createTranslationKey({
        namespace: 'common',
        key: 'save',
        defaultValue: 'Save',
      });

      expect(result.key).toBe('save');
    });

    it('throws ConflictException for duplicate key', async () => {
      mockPrisma.translationKey.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(
        service.createTranslationKey({
          namespace: 'common',
          key: 'save',
          defaultValue: 'Save',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('updateTranslationKey', () => {
    it('merges new translations with existing ones', async () => {
      mockPrisma.translationKey.findUnique.mockResolvedValue({
        id: 'tk-1',
        translations: { hi: 'Old Hindi' },
      });
      mockPrisma.translationKey.update.mockResolvedValue({ id: 'tk-1' });

      await service.updateTranslationKey('tk-1', {
        translations: { gu: 'Gujarati' },
      });

      expect(mockPrisma.translationKey.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            translations: { hi: 'Old Hindi', gu: 'Gujarati' },
          }),
        }),
      );
    });

    it('throws NotFoundException for missing key', async () => {
      mockPrisma.translationKey.findUnique.mockResolvedValue(null);
      await expect(
        service.updateTranslationKey('bad', { defaultValue: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteTranslationKey', () => {
    it('deletes existing key', async () => {
      mockPrisma.translationKey.findUnique.mockResolvedValue({ id: 'tk-1' });
      mockPrisma.translationKey.delete.mockResolvedValue({});

      const result = await service.deleteTranslationKey('tk-1');
      expect(result.success).toBe(true);
    });

    it('throws NotFoundException for missing key', async () => {
      mockPrisma.translationKey.findUnique.mockResolvedValue(null);
      await expect(service.deleteTranslationKey('bad')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getTranslationsByNamespace', () => {
    it('returns translations for the specified locale', async () => {
      mockPrisma.translationKey.findMany.mockResolvedValue([
        { key: 'save', defaultValue: 'Save', translations: { hi: 'सहेजें' } },
        { key: 'cancel', defaultValue: 'Cancel', translations: {} },
      ]);

      const result = await service.getTranslationsByNamespace('common', 'hi');
      expect(result.save).toBe('सहेजें');
      expect(result.cancel).toBe('Cancel'); // falls back to default
    });

    it('defaults to en locale', async () => {
      mockPrisma.translationKey.findMany.mockResolvedValue([
        { key: 'title', defaultValue: 'Title', translations: { en: 'Title EN' } },
      ]);

      const result = await service.getTranslationsByNamespace('common');
      expect(result.title).toBe('Title EN');
    });
  });

  describe('getNamespaces', () => {
    it('returns distinct namespaces', async () => {
      mockPrisma.translationKey.findMany.mockResolvedValue([
        { namespace: 'common' },
        { namespace: 'dashboard' },
      ]);

      const result = await service.getNamespaces();
      expect(result).toEqual(['common', 'dashboard']);
    });
  });

  describe('bulkUpdateTranslations', () => {
    it('updates multiple translations for a namespace and locale', async () => {
      mockPrisma.translationKey.findUnique
        .mockResolvedValueOnce({ id: 'tk-1', translations: {} })
        .mockResolvedValueOnce({ id: 'tk-2', translations: {} });
      mockPrisma.translationKey.update.mockResolvedValue({});

      const result = await service.bulkUpdateTranslations('common', 'hi', {
        save: 'सहेजें',
        cancel: 'रद्द करें',
      });

      expect(result.updated).toBe(2);
    });
  });
});
