"use client";

import { useState } from "react";
import Link from "next/link";
import { mockCategories } from "@/lib/mock-data";
import { METAL_TYPES, OCCASIONS } from "@/lib/constants";

export default function MegaMenu() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <button
        type="button"
        className="flex items-center gap-1 text-sm font-medium text-navy/70 hover:text-gold transition-colors py-2"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        </svg>
        Categories
        <svg className={`w-3.5 h-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 w-[680px] bg-white rounded-xl shadow-2xl border border-gray-100 p-6 z-50">
          <div className="grid grid-cols-3 gap-6">
            {/* Categories */}
            <div>
              <h3 className="text-xs font-semibold text-navy/40 uppercase tracking-wider mb-3">Jewelry Type</h3>
              <div className="space-y-1">
                {mockCategories.slice(0, 10).map((cat) => (
                  <Link
                    key={cat.id}
                    href={`/category/${cat.slug}`}
                    className="flex items-center gap-2 py-1.5 text-sm text-navy/70 hover:text-gold transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    <span>{cat.name}</span>
                    <span className="text-[10px] text-navy/30">({cat.productCount})</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Metal Type */}
            <div>
              <h3 className="text-xs font-semibold text-navy/40 uppercase tracking-wider mb-3">Metal Type</h3>
              <div className="space-y-1">
                {METAL_TYPES.map((metal) => (
                  <Link
                    key={metal.value}
                    href={`/category/all?metal=${metal.value}`}
                    className="flex items-center gap-2 py-1.5 text-sm text-navy/70 hover:text-gold transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    <span className="w-5 h-5 rounded-full bg-gradient-to-br from-gold/20 to-gold/40 flex items-center justify-center">
                      <span className="w-2.5 h-2.5 rounded-full bg-gold/60" />
                    </span>
                    <span>{metal.label}</span>
                  </Link>
                ))}
              </div>

              <h3 className="text-xs font-semibold text-navy/40 uppercase tracking-wider mb-3 mt-6">Shop by Occasion</h3>
              <div className="space-y-1">
                {OCCASIONS.slice(0, 4).map((occ) => (
                  <Link
                    key={occ.slug}
                    href={`/category/all?occasion=${occ.slug}`}
                    className="block py-1.5 text-sm text-navy/70 hover:text-gold transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    {occ.name}
                  </Link>
                ))}
              </div>
            </div>

            {/* Promo */}
            <div className="bg-gradient-to-br from-cream to-gold/10 rounded-lg p-4 flex flex-col justify-between">
              <div>
                <p className="text-[10px] font-semibold text-gold uppercase tracking-wider mb-1">Special Offer</p>
                <h4 className="text-lg font-bold text-navy leading-tight mb-1">
                  Flat 15% Off Making Charges
                </h4>
                <p className="text-xs text-navy/60 mb-3">
                  On all diamond jewelry. Use code SPARKLE15
                </p>
              </div>
              <Link
                href="/category/all?metal=DIAMOND"
                className="inline-block bg-gold text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-gold-dark transition-colors text-center"
                onClick={() => setIsOpen(false)}
              >
                Shop Diamonds
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
