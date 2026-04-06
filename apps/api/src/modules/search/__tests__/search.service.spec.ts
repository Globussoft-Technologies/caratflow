import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SearchService } from '../search.service';
import { createMockPrismaService, TEST_TENANT_ID, resetAllMocks } from '../../../__tests__/setup';

describe('SearchService', () => {
  let service: SearchService;
  let mockPrisma: ReturnType<typeof createMockPrismaService>;
  let mockSynonymService: any;
  let mockAnalyticsService: any;

  beforeEach(() => {
    mockPrisma = createMockPrismaService();
    mockSynonymService = {
      expandQuery: vi.fn().mockImplementation((_tenantId: string, query: string) => query),
    };
    mockAnalyticsService = {
      logSearch: vi.fn().mockResolvedValue(undefined),
    };

    (mockPrisma as any).$queryRawUnsafe = vi.fn().mockResolvedValue([]);
    (mockPrisma as any).popularSearch = {
      findMany: vi.fn().mockResolvedValue([]),
    };
    (mockPrisma as any).searchLog = {
      findMany: vi.fn().mockResolvedValue([]),
      deleteMany: vi.fn(),
    };
    (mockPrisma as any).searchSuggestion = {
      findMany: vi.fn().mockResolvedValue([]),
    };
    (mockPrisma as any).category = {
      findMany: vi.fn().mockResolvedValue([]),
    };

    service = new SearchService(
      mockPrisma as any,
      mockSynonymService,
      mockAnalyticsService,
    );
    resetAllMocks(mockPrisma);
  });

  // ─── search ────────────────────────────────────────────────

  describe('search', () => {
    it('returns empty results for no matches', async () => {
      (mockPrisma as any).$queryRawUnsafe
        .mockResolvedValueOnce([]) // search results
        .mockResolvedValueOnce([{ cnt: BigInt(0) }]); // count
      (mockPrisma as any).popularSearch.findMany.mockResolvedValue([]);
      (mockPrisma as any).searchSuggestion.findMany.mockResolvedValue([]);

      const result = await service.search(TEST_TENANT_ID, 'nonexistent', undefined, 1, 10);
      expect(result.products).toHaveLength(0);
      expect(result.totalCount).toBe(0);
    });

    it('expands query with synonyms', async () => {
      mockSynonymService.expandQuery.mockResolvedValue('gold sona yellow gold');
      (mockPrisma as any).$queryRawUnsafe
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ cnt: BigInt(0) }]);
      (mockPrisma as any).popularSearch.findMany.mockResolvedValue([]);
      (mockPrisma as any).searchSuggestion.findMany.mockResolvedValue([]);

      await service.search(TEST_TENANT_ID, 'gold', undefined, 1, 10);
      expect(mockSynonymService.expandQuery).toHaveBeenCalledWith(TEST_TENANT_ID, 'gold');
    });

    it('logs the search query', async () => {
      (mockPrisma as any).$queryRawUnsafe
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ cnt: BigInt(0) }]);
      (mockPrisma as any).popularSearch.findMany.mockResolvedValue([]);
      (mockPrisma as any).searchSuggestion.findMany.mockResolvedValue([]);

      await service.search(TEST_TENANT_ID, 'ring', undefined, 1, 10, undefined, 'cust-1');
      expect(mockAnalyticsService.logSearch).toHaveBeenCalledWith(
        TEST_TENANT_ID, 'ring', 'cust-1', 0,
      );
    });
  });

  // ─── getSuggestion (did-you-mean) ──────────────────────────

  describe('getSuggestion', () => {
    it('suggests popular search when input has typo', async () => {
      (mockPrisma as any).popularSearch.findMany.mockResolvedValue([
        { query: 'gold ring' },
        { query: 'silver chain' },
        { query: 'diamond pendant' },
      ]);

      const suggestion = await service.getSuggestion(TEST_TENANT_ID, 'gokd ring');
      // 'gokd ring' is close to 'gold ring' (1 edit distance)
      expect(suggestion).toBe('gold ring');
    });

    it('returns null when query matches exactly', async () => {
      (mockPrisma as any).popularSearch.findMany.mockResolvedValue([
        { query: 'gold ring' },
      ]);

      const suggestion = await service.getSuggestion(TEST_TENANT_ID, 'gold ring');
      // Exact match has distance 0, which is skipped
      expect(suggestion).toBeNull();
    });

    it('returns null when no close matches', async () => {
      (mockPrisma as any).popularSearch.findMany.mockResolvedValue([
        { query: 'gold ring' },
      ]);

      const suggestion = await service.getSuggestion(TEST_TENANT_ID, 'xyzzyabcdef');
      expect(suggestion).toBeNull();
    });
  });

  // ─── getPopularSearches ────────────────────────────────────

  describe('getPopularSearches', () => {
    it('returns popular search terms', async () => {
      (mockPrisma as any).popularSearch.findMany.mockResolvedValue([
        { query: 'gold necklace' },
        { query: 'diamond ring' },
      ]);

      const results = await service.getPopularSearches(TEST_TENANT_ID, 10);
      expect(results).toEqual(['gold necklace', 'diamond ring']);
    });
  });

  // ─── getRecentSearches ─────────────────────────────────────

  describe('getRecentSearches', () => {
    it('returns deduplicated recent searches', async () => {
      (mockPrisma as any).searchLog.findMany.mockResolvedValue([
        { query: 'Gold Ring' },
        { query: 'gold ring' }, // duplicate
        { query: 'Silver Chain' },
      ]);

      const results = await service.getRecentSearches('cust-1', 5);
      expect(results).toEqual(['Gold Ring', 'Silver Chain']);
    });
  });

  // ─── clearRecentSearches ───────────────────────────────────

  describe('clearRecentSearches', () => {
    it('deletes all search logs for customer', async () => {
      await service.clearRecentSearches('cust-1');
      expect((mockPrisma as any).searchLog.deleteMany).toHaveBeenCalledWith({
        where: { customerId: 'cust-1' },
      });
    });
  });
});
