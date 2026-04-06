"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import { mockProducts } from "@/lib/mock-data";
import ProductCard from "@/components/ProductCard";

export default function WishlistPage() {
  const { wishlistIds } = useStore();

  const products = Array.from(wishlistIds)
    .map((id) => mockProducts.find((p) => p.id === id))
    .filter(Boolean);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <h1 className="text-2xl md:text-3xl font-bold text-navy mb-8" style={{ fontFamily: "var(--font-serif)" }}>
        My Wishlist ({products.length})
      </h1>

      {products.length === 0 ? (
        <div className="text-center py-20">
          <svg className="w-20 h-20 text-navy/10 mx-auto mb-4" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
          </svg>
          <h3 className="text-lg font-semibold text-navy mb-2">Your wishlist is empty</h3>
          <p className="text-sm text-navy/50 mb-6">Save items you love by tapping the heart icon</p>
          <Link href="/" className="inline-block bg-gold text-white font-semibold px-8 py-3 rounded-lg hover:bg-gold-dark transition-colors">
            Explore Jewelry
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {products.map((product) => (
            <ProductCard key={product!.id} product={product!} />
          ))}
        </div>
      )}
    </div>
  );
}
