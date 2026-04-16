"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { formatDate, cn } from "@/lib/utils";

interface LoyaltyDashboard {
  currentPoints: number;
  tier?: string | null;
  tierBenefits?: string[];
  tierMultiplier?: number | null;
  lifetimeEarned?: number;
  lifetimeRedeemed?: number;
  pointsExpiringSoon?: number;
  pointsExpiryDate?: string | null;
  nextTier?: string | null;
  pointsToNextTier?: number | null;
  nextTierBenefits?: string[];
  recentTransactions?: Array<{
    id: string;
    transactionType: string;
    points: number;
    description?: string;
    createdAt: string;
  }>;
}

interface PointsHistory {
  items: Array<{
    id: string;
    transactionType: string;
    points: number;
    description?: string;
    createdAt: string;
  }>;
}

export default function LoyaltyPage() {
  const [dashboard, setDashboard] = useState<LoyaltyDashboard | null>(null);
  const [history, setHistory] = useState<PointsHistory["items"]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [dash, hist] = await Promise.all([
          apiFetch<LoyaltyDashboard>("/api/v1/store/account/loyalty"),
          apiFetch<PointsHistory>("/api/v1/store/account/loyalty/history?page=1&limit=20").catch(() => ({ items: [] })),
        ]);
        if (cancelled) return;
        setDashboard(dash);
        setHistory(hist.items ?? []);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          if (typeof window !== "undefined") window.location.href = "/auth/login";
          return;
        }
        setError(err instanceof Error ? err.message : "Could not load loyalty");
        setDashboard({ currentPoints: 0 });
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (dashboard === null) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-navy mb-6" style={{ fontFamily: "var(--font-serif)" }}>Loyalty Program</h1>
        <div className="bg-white rounded-xl border border-gray-100 p-6 text-navy/50 text-sm">Loading...</div>
      </div>
    );
  }

  const tierName = dashboard.tier ?? "Bronze";
  const points = dashboard.currentPoints ?? 0;
  const next = dashboard.nextTier;
  const toNext = dashboard.pointsToNextTier ?? 0;
  const progress = next && toNext > 0
    ? Math.max(0, Math.min(100, Math.round((points / (points + toNext)) * 100)))
    : 100;

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy mb-6" style={{ fontFamily: "var(--font-serif)" }}>Loyalty Program</h1>

      {error && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 text-sm rounded-lg p-3 mb-4">{error}</div>
      )}

      {/* Points overview */}
      <div className="bg-gradient-to-br from-navy to-navy-light rounded-2xl p-6 text-white mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-white/60 uppercase tracking-wider mb-1">Your Tier</p>
            <p className="text-2xl font-bold">{tierName}</p>
          </div>
          <div className="text-right">
            <p className="text-4xl font-bold">{points.toLocaleString()}</p>
            <p className="text-xs text-white/60">total points</p>
          </div>
        </div>
        {next && (
          <div className="mb-2">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-white/60">Progress to {next}</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2.5 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-gold rounded-full" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-xs text-white/60 mt-1">{toNext.toLocaleString()} more points needed</p>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-[10px] text-navy/40 uppercase tracking-wider">Lifetime Earned</p>
          <p className="text-xl font-bold text-navy mt-1">{(dashboard.lifetimeEarned ?? 0).toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-[10px] text-navy/40 uppercase tracking-wider">Lifetime Redeemed</p>
          <p className="text-xl font-bold text-navy mt-1">{(dashboard.lifetimeRedeemed ?? 0).toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-[10px] text-navy/40 uppercase tracking-wider">Expiring Soon</p>
          <p className="text-xl font-bold text-amber-600 mt-1">{(dashboard.pointsExpiringSoon ?? 0).toLocaleString()}</p>
          {dashboard.pointsExpiryDate && (
            <p className="text-[10px] text-navy/40 mt-0.5">{formatDate(dashboard.pointsExpiryDate)}</p>
          )}
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-[10px] text-navy/40 uppercase tracking-wider">Multiplier</p>
          <p className="text-xl font-bold text-navy mt-1">{dashboard.tierMultiplier ?? 1}x</p>
        </div>
      </div>

      {/* Tier benefits */}
      {(dashboard.tierBenefits?.length ?? 0) > 0 && (
        <div className="bg-cream rounded-xl p-5 border border-gold/10 mb-6">
          <h3 className="font-semibold text-navy mb-2">Your {tierName} Benefits</h3>
          <ul className="space-y-1.5 text-sm text-navy/70">
            {(dashboard.tierBenefits ?? []).map((b, i) => (
              <li key={i} className="flex items-start gap-2">
                <svg className="w-4 h-4 text-gold flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                {b}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* History */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <h2 className="font-semibold text-navy mb-4">Points History</h2>
        {history.length === 0 ? (
          <p className="text-sm text-navy/40">No loyalty transactions yet.</p>
        ) : (
          <div className="space-y-3">
            {history.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm text-navy">{tx.description ?? tx.transactionType}</p>
                  <p className="text-xs text-navy/40">{formatDate(tx.createdAt)}</p>
                </div>
                <span className={cn(
                  "font-bold text-sm",
                  tx.transactionType === "EARNED" || tx.transactionType === "BONUS" ? "text-emerald-600" :
                  tx.transactionType === "REDEEMED" ? "text-rose-500" : "text-navy"
                )}>
                  {tx.points > 0 ? "+" : ""}{tx.points.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
