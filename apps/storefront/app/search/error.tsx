"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function SearchError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[CaratFlow] Search error:", error);
  }, [error]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 text-center">
      <div className="inline-flex w-14 h-14 bg-gold/10 rounded-full items-center justify-center mb-5">
        <svg className="w-7 h-7 text-gold" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
          />
        </svg>
      </div>
      <h2 className="text-xl font-bold text-navy mb-2" style={{ fontFamily: "var(--font-serif)" }}>
        Search isn't working right now
      </h2>
      <p className="text-sm text-navy/60 mb-5 max-w-md mx-auto">
        We couldn't complete your search. Please try again, or browse by category.
      </p>
      {error?.digest && (
        <p className="text-xs text-navy/30 font-mono mb-6">Reference: {error.digest}</p>
      )}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="px-5 py-2.5 bg-gold text-white text-sm font-semibold rounded-lg hover:bg-gold-dark transition-colors"
        >
          Try Again
        </button>
        <Link
          href="/"
          className="px-5 py-2.5 border border-gray-200 text-navy text-sm font-medium rounded-lg hover:border-gold hover:text-gold transition-colors"
        >
          Browse Categories
        </Link>
      </div>
    </div>
  );
}
