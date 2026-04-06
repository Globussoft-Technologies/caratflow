import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { createMockPrismaService, mockTenantContext, resetMocks } from '../../../__tests__/mocks';
vi.mock('uuid', () => ({ v4: vi.fn(() => 'mock-uuid') }));
import { StorefrontReviewService } from '../storefront.review.service';

describe('StorefrontReviewService', () => {
  let service: StorefrontReviewService; let prisma: ReturnType<typeof createMockPrismaService>;
  const { tenantId } = mockTenantContext;
  beforeEach(() => {
    prisma = createMockPrismaService();
    resetMocks(prisma);
    (prisma as any).productReview = { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), count: vi.fn() };
    (prisma as any).onlineOrderItem = { findFirst: vi.fn() };
    prisma.product.findFirst = vi.fn() as any;
    prisma.customer.findFirst = vi.fn() as any;
    service = new StorefrontReviewService(prisma as never);
  });

  describe('submitReview', () => {
    it('should create review with verified purchase check', async () => {
      prisma.product.findFirst.mockResolvedValue({ id: 'p1' } as any);
      (prisma as any).productReview.findFirst.mockResolvedValue(null);
      (prisma as any).onlineOrderItem.findFirst.mockResolvedValue({ id: 'oi-1' });
      prisma.customer.findFirst.mockResolvedValue({ firstName: 'A', lastName: 'B' } as any);
      (prisma as any).productReview.create.mockResolvedValue({ id: 'r-1', productId: 'p1', customerName: 'A B', rating: 5, title: 'Great', body: 'Love it', isVerified: true, isPublished: false, createdBy: 'c1', createdAt: new Date() });
      const r = await service.submitReview(tenantId, 'c1', { productId: 'p1', rating: 5, title: 'Great', body: 'Love it' } as any);
      expect(r.isVerified).toBe(true);
    });
    it('should reject duplicate review', async () => {
      prisma.product.findFirst.mockResolvedValue({ id: 'p1' } as any);
      (prisma as any).productReview.findFirst.mockResolvedValue({ id: 'existing' });
      await expect(service.submitReview(tenantId, 'c1', { productId: 'p1', rating: 5 } as any)).rejects.toThrow(BadRequestException);
    });
    it('should throw NotFoundException for missing product', async () => {
      prisma.product.findFirst.mockResolvedValue(null);
      await expect(service.submitReview(tenantId, 'c1', { productId: 'x', rating: 5 } as any)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getReviews', () => {
    it('should return paginated published reviews', async () => {
      (prisma as any).productReview.findMany.mockResolvedValue([{ id: 'r-1', productId: 'p1', customerName: 'A', rating: 5, title: 'Good', body: '', isVerified: true, createdBy: 'c1', createdAt: new Date() }]);
      (prisma as any).productReview.count.mockResolvedValue(1);
      const r = await service.getReviews(tenantId, { productId: 'p1', page: 1, limit: 10 } as any);
      expect(r.total).toBe(1);
    });
  });

  describe('markHelpful', () => {
    it('should not throw for published review', async () => {
      (prisma as any).productReview.findFirst.mockResolvedValue({ id: 'r-1', isPublished: true });
      await service.markHelpful(tenantId, 'r-1'); // no-op in current impl
    });
    it('should throw NotFoundException for missing review', async () => {
      (prisma as any).productReview.findFirst.mockResolvedValue(null);
      await expect(service.markHelpful(tenantId, 'x')).rejects.toThrow(NotFoundException);
    });
  });
});
