"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ChatError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[CaratFlow] Chat error:", error);
  }, [error]);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 text-center">
      <div className="inline-flex w-16 h-16 bg-gold/10 rounded-full items-center justify-center mb-5">
        <svg className="w-8 h-8 text-gold" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155"
          />
        </svg>
      </div>
      <h2 className="text-2xl font-bold text-navy mb-3" style={{ fontFamily: "var(--font-serif)" }}>
        Chat is unavailable right now
      </h2>
      <p className="text-sm text-navy/60 mb-2 max-w-md mx-auto">
        We couldn't connect you to an advisor. Please try again, or reach us on WhatsApp or email.
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
          href="/contact"
          className="px-6 py-3 border border-gray-200 text-navy font-medium rounded-lg hover:border-gold hover:text-gold transition-colors"
        >
          Other Ways to Reach Us
        </Link>
      </div>
    </div>
  );
}
