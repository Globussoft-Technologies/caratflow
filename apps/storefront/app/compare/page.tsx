"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import { mockProducts } from "@/lib/mock-data";
import { calculateProductPrice, formatRupees, cn } from "@/lib/utils";
import RatingStars from "@/components/RatingStars";

export default function ComparePage() {
  const { compareIds, removeFromCompare, addToCart } = useStore();

  const products = compareIds
    .map((id) => mockProducts.find((p) => p.id === id))
    .filter(Boolean);

  if (products.length < 2) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20 text-center">
        <h1 className="text-2xl font-bold text-navy mb-2">Compare Products</h1>
        <p className="text-navy/50 text-sm mb-6">
          Add at least 2 products to compare. You have {products.length} selected.
        </p>
        <Link href="/" className="text-gold font-medium hover:text-gold-dark transition-colors">
          Continue Shopping
        </Link>
      </div>
    );
  }

  const specs = new Set<string>();
  products.forEach((p) => {
    if (!p) return;
    Object.keys(p.specifications).forEach((k) => specs.add(k));
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <h1 className="text-2xl font-bold text-navy mb-8" style={{ fontFamily: "var(--font-serif)" }}>
        Compare Products ({products.length})
      </h1>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr>
              <th className="text-left py-3 pr-4 w-40" />
              {products.map((p) => {
                if (!p) return null;
                const img = p.images.find((i) => i.isPrimary) ?? p.images[0];
                const price = calculateProductPrice(p);
                return (
                  <th key={p.id} className="px-4 py-3 text-center align-top">
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => removeFromCompare(p.id)}
                        className="absolute -top-1 -right-1 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center text-navy/40 hover:text-rose-500 transition-colors z-10"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                      <div className="w-40 h-40 rounded-xl overflow-hidden bg-warm-gray mx-auto mb-3">
                        <img src={img?.url} alt={p.name} className="w-full h-full object-cover" />
                      </div>
                      <Link href={`/product/${p.id}`} className="font-semibold text-sm text-navy hover:text-gold transition-colors">
                        {p.name}
                      </Link>
                      <p className="text-lg font-bold text-navy mt-1">{formatRupees(price.total / 100)}</p>
                      <button
                        type="button"
                        onClick={() => addToCart(p)}
                        className="mt-2 px-4 py-2 bg-gold text-white text-xs font-semibold rounded-lg hover:bg-gold-dark transition-colors"
                      >
                        Add to Cart
                      </button>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {[
              { label: "Rating", render: (p: NonNullable<typeof products[0]>) => <RatingStars rating={p.rating} size="sm" showValue /> },
              { label: "Metal Type", render: (p: NonNullable<typeof products[0]>) => <span>{p.metalType}</span> },
              { label: "Purity", render: (p: NonNullable<typeof products[0]>) => <span>{p.purityLabel}</span> },
              { label: "Gross Weight", render: (p: NonNullable<typeof products[0]>) => <span>{p.grossWeightGrams}g</span> },
              { label: "Net Weight", render: (p: NonNullable<typeof products[0]>) => <span>{p.netWeightGrams}g</span> },
              { label: "Metal Rate", render: (p: NonNullable<typeof products[0]>) => <span>{formatRupees(p.metalRatePerGram)}/g</span> },
              { label: "Making Charges", render: (p: NonNullable<typeof products[0]>) => <span>{formatRupees(calculateProductPrice(p).makingCharges / 100)}</span> },
              { label: "Stones", render: (p: NonNullable<typeof products[0]>) => <span>{p.stoneDetails.length > 0 ? p.stoneDetails.map((s) => `${s.type} ${s.weightCarat}ct`).join(", ") : "None"}</span> },
              { label: "HUID", render: (p: NonNullable<typeof products[0]>) => <span>{p.huidNumber ?? "-"}</span> },
              { label: "Gender", render: (p: NonNullable<typeof products[0]>) => <span className="capitalize">{p.gender}</span> },
              { label: "Occasion", render: (p: NonNullable<typeof products[0]>) => <span className="capitalize">{p.occasion.join(", ")}</span> },
              ...Array.from(specs).map((spec) => ({
                label: spec,
                render: (p: NonNullable<typeof products[0]>) => <span>{p.specifications[spec] ?? "-"}</span>,
              })),
            ].map((row, idx) => (
              <tr key={row.label} className={cn(idx % 2 === 0 ? "bg-warm-white" : "bg-white")}>
                <td className="py-3 pr-4 text-sm font-medium text-navy/60">{row.label}</td>
                {products.map((p) => (
                  <td key={p!.id} className="px-4 py-3 text-center text-sm text-navy">
                    {row.render(p!)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
