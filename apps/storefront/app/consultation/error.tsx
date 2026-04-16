"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ConsultationError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[CaratFlow] Consultation error:", error);
  }, [error]);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 text-center">
      <div className="inline-flex w-16 h-16 bg-gold/10 rounded-full items-center justify-center mb-5">
        <svg className="w-8 h-8 text-gold" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z"
          />
        </svg>
      </div>
      <h2 className="text-2xl font-bold text-navy mb-3" style={{ fontFamily: "var(--font-serif)" }}>
        Video consultation unavailable
      </h2>
      <p className="text-sm text-navy/60 mb-2 max-w-md mx-auto">
        We couldn't book or join your consultation right now. Please try again, or contact us to schedule.
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
          Contact Support
        </Link>
      </div>
    </div>
  );
}
