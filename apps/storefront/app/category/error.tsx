"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function CategoryError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[CaratFlow] Category error:", error);
  }, [error]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 text-center">
      <h2 className="text-xl font-bold text-navy mb-2">Couldn't load this collection</h2>
      <p className="text-sm text-navy/60 mb-5">
        We're having trouble loading these products right now.
      </p>
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
          Back to Home
        </Link>
      </div>
    </div>
  );
}
