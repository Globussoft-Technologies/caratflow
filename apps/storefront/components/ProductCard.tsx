"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import { calculateProductPrice, formatRupees, cn } from "@/lib/utils";
import RatingStars from "./RatingStars";
import type { Product } from "@/lib/types";

interface ProductCardProps {
  product: Product;
  showQuickAdd?: boolean;
}

export default function ProductCard({ product, showQuickAdd = true }: ProductCardProps) {
  const { addToCart, toggleWishlist, isInWishlist } = useStore();
  const price = calculateProductPrice(product);
  const wishlisted = isInWishlist(product.id);
  const primaryImage = product.images.find((img) => img.isPrimary) ?? product.images[0];

  return (
    <div className="group relative bg-white rounded-xl overflow-hidden border border-gray-100 hover:border-gold/30 hover:shadow-lg transition-all duration-300">
      {/* Badges */}
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5">
        {product.isNew && (
          <span className="px-2 py-0.5 bg-navy text-white text-[10px] font-semibold uppercase tracking-wider rounded">
            New
          </span>
        )}
        {product.isBestseller && (
          <span className="px-2 py-0.5 bg-gold text-white text-[10px] font-semibold uppercase tracking-wider rounded">
            Bestseller
          </span>
        )}
        {product.isTrending && !product.isBestseller && (
          <span className="px-2 py-0.5 bg-rose-500 text-white text-[10px] font-semibold uppercase tracking-wider rounded">
            Trending
          </span>
        )}
      </div>

      {/* Wishlist button */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          toggleWishlist(product.id);
        }}
        className={cn(
          "absolute top-3 right-3 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all",
          wishlisted
            ? "bg-rose-50 text-rose-500"
            : "bg-white/80 text-navy/40 hover:text-rose-500 hover:bg-rose-50"
        )}
        aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
      >
        <svg
          className="w-4.5 h-4.5"
          viewBox="0 0 24 24"
          fill={wishlisted ? "currentColor" : "none"}
          strokeWidth={2}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
          />
        </svg>
      </button>

      {/* Image */}
      <Link href={`/product/${product.id}`} className="block aspect-square overflow-hidden bg-warm-gray">
        <img
          src={primaryImage?.url}
          alt={primaryImage?.alt ?? product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
      </Link>

      {/* Quick Add overlay */}
      {showQuickAdd && (
        <div className="absolute bottom-[calc(50%+40px)] left-0 right-0 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              if (!product.sizes) {
                addToCart(product);
              }
            }}
            className="bg-navy/90 text-white text-xs font-medium px-5 py-2 rounded-full hover:bg-navy transition-colors backdrop-blur-sm"
          >
            {product.sizes ? "Select Size" : "Quick Add"}
          </button>
        </div>
      )}

      {/* Info */}
      <div className="p-3.5">
        <Link href={`/product/${product.id}`}>
          <p className="text-[10px] font-medium text-gold uppercase tracking-wider mb-0.5">
            {product.metalType} &middot; {product.purityLabel}
          </p>
          <h3 className="text-sm font-semibold text-navy leading-tight mb-1 line-clamp-1 group-hover:text-gold-dark transition-colors">
            {product.name}
          </h3>
          <div className="mb-1.5">
            <RatingStars rating={product.rating} size="sm" reviewCount={product.reviewCount} />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-base font-bold text-navy">
              {formatRupees(price.total / 100)}
            </span>
            <span className="text-[10px] text-navy/40 font-medium">
              {product.netWeightGrams}g
            </span>
          </div>
        </Link>
      </div>
    </div>
  );
}
