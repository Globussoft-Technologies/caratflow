// ─── Search Synonym Service ─────────────────────────────────────
// Synonym management: CRUD, query expansion, default seeding.

import { Injectable, Logger } from '@nestjs/common';
import type { SearchSynonymResponse } from '@caratflow/shared-types';
import { PrismaService } from '../../common/prisma.service';
import { TenantAwareService } from '../../common/base.service';
import { v4 as uuidv4 } from 'uuid';

/** Default synonyms for Indian jewelry terms */
const DEFAULT_SYNONYMS: Array<{ term: string; synonyms: string[] }> = [
  { term: 'choker', synonyms: ['short necklace', 'collar necklace'] },
  { term: 'mangalsutra', synonyms: ['wedding chain', 'thali'] },
  { term: 'jhumka', synonyms: ['drop earring', 'traditional earring'] },
  { term: 'kada', synonyms: ['thick bangle', 'men bangle'] },
  { term: 'polki', synonyms: ['uncut diamond'] },
  { term: 'kundan', synonyms: ['traditional setting'] },
  { term: 'solitaire', synonyms: ['single diamond ring'] },
  { term: 'eternity band', synonyms: ['full diamond ring'] },
  { term: 'nath', synonyms: ['nose ring', 'bridal nose ring'] },
  { term: 'payal', synonyms: ['anklet', 'ankle bracelet'] },
  { term: 'haar', synonyms: ['long necklace', 'rani haar'] },
  { term: 'tikka', synonyms: ['maang tikka', 'head jewelry'] },
];

@Injectable()
export class SearchSynonymService extends TenantAwareService {
  private readonly logger = new Logger(SearchSynonymService.name);

  constructor(prisma: PrismaService) {
    super(prisma);
  }

  /**
   * Expand a query by replacing known terms with their synonyms.
   * Returns the original query plus synonym terms joined.
   */
  async expandQuery(tenantId: string, query: string): Promise<string> {
    const queryLower = query.toLowerCase().trim();
    const words = queryLower.split(/\s+/);

    // Fetch all active synonyms for this tenant
    const synonyms = await this.prisma.searchSynonym.findMany({
      where: { tenantId, isActive: true },
      select: { term: true, synonyms: true },
    });

    const synonymMap = new Map<string, string[]>();
    for (const s of synonyms) {
      synonymMap.set(s.term.toLowerCase(), s.synonyms as string[]);
    }

    const expandedTerms: string[] = [queryLower];

    // Check for multi-word term matches first (e.g., "eternity band")
    for (const [term, syns] of synonymMap) {
      if (queryLower.includes(term)) {
        expandedTerms.push(...syns);
      }
    }

    // Check individual words
    for (const word of words) {
      const syns = synonymMap.get(word);
      if (syns) {
        expandedTerms.push(...syns);
      }
    }

    // Deduplicate
    return [...new Set(expandedTerms)].join(' ');
  }

  /**
   * Create a new synonym mapping.
   */
  async createSynonym(
    tenantId: string,
    term: string,
    synonyms: string[],
    isActive: boolean = true,
  ): Promise<SearchSynonymResponse> {
    const record = await this.prisma.searchSynonym.create({
      data: {
        id: uuidv4(),
        tenantId,
        term: term.toLowerCase().trim(),
        synonyms: synonyms.map((s) => s.toLowerCase().trim()),
        isActive,
      },
    });
    return this.mapToResponse(record);
  }

  /**
   * Update an existing synonym mapping.
   */
  async updateSynonym(
    tenantId: string,
    id: string,
    data: { term?: string; synonyms?: string[]; isActive?: boolean },
  ): Promise<SearchSynonymResponse> {
    const updateData: Record<string, unknown> = {};
    if (data.term !== undefined) updateData.term = data.term.toLowerCase().trim();
    if (data.synonyms !== undefined) updateData.synonyms = data.synonyms.map((s) => s.toLowerCase().trim());
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const record = await this.prisma.searchSynonym.update({
      where: { id },
      data: updateData,
    });
    return this.mapToResponse(record);
  }

  /**
   * Delete a synonym mapping.
   */
  async deleteSynonym(tenantId: string, id: string): Promise<void> {
    await this.prisma.searchSynonym.delete({
      where: { id },
    });
  }

  /**
   * List all synonym mappings for a tenant.
   */
  async listSynonyms(tenantId: string): Promise<SearchSynonymResponse[]> {
    const records = await this.prisma.searchSynonym.findMany({
      where: { tenantId },
      orderBy: { term: 'asc' },
    });
    return records.map(this.mapToResponse);
  }

  /**
   * Seed default synonyms for a tenant (idempotent).
   */
  async seedDefaults(tenantId: string): Promise<number> {
    let created = 0;
    for (const def of DEFAULT_SYNONYMS) {
      try {
        await this.prisma.searchSynonym.create({
          data: {
            id: uuidv4(),
            tenantId,
            term: def.term,
            synonyms: def.synonyms,
            isActive: true,
          },
        });
        created++;
      } catch {
        // Already exists (unique constraint), skip
      }
    }
    this.logger.log(`Seeded ${created} default synonyms for tenant ${tenantId}`);
    return created;
  }

  // ─── Private Helpers ──────────────────────────────────────────

  private mapToResponse(record: Record<string, unknown>): SearchSynonymResponse {
    return {
      id: record.id as string,
      term: record.term as string,
      synonyms: record.synonyms as string[],
      isActive: record.isActive as boolean,
      createdAt: record.createdAt as Date,
      updatedAt: record.updatedAt as Date,
    };
  }
}
