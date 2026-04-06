"use client";

import { useState } from "react";
import { calculateProductPrice, formatRupees, cn } from "@/lib/utils";
import type { Product } from "@/lib/types";

interface PriceDisplayProps {
  product: Product;
  size?: "sm" | "md" | "lg";
  showBreakdown?: boolean;
}

export default function PriceDisplay({ product, size = "md", showBreakdown = false }: PriceDisplayProps) {
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const price = calculateProductPrice(product);

  const textSize = {
    sm: "text-sm",
    md: "text-lg",
    lg: "text-2xl",
  }[size];

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <span className={cn(textSize, "font-bold text-navy")}>
          {formatRupees(price.total / 100)}
        </span>
        {showBreakdown && (
          <button
            type="button"
            className="text-gold/70 hover:text-gold transition-colors"
            onMouseEnter={() => setTooltipOpen(true)}
            onMouseLeave={() => setTooltipOpen(false)}
            onClick={() => setTooltipOpen(!tooltipOpen)}
            aria-label="View price breakdown"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
            </svg>
          </button>
        )}
      </div>

      {/* Price breakdown tooltip */}
      {tooltipOpen && showBreakdown && (
        <div className="absolute top-full left-0 mt-2 z-50 bg-white rounded-lg shadow-xl border border-gray-100 p-4 min-w-[260px]">
          <div className="text-xs font-semibold text-navy/50 uppercase tracking-wider mb-3">Price Breakdown</div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-navy/70">Metal Value ({product.purityLabel} {product.netWeightGrams}g)</span>
              <span className="font-medium">{formatRupees(price.metalValue / 100)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-navy/70">Making Charges</span>
              <span className="font-medium">{formatRupees(price.makingCharges / 100)}</span>
            </div>
            {price.stoneCharges > 0 && (
              <div className="flex justify-between">
                <span className="text-navy/70">Stone Charges</span>
                <span className="font-medium">{formatRupees(price.stoneCharges / 100)}</span>
              </div>
            )}
            <div className="border-t border-gray-100 pt-2 flex justify-between">
              <span className="text-navy/70">Subtotal</span>
              <span className="font-medium">{formatRupees(price.subtotal / 100)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-navy/70">GST (3%)</span>
              <span className="font-medium">{formatRupees(price.gst / 100)}</span>
            </div>
            <div className="border-t border-navy/10 pt-2 flex justify-between">
              <span className="font-semibold text-navy">Total</span>
              <span className="font-bold text-navy">{formatRupees(price.total / 100)}</span>
            </div>
          </div>
          <div className="mt-3 text-[10px] text-navy/40">* Prices based on current metal rates</div>
        </div>
      )}
    </div>
  );
}
