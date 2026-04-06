"use client";

import { mockWishlistItems } from "@/lib/mock-data";
import { useStore } from "@/lib/store";
import { calculateProductPrice, formatRupees, formatDate } from "@/lib/utils";
import ProductCard from "@/components/ProductCard";

export default function AccountWishlistPage() {
  const { addToCart } = useStore();

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy mb-6" style={{ fontFamily: "var(--font-serif)" }}>My Wishlist</h1>

      {mockWishlistItems.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-navy/40 mb-2">Your wishlist is empty</p>
          <p className="text-sm text-navy/30">Save items you love to your wishlist</p>
        </div>
      ) : (
        <div className="space-y-4">
          {mockWishlistItems.map((item) => {
            const price = calculateProductPrice(item.product);
            const img = item.product.images.find((i) => i.isPrimary) ?? item.product.images[0];

            return (
              <div key={item.id} className="flex items-center gap-4 bg-white rounded-xl border border-gray-100 p-4">
                <div className="w-20 h-20 rounded-lg overflow-hidden bg-warm-gray flex-shrink-0">
                  <img src={img?.url} alt={item.product.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-navy">{item.product.name}</h3>
                  <p className="text-xs text-navy/50 mt-0.5">{item.product.purityLabel} {item.product.metalType}</p>
                  <p className="text-sm font-bold text-navy mt-1">{formatRupees(price.total / 100)}</p>
                  <p className="text-[10px] text-navy/40 mt-0.5">Added {formatDate(item.addedAt)}</p>
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => addToCart(item.product)}
                    className="px-4 py-2 bg-gold text-white text-xs font-semibold rounded-lg hover:bg-gold-dark transition-colors"
                  >
                    Add to Cart
                  </button>
                  {item.priceAlertEnabled && (
                    <span className="text-[10px] text-emerald-600 text-center">Price alert on</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
