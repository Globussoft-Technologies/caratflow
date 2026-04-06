"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import { mockProducts } from "@/lib/mock-data";

export default function CompareBar() {
  const { compareIds, removeFromCompare } = useStore();

  if (compareIds.length === 0) return null;

  const products = compareIds
    .map((id) => mockProducts.find((p) => p.id === id))
    .filter(Boolean);

  return (
    <div className="fixed bottom-0 left-0 right-0 compare-bar bg-white border-t border-gray-200 z-40 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-navy">
            Compare ({compareIds.length}/4)
          </span>
          <div className="flex items-center gap-2">
            {products.map((product) => {
              if (!product) return null;
              const img = product.images.find((i) => i.isPrimary) ?? product.images[0];
              return (
                <div key={product.id} className="relative group">
                  <div className="w-12 h-12 rounded-lg overflow-hidden border border-gray-200 bg-warm-gray">
                    <img src={img?.url} alt={product.name} className="w-full h-full object-cover" />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFromCompare(product.id)}
                    className="absolute -top-1 -right-1 w-4 h-4 bg-navy text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              );
            })}
            {Array.from({ length: 4 - compareIds.length }, (_, i) => (
              <div key={`empty-${i}`} className="w-12 h-12 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center">
                <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => compareIds.forEach((id) => removeFromCompare(id))}
            className="text-sm text-navy/50 hover:text-navy transition-colors"
          >
            Clear All
          </button>
          <Link
            href="/compare"
            className={`px-5 py-2 bg-gold text-white text-sm font-semibold rounded-lg hover:bg-gold-dark transition-colors ${
              compareIds.length < 2 ? "opacity-50 pointer-events-none" : ""
            }`}
          >
            Compare Now
          </Link>
        </div>
      </div>
    </div>
  );
}
