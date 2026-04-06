"use client";

import { mockLoyalty } from "@/lib/mock-data";
import { LOYALTY_TIERS } from "@/lib/constants";
import { formatDate, cn } from "@/lib/utils";

export default function LoyaltyPage() {
  const tier = LOYALTY_TIERS[mockLoyalty.tier];
  const allTiers = Object.entries(LOYALTY_TIERS);

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy mb-6" style={{ fontFamily: "var(--font-serif)" }}>Loyalty Program</h1>

      {/* Points overview */}
      <div className="bg-gradient-to-br from-navy to-navy-light rounded-2xl p-6 text-white mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-white/60 uppercase tracking-wider mb-1">Your Tier</p>
            <p className="text-2xl font-bold">{tier.name}</p>
          </div>
          <div className="text-right">
            <p className="text-4xl font-bold">{mockLoyalty.points.toLocaleString()}</p>
            <p className="text-xs text-white/60">total points</p>
          </div>
        </div>
        <div className="mb-2">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-white/60">Progress to {mockLoyalty.nextTier}</span>
            <span>{mockLoyalty.tierProgress}%</span>
          </div>
          <div className="h-2.5 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-gold rounded-full" style={{ width: `${mockLoyalty.tierProgress}%` }} />
          </div>
          <p className="text-xs text-white/60 mt-1">{mockLoyalty.pointsToNextTier} more points needed</p>
        </div>
      </div>

      {/* Tier benefits */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {allTiers.map(([key, t]) => (
          <div
            key={key}
            className={cn(
              "rounded-xl border p-4 text-center",
              key === mockLoyalty.tier ? "border-gold bg-gold/5" : "border-gray-100 bg-white"
            )}
          >
            <div className="w-8 h-8 rounded-full mx-auto mb-2" style={{ background: t.color }} />
            <p className="font-semibold text-sm text-navy">{t.name}</p>
            <p className="text-[10px] text-navy/40 mt-0.5">{t.minPoints.toLocaleString()}+ pts</p>
            {t.discount > 0 && <p className="text-xs text-gold mt-1">{t.discount}% off</p>}
            {key === mockLoyalty.tier && <p className="text-[10px] text-gold font-semibold mt-1">Current Tier</p>}
          </div>
        ))}
      </div>

      {/* History */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <h2 className="font-semibold text-navy mb-4">Points History</h2>
        <div className="space-y-3">
          {mockLoyalty.history.map((tx) => (
            <div key={tx.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
              <div>
                <p className="text-sm text-navy">{tx.description}</p>
                <p className="text-xs text-navy/40">{formatDate(tx.date)}</p>
              </div>
              <span className={cn(
                "font-bold text-sm",
                tx.type === "earned" ? "text-emerald-600" :
                tx.type === "redeemed" ? "text-navy" :
                "text-rose-500"
              )}>
                {tx.points > 0 ? "+" : ""}{tx.points}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
