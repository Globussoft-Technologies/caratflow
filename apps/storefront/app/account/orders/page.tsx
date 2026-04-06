"use client";

import Link from "next/link";
import { mockOrders } from "@/lib/mock-data";
import { formatPrice, formatDate, cn } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  placed: "bg-gray-100 text-navy/50",
  confirmed: "bg-blue-50 text-blue-600",
  processing: "bg-amber-50 text-amber-600",
  shipped: "bg-indigo-50 text-indigo-600",
  out_for_delivery: "bg-purple-50 text-purple-600",
  delivered: "bg-emerald-50 text-emerald-600",
  cancelled: "bg-rose-50 text-rose-600",
  returned: "bg-rose-50 text-rose-600",
};

export default function OrdersPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-navy mb-6" style={{ fontFamily: "var(--font-serif)" }}>My Orders</h1>

      {mockOrders.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-navy/40 mb-4">You have no orders yet.</p>
          <Link href="/" className="text-gold font-medium hover:text-gold-dark transition-colors">
            Start Shopping
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {mockOrders.map((order) => (
            <Link
              key={order.id}
              href={`/account/orders/${order.id}`}
              className="block bg-white rounded-xl border border-gray-100 p-5 hover:border-gold/30 hover:shadow-sm transition-all"
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-semibold text-navy">{order.orderNumber}</p>
                  <p className="text-xs text-navy/40 mt-0.5">Placed on {formatDate(order.createdAt)}</p>
                </div>
                <span className={cn("px-2.5 py-1 rounded text-[10px] font-semibold uppercase", STATUS_COLORS[order.status] ?? "bg-gray-100 text-navy/50")}>
                  {order.status.replace(/_/g, " ")}
                </span>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex -space-x-3">
                  {order.items.slice(0, 3).map((item) => (
                    <div key={item.id} className="w-12 h-12 rounded-lg overflow-hidden border-2 border-white bg-warm-gray">
                      <img src={item.product.images[0]?.url} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                  {order.items.length > 3 && (
                    <div className="w-12 h-12 rounded-lg bg-warm-gray border-2 border-white flex items-center justify-center text-[10px] font-bold text-navy/40">
                      +{order.items.length - 3}
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-navy/60">
                    {order.items.length} {order.items.length === 1 ? "item" : "items"}
                  </p>
                </div>
                <p className="font-bold text-navy">{formatPrice(order.totalPaise)}</p>
              </div>

              {order.estimatedDelivery && order.status !== "delivered" && (
                <p className="text-xs text-navy/40 mt-3">
                  Expected delivery: {formatDate(order.estimatedDelivery)}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
