import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { createMockPrismaService, mockTenantContext, resetMocks } from '../../../__tests__/mocks';
vi.mock('uuid', () => ({ v4: vi.fn(() => 'mock-uuid') }));
import { CmsHomepageService } from '../cms.homepage.service';

describe('CmsHomepageService', () => {
  let service: CmsHomepageService; let prisma: ReturnType<typeof createMockPrismaService>;
  const { tenantId, userId } = mockTenantContext;
  beforeEach(() => {
    prisma = createMockPrismaService();
    resetMocks(prisma);
    (prisma as any).homepageSection = { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), updateMany: vi.fn() };
    ['banner','collection','blogPost'].forEach(m => { (prisma as any)[m] = (prisma as any)[m] || { findMany: vi.fn() }; });
    service = new CmsHomepageService(prisma as never);
  });
  const mk = (o: Record<string,unknown> = {}) => ({ id: 'hs-1', tenantId, sectionType: 'HERO_BANNER', displayOrder: 0, isActive: true, config: {}, createdAt: new Date(), updatedAt: new Date(), ...o });

  describe('createSection', () => {
    it('should create section', async () => {
      (prisma as any).homepageSection.create.mockResolvedValue(mk());
      const r = await service.createSection(tenantId, userId, { sectionType: 'HERO_BANNER' } as any);
      expect(r.sectionType).toBe('HERO_BANNER');
    });
  });

  describe('updateSection', () => {
    it('should update section', async () => {
      (prisma as any).homepageSection.findFirst.mockResolvedValue(mk());
      (prisma as any).homepageSection.update.mockResolvedValue(mk({ displayOrder: 5 }));
      const r = await service.updateSection(tenantId, userId, 'hs-1', { displayOrder: 5 });
      expect(r.displayOrder).toBe(5);
    });
    it('should throw NotFoundException', async () => {
      (prisma as any).homepageSection.findFirst.mockResolvedValue(null);
      await expect(service.updateSection(tenantId, userId, 'x', {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('getSections (listSections)', () => {
    it('should return ordered sections', async () => {
      (prisma as any).homepageSection.findMany.mockResolvedValue([mk(), mk({ id: 'hs-2', displayOrder: 1 })]);
      const sections = await (prisma as any).homepageSection.findMany({ where: { tenantId }, orderBy: { displayOrder: 'asc' } });
      expect(sections).toHaveLength(2);
    });
  });
});
