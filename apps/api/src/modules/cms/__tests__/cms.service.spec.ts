import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { createMockPrismaService, mockTenantContext, resetMocks } from '../../../__tests__/mocks';
vi.mock('uuid', () => ({ v4: vi.fn(() => 'mock-uuid') }));
import { CmsService } from '../cms.service';

describe('CmsService', () => {
  let service: CmsService; let prisma: ReturnType<typeof createMockPrismaService>;
  const { tenantId, userId } = mockTenantContext;
  beforeEach(() => {
    prisma = createMockPrismaService();
    resetMocks(prisma);
    ['banner','collection','page','faqItem','announcement','blogPost','homepageSection'].forEach(m => { (prisma as any)[m] = { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), updateMany: vi.fn(), delete: vi.fn(), count: vi.fn() }; });
    service = new CmsService(prisma as never);
  });

  describe('createBanner', () => {
    it('should create banner', async () => {
      (prisma as any).banner.create.mockResolvedValue({ id: 'b-1', tenantId, title: 'Sale', subtitle: null, imageUrl: 'img.jpg', linkUrl: null, linkType: 'NONE', position: 'HERO', displayOrder: 0, startDate: null, endDate: null, isActive: true, targetAudience: 'ALL', createdAt: new Date(), updatedAt: new Date() });
      const r = await service.createBanner(tenantId, userId, { title: 'Sale', imageUrl: 'img.jpg' } as any);
      expect(r.title).toBe('Sale');
    });
  });

  describe('createCollection', () => {
    it('should create collection', async () => {
      (prisma as any).collection.findFirst.mockResolvedValue(null);
      (prisma as any).collection.create.mockResolvedValue({ id: 'c-1', tenantId, name: 'Summer', slug: 'summer', description: null, imageUrl: null, products: [], displayOrder: 0, isActive: true, isFeatured: false, createdAt: new Date(), updatedAt: new Date() });
      const r = await service.createCollection(tenantId, userId, { name: 'Summer', slug: 'summer' } as any);
      expect(r.slug).toBe('summer');
    });
    it('should reject duplicate slug', async () => {
      (prisma as any).collection.findFirst.mockResolvedValue({ id: 'existing' });
      await expect(service.createCollection(tenantId, userId, { name: 'Summer', slug: 'summer' } as any)).rejects.toThrow(ConflictException);
    });
  });

  describe('createPage', () => {
    it('should create page', async () => {
      (prisma as any).page.findFirst.mockResolvedValue(null);
      (prisma as any).page.create.mockResolvedValue({ id: 'p-1', tenantId, title: 'About', slug: 'about', content: 'Content', metaTitle: null, metaDescription: null, isPublished: false, publishedAt: null, createdAt: new Date(), updatedAt: new Date() });
      const r = await service.createPage(tenantId, userId, { title: 'About', slug: 'about', content: 'Content' } as any);
      expect(r.slug).toBe('about');
    });
  });

  describe('createFaq', () => {
    it('should create FAQ', async () => {
      (prisma as any).faqItem.create.mockResolvedValue({ id: 'f-1', tenantId, question: 'Q?', answer: 'A', category: null, displayOrder: 0, isPublished: true, createdAt: new Date(), updatedAt: new Date() });
      const r = await service.createFaq(tenantId, userId, { question: 'Q?', answer: 'A' } as any);
      expect(r.question).toBe('Q?');
    });
  });

  describe('getDashboard', () => {
    it('should return CMS dashboard stats', async () => {
      (prisma as any).banner.count.mockResolvedValue(3);
      (prisma as any).collection.count.mockResolvedValue(5);
      (prisma as any).page.count.mockResolvedValue(2);
      (prisma as any).blogPost.count.mockResolvedValue(10);
      (prisma as any).faqItem.count.mockResolvedValue(8);
      (prisma as any).announcement.count.mockResolvedValue(1);
      (prisma as any).homepageSection.count.mockResolvedValue(4);
      const r = await service.getDashboard(tenantId);
      expect(r.activeBanners).toBe(3);
      expect(r.publishedBlogPosts).toBe(10);
    });
  });

  describe('deleteBanner', () => {
    it('should delete banner', async () => {
      (prisma as any).banner.findFirst.mockResolvedValue({ id: 'b-1' });
      (prisma as any).banner.delete.mockResolvedValue({});
      await service.deleteBanner(tenantId, 'b-1');
      expect((prisma as any).banner.delete).toHaveBeenCalled();
    });
    it('should throw NotFoundException', async () => {
      (prisma as any).banner.findFirst.mockResolvedValue(null);
      await expect(service.deleteBanner(tenantId, 'x')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getBanner', () => {
    it('should throw NotFoundException', async () => {
      (prisma as any).banner.findFirst.mockResolvedValue(null);
      await expect(service.getBanner(tenantId, 'x')).rejects.toThrow(NotFoundException);
    });
  });
});
