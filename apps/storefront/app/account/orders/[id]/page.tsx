"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiFetch, ApiError, getAccessToken } from "@/lib/api";
import { API_BASE_URL } from "@/lib/constants";
import { formatPrice, formatDate } from "@/lib/utils";

interface OrderItem {
  id: string;
  title: string;
  sku?: string | null;
  quantity: number;
  unitPricePaise: number;
  totalPaise: number;
  image?: string | null;
}

interface ShipmentInfo {
  id: string;
  shipmentNumber?: string;
  carrier?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  status?: string;
  estimatedDeliveryDate?: string | null;
}

interface AddressShape {
  fullName?: string;
  firstName?: string;
  lastName?: string;
  addressLine1?: string;
  addressLine2?: string | null;
  city?: string;
  state?: string;
  pincode?: string;
  postalCode?: string;
  phone?: string;
  [key: string]: unknown;
}

interface OrderDetail {
  id: string;
  orderNumber: string;
  status: string;
  subtotalPaise: number;
  shippingPaise: number;
  taxPaise?: number;
  cgstPaise?: number;
  sgstPaise?: number;
  discountPaise: number;
  totalPaise: number;
  shippingAddress?: AddressShape | null;
  items: OrderItem[];
  shipments?: ShipmentInfo[];
  invoiceUrl?: string;
}

interface ReturnReason {
  orderItemId: string;
  quantity: number;
  reason: string;
}

export default function OrderDetailPage() {
  const params = useParams();
  const orderId = params.id as string;
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [error, setError] = useState("");
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnReason, setReturnReason] = useState("");
  const [returnItems, setReturnItems] = useState<ReturnReason[]>([]);
  const [returnRefundMethod, setReturnRefundMethod] = useState<"ORIGINAL_PAYMENT" | "STORE_CREDIT" | "BANK_TRANSFER">("ORIGINAL_PAYMENT");
  const [returnSubmitting, setReturnSubmitting] = useState(false);
  const [returnMsg, setReturnMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiFetch<OrderDetail>(`/api/v1/store/account/orders/${orderId}`);
        if (cancelled) return;
        setOrder(data);
        setReturnItems((data.items ?? []).map((it) => ({
          orderItemId: it.id,
          quantity: 0,
          reason: "",
        })));
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          if (typeof window !== "undefined") window.location.href = "/auth/login";
          return;
        }
        setError(err instanceof Error ? err.message : "Could not load order");
      }
    })();
    return () => { cancelled = true; };
  }, [orderId]);

  async function handleDownloadInvoice() {
    if (!order) return;
    setDownloading(true);
    try {
      const token = getAccessToken();
      const res = await fetch(`${API_BASE_URL}/api/v1/financial/invoices/${order.id}/pdf`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        if (res.status === 401 && typeof window !== "undefined") {
          window.location.href = "/auth/login";
          return;
        }
        throw new Error(`Could not download invoice (${res.status})`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `invoice-${order.orderNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not download invoice");
    } finally {
      setDownloading(false);
    }
  }

  async function handleReturnSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!order) return;
    setReturnMsg(null);
    const items = returnItems.filter((r) => r.quantity > 0).map((r) => ({
      orderItemId: r.orderItemId,
      quantity: r.quantity,
      reason: r.reason || returnReason,
    }));
    if (items.length === 0) {
      setReturnMsg({ type: "err", text: "Select at least one item to return." });
      return;
    }
    if (!returnReason.trim()) {
      setReturnMsg({ type: "err", text: "Please add a reason for the return." });
      return;
    }
    setReturnSubmitting(true);
    try {
      await apiFetch(`/api/v1/store/account/orders/${order.id}/return`, {
        method: "POST",
        body: {
          orderId: order.id,
          items,
          reason: returnReason,
          preferredRefundMethod: returnRefundMethod,
        },
      });
      setReturnMsg({ type: "ok", text: "Return request submitted. Our team will contact you." });
      setTimeout(() => { setShowReturnModal(false); setReturnMsg(null); }, 1500);
    } catch (err) {
      setReturnMsg({ type: "err", text: err instanceof Error ? err.message : "Could not submit return" });
    } finally {
      setReturnSubmitting(false);
    }
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <h1 className="text-xl font-bold text-navy mb-2">Order Not Found</h1>
        <p className="text-sm text-navy/50 mb-4">{error}</p>
        <Link href="/account/orders" className="text-gold font-medium hover:text-gold-dark transition-colors">
          Back to Orders
        </Link>
      </div>
    );
  }

  if (!order) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-navy mb-6" style={{ fontFamily: "var(--font-serif)" }}>Order</h1>
        <div className="bg-white rounded-xl border border-gray-100 p-6 text-navy/50 text-sm">Loading...</div>
      </div>
    );
  }

  const addr = order.shippingAddress;
  const fullName = addr?.fullName ?? `${addr?.firstName ?? ""} ${addr?.lastName ?? ""}`.trim();
  const pin = addr?.pincode ?? addr?.postalCode ?? "";
  const tracking = order.shipments?.[0];

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Link href="/account/orders" className="text-navy/40 hover:text-gold transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold text-navy" style={{ fontFamily: "var(--font-serif)" }}>
          Order {order.orderNumber}
        </h1>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-xs text-navy/40 uppercase tracking-wider">Status</p>
            <p className="text-lg font-bold text-navy">{order.status?.replace(/_/g, " ")}</p>
          </div>
          {tracking?.trackingNumber && (
            <div className="text-right">
              <p className="text-xs text-navy/40">Tracking #</p>
              <p className="text-sm font-medium text-navy">{tracking.trackingNumber}</p>
              {tracking.trackingUrl && (
                <a href={tracking.trackingUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-gold hover:text-gold-dark">
                  Track Package
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-3">
          <h2 className="font-semibold text-navy">Items</h2>
          {order.items.map((item) => (
            <div key={item.id} className="flex gap-3 bg-white rounded-xl border border-gray-100 p-4">
              <div className="w-20 h-20 rounded-lg overflow-hidden bg-warm-gray flex-shrink-0">
                {item.image ? (
                  <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-warm-gray" />
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-navy">{item.title}</p>
                {item.sku && <p className="text-xs text-navy/40 mt-0.5">SKU: {item.sku}</p>}
                <p className="text-xs text-navy/40 mt-0.5">Qty: {item.quantity}</p>
              </div>
              <p className="font-semibold text-sm text-navy">{formatPrice(item.totalPaise)}</p>
            </div>
          ))}

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={handleDownloadInvoice}
              disabled={downloading}
              className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 rounded-lg text-sm text-navy/60 hover:border-gold hover:text-gold transition-colors disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              {downloading ? "Downloading..." : "Download Invoice"}
            </button>
            {order.status?.toLowerCase() === "delivered" && (
              <button
                type="button"
                onClick={() => setShowReturnModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 rounded-lg text-sm text-navy/60 hover:border-rose-300 hover:text-rose-500 transition-colors"
              >
                Request Return
              </button>
            )}
          </div>
        </div>

        <div>
          <div className="bg-white rounded-xl border border-gray-100 p-5 mb-4">
            <h3 className="font-semibold text-navy mb-3 text-sm">Order Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-navy/60">Subtotal</span>
                <span>{formatPrice(order.subtotalPaise)}</span>
              </div>
              {order.discountPaise > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount</span>
                  <span>-{formatPrice(order.discountPaise)}</span>
                </div>
              )}
              {(order.taxPaise ?? 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-navy/60">Tax (GST)</span>
                  <span>{formatPrice(order.taxPaise ?? 0)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-navy/60">Shipping</span>
                <span>{order.shippingPaise === 0 ? "Free" : formatPrice(order.shippingPaise)}</span>
              </div>
              <div className="border-t border-gray-100 pt-2 flex justify-between font-bold">
                <span>Total</span>
                <span>{formatPrice(order.totalPaise)}</span>
              </div>
            </div>
          </div>

          {addr && (
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h3 className="font-semibold text-navy mb-3 text-sm">Shipping Address</h3>
              <p className="text-sm text-navy/70">
                {fullName}<br />
                {addr.addressLine1}<br />
                {addr.addressLine2 && <>{addr.addressLine2}<br /></>}
                {addr.city}, {addr.state} - {pin}
              </p>
              {addr.phone && <p className="text-xs text-navy/40 mt-2">{addr.phone}</p>}
            </div>
          )}
        </div>
      </div>

      {showReturnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-navy text-lg">Request Return</h2>
                <button type="button" onClick={() => { setShowReturnModal(false); setReturnMsg(null); }} className="text-navy/40 hover:text-navy">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {returnMsg && (
                <div className={`text-sm rounded-lg p-3 mb-4 ${
                  returnMsg.type === "ok" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"
                }`}>
                  {returnMsg.text}
                </div>
              )}

              <form onSubmit={handleReturnSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-navy/60 mb-2">Items to Return</label>
                  <div className="space-y-2">
                    {order.items.map((item, idx) => (
                      <div key={item.id} className="flex items-center gap-2">
                        <div className="flex-1 text-sm text-navy">{item.title}</div>
                        <input
                          type="number"
                          min={0}
                          max={item.quantity}
                          value={returnItems[idx]?.quantity ?? 0}
                          onChange={(e) => {
                            const next = [...returnItems];
                            next[idx] = { ...next[idx], quantity: Number(e.target.value) || 0 };
                            setReturnItems(next);
                          }}
                          className="w-16 border border-gray-200 rounded px-2 py-1 text-sm"
                        />
                        <span className="text-xs text-navy/40">/ {item.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-navy/60 mb-1">Reason for Return</label>
                  <textarea
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                    rows={3}
                    required
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/20"
                    placeholder="Tell us why you're returning these items..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-navy/60 mb-1">Refund Method</label>
                  <select
                    value={returnRefundMethod}
                    onChange={(e) => setReturnRefundMethod(e.target.value as typeof returnRefundMethod)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="ORIGINAL_PAYMENT">Refund to original payment</option>
                    <option value="STORE_CREDIT">Store credit</option>
                    <option value="BANK_TRANSFER">Bank transfer</option>
                  </select>
                </div>

                <div className="text-xs text-navy/50">
                  Estimated refund: {formatPrice(order.totalPaise)}
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setShowReturnModal(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-navy/60 hover:bg-gray-50">
                    Cancel
                  </button>
                  <button type="submit" disabled={returnSubmitting} className="px-5 py-2 bg-gold text-white text-sm font-semibold rounded-lg hover:bg-gold-dark disabled:opacity-60">
                    {returnSubmitting ? "Submitting..." : "Submit Request"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
