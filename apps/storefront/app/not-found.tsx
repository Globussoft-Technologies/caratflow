import Link from "next/link";

export default function NotFound() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-24 text-center">
      <p
        className="text-8xl md:text-9xl font-bold text-gold/20 mb-2 leading-none"
        style={{ fontFamily: "var(--font-serif)" }}
      >
        404
      </p>
      <h1
        className="text-3xl font-bold text-navy mb-3"
        style={{ fontFamily: "var(--font-serif)" }}
      >
        Page Not Found
      </h1>
      <p className="text-navy/60 text-sm mb-8 max-w-md mx-auto">
        Sorry, we couldn't find the page you were looking for. Perhaps it was moved, or never existed in the first place.
      </p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <Link
          href="/"
          className="px-6 py-3 bg-gold text-white font-semibold rounded-lg hover:bg-gold-dark transition-colors"
        >
          Back to Home
        </Link>
        <Link
          href="/category/rings"
          className="px-6 py-3 border border-gray-200 text-navy font-medium rounded-lg hover:border-gold hover:text-gold transition-colors"
        >
          Browse Collections
        </Link>
      </div>
    </div>
  );
}
