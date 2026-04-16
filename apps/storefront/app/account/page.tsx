"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch, ApiError } from "@/lib/api";
import { formatPrice, formatDate } from "@/lib/utils";

interface DashboardData {
  greeting?: string;
  recentOrders?: Array<{
    id: string;
    orderNumber: string;
    status: string;
    totalPaise: number;
    itemCount: number;
    thumbnail?: string | null;
    createdAt: string;
  }>;
  loyalty?: {
    currentPoints: number;
    tier: string | null;
    pointsExpiringSoon: number;
  };
  activeSchemesCount?: number;
  upcomingInstallments?: Array<{
    schemeName: string;
    dueDate: string;
    amountPaise: number;
  }>;
  wishlistCount?: number;
  pendingReturns?: number;
}

const TIER_LABEL: Record<string, string> = {
  BRONZE: "Bronze",
  SILVER: "Silver",
  GOLD: "Gold",
  PLATINUM: "Platinum",
  DIAMOND: "Diamond",
};

export default function AccountDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch<DashboardData>("/api/v1/store/account/dashboard");
        if (cancelled) return;
        setData(res);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          if (typeof window !== "undefined") window.location.href = "/auth/login";
          return;
        }
        setError(err instanceof Error ? err.message : "Could not load dashboard");
        setData({});
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (data === null) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-navy mb-6" style={{ fontFamily: "var(--font-serif)" }}>My Dashboard</h1>
        <div className="bg-white rounded-xl border border-gray-100 p-6 text-navy/50 text-sm">Loading...</div>
      </div>
    );
  }

  const recent = data.recentOrders ?? [];
  const loyalty = data.loyalty ?? { currentPoints: 0, tier: null, pointsExpiringSoon: 0 };
  const tierLabel = loyalty.tier ? (TIER_LABEL[loyalty.tier] ?? loyalty.tier) : "Bronze";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-navy" style={{ fontFamily: "var(--font-serif)" }}>
        {data.greeting ?? "My Dashboard"}
      </h1>

      {error && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 text-sm rounded-lg p-3">{error}</div>
      )}

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Recent Orders", value: recent.length, href: "/account/orders" },
          { label: "Wishlist Items", value: data.wishlistCount ?? 0, href: "/account/wishlist" },
          { label: "Loyalty Points", value: (loyalty.currentPoints ?? 0).toLocaleString(), href: "/account/loyalty" },
          { label: "Active Schemes", value: data.activeSchemesCount ?? 0, href: "/account/schemes" },
        ].map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="bg-white rounded-xl border border-gray-100 p-4 hover:border-gold/30 hover:shadow-sm transition-all"
          >
            <p className="text-[10px] text-navy/40 uppercase tracking-wider">{stat.label}</p>
            <p className="text-2xl font-bold text-navy mt-1">{stat.value}</p>
          </Link>
        ))}
      </div>

      {/* Loyalty banner */}
      <div className="bg-gradient-to-r from-navy to-navy-light rounded-xl p-5 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-white/60 uppercase tracking-wider">Loyalty Tier</p>
            <p className="text-lg font-bold">{tierLabel}</p>
            {loyalty.pointsExpiringSoon > 0 && (
              <p className="text-xs text-white/60 mt-1">
                {loyalty.pointsExpiringSoon.toLocaleString()} points expiring soon
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold">{(loyalty.currentPoints ?? 0).toLocaleString()}</p>
            <p className="text-xs text-white/60">points</p>
          </div>
        </div>
      </div>

      {/* Recent orders */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-navy">Recent Orders</h2>
          <Link href="/account/orders" className="text-gold text-sm font-medium hover:text-gold-dark transition-colors">
            View All
          </Link>
        </div>
        {recent.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-6 text-sm text-navy/50">
            You don't have any orders yet. <Link href="/" className="text-gold">Start shopping</Link>.
          </div>
        ) : (
          <div className="space-y-3">
            {recent.map((order) => (
              <Link
                key={order.id}
                href={`/account/orders/${order.id}`}
                className="flex items-center gap-4 bg-white rounded-xl border border-gray-100 p-4 hover:border-gold/30 transition-all"
              >
                <div className="w-14 h-14 rounded-lg overflow-hidden bg-warm-gray flex-shrink-0">
                  {order.thumbnail ? (
                    <img src={order.thumbnail} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-warm-gray" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-navy">{order.orderNumber}</p>
                  <p className="text-xs text-navy/50">
                    {formatDate(order.createdAt)} &middot; {order.itemCount} item(s)
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-navy">{formatPrice(order.totalPaise)}</p>
                  <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-gray-100 text-navy/60">
                    {order.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Upcoming installments */}
      {(data.upcomingInstallments ?? []).length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-navy">Upcoming Installments</h2>
            <Link href="/account/schemes" className="text-gold text-sm font-medium hover:text-gold-dark transition-colors">
              View Schemes
            </Link>
          </div>
          <div className="space-y-3">
            {(data.upcomingInstallments ?? []).map((inst, idx) => (
              <div key={idx} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm text-navy">{inst.schemeName}</p>
                  <p className="text-xs text-navy/50">Due {formatDate(inst.dueDate)}</p>
                </div>
                <p className="font-bold text-sm text-navy">{formatPrice(inst.amountPaise)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
