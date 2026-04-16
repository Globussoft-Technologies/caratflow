"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch, ApiError } from "@/lib/api";
import { formatPrice, formatDate } from "@/lib/utils";

interface SchemeMembership {
  id: string;
  memberNumber: string;
  schemeType: "KITTY" | "GOLD_SAVINGS";
  schemeName: string;
  status: string;
  totalPaidPaise: number;
  monthlyAmountPaise: number;
  durationMonths: number;
  paidInstallments: number;
  totalInstallments: number;
  nextDueDate?: string | null;
  maturityDate?: string | null;
}

interface SchemesDashboard {
  activeSchemes?: SchemeMembership[];
  totalInvestedPaise?: number;
  upcomingInstallments?: Array<{
    membershipId: string;
    schemeName: string;
    installmentNumber: number;
    dueDate: string;
    amountPaise: number;
  }>;
}

export default function SchemesPage() {
  const [data, setData] = useState<SchemesDashboard | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch<SchemesDashboard>("/api/v1/store/account/schemes");
        if (cancelled) return;
        setData(res);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          if (typeof window !== "undefined") window.location.href = "/auth/login";
          return;
        }
        setError(err instanceof Error ? err.message : "Could not load schemes");
        setData({});
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (data === null) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-navy mb-6" style={{ fontFamily: "var(--font-serif)" }}>My Schemes</h1>
        <div className="bg-white rounded-xl border border-gray-100 p-6 text-navy/50 text-sm">Loading...</div>
      </div>
    );
  }

  const schemes = data.activeSchemes ?? [];

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy mb-6" style={{ fontFamily: "var(--font-serif)" }}>My Schemes</h1>

      {error && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 text-sm rounded-lg p-3 mb-4">{error}</div>
      )}

      {(data.totalInvestedPaise ?? 0) > 0 && (
        <div className="bg-cream rounded-xl p-4 border border-gold/10 mb-4">
          <p className="text-xs text-navy/40 uppercase tracking-wider">Total Invested</p>
          <p className="text-xl font-bold text-navy">{formatPrice(data.totalInvestedPaise ?? 0)}</p>
        </div>
      )}

      {schemes.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
          <p className="text-navy/40 mb-2">No active schemes</p>
          <p className="text-sm text-navy/30">Join a Gold Savings or Kitty scheme to start saving</p>
        </div>
      ) : (
        <div className="space-y-4">
          {schemes.map((s) => {
            const progress = s.totalInstallments > 0
              ? Math.round((s.paidInstallments / s.totalInstallments) * 100)
              : 0;
            return (
              <Link
                key={s.id}
                href={`/account/schemes/${s.id}`}
                className="block bg-white rounded-xl border border-gray-100 p-5 hover:border-gold/30 transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-semibold text-navy">{s.schemeName}</p>
                    <p className="text-xs text-navy/40">{s.memberNumber} &middot; {s.schemeType.replace("_", " ")}</p>
                  </div>
                  <p className="text-sm font-bold text-navy">{formatPrice(s.monthlyAmountPaise)}/mo</p>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gold rounded-full" style={{ width: `${progress}%` }} />
                </div>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-navy/40">{s.paidInstallments}/{s.totalInstallments} months completed</p>
                  {s.nextDueDate && (
                    <p className="text-xs text-amber-600">Next due {formatDate(s.nextDueDate)}</p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <div className="mt-8 bg-cream rounded-xl p-6 border border-gold/10">
        <h3 className="font-bold text-navy mb-3">How Gold Savings Scheme Works</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="font-semibold text-navy mb-1">1. Choose Your Plan</p>
            <p className="text-navy/60">Select a monthly amount starting from Rs 1,000. Choose an 11-month plan.</p>
          </div>
          <div>
            <p className="font-semibold text-navy mb-1">2. Pay Monthly</p>
            <p className="text-navy/60">Pay your installment every month via UPI, card, or auto-debit.</p>
          </div>
          <div>
            <p className="font-semibold text-navy mb-1">3. Get Gold Bonus</p>
            <p className="text-navy/60">After 11 months, we add 1 month's amount as bonus. Redeem for jewelry!</p>
          </div>
        </div>
      </div>
    </div>
  );
}
