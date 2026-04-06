import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockPrismaService, mockTenantContext, resetMocks } from '../../../__tests__/mocks';
vi.mock('uuid', () => ({ v4: vi.fn(() => 'mock-uuid') }));
import { SearchAnalyticsService } from '../search.analytics.service';

describe('SearchAnalyticsService', () => {
  let service: SearchAnalyticsService; let prisma: ReturnType<typeof createMockPrismaService>;
  const { tenantId } = mockTenantContext;
  beforeEach(() => {
    prisma = createMockPrismaService();
    resetMocks(prisma);
    ['searchLog','popularSearch'].forEach(m => { (prisma as any)[m] = { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), upsert: vi.fn(), delete: vi.fn(), count: vi.fn() }; });
    service = new SearchAnalyticsService(prisma as never);
  });

  describe('logSearch', () => {
    it('should create log and upsert popular search', async () => {
      (prisma as any).searchLog.create.mockResolvedValue({});
      (prisma as any).popularSearch.upsert.mockResolvedValue({});
      await service.logSearch(tenantId, 'gold ring', 'c1', 15);
      expect((prisma as any).searchLog.create).toHaveBeenCalled();
      expect((prisma as any).popularSearch.upsert).toHaveBeenCalled();
    });
  });

  describe('getSearchAnalytics', () => {
    it('should return analytics summary', async () => {
      (prisma as any).searchLog.count.mockResolvedValue(100);
      prisma.$queryRawUnsafe = vi.fn().mockResolvedValueOnce([{ cnt: 50n }]).mockResolvedValueOnce([{ avg_cnt: 12.5 }]);
      (prisma as any).popularSearch.findMany.mockResolvedValue([]);
      const r = await service.getSearchAnalytics(tenantId);
      expect(r.totalSearches).toBe(100);
      expect(r.uniqueQueries).toBe(50);
    });
  });

  describe('getZeroResultQueries', () => {
    it('should return queries with no results', async () => {
      (prisma as any).popularSearch.findMany.mockResolvedValue([{ id: 'ps-1', query: 'rare gem', searchCount: 5, lastSearchedAt: new Date(), resultCount: 0, category: null }]);
      const r = await service.getZeroResultQueries(tenantId);
      expect(r).toHaveLength(1);
      expect(r[0].query).toBe('rare gem');
    });
  });

  describe('getPopularSearchesAdmin', () => {
    it('should return popular searches', async () => {
      (prisma as any).popularSearch.findMany.mockResolvedValue([{ id: 'ps-1', query: 'gold', searchCount: 50, lastSearchedAt: new Date(), resultCount: 20, category: null }]);
      const r = await service.getPopularSearchesAdmin(tenantId);
      expect(r).toHaveLength(1);
    });
  });

  describe('deletePopularSearch', () => {
    it('should delete entry', async () => {
      (prisma as any).popularSearch.delete.mockResolvedValue({});
      await service.deletePopularSearch(tenantId, 'ps-1');
      expect((prisma as any).popularSearch.delete).toHaveBeenCalled();
    });
  });
});
