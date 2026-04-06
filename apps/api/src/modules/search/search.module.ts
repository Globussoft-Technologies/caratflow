// ─── Search Module ──────────────────────────────────────────────
// Full-text search, autocomplete, voice search support,
// search analytics, synonyms, suggestions, and indexing.

import { Module } from '@nestjs/common';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { SearchIndexService } from './search.index.service';
import { SearchSynonymService } from './search.synonym.service';
import { SearchAnalyticsService } from './search.analytics.service';
import { SearchTrpcRouter } from './search.trpc';

@Module({
  controllers: [SearchController],
  providers: [
    SearchService,
    SearchIndexService,
    SearchSynonymService,
    SearchAnalyticsService,
    SearchTrpcRouter,
  ],
  exports: [
    SearchService,
    SearchIndexService,
    SearchSynonymService,
    SearchAnalyticsService,
    SearchTrpcRouter,
  ],
})
export class SearchModule {}
