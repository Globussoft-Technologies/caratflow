"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch, ApiError } from "@/lib/api";
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

interface OrderSummary {
  id: string;
  orderNumber: string;
  status: string;
  totalPaise: number | string;
  currencyCode?: string;
  itemCount: number;
  thumbnail?: string | null;
  placedAt?: string | Date;
  createdAt: string | Date;
  estimatedDelivery?: string | Date;
}

interface OrdersResponse {
  items: OrderSummary[];
  total: number;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderSummary[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    apiFetch<OrdersResponse>("/api/v1/store/account/orders")
      .then((data) => {
        if (cancelled) return;
        setOrders(data?.items ?? []);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const msg =
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Could not load orders";
        setError(msg);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy mb-6" style={{ fontFamily: "var(--font-serif)" }}>My Orders</h1>

      {loading ? (
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 animate-pulse">
              <div className="flex items-center justify-between mb-3">
                <div className="space-y-2">
                  <div className="h-4 w-32 bg-navy/5 rounded" />
                  <div className="h-3 w-24 bg-navy/5 rounded" />
                </div>
                <div className="h-5 w-20 bg-navy/5 rounded" />
              </div>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-navy/5" />
                <div className="h-4 flex-1 bg-navy/5 rounded" />
                <div className="h-5 w-20 bg-navy/5 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
          <p className="text-sm font-semibold text-navy mb-1">Couldn't load your orders</p>
          <p className="text-xs text-navy/60 mb-4">{error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-5 py-2 bg-gold text-white text-sm font-semibold rounded-lg hover:bg-gold-dark transition-colors"
          >
            Try Again
          </button>
        </div>
      ) : !orders || orders.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-navy/40 mb-4">You have no orders yet.</p>
          <Link href="/" className="text-gold font-medium hover:text-gold-dark transition-colors">
            Start Shopping
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const totalPaise = typeof order.totalPaise === "string"
              ? Number(order.totalPaise)
              : order.totalPaise;
            const placedAt = order.placedAt ?? order.createdAt;
            return (
              <Link
                key={order.id}
                href={`/account/orders/${order.id}`}
                className="block bg-white rounded-xl border border-gray-100 p-5 hover:border-gold/30 hover:shadow-sm transition-all"
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-semibold text-navy">{order.orderNumber}</p>
                    <p className="text-xs text-navy/40 mt-0.5">
                      Placed on {formatDate(typeof placedAt === "string" ? placedAt : placedAt.toISOString())}
                    </p>
                  </div>
                  <span className={cn("px-2.5 py-1 rounded text-[10px] font-semibold uppercase", STATUS_COLORS[order.status] ?? "bg-gray-100 text-navy/50")}>
                    {order.status.replace(/_/g, " ")}
                  </span>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg overflow-hidden border-2 border-white bg-warm-gray">
                    {order.thumbnail ? (
                      <img src={order.thumbnail} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-warm-gray" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-navy/60">
                      {order.itemCount} {order.itemCount === 1 ? "item" : "items"}
                    </p>
                  </div>
                  <p className="font-bold text-navy">{formatPrice(totalPaise)}</p>
                </div>

                {order.estimatedDelivery && order.status !== "delivered" && (
                  <p className="text-xs text-navy/40 mt-3">
                    Expected delivery: {formatDate(typeof order.estimatedDelivery === "string" ? order.estimatedDelivery : order.estimatedDelivery.toISOString())}
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
