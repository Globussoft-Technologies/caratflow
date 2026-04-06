import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockPrismaService, mockTenantContext, resetMocks } from '../../../__tests__/mocks';
import { CrmFeedbackService } from '../crm.feedback.service';

describe('CrmFeedbackService', () => {
  let service: CrmFeedbackService; let prisma: ReturnType<typeof createMockPrismaService>;
  const { tenantId, userId } = mockTenantContext;
  beforeEach(() => {
    prisma = createMockPrismaService();
    resetMocks(prisma);
    ['feedback'].forEach(m => { (prisma as any)[m] = { findFirst: vi.fn(), findFirstOrThrow: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), count: vi.fn(), aggregate: vi.fn(), groupBy: vi.fn() }; });
    service = new CrmFeedbackService(prisma as never);
  });

  describe('createFeedback', () => {
    it('should create with NEW status', async () => {
      (prisma as any).feedback.create.mockResolvedValue({ id: 'f-1', status: 'NEW', rating: 4 });
      const r = await service.createFeedback(tenantId, userId, { customerId: 'c1', feedbackType: 'PURCHASE', rating: 4, comment: 'Good' } as any);
      expect(r.status).toBe('NEW');
    });
  });

  describe('reviewFeedback', () => {
    it('should set status to REVIEWED', async () => {
      (prisma as any).feedback.findFirstOrThrow.mockResolvedValue({ id: 'f-1' });
      (prisma as any).feedback.update.mockResolvedValue({ id: 'f-1', status: 'REVIEWED' });
      const r = await service.reviewFeedback(tenantId, userId, 'f-1');
      expect(r.status).toBe('REVIEWED');
    });
  });

  describe('actionFeedback', () => {
    it('should set status to ACTIONED', async () => {
      (prisma as any).feedback.findFirstOrThrow.mockResolvedValue({ id: 'f-1' });
      (prisma as any).feedback.update.mockResolvedValue({ id: 'f-1', status: 'ACTIONED' });
      const r = await service.actionFeedback(tenantId, userId, 'f-1');
      expect(r.status).toBe('ACTIONED');
    });
  });

  describe('getAverageRating', () => {
    it('should return average and breakdown by type', async () => {
      (prisma as any).feedback.aggregate.mockResolvedValue({ _avg: { rating: 4.2 }, _count: 10 });
      (prisma as any).feedback.groupBy.mockResolvedValue([{ feedbackType: 'PURCHASE', _avg: { rating: 4.5 }, _count: 5 }]);
      const r = await service.getAverageRating(tenantId);
      expect(r.averageRating).toBe(4.2);
      expect(r.totalCount).toBe(10);
      expect(r.byType).toHaveLength(1);
    });
  });

  describe('listFeedback', () => {
    it('should return paginated list', async () => {
      (prisma as any).feedback.findMany.mockResolvedValue([{ id: 'f-1' }]);
      (prisma as any).feedback.count.mockResolvedValue(1);
      const r = await service.listFeedback(tenantId, 1, 20);
      expect(r.total).toBe(1);
    });
  });

  describe('getRatingDistribution', () => {
    it('should return 1-5 distribution', async () => {
      (prisma as any).feedback.groupBy.mockResolvedValue([{ rating: 5, _count: 10 }, { rating: 4, _count: 5 }]);
      const r = await service.getRatingDistribution(tenantId);
      expect(r[5]).toBe(10);
      expect(r[4]).toBe(5);
      expect(r[1]).toBe(0);
    });
  });
});
