"use client";

import { useState, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { mockProducts } from "@/lib/mock-data";
import { SORT_OPTIONS } from "@/lib/constants";
import { normalizeVoiceQuery } from "@/lib/voice-normalize";
import type { FilterState } from "@/lib/types";
import ProductCard from "@/components/ProductCard";
import FilterSidebar from "@/components/FilterSidebar";
import VoiceSearchButton from "@/components/VoiceSearchButton";

const defaultFilters: FilterState = {
  metalType: [],
  purity: [],
  priceRange: [0, 1000000],
  weightRange: [0, 100],
  gemstone: [],
  gender: [],
  occasion: [],
  availability: "all",
  sortBy: "popularity",
};

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.get("q") ?? "";
  const [filters, setFilters] = useState<FilterState>(defaultFilters);

  function handleVoiceTranscript(transcript: string) {
    const normalized = normalizeVoiceQuery(transcript) || transcript.trim();
    if (normalized) {
      router.push(`/search?q=${encodeURIComponent(normalized)}`);
    }
  }

  const results = useMemo(() => {
    if (!query) return [];
    const lower = query.toLowerCase();
    return mockProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(lower) ||
        p.categoryName.toLowerCase().includes(lower) ||
        p.metalType.toLowerCase().includes(lower) ||
        p.tags.some((t) => t.toLowerCase().includes(lower))
    );
  }, [query]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-xs text-navy/50 mb-6">
        <Link href="/" className="hover:text-gold transition-colors">Home</Link>
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
        <span className="text-navy font-medium">Search Results</span>
      </nav>

      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy" style={{ fontFamily: "var(--font-serif)" }}>
            {query ? `Results for "${query}"` : "Search"}
          </h1>
          <p className="text-sm text-navy/50 mt-1">
            {results.length} {results.length === 1 ? "product" : "products"} found
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-navy/50 hidden sm:inline">Search by voice</span>
          <VoiceSearchButton onTranscript={handleVoiceTranscript} />
        </div>
      </div>

      {results.length === 0 ? (
        <div className="text-center py-20">
          <svg className="w-20 h-20 text-navy/10 mx-auto mb-4" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <h3 className="text-lg font-semibold text-navy mb-2">No results found</h3>
          <p className="text-sm text-navy/50 mb-6 max-w-md mx-auto">
            We couldn't find any products matching "{query}". Try a different search term or browse our categories.
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            {["Rings", "Necklaces", "Earrings", "Bangles", "Diamonds"].map((suggestion) => (
              <Link
                key={suggestion}
                href={`/search?q=${suggestion}`}
                className="px-4 py-2 border border-gray-200 rounded-full text-sm text-navy/60 hover:border-gold hover:text-gold transition-colors"
              >
                {suggestion}
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex gap-6">
          <div className="hidden lg:block w-64 flex-shrink-0">
            <FilterSidebar filters={filters} onFilterChange={setFilters} />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-end mb-4">
              <select
                value={filters.sortBy}
                onChange={(e) => setFilters({ ...filters, sortBy: e.target.value as FilterState["sortBy"] })}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-gold"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
              {results.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto px-4 sm:px-6 py-20 text-center text-navy/50">Loading...</div>}>
      <SearchContent />
    </Suspense>
  );
}
