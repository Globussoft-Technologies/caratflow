"use client";

import Link from "next/link";
import { mockOrders, mockWishlistItems, mockLoyalty, mockSchemes } from "@/lib/mock-data";
import { formatPrice, formatDate } from "@/lib/utils";
import { LOYALTY_TIERS } from "@/lib/constants";

export default function AccountDashboard() {
  const recentOrders = mockOrders.slice(0, 3);
  const tier = LOYALTY_TIERS[mockLoyalty.tier];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-navy" style={{ fontFamily: "var(--font-serif)" }}>My Dashboard</h1>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Orders", value: mockOrders.length, href: "/account/orders" },
          { label: "Wishlist Items", value: mockWishlistItems.length, href: "/account/wishlist" },
          { label: "Loyalty Points", value: mockLoyalty.points.toLocaleString(), href: "/account/loyalty" },
          { label: "Active Schemes", value: mockSchemes.filter((s) => s.status === "active").length, href: "/account/schemes" },
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
            <p className="text-lg font-bold">{tier.name}</p>
            <p className="text-xs text-white/60 mt-1">
              {mockLoyalty.pointsToNextTier} points to {mockLoyalty.nextTier}
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold">{mockLoyalty.points.toLocaleString()}</p>
            <p className="text-xs text-white/60">points</p>
          </div>
        </div>
        <div className="mt-3 h-2 bg-white/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-gold rounded-full"
            style={{ width: `${mockLoyalty.tierProgress}%` }}
          />
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
        <div className="space-y-3">
          {recentOrders.map((order) => (
            <Link
              key={order.id}
              href={`/account/orders/${order.id}`}
              className="flex items-center gap-4 bg-white rounded-xl border border-gray-100 p-4 hover:border-gold/30 transition-all"
            >
              <div className="w-14 h-14 rounded-lg overflow-hidden bg-warm-gray flex-shrink-0">
                <img
                  src={order.items[0]?.product.images[0]?.url}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-navy">{order.orderNumber}</p>
                <p className="text-xs text-navy/50">{formatDate(order.createdAt)} &middot; {order.items.length} item(s)</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-navy">{formatPrice(order.totalPaise)}</p>
                <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded ${
                  order.status === "delivered" ? "bg-emerald-50 text-emerald-600" :
                  order.status === "shipped" ? "bg-blue-50 text-blue-600" :
                  "bg-gray-100 text-navy/50"
                }`}>
                  {order.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Active schemes */}
      {mockSchemes.filter((s) => s.status === "active").length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-navy">Active Schemes</h2>
            <Link href="/account/schemes" className="text-gold text-sm font-medium hover:text-gold-dark transition-colors">
              View All
            </Link>
          </div>
          {mockSchemes.filter((s) => s.status === "active").map((scheme) => {
            const progress = (scheme.paidMonths / scheme.totalMonths) * 100;
            return (
              <Link key={scheme.id} href={`/account/schemes/${scheme.id}`} className="block bg-white rounded-xl border border-gray-100 p-4 hover:border-gold/30 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium text-sm text-navy">{scheme.name}</p>
                  <p className="text-sm font-bold text-navy">{formatPrice(scheme.monthlyAmountPaise)}/mo</p>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gold rounded-full" style={{ width: `${progress}%` }} />
                </div>
                <p className="text-xs text-navy/40 mt-1">{scheme.paidMonths}/{scheme.totalMonths} months completed</p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
