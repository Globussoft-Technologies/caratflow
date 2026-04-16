"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[CaratFlow] Auth error:", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md text-center">
        <div className="inline-flex w-14 h-14 bg-gold/10 rounded-full items-center justify-center mb-5">
          <svg className="w-7 h-7 text-gold" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-navy mb-2" style={{ fontFamily: "var(--font-serif)" }}>
          We couldn't complete that step
        </h2>
        <p className="text-sm text-navy/60 mb-5 max-w-sm mx-auto">
          Something went wrong during sign-in. Please try again -- if the problem persists, contact support.
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
            href="/auth/login"
            className="px-5 py-2.5 border border-gray-200 text-navy text-sm font-medium rounded-lg hover:border-gold hover:text-gold transition-colors"
          >
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
