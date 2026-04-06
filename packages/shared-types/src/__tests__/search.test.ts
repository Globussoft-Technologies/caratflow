import { describe, it, expect } from 'vitest';
import {
  SearchInputSchema,
  AutocompleteInputSchema,
  SearchSynonymInputSchema,
  SearchSuggestionInputSchema,
  SearchFiltersSchema,
} from '../search';

describe('SearchInputSchema', () => {
  it('should parse valid search input', () => {
    const result = SearchInputSchema.safeParse({
      query: 'gold necklace',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(20);
    }
  });

  it('should reject empty query', () => {
    const result = SearchInputSchema.safeParse({
      query: '',
    });
    expect(result.success).toBe(false);
  });

  it('should accept optional filters', () => {
    const result = SearchInputSchema.safeParse({
      query: 'diamond ring',
      filters: {
        metalTypes: ['GOLD', 'PLATINUM'],
        purities: [916, 750],
        inStockOnly: true,
      },
    });
    expect(result.success).toBe(true);
  });

  it('should accept pagination parameters', () => {
    const result = SearchInputSchema.safeParse({
      query: 'bracelet',
      page: 2,
      limit: 50,
      sortBy: 'price',
      sortOrder: 'asc',
    });
    expect(result.success).toBe(true);
  });
});

describe('AutocompleteInputSchema', () => {
  it('should parse valid autocomplete input', () => {
    const result = AutocompleteInputSchema.safeParse({
      query: 'gol',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(8);
    }
  });

  it('should reject empty query', () => {
    const result = AutocompleteInputSchema.safeParse({
      query: '',
    });
    expect(result.success).toBe(false);
  });

  it('should reject limit above 20', () => {
    const result = AutocompleteInputSchema.safeParse({
      query: 'test',
      limit: 21,
    });
    expect(result.success).toBe(false);
  });
});

describe('SearchSynonymInputSchema', () => {
  it('should parse valid synonym input', () => {
    const result = SearchSynonymInputSchema.safeParse({
      term: 'necklace',
      synonyms: ['chain', 'pendant', 'haar'],
    });
    expect(result.success).toBe(true);
  });

  it('should reject empty synonyms array', () => {
    const result = SearchSynonymInputSchema.safeParse({
      term: 'ring',
      synonyms: [],
    });
    expect(result.success).toBe(false);
  });

  it('should reject empty term', () => {
    const result = SearchSynonymInputSchema.safeParse({
      term: '',
      synonyms: ['test'],
    });
    expect(result.success).toBe(false);
  });
});

describe('SearchSuggestionInputSchema', () => {
  it('should parse valid suggestion', () => {
    const result = SearchSuggestionInputSchema.safeParse({
      suggestion: 'gold necklace for wedding',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isActive).toBe(true);
      expect(result.data.priority).toBe(0);
    }
  });

  it('should reject empty suggestion', () => {
    const result = SearchSuggestionInputSchema.safeParse({
      suggestion: '',
    });
    expect(result.success).toBe(false);
  });
});

describe('SearchFiltersSchema', () => {
  it('should parse empty filters (all optional)', () => {
    const result = SearchFiltersSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('should parse filters with various fields', () => {
    const result = SearchFiltersSchema.safeParse({
      metalTypes: ['GOLD'],
      purities: [916],
      categories: ['rings'],
      inStockOnly: true,
    });
    expect(result.success).toBe(true);
  });
});
