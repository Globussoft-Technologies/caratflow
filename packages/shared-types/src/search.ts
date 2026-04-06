// ─── CaratFlow Search Types ────────────────────────────────────
// Types for full-text search, autocomplete, voice search,
// search analytics, synonyms, and suggestions.

import { z } from 'zod';
import { PaginationSchema } from './common';

// ─── Search Input / Output ────────────────────────────────────────

export const SearchFiltersSchema = z.object({
  metalTypes: z.array(z.string()).optional(),
  purities: z.array(z.number().int()).optional(),
  priceRanges: z.array(z.string()).optional(),
  categories: z.array(z.string()).optional(),
  weightRanges: z.array(z.string()).optional(),
  inStockOnly: z.boolean().optional(),
});
export type SearchFilters = z.infer<typeof SearchFiltersSchema>;

export const SearchInputSchema = PaginationSchema.extend({
  query: z.string().min(1).max(500),
  filters: SearchFiltersSchema.optional(),
});
export type SearchInput = z.infer<typeof SearchInputSchema>;

export const SearchFacetsSchema = z.object({
  metalTypes: z.array(z.object({ value: z.string(), count: z.number().int() })),
  purities: z.array(z.object({ value: z.number().int(), count: z.number().int() })),
  priceRanges: z.array(z.object({ value: z.string(), count: z.number().int() })),
  categories: z.array(z.object({ value: z.string(), count: z.number().int() })),
  weightRanges: z.array(z.object({ value: z.string(), count: z.number().int() })),
});
export type SearchFacets = z.infer<typeof SearchFacetsSchema>;

export const SearchProductSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  sku: z.string(),
  productType: z.string(),
  categoryName: z.string().nullable(),
  metalPurity: z.number().int().nullable(),
  grossWeightMg: z.number().int().nullable(),
  totalPricePaise: z.number().int(),
  currencyCode: z.string(),
  images: z.array(z.string()).nullable(),
  stockStatus: z.enum(['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK']),
  relevanceScore: z.number().optional(),
});
export type SearchProduct = z.infer<typeof SearchProductSchema>;

export const SearchResponseSchema = z.object({
  products: z.array(SearchProductSchema),
  totalCount: z.number().int(),
  facets: SearchFacetsSchema,
  suggestions: z.array(z.string()),
  didYouMean: z.string().nullable(),
});
export type SearchResponse = z.infer<typeof SearchResponseSchema>;

// ─── Autocomplete ─────────────────────────────────────────────────

export const AutocompleteInputSchema = z.object({
  query: z.string().min(1).max(500),
  limit: z.number().int().min(1).max(20).default(8),
});
export type AutocompleteInput = z.infer<typeof AutocompleteInputSchema>;

export const AutocompleteProductSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  productType: z.string(),
  categoryName: z.string().nullable(),
  totalPricePaise: z.number().int(),
  currencyCode: z.string(),
  image: z.string().nullable(),
});
export type AutocompleteProduct = z.infer<typeof AutocompleteProductSchema>;

export const AutocompleteCategorySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  productCount: z.number().int(),
});
export type AutocompleteCategory = z.infer<typeof AutocompleteCategorySchema>;

export const AutocompleteResponseSchema = z.object({
  products: z.array(AutocompleteProductSchema),
  categories: z.array(AutocompleteCategorySchema),
  suggestions: z.array(z.string()),
  recentSearches: z.array(z.string()),
});
export type AutocompleteResponse = z.infer<typeof AutocompleteResponseSchema>;

// ─── Voice Search ─────────────────────────────────────────────────

export const VoiceSearchResultSchema = z.object({
  transcript: z.string(),
  confidence: z.number().min(0).max(1),
  searchResults: SearchResponseSchema,
});
export type VoiceSearchResult = z.infer<typeof VoiceSearchResultSchema>;

// ─── Search Synonym ───────────────────────────────────────────────

export const SearchSynonymInputSchema = z.object({
  term: z.string().min(1).max(255),
  synonyms: z.array(z.string().min(1).max(255)).min(1),
  isActive: z.boolean().default(true),
});
export type SearchSynonymInput = z.infer<typeof SearchSynonymInputSchema>;

export const SearchSynonymResponseSchema = z.object({
  id: z.string().uuid(),
  term: z.string(),
  synonyms: z.array(z.string()),
  isActive: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type SearchSynonymResponse = z.infer<typeof SearchSynonymResponseSchema>;

// ─── Search Suggestion ────────────────────────────────────────────

export const SearchSuggestionInputSchema = z.object({
  suggestion: z.string().min(1).max(500),
  category: z.string().max(100).optional(),
  priority: z.number().int().default(0),
  isActive: z.boolean().default(true),
});
export type SearchSuggestionInput = z.infer<typeof SearchSuggestionInputSchema>;

export const SearchSuggestionResponseSchema = z.object({
  id: z.string().uuid(),
  suggestion: z.string(),
  category: z.string().nullable(),
  priority: z.number().int(),
  isActive: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type SearchSuggestionResponse = z.infer<typeof SearchSuggestionResponseSchema>;

// ─── Popular Search ───────────────────────────────────────────────

export const PopularSearchResponseSchema = z.object({
  id: z.string().uuid(),
  query: z.string(),
  searchCount: z.number().int(),
  lastSearchedAt: z.coerce.date(),
  resultCount: z.number().int(),
  category: z.string().nullable(),
});
export type PopularSearchResponse = z.infer<typeof PopularSearchResponseSchema>;

// ─── Search Analytics ─────────────────────────────────────────────

export const SearchAnalyticsSchema = z.object({
  totalSearches: z.number().int(),
  uniqueQueries: z.number().int(),
  avgResultCount: z.number(),
  zeroResultCount: z.number().int(),
  topQueries: z.array(z.object({
    query: z.string(),
    count: z.number().int(),
    resultCount: z.number().int(),
  })),
  zeroResultQueries: z.array(z.object({
    query: z.string(),
    count: z.number().int(),
    lastSearchedAt: z.coerce.date(),
  })),
  trendingQueries: z.array(z.object({
    query: z.string(),
    count: z.number().int(),
    growth: z.number(),
  })),
});
export type SearchAnalytics = z.infer<typeof SearchAnalyticsSchema>;
