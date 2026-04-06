import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockPrismaService, mockTenantContext, resetMocks } from '../../../__tests__/mocks';
vi.mock('uuid', () => ({ v4: vi.fn(() => 'mock-uuid') }));
import { SearchSynonymService } from '../search.synonym.service';

describe('SearchSynonymService', () => {
  let service: SearchSynonymService; let prisma: ReturnType<typeof createMockPrismaService>;
  const { tenantId } = mockTenantContext;
  beforeEach(() => {
    prisma = createMockPrismaService();
    resetMocks(prisma);
    (prisma as any).searchSynonym = { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() };
    service = new SearchSynonymService(prisma as never);
  });

  describe('expandQuery', () => {
    it('should expand known terms with synonyms', async () => {
      (prisma as any).searchSynonym.findMany.mockResolvedValue([{ term: 'choker', synonyms: ['short necklace', 'collar necklace'], isActive: true }]);
      const r = await service.expandQuery(tenantId, 'gold choker');
      expect(r).toContain('short necklace');
      expect(r).toContain('collar necklace');
    });
    it('should return original if no matches', async () => {
      (prisma as any).searchSynonym.findMany.mockResolvedValue([]);
      const r = await service.expandQuery(tenantId, 'random query');
      expect(r).toBe('random query');
    });
  });

  describe('createSynonym', () => {
    it('should create and lowercase', async () => {
      (prisma as any).searchSynonym.create.mockResolvedValue({ id: 's-1', term: 'jhumka', synonyms: ['drop earring'], isActive: true, createdAt: new Date(), updatedAt: new Date() });
      const r = await service.createSynonym(tenantId, 'Jhumka', ['Drop Earring']);
      expect(r.term).toBe('jhumka');
    });
  });

  describe('seedDefaults', () => {
    it('should seed default jewelry terms', async () => {
      (prisma as any).searchSynonym.create.mockResolvedValue({});
      const count = await service.seedDefaults(tenantId);
      expect(count).toBeGreaterThan(0);
    });
  });

  describe('listSynonyms', () => {
    it('should return all synonyms', async () => {
      (prisma as any).searchSynonym.findMany.mockResolvedValue([{ id: 's-1', term: 'choker', synonyms: ['short necklace'], isActive: true, createdAt: new Date(), updatedAt: new Date() }]);
      const r = await service.listSynonyms(tenantId);
      expect(r).toHaveLength(1);
    });
  });

  describe('updateSynonym', () => {
    it('should update synonym', async () => {
      (prisma as any).searchSynonym.update.mockResolvedValue({ id: 's-1', term: 'choker', synonyms: ['short necklace', 'collar'], isActive: true, createdAt: new Date(), updatedAt: new Date() });
      const r = await service.updateSynonym(tenantId, 's-1', { synonyms: ['short necklace', 'collar'] });
      expect(r.synonyms).toHaveLength(2);
    });
  });

  describe('deleteSynonym', () => {
    it('should delete', async () => {
      (prisma as any).searchSynonym.delete.mockResolvedValue({});
      await service.deleteSynonym(tenantId, 's-1');
      expect((prisma as any).searchSynonym.delete).toHaveBeenCalled();
    });
  });
});
