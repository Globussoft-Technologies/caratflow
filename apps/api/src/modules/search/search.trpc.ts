// ─── Search tRPC Router ─────────────────────────────────────────
// Admin-facing procedures: synonym CRUD, suggestion CRUD,
// analytics, reindex trigger, zero-result queries.

import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { TrpcService } from '../../trpc/trpc.service';
import { SearchSynonymService } from './search.synonym.service';
import { SearchAnalyticsService } from './search.analytics.service';
import { SearchIndexService } from './search.index.service';
import { PrismaService } from '../../common/prisma.service';
import {
  SearchSynonymInputSchema,
  SearchSuggestionInputSchema,
} from '@caratflow/shared-types';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class SearchTrpcRouter {
  constructor(
    private readonly trpc: TrpcService,
    private readonly prisma: PrismaService,
    private readonly synonymService: SearchSynonymService,
    private readonly analyticsService: SearchAnalyticsService,
    private readonly indexService: SearchIndexService,
  ) {}

  get router() {
    return this.trpc.router({
      // ─── Synonyms ──────────────────────────────────────────────

      listSynonyms: this.trpc.authedProcedure.query(({ ctx }) =>
        this.synonymService.listSynonyms(ctx.tenantId!),
      ),

      createSynonym: this.trpc.authedProcedure
        .input(SearchSynonymInputSchema)
        .mutation(({ ctx, input }) =>
          this.synonymService.createSynonym(
            ctx.tenantId!,
            input.term,
            input.synonyms,
            input.isActive,
          ),
        ),

      updateSynonym: this.trpc.authedProcedure
        .input(
          z.object({
            id: z.string().uuid(),
            term: z.string().min(1).max(255).optional(),
            synonyms: z.array(z.string().min(1).max(255)).min(1).optional(),
            isActive: z.boolean().optional(),
          }),
        )
        .mutation(({ ctx, input }) =>
          this.synonymService.updateSynonym(ctx.tenantId!, input.id, {
            term: input.term,
            synonyms: input.synonyms,
            isActive: input.isActive,
          }),
        ),

      deleteSynonym: this.trpc.authedProcedure
        .input(z.object({ id: z.string().uuid() }))
        .mutation(({ ctx, input }) =>
          this.synonymService.deleteSynonym(ctx.tenantId!, input.id),
        ),

      seedDefaultSynonyms: this.trpc.authedProcedure.mutation(({ ctx }) =>
        this.synonymService.seedDefaults(ctx.tenantId!),
      ),

      // ─── Suggestions ───────────────────────────────────────────

      listSuggestions: this.trpc.authedProcedure.query(async ({ ctx }) => {
        const results = await this.prisma.searchSuggestion.findMany({
          where: { tenantId: ctx.tenantId! },
          orderBy: { priority: 'desc' },
        });
        return results.map((r) => ({
          id: r.id,
          suggestion: r.suggestion,
          category: r.category,
          priority: r.priority,
          isActive: r.isActive,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
        }));
      }),

      createSuggestion: this.trpc.authedProcedure
        .input(SearchSuggestionInputSchema)
        .mutation(async ({ ctx, input }) => {
          const record = await this.prisma.searchSuggestion.create({
            data: {
              id: uuidv4(),
              tenantId: ctx.tenantId!,
              suggestion: input.suggestion,
              category: input.category ?? null,
              priority: input.priority ?? 0,
              isActive: input.isActive ?? true,
            },
          });
          return {
            id: record.id,
            suggestion: record.suggestion,
            category: record.category,
            priority: record.priority,
            isActive: record.isActive,
            createdAt: record.createdAt,
            updatedAt: record.updatedAt,
          };
        }),

      updateSuggestion: this.trpc.authedProcedure
        .input(
          z.object({
            id: z.string().uuid(),
            suggestion: z.string().min(1).max(500).optional(),
            category: z.string().max(100).nullable().optional(),
            priority: z.number().int().optional(),
            isActive: z.boolean().optional(),
          }),
        )
        .mutation(async ({ ctx, input }) => {
          const { id, ...data } = input;
          const record = await this.prisma.searchSuggestion.update({
            where: { id },
            data,
          });
          return {
            id: record.id,
            suggestion: record.suggestion,
            category: record.category,
            priority: record.priority,
            isActive: record.isActive,
            createdAt: record.createdAt,
            updatedAt: record.updatedAt,
          };
        }),

      deleteSuggestion: this.trpc.authedProcedure
        .input(z.object({ id: z.string().uuid() }))
        .mutation(async ({ ctx, input }) => {
          await this.prisma.searchSuggestion.delete({
            where: { id: input.id },
          });
        }),

      // ─── Analytics ─────────────────────────────────────────────

      getAnalytics: this.trpc.authedProcedure
        .input(
          z
            .object({
              from: z.coerce.date().optional(),
              to: z.coerce.date().optional(),
            })
            .optional(),
        )
        .query(({ ctx, input }) => {
          const dateRange =
            input?.from && input?.to
              ? { from: input.from, to: input.to }
              : undefined;
          return this.analyticsService.getSearchAnalytics(ctx.tenantId!, dateRange);
        }),

      getZeroResultQueries: this.trpc.authedProcedure
        .input(z.object({ limit: z.number().int().min(1).max(100).default(20) }).optional())
        .query(({ ctx, input }) =>
          this.analyticsService.getZeroResultQueries(ctx.tenantId!, input?.limit ?? 20),
        ),

      getPopularSearches: this.trpc.authedProcedure
        .input(z.object({ limit: z.number().int().min(1).max(100).default(50) }).optional())
        .query(({ ctx, input }) =>
          this.analyticsService.getPopularSearchesAdmin(ctx.tenantId!, input?.limit ?? 50),
        ),

      deletePopularSearch: this.trpc.authedProcedure
        .input(z.object({ id: z.string().uuid() }))
        .mutation(({ ctx, input }) =>
          this.analyticsService.deletePopularSearch(ctx.tenantId!, input.id),
        ),

      // ─── Reindex ───────────────────────────────────────────────

      reindexAll: this.trpc.authedProcedure.mutation(({ ctx }) =>
        this.indexService.reindexAll(ctx.tenantId!),
      ),
    });
  }
}
