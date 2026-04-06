"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { mockProducts, mockReviews } from "@/lib/mock-data";
import { useStore } from "@/lib/store";
import { calculateProductPrice, formatRupees, cn, formatDate } from "@/lib/utils";
import ProductGallery from "@/components/ProductGallery";
import PriceBreakdown from "@/components/PriceBreakdown";
import DeliveryChecker from "@/components/DeliveryChecker";
import RatingStars from "@/components/RatingStars";
import ProductCard from "@/components/ProductCard";

export default function ProductDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const product = mockProducts.find((p) => p.id === id);
  const { addToCart, toggleWishlist, isInWishlist, addToCompare, isInCompare } = useStore();
  const [selectedSize, setSelectedSize] = useState<string | undefined>();
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<"description" | "specifications" | "reviews">("description");

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20 text-center">
        <h1 className="text-2xl font-bold text-navy mb-2">Product Not Found</h1>
        <p className="text-navy/50 mb-4">The product you are looking for does not exist.</p>
        <Link href="/" className="text-gold font-medium hover:text-gold-dark transition-colors">
          Back to Home
        </Link>
      </div>
    );
  }

  const price = calculateProductPrice(product);
  const wishlisted = isInWishlist(product.id);
  const inCompare = isInCompare(product.id);
  const relatedProducts = mockProducts.filter((p) => p.categoryId === product.categoryId && p.id !== product.id).slice(0, 4);

  // JSON-LD structured data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    sku: product.sku,
    image: product.images.map((img) => img.url),
    brand: { "@type": "Brand", name: "CaratFlow" },
    offers: {
      "@type": "Offer",
      price: (price.total / 100).toFixed(2),
      priceCurrency: "INR",
      availability: product.isAvailable ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: product.rating,
      reviewCount: product.reviewCount,
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-xs text-navy/50 mb-6">
          <Link href="/" className="hover:text-gold transition-colors">Home</Link>
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
          <Link href={`/category/${product.categorySlug}`} className="hover:text-gold transition-colors">
            {product.categoryName}
          </Link>
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
          <span className="text-navy font-medium truncate">{product.name}</span>
        </nav>

        {/* Product top section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 mb-12">
          {/* Gallery */}
          <ProductGallery images={product.images} productName={product.name} />

          {/* Details */}
          <div>
            <div className="mb-1">
              <span className="text-[10px] font-semibold text-gold uppercase tracking-wider">
                {product.metalType} &middot; {product.purityLabel}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-navy mb-2" style={{ fontFamily: "var(--font-serif)" }}>
              {product.name}
            </h1>
            <p className="text-xs text-navy/40 mb-3">SKU: {product.sku}</p>

            <div className="flex items-center gap-3 mb-5">
              <RatingStars rating={product.rating} showValue reviewCount={product.reviewCount} />
            </div>

            {/* Price */}
            <div className="mb-6">
              <div className="text-3xl font-bold text-navy mb-1">
                {formatRupees(price.total / 100)}
              </div>
              <p className="text-xs text-navy/40">Inclusive of all taxes</p>
            </div>

            {/* Price breakdown */}
            <div className="mb-6">
              <PriceBreakdown product={product} />
            </div>

            {/* Quick info */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-warm-white rounded-lg p-3">
                <p className="text-[10px] text-navy/40 mb-0.5">Gross Weight</p>
                <p className="text-sm font-semibold text-navy">{product.grossWeightGrams}g</p>
              </div>
              <div className="bg-warm-white rounded-lg p-3">
                <p className="text-[10px] text-navy/40 mb-0.5">Net Weight</p>
                <p className="text-sm font-semibold text-navy">{product.netWeightGrams}g</p>
              </div>
              {product.huidNumber && (
                <div className="bg-warm-white rounded-lg p-3">
                  <p className="text-[10px] text-navy/40 mb-0.5">HUID Number</p>
                  <p className="text-sm font-semibold text-navy">{product.huidNumber}</p>
                </div>
              )}
              {product.stoneDetails.length > 0 && (
                <div className="bg-warm-white rounded-lg p-3">
                  <p className="text-[10px] text-navy/40 mb-0.5">Stone</p>
                  <p className="text-sm font-semibold text-navy">
                    {product.stoneDetails[0]!.type} {product.stoneDetails[0]!.weightCarat}ct
                  </p>
                </div>
              )}
            </div>

            {/* Size selector */}
            {product.sizes && (
              <div className="mb-6">
                <label className="block text-sm font-semibold text-navy mb-2">Select Size</label>
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map((size) => (
                    <button
                      key={size.id}
                      type="button"
                      disabled={!size.isAvailable}
                      onClick={() => setSelectedSize(size.value)}
                      className={cn(
                        "w-10 h-10 rounded-lg border text-sm font-medium transition-all",
                        selectedSize === size.value
                          ? "border-gold bg-gold/10 text-gold"
                          : size.isAvailable
                            ? "border-gray-200 text-navy hover:border-gold/40"
                            : "border-gray-100 text-navy/20 cursor-not-allowed line-through"
                      )}
                    >
                      {size.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-navy mb-2">Quantity</label>
              <div className="flex items-center border border-gray-200 rounded-lg w-fit">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-10 h-10 flex items-center justify-center text-navy/60 hover:text-navy transition-colors"
                >
                  -
                </button>
                <span className="w-12 text-center font-medium text-sm">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-10 h-10 flex items-center justify-center text-navy/60 hover:text-navy transition-colors"
                >
                  +
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mb-6">
              <button
                type="button"
                onClick={() => {
                  if (product.sizes && !selectedSize) return;
                  addToCart(product, quantity, selectedSize);
                }}
                disabled={!product.isAvailable || (!!product.sizes && !selectedSize)}
                className="flex-1 bg-gold text-white font-semibold py-3.5 rounded-lg hover:bg-gold-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {!product.isAvailable ? "Out of Stock" : product.sizes && !selectedSize ? "Select a Size" : "Add to Cart"}
              </button>
              <button
                type="button"
                onClick={() => toggleWishlist(product.id)}
                className={cn(
                  "w-12 h-12 rounded-lg border flex items-center justify-center transition-all",
                  wishlisted ? "border-rose-200 bg-rose-50 text-rose-500" : "border-gray-200 text-navy/40 hover:text-rose-500 hover:border-rose-200"
                )}
                aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill={wishlisted ? "currentColor" : "none"} strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => inCompare ? undefined : addToCompare(product.id)}
                className={cn(
                  "w-12 h-12 rounded-lg border flex items-center justify-center transition-all",
                  inCompare ? "border-gold/30 bg-gold/10 text-gold" : "border-gray-200 text-navy/40 hover:text-gold hover:border-gold/30"
                )}
                aria-label="Add to compare"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                </svg>
              </button>
            </div>

            {/* Delivery checker */}
            <DeliveryChecker />
          </div>
        </div>

        {/* Tabs */}
        <div className="border-t border-gray-100 mb-12">
          <div className="flex gap-8 border-b border-gray-100">
            {(["description", "specifications", "reviews"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "py-4 text-sm font-medium border-b-2 transition-colors capitalize",
                  activeTab === tab
                    ? "border-gold text-gold"
                    : "border-transparent text-navy/50 hover:text-navy"
                )}
              >
                {tab}
                {tab === "reviews" && ` (${product.reviewCount})`}
              </button>
            ))}
          </div>

          <div className="py-8">
            {activeTab === "description" && (
              <div className="prose prose-sm max-w-none text-navy/70">
                <p>{product.description}</p>
                {product.stoneDetails.length > 0 && (
                  <>
                    <h3 className="text-navy font-semibold text-base mt-6 mb-3">Stone Details</h3>
                    <div className="bg-warm-white rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-100">
                            <th className="text-left py-2.5 px-4 font-medium text-navy/60">Stone</th>
                            <th className="text-left py-2.5 px-4 font-medium text-navy/60">Shape</th>
                            <th className="text-left py-2.5 px-4 font-medium text-navy/60">Weight</th>
                            <th className="text-left py-2.5 px-4 font-medium text-navy/60">Count</th>
                            {product.stoneDetails.some((s) => s.clarity) && (
                              <th className="text-left py-2.5 px-4 font-medium text-navy/60">Clarity</th>
                            )}
                            {product.stoneDetails.some((s) => s.color) && (
                              <th className="text-left py-2.5 px-4 font-medium text-navy/60">Color</th>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {product.stoneDetails.map((stone, idx) => (
                            <tr key={idx} className="border-b border-gray-50">
                              <td className="py-2.5 px-4">{stone.type}</td>
                              <td className="py-2.5 px-4">{stone.shape}</td>
                              <td className="py-2.5 px-4">{stone.weightCarat} ct</td>
                              <td className="py-2.5 px-4">{stone.count}</td>
                              {stone.clarity && <td className="py-2.5 px-4">{stone.clarity}</td>}
                              {stone.color && <td className="py-2.5 px-4">{stone.color}</td>}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}

            {activeTab === "specifications" && (
              <div className="max-w-2xl">
                <div className="bg-warm-white rounded-lg overflow-hidden">
                  {Object.entries(product.specifications).map(([key, value], idx) => (
                    <div key={key} className={cn("flex py-3 px-4", idx > 0 && "border-t border-gray-100")}>
                      <span className="w-1/3 text-sm text-navy/50 flex-shrink-0">{key}</span>
                      <span className="text-sm font-medium text-navy">{value}</span>
                    </div>
                  ))}
                  <div className="flex py-3 px-4 border-t border-gray-100">
                    <span className="w-1/3 text-sm text-navy/50 flex-shrink-0">Metal Type</span>
                    <span className="text-sm font-medium text-navy">{product.metalType}</span>
                  </div>
                  <div className="flex py-3 px-4 border-t border-gray-100">
                    <span className="w-1/3 text-sm text-navy/50 flex-shrink-0">Purity</span>
                    <span className="text-sm font-medium text-navy">{product.purityLabel}</span>
                  </div>
                  <div className="flex py-3 px-4 border-t border-gray-100">
                    <span className="w-1/3 text-sm text-navy/50 flex-shrink-0">Gross Weight</span>
                    <span className="text-sm font-medium text-navy">{product.grossWeightGrams}g</span>
                  </div>
                  <div className="flex py-3 px-4 border-t border-gray-100">
                    <span className="w-1/3 text-sm text-navy/50 flex-shrink-0">Net Weight</span>
                    <span className="text-sm font-medium text-navy">{product.netWeightGrams}g</span>
                  </div>
                  {product.huidNumber && (
                    <div className="flex py-3 px-4 border-t border-gray-100">
                      <span className="w-1/3 text-sm text-navy/50 flex-shrink-0">HUID</span>
                      <span className="text-sm font-medium text-navy">{product.huidNumber}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "reviews" && (
              <div>
                {/* Rating summary */}
                <div className="flex items-center gap-6 mb-8 p-6 bg-warm-white rounded-xl">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-navy">{product.rating}</div>
                    <RatingStars rating={product.rating} size="md" />
                    <p className="text-xs text-navy/50 mt-1">{product.reviewCount} reviews</p>
                  </div>
                  <div className="flex-1 space-y-1.5">
                    {[5, 4, 3, 2, 1].map((star) => {
                      const count = mockReviews.filter((r) => Math.floor(r.rating) === star).length;
                      const pct = mockReviews.length > 0 ? (count / mockReviews.length) * 100 : 0;
                      return (
                        <div key={star} className="flex items-center gap-2">
                          <span className="text-xs text-navy/50 w-3">{star}</span>
                          <svg className="w-3 h-3 text-gold" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-gold rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-navy/40 w-6">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Reviews list */}
                <div className="space-y-6">
                  {mockReviews.map((review) => (
                    <div key={review.id} className="border-b border-gray-50 pb-6 last:border-0">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <RatingStars rating={review.rating} size="sm" />
                          <span className="text-sm font-semibold text-navy">{review.title}</span>
                        </div>
                        <span className="text-xs text-navy/40">{formatDate(review.createdAt)}</span>
                      </div>
                      <p className="text-sm text-navy/70 mb-2">{review.comment}</p>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="font-medium text-navy/60">{review.userName}</span>
                        {review.isVerifiedPurchase && (
                          <span className="text-emerald-600 flex items-center gap-0.5">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                            Verified Purchase
                          </span>
                        )}
                        <button type="button" className="text-navy/40 hover:text-navy transition-colors">
                          Helpful ({review.helpfulCount})
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <section className="mb-12">
            <h2 className="text-xl font-bold text-navy mb-6" style={{ fontFamily: "var(--font-serif)" }}>
              You May Also Like
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {relatedProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
