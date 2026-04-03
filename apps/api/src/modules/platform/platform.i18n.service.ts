import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { PrismaService } from '../../common/prisma.service';

/** Supported locales for CaratFlow. */
const SUPPORTED_LOCALES = ['en', 'hi', 'ta', 'te', 'gu', 'mr', 'bn'] as const;
type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

interface CreateTranslationInput {
  namespace: string;
  key: string;
  defaultValue: string;
  translations?: Partial<Record<SupportedLocale, string>>;
}

interface UpdateTranslationInput {
  defaultValue?: string;
  translations?: Partial<Record<SupportedLocale, string>>;
}

@Injectable()
export class PlatformI18nService {
  constructor(private readonly prisma: PrismaService) {}

  /** Get all supported locales. */
  getSupportedLocales(): readonly string[] {
    return SUPPORTED_LOCALES;
  }

  /** Create a new translation key. */
  async createTranslationKey(input: CreateTranslationInput) {
    const existing = await this.prisma.translationKey.findUnique({
      where: { namespace_key: { namespace: input.namespace, key: input.key } },
    });
    if (existing) {
      throw new ConflictException(`Translation key "${input.namespace}.${input.key}" already exists`);
    }

    return this.prisma.translationKey.create({
      data: {
        id: uuid(),
        namespace: input.namespace,
        key: input.key,
        defaultValue: input.defaultValue,
        translations: (input.translations as Record<string, string>) ?? {},
      },
    });
  }

  /** Update an existing translation key or its translations. */
  async updateTranslationKey(id: string, input: UpdateTranslationInput) {
    const existing = await this.prisma.translationKey.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Translation key not found');
    }

    const data: Record<string, unknown> = {};
    if (input.defaultValue !== undefined) {
      data.defaultValue = input.defaultValue;
    }
    if (input.translations !== undefined) {
      // Merge with existing translations
      const currentTranslations = (existing.translations as Record<string, string>) ?? {};
      data.translations = { ...currentTranslations, ...input.translations };
    }

    return this.prisma.translationKey.update({
      where: { id },
      data,
    });
  }

  /** Delete a translation key. */
  async deleteTranslationKey(id: string) {
    const existing = await this.prisma.translationKey.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Translation key not found');
    }
    await this.prisma.translationKey.delete({ where: { id } });
    return { success: true };
  }

  /** Get translations by namespace and locale. Returns key-value map. */
  async getTranslationsByNamespace(
    namespace: string,
    locale: SupportedLocale = 'en',
  ): Promise<Record<string, string>> {
    const keys = await this.prisma.translationKey.findMany({
      where: { namespace },
      orderBy: { key: 'asc' },
    });

    const result: Record<string, string> = {};
    for (const tk of keys) {
      const translations = (tk.translations as Record<string, string>) ?? {};
      result[tk.key] = translations[locale] ?? tk.defaultValue;
    }
    return result;
  }

  /** Get all translation keys with pagination, optionally filtered by namespace. */
  async listTranslationKeys(
    page = 1,
    limit = 50,
    namespace?: string,
    search?: string,
  ) {
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = {};
    if (namespace) {
      where.namespace = namespace;
    }
    if (search) {
      where.OR = [
        { key: { contains: search } },
        { defaultValue: { contains: search } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.translationKey.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ namespace: 'asc' }, { key: 'asc' }],
      }),
      this.prisma.translationKey.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);
    return {
      items,
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    };
  }

  /** Get all distinct namespaces. */
  async getNamespaces(): Promise<string[]> {
    const results = await this.prisma.translationKey.findMany({
      distinct: ['namespace'],
      select: { namespace: true },
      orderBy: { namespace: 'asc' },
    });
    return results.map((r) => r.namespace);
  }

  /** Bulk update translations for a namespace+locale. */
  async bulkUpdateTranslations(
    namespace: string,
    locale: SupportedLocale,
    translations: Record<string, string>,
  ) {
    let updated = 0;

    for (const [key, value] of Object.entries(translations)) {
      const existing = await this.prisma.translationKey.findUnique({
        where: { namespace_key: { namespace, key } },
      });
      if (!existing) continue;

      const currentTranslations = (existing.translations as Record<string, string>) ?? {};
      currentTranslations[locale] = value;

      await this.prisma.translationKey.update({
        where: { id: existing.id },
        data: { translations: currentTranslations },
      });
      updated++;
    }

    return { updated };
  }
}
