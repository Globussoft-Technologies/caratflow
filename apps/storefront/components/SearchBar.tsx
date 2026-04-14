"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { mockProducts } from "@/lib/mock-data";
import { cn, formatPrice, debounce } from "@/lib/utils";
import VoiceSearchButton from "./VoiceSearchButton";
import { normalizeVoiceQuery } from "@/lib/voice-normalize";

// ─── Types ────────────────────────────────────────────────────────

interface SearchBarProps {
  className?: string;
  expanded?: boolean;
}

interface AutocompleteProduct {
  id: string;
  name: string;
  productType: string;
  categoryName: string | null;
  totalPricePaise: number;
  currencyCode: string;
  image: string | null;
}

interface AutocompleteCategory {
  id: string;
  name: string;
  productCount: number;
}

interface AutocompleteData {
  products: AutocompleteProduct[];
  categories: AutocompleteCategory[];
  suggestions: string[];
  recentSearches: string[];
}

// ─── Mock Autocomplete (replace with API call in production) ──────

function mockAutocomplete(query: string): AutocompleteData {
  const q = query.toLowerCase();
  const products = mockProducts
    .filter((p) => p.name.toLowerCase().includes(q))
    .slice(0, 4)
    .map((p) => ({
      id: p.id,
      name: p.name,
      productType: p.metalType,
      categoryName: p.category,
      totalPricePaise: Math.round(p.price * 100),
      currencyCode: "INR",
      image: p.images?.[0] ?? null,
    }));

  // Extract unique categories from matching products
  const categoryMap = new Map<string, number>();
  mockProducts
    .filter((p) => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q))
    .forEach((p) => {
      categoryMap.set(p.category, (categoryMap.get(p.category) ?? 0) + 1);
    });
  const categories: AutocompleteCategory[] = Array.from(categoryMap.entries())
    .slice(0, 3)
    .map(([name, count], i) => ({
      id: `cat-${i}`,
      name,
      productCount: count,
    }));

  // Popular suggestions based on common jewelry terms
  const popularTerms = [
    "gold necklace set",
    "diamond ring",
    "silver bracelet",
    "kundan earrings",
    "mangalsutra",
    "gold bangles",
    "solitaire ring",
    "jhumka earrings",
  ];
  const suggestions = popularTerms
    .filter((t) => t.includes(q))
    .slice(0, 4);

  return { products, categories, suggestions, recentSearches: [] };
}

// Mock recent searches (replace with API)
const MOCK_RECENT_SEARCHES = [
  "22k gold necklace",
  "diamond solitaire ring",
  "silver anklet",
  "kundan bridal set",
];

// ─── Component ────────────────────────────────────────────────────

export default function SearchBar({ className, expanded = false }: SearchBarProps) {
  const router = useRouter();
  const { searchQuery, setSearchQuery } = useStore();
  const [localQuery, setLocalQuery] = useState(searchQuery);
  const [autocomplete, setAutocomplete] = useState<AutocompleteData | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [showRecent, setShowRecent] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // All navigable items for keyboard nav
  const allItems = buildNavigableItems(autocomplete, showRecent);

  // Debounced autocomplete fetch
  const fetchAutocomplete = useCallback(
    debounce((query: string) => {
      if (query.length >= 2) {
        // In production: fetch from /api/v1/store/search/autocomplete?q=query
        const data = mockAutocomplete(query);
        setAutocomplete(data);
        setIsOpen(true);
        setShowRecent(false);
        setActiveIndex(-1);
      } else {
        setAutocomplete(null);
        setIsOpen(false);
      }
    }, 300) as (query: string) => void,
    [],
  );

  useEffect(() => {
    fetchAutocomplete(localQuery);
  }, [localQuery, fetchAutocomplete]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setShowRecent(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (localQuery.trim()) {
      performSearch(localQuery.trim());
    }
  }

  function performSearch(query: string) {
    setSearchQuery(query);
    setLocalQuery(query);
    router.push(`/search?q=${encodeURIComponent(query)}`);
    setIsOpen(false);
    setShowRecent(false);
  }

  function handleProductClick(productId: string) {
    router.push(`/product/${productId}`);
    setIsOpen(false);
    setShowRecent(false);
  }

  function handleCategoryClick(categoryName: string) {
    router.push(`/category/${encodeURIComponent(categoryName.toLowerCase())}`);
    setIsOpen(false);
    setShowRecent(false);
  }

  function handleFocus() {
    if (localQuery.length >= 2 && autocomplete) {
      setIsOpen(true);
    } else if (localQuery.length < 2) {
      // Show recent searches when input is focused but empty
      setShowRecent(true);
      setIsOpen(true);
    }
  }

  function handleClearRecent() {
    // In production: DELETE /api/v1/store/search/recent
    setShowRecent(false);
    setIsOpen(false);
  }

  function handleVoiceTranscript(transcript: string) {
    const normalized = normalizeVoiceQuery(transcript);
    const query = normalized || transcript.trim();
    setLocalQuery(query);
    if (query) performSearch(query);
  }

  // Keyboard navigation
  function handleKeyDown(e: React.KeyboardEvent) {
    if (!isOpen) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((prev) => (prev < allItems.length - 1 ? prev + 1 : 0));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : allItems.length - 1));
        break;
      case "Enter":
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < allItems.length) {
          const item = allItems[activeIndex];
          if (item.type === "product") {
            handleProductClick(item.id);
          } else if (item.type === "category") {
            handleCategoryClick(item.label);
          } else {
            performSearch(item.label);
          }
        } else if (localQuery.trim()) {
          performSearch(localQuery.trim());
        }
        break;
      case "Escape":
        setIsOpen(false);
        setShowRecent(false);
        inputRef.current?.blur();
        break;
    }
  }

  const hasDropdownContent =
    showRecent ||
    (autocomplete &&
      (autocomplete.products.length > 0 ||
        autocomplete.categories.length > 0 ||
        autocomplete.suggestions.length > 0));

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <form onSubmit={handleSubmit} className="relative flex items-center">
        {/* Search icon */}
        <svg
          className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-navy/40 pointer-events-none"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
          />
        </svg>

        <input
          ref={inputRef}
          type="text"
          value={localQuery}
          onChange={(e) => setLocalQuery(e.target.value)}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          placeholder="Search for jewelry, gold, diamond..."
          className={cn(
            "w-full bg-warm-white border border-gray-200 rounded-full pl-10 pr-20 py-2.5 text-sm text-navy placeholder:text-navy/40 focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 transition-all",
            expanded && "lg:py-3 lg:text-base",
          )}
          role="combobox"
          aria-expanded={isOpen && hasDropdownContent}
          aria-haspopup="listbox"
          aria-autocomplete="list"
        />

        {/* Right side: clear button + voice search */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
          {localQuery && (
            <button
              type="button"
              onClick={() => {
                setLocalQuery("");
                setAutocomplete(null);
                setIsOpen(false);
                inputRef.current?.focus();
              }}
              className="p-1 text-navy/30 hover:text-navy/60 transition-colors"
              aria-label="Clear search"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
          <VoiceSearchButton onTranscript={handleVoiceTranscript} />
        </div>
      </form>

      {/* Autocomplete dropdown */}
      {isOpen && hasDropdownContent && (
        <div
          className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-50 max-h-[480px] overflow-y-auto"
          role="listbox"
        >
          {/* Recent searches (shown when input empty/short) */}
          {showRecent && MOCK_RECENT_SEARCHES.length > 0 && (
            <div className="p-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold text-navy/50 uppercase tracking-wider">
                  Recent Searches
                </h4>
                <button
                  type="button"
                  onClick={handleClearRecent}
                  className="text-[10px] text-navy/40 hover:text-gold transition-colors"
                >
                  Clear all
                </button>
              </div>
              {MOCK_RECENT_SEARCHES.map((search, i) => {
                const itemIndex = i;
                return (
                  <button
                    key={search}
                    type="button"
                    onClick={() => performSearch(search)}
                    className={cn(
                      "w-full flex items-center gap-3 px-2 py-2 text-sm text-navy rounded-lg hover:bg-warm-gray transition-colors text-left",
                      activeIndex === itemIndex && "bg-warm-gray",
                    )}
                    role="option"
                    aria-selected={activeIndex === itemIndex}
                  >
                    <svg className="w-3.5 h-3.5 text-navy/25 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{search}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Autocomplete results */}
          {autocomplete && !showRecent && (
            <>
              {/* Products section */}
              {autocomplete.products.length > 0 && (
                <div className="p-3 border-b border-gray-50">
                  <h4 className="text-xs font-semibold text-navy/50 uppercase tracking-wider mb-2">
                    Products
                  </h4>
                  <div className="space-y-1">
                    {autocomplete.products.map((product, i) => {
                      const itemIndex = allItems.findIndex(
                        (item) => item.type === "product" && item.id === product.id,
                      );
                      return (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => handleProductClick(product.id)}
                          className={cn(
                            "w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-warm-gray transition-colors text-left",
                            activeIndex === itemIndex && "bg-warm-gray",
                          )}
                          role="option"
                          aria-selected={activeIndex === itemIndex}
                        >
                          {/* Product thumbnail */}
                          <div className="w-10 h-10 bg-warm-gray rounded-lg flex-shrink-0 overflow-hidden">
                            {product.image ? (
                              <img
                                src={product.image}
                                alt={product.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[8px] text-navy/30">
                                {product.productType}
                              </div>
                            )}
                          </div>
                          {/* Product info */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-navy truncate">{product.name}</p>
                            <p className="text-xs text-navy/40">{product.categoryName}</p>
                          </div>
                          {/* Price */}
                          <span className="text-sm font-semibold text-gold flex-shrink-0">
                            {formatPrice(product.totalPricePaise)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Categories section */}
              {autocomplete.categories.length > 0 && (
                <div className="p-3 border-b border-gray-50">
                  <h4 className="text-xs font-semibold text-navy/50 uppercase tracking-wider mb-2">
                    Categories
                  </h4>
                  {autocomplete.categories.map((category) => {
                    const itemIndex = allItems.findIndex(
                      (item) => item.type === "category" && item.id === category.id,
                    );
                    return (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => handleCategoryClick(category.name)}
                        className={cn(
                          "w-full flex items-center justify-between gap-3 px-2 py-2 rounded-lg hover:bg-warm-gray transition-colors text-left",
                          activeIndex === itemIndex && "bg-warm-gray",
                        )}
                        role="option"
                        aria-selected={activeIndex === itemIndex}
                      >
                        <div className="flex items-center gap-2">
                          <svg className="w-3.5 h-3.5 text-navy/30 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                          </svg>
                          <span className="text-sm text-navy">{category.name}</span>
                        </div>
                        <span className="text-xs text-navy/30">{category.productCount} products</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Suggestions section */}
              {autocomplete.suggestions.length > 0 && (
                <div className="p-3 border-b border-gray-50">
                  <h4 className="text-xs font-semibold text-navy/50 uppercase tracking-wider mb-2">
                    Popular Searches
                  </h4>
                  {autocomplete.suggestions.map((suggestion) => {
                    const itemIndex = allItems.findIndex(
                      (item) => item.type === "suggestion" && item.label === suggestion,
                    );
                    return (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => performSearch(suggestion)}
                        className={cn(
                          "w-full flex items-center gap-3 px-2 py-2 text-sm text-navy rounded-lg hover:bg-warm-gray transition-colors text-left",
                          activeIndex === itemIndex && "bg-warm-gray",
                        )}
                        role="option"
                        aria-selected={activeIndex === itemIndex}
                      >
                        <svg className="w-3.5 h-3.5 text-navy/25 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
                        </svg>
                        <span>{suggestion}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* See all results footer */}
              {localQuery.trim() && (
                <button
                  type="button"
                  onClick={() => performSearch(localQuery.trim())}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-gold hover:bg-gold/5 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
                  See all results for &ldquo;{localQuery.trim()}&rdquo;
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────

interface NavigableItem {
  type: "product" | "category" | "suggestion" | "recent";
  id: string;
  label: string;
}

function buildNavigableItems(
  autocomplete: AutocompleteData | null,
  showRecent: boolean,
): NavigableItem[] {
  const items: NavigableItem[] = [];

  if (showRecent) {
    MOCK_RECENT_SEARCHES.forEach((s, i) => {
      items.push({ type: "recent", id: `recent-${i}`, label: s });
    });
    return items;
  }

  if (!autocomplete) return items;

  autocomplete.products.forEach((p) => {
    items.push({ type: "product", id: p.id, label: p.name });
  });
  autocomplete.categories.forEach((c) => {
    items.push({ type: "category", id: c.id, label: c.name });
  });
  autocomplete.suggestions.forEach((s, i) => {
    items.push({ type: "suggestion", id: `sug-${i}`, label: s });
  });

  return items;
}
