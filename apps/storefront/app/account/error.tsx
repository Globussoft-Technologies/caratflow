"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function AccountError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[CaratFlow] Account error:", error);
  }, [error]);

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
      <h2 className="text-lg font-bold text-navy mb-2">We couldn't load your account</h2>
      <p className="text-sm text-navy/60 mb-5">
        Something went wrong on our end. Please try again in a moment.
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
          href="/account"
          className="px-5 py-2.5 border border-gray-200 text-navy text-sm font-medium rounded-lg hover:border-gold hover:text-gold transition-colors"
        >
          Account Dashboard
        </Link>
      </div>
    </div>
  );
}
