"use client";

import { useState } from "react";
import { METAL_TYPES, PURITY_OPTIONS, GENDER_OPTIONS, OCCASIONS } from "@/lib/constants";
import { cn, formatRupees } from "@/lib/utils";
import type { FilterState, MetalType } from "@/lib/types";

interface FilterSidebarProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  className?: string;
}

export default function FilterSidebar({ filters, onFilterChange, className }: FilterSidebarProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["metalType", "purity", "price"])
  );

  function toggleSection(section: string) {
    const next = new Set(expandedSections);
    if (next.has(section)) {
      next.delete(section);
    } else {
      next.add(section);
    }
    setExpandedSections(next);
  }

  function toggleArrayFilter<K extends keyof FilterState>(
    key: K,
    value: FilterState[K] extends (infer U)[] ? U : never
  ) {
    const current = filters[key] as unknown[];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    onFilterChange({ ...filters, [key]: next });
  }

  function FilterSection({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
    const isExpanded = expandedSections.has(id);
    return (
      <div className="border-b border-gray-100 pb-4 mb-4 last:border-0">
        <button
          type="button"
          onClick={() => toggleSection(id)}
          className="flex items-center justify-between w-full text-sm font-semibold text-navy mb-3"
        >
          {title}
          <svg
            className={cn("w-4 h-4 text-navy/40 transition-transform", isExpanded && "rotate-180")}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </button>
        {isExpanded && children}
      </div>
    );
  }

  return (
    <div className={cn("bg-white rounded-xl border border-gray-100 p-5", className)}>
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-bold text-navy">Filters</h3>
        <button
          type="button"
          onClick={() =>
            onFilterChange({
              metalType: [],
              purity: [],
              priceRange: [0, 1000000],
              weightRange: [0, 100],
              gemstone: [],
              gender: [],
              occasion: [],
              availability: "all",
              sortBy: "popularity",
            })
          }
          className="text-xs text-gold hover:text-gold-dark font-medium transition-colors"
        >
          Clear All
        </button>
      </div>

      <FilterSection id="metalType" title="Metal Type">
        <div className="space-y-2">
          {METAL_TYPES.map((metal) => (
            <label key={metal.value} className="flex items-center gap-2.5 cursor-pointer group">
              <input
                type="checkbox"
                checked={filters.metalType.includes(metal.value as MetalType)}
                onChange={() => toggleArrayFilter("metalType", metal.value as MetalType)}
                className="w-4 h-4 rounded border-gray-300 text-gold focus:ring-gold/30 accent-gold"
              />
              <span className="text-sm text-navy/70 group-hover:text-navy transition-colors">
                {metal.label}
              </span>
            </label>
          ))}
        </div>
      </FilterSection>

      <FilterSection id="purity" title="Purity">
        <div className="space-y-2">
          {PURITY_OPTIONS.map((p) => (
            <label key={p.value} className="flex items-center gap-2.5 cursor-pointer group">
              <input
                type="checkbox"
                checked={filters.purity.includes(p.value)}
                onChange={() => toggleArrayFilter("purity", p.value)}
                className="w-4 h-4 rounded border-gray-300 text-gold focus:ring-gold/30 accent-gold"
              />
              <span className="text-sm text-navy/70 group-hover:text-navy transition-colors">
                {p.label}
              </span>
            </label>
          ))}
        </div>
      </FilterSection>

      <FilterSection id="price" title="Price Range">
        <div className="space-y-3 px-1">
          <input
            type="range"
            min={0}
            max={1000000}
            step={5000}
            value={filters.priceRange[1]}
            onChange={(e) =>
              onFilterChange({ ...filters, priceRange: [filters.priceRange[0], parseInt(e.target.value)] })
            }
            className="w-full"
          />
          <div className="flex items-center justify-between text-xs text-navy/60">
            <span>{formatRupees(filters.priceRange[0])}</span>
            <span>{formatRupees(filters.priceRange[1])}</span>
          </div>
        </div>
      </FilterSection>

      <FilterSection id="weight" title="Weight Range (grams)">
        <div className="space-y-3 px-1">
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={filters.weightRange[1]}
            onChange={(e) =>
              onFilterChange({ ...filters, weightRange: [filters.weightRange[0], parseInt(e.target.value)] })
            }
            className="w-full"
          />
          <div className="flex items-center justify-between text-xs text-navy/60">
            <span>{filters.weightRange[0]}g</span>
            <span>{filters.weightRange[1]}g</span>
          </div>
        </div>
      </FilterSection>

      <FilterSection id="gender" title="Gender">
        <div className="space-y-2">
          {GENDER_OPTIONS.map((g) => (
            <label key={g.value} className="flex items-center gap-2.5 cursor-pointer group">
              <input
                type="checkbox"
                checked={filters.gender.includes(g.value)}
                onChange={() => toggleArrayFilter("gender", g.value)}
                className="w-4 h-4 rounded border-gray-300 text-gold focus:ring-gold/30 accent-gold"
              />
              <span className="text-sm text-navy/70 group-hover:text-navy transition-colors">
                {g.label}
              </span>
            </label>
          ))}
        </div>
      </FilterSection>

      <FilterSection id="occasion" title="Occasion">
        <div className="space-y-2">
          {OCCASIONS.map((occ) => (
            <label key={occ.slug} className="flex items-center gap-2.5 cursor-pointer group">
              <input
                type="checkbox"
                checked={filters.occasion.includes(occ.slug)}
                onChange={() => toggleArrayFilter("occasion", occ.slug)}
                className="w-4 h-4 rounded border-gray-300 text-gold focus:ring-gold/30 accent-gold"
              />
              <span className="text-sm text-navy/70 group-hover:text-navy transition-colors">
                {occ.name}
              </span>
            </label>
          ))}
        </div>
      </FilterSection>

      <FilterSection id="availability" title="Availability">
        <div className="space-y-2">
          <label className="flex items-center gap-2.5 cursor-pointer group">
            <input
              type="radio"
              name="availability"
              checked={filters.availability === "all"}
              onChange={() => onFilterChange({ ...filters, availability: "all" })}
              className="w-4 h-4 border-gray-300 text-gold focus:ring-gold/30 accent-gold"
            />
            <span className="text-sm text-navy/70 group-hover:text-navy transition-colors">All</span>
          </label>
          <label className="flex items-center gap-2.5 cursor-pointer group">
            <input
              type="radio"
              name="availability"
              checked={filters.availability === "in_stock"}
              onChange={() => onFilterChange({ ...filters, availability: "in_stock" })}
              className="w-4 h-4 border-gray-300 text-gold focus:ring-gold/30 accent-gold"
            />
            <span className="text-sm text-navy/70 group-hover:text-navy transition-colors">In Stock Only</span>
          </label>
        </div>
      </FilterSection>
    </div>
  );
}
