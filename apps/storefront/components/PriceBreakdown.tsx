"use client";

import { calculateProductPrice, formatRupees } from "@/lib/utils";
import type { Product } from "@/lib/types";

interface PriceBreakdownProps {
  product: Product;
}

export default function PriceBreakdown({ product }: PriceBreakdownProps) {
  const price = calculateProductPrice(product);

  return (
    <div className="bg-cream rounded-xl p-5 border border-gold/10">
      <h3 className="text-sm font-semibold text-navy mb-4 flex items-center gap-2">
        <svg className="w-4 h-4 text-gold" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
        </svg>
        Price Breakdown
      </h3>
      <div className="space-y-2.5 text-sm">
        <div className="flex justify-between">
          <span className="text-navy/60">
            Metal Value
            <span className="text-[10px] ml-1">({product.purityLabel} {product.metalType}, {product.netWeightGrams}g @ {formatRupees(product.metalRatePerGram)}/g)</span>
          </span>
          <span className="font-medium text-navy">{formatRupees(price.metalValue / 100)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-navy/60">
            Making Charges
            <span className="text-[10px] ml-1">
              ({product.makingChargesType === "per_gram"
                ? `${formatRupees(product.makingChargesValue)}/g`
                : product.makingChargesType === "percentage"
                  ? `${product.makingChargesValue}%`
                  : "Flat"})
            </span>
          </span>
          <span className="font-medium text-navy">{formatRupees(price.makingCharges / 100)}</span>
        </div>
        {price.stoneCharges > 0 && (
          <div className="flex justify-between">
            <span className="text-navy/60">Stone Charges</span>
            <span className="font-medium text-navy">{formatRupees(price.stoneCharges / 100)}</span>
          </div>
        )}
        <div className="border-t border-gold/10 pt-2 flex justify-between">
          <span className="text-navy/60">Subtotal</span>
          <span className="font-medium text-navy">{formatRupees(price.subtotal / 100)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-navy/60">GST (3%)</span>
          <span className="font-medium text-navy">{formatRupees(price.gst / 100)}</span>
        </div>
        <div className="border-t border-gold/20 pt-2.5 flex justify-between">
          <span className="font-bold text-navy">Total Price</span>
          <span className="font-bold text-lg text-navy">{formatRupees(price.total / 100)}</span>
        </div>
      </div>
      <p className="mt-3 text-[10px] text-navy/40 flex items-center gap-1">
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Prices based on live metal rates. Final price may vary at time of order confirmation.
      </p>
    </div>
  );
}
