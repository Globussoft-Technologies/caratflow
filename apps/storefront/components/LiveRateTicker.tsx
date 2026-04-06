"use client";

import { mockGoldRates } from "@/lib/mock-data";
import { formatRupees, cn } from "@/lib/utils";

export default function LiveRateTicker() {
  const rates = mockGoldRates;

  const tickerContent = rates.map((rate) => {
    const label =
      rate.metalType === "GOLD"
        ? `Gold ${rate.purity}`
        : rate.metalType === "SILVER"
          ? "Silver 999"
          : "Platinum 950";
    const isUp = rate.change24h >= 0;

    return (
      <span key={`${rate.metalType}-${rate.purity}`} className="inline-flex items-center gap-2 mx-6">
        <span className="font-medium text-white/90">{label}</span>
        <span className="font-bold text-white">{formatRupees(rate.ratePerGram)}/g</span>
        <span className={cn("text-xs font-medium", isUp ? "text-emerald-400" : "text-rose-400")}>
          {isUp ? "+" : ""}
          {rate.changePercent24h.toFixed(2)}%
          {isUp ? (
            <svg className="w-3 h-3 inline ml-0.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 17a.75.75 0 01-.75-.75V5.612L5.29 9.77a.75.75 0 01-1.08-1.04l5.25-5.5a.75.75 0 011.08 0l5.25 5.5a.75.75 0 11-1.08 1.04l-3.96-4.158V16.25A.75.75 0 0110 17z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className="w-3 h-3 inline ml-0.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a.75.75 0 01.75.75v10.638l3.96-4.158a.75.75 0 111.08 1.04l-5.25 5.5a.75.75 0 01-1.08 0l-5.25-5.5a.75.75 0 111.08-1.04l3.96 4.158V3.75A.75.75 0 0110 3z" clipRule="evenodd" />
            </svg>
          )}
        </span>
      </span>
    );
  });

  return (
    <div className="bg-navy-dark overflow-hidden">
      <div className="ticker-animate inline-flex whitespace-nowrap py-1.5 text-xs">
        {tickerContent}
        {tickerContent}
      </div>
    </div>
  );
}
