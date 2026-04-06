import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { createMockPrismaService, mockTenantContext, resetMocks } from '../../../__tests__/mocks';
vi.mock('uuid', () => ({ v4: vi.fn(() => 'mock-uuid') }));
import { CmsSeoService } from '../cms.seo.service';

describe('CmsSeoService', () => {
  let service: CmsSeoService; let prisma: ReturnType<typeof createMockPrismaService>;
  const { tenantId, userId } = mockTenantContext;
  beforeEach(() => {
    prisma = createMockPrismaService();
    resetMocks(prisma);
    (prisma as any).seoMetadata = { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), count: vi.fn() };
    service = new CmsSeoService(prisma as never);
  });
  const mk = (o: Record<string,unknown> = {}) => ({ id: 'seo-1', tenantId, pageType: 'PRODUCT', pageIdentifier: 'p1', metaTitle: 'Ring', metaDescription: 'Gold ring', ogImage: null, canonicalUrl: null, structuredData: null, createdAt: new Date(), updatedAt: new Date(), ...o });

  describe('upsertSeoMetadata', () => {
    it('should create when not exists', async () => {
      (prisma as any).seoMetadata.findFirst.mockResolvedValue(null);
      (prisma as any).seoMetadata.create.mockResolvedValue(mk());
      const r = await service.upsertSeoMetadata(tenantId, userId, { pageType: 'PRODUCT', pageIdentifier: 'p1', metaTitle: 'Ring' } as any);
      expect(r.metaTitle).toBe('Ring');
    });
    it('should update when exists', async () => {
      (prisma as any).seoMetadata.findFirst.mockResolvedValue(mk());
      (prisma as any).seoMetadata.update.mockResolvedValue(mk({ metaTitle: 'Updated' }));
      const r = await service.upsertSeoMetadata(tenantId, userId, { pageType: 'PRODUCT', pageIdentifier: 'p1', metaTitle: 'Updated' } as any);
      expect(r.metaTitle).toBe('Updated');
    });
  });
});
