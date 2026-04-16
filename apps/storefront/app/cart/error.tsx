"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function CartError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[CaratFlow] Cart error:", error);
  }, [error]);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 text-center">
      <div className="inline-flex w-16 h-16 bg-gold/10 rounded-full items-center justify-center mb-5">
        <svg className="w-8 h-8 text-gold" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c.82 0 1.54-.498 1.844-1.252l2.58-6.384a.75.75 0 00-.697-1.03H5.106M7.5 14.25 5.106 5.334M6 20.25h.008v.008H6v-.008zm0 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm12 0h.008v.008H18v-.008zm0 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
          />
        </svg>
      </div>
      <h2 className="text-2xl font-bold text-navy mb-3" style={{ fontFamily: "var(--font-serif)" }}>
        Couldn't load your cart
      </h2>
      <p className="text-sm text-navy/60 mb-2 max-w-md mx-auto">
        We ran into a problem while fetching your cart. Your saved items are safe -- please try again.
      </p>
      {error?.digest && (
        <p className="text-xs text-navy/30 font-mono mb-6">Reference: {error.digest}</p>
      )}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-6">
        <button
          type="button"
          onClick={reset}
          className="px-6 py-3 bg-gold text-white font-semibold rounded-lg hover:bg-gold-dark transition-colors"
        >
          Try Again
        </button>
        <Link
          href="/"
          className="px-6 py-3 border border-gray-200 text-navy font-medium rounded-lg hover:border-gold hover:text-gold transition-colors"
        >
          Continue Shopping
        </Link>
      </div>
    </div>
  );
}
