"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function CheckoutError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[CaratFlow] Checkout error:", error);
  }, [error]);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 text-center">
      <div className="inline-flex w-16 h-16 bg-gold/10 rounded-full items-center justify-center mb-5">
        <svg className="w-8 h-8 text-gold" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
          />
        </svg>
      </div>
      <h2
        className="text-2xl font-bold text-navy mb-3"
        style={{ fontFamily: "var(--font-serif)" }}
      >
        Checkout couldn't be completed
      </h2>
      <p className="text-sm text-navy/60 mb-2 max-w-md mx-auto">
        We ran into a problem processing your order. Don't worry -- no payment has been taken, and your cart is still saved.
      </p>
      <p className="text-xs text-navy/50 mb-6 max-w-md mx-auto">
        If the problem persists, please contact our support team.
      </p>
      {error?.digest && (
        <p className="text-xs text-navy/30 font-mono mb-6">
          Reference: {error.digest}
        </p>
      )}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="px-6 py-3 bg-gold text-white font-semibold rounded-lg hover:bg-gold-dark transition-colors"
        >
          Try Again
        </button>
        <Link
          href="/cart"
          className="px-6 py-3 border border-gray-200 text-navy font-medium rounded-lg hover:border-gold hover:text-gold transition-colors"
        >
          Back to Cart
        </Link>
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
