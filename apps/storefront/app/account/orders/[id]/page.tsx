"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { mockOrders } from "@/lib/mock-data";
import { formatPrice, formatDate } from "@/lib/utils";
import OrderTimeline from "@/components/OrderTimeline";

export default function OrderDetailPage() {
  const params = useParams();
  const order = mockOrders.find((o) => o.id === params.id);

  if (!order) {
    return (
      <div className="text-center py-16">
        <h1 className="text-xl font-bold text-navy mb-2">Order Not Found</h1>
        <Link href="/account/orders" className="text-gold font-medium hover:text-gold-dark transition-colors">
          Back to Orders
        </Link>
      </div>
    );
  }

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

      {/* Timeline */}
      <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
        <h2 className="font-semibold text-navy mb-4">Order Status</h2>
        <OrderTimeline timeline={order.timeline} currentStatus={order.status} />
        {order.trackingNumber && (
          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2">
            <span className="text-xs text-navy/50">Tracking:</span>
            <span className="text-xs font-medium text-navy">{order.trackingNumber}</span>
            {order.trackingUrl && (
              <a href={order.trackingUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-gold hover:text-gold-dark transition-colors">
                Track Package
              </a>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Items */}
        <div className="md:col-span-2 space-y-3">
          <h2 className="font-semibold text-navy">Items</h2>
          {order.items.map((item) => (
            <div key={item.id} className="flex gap-3 bg-white rounded-xl border border-gray-100 p-4">
              <div className="w-20 h-20 rounded-lg overflow-hidden bg-warm-gray flex-shrink-0">
                <img src={item.product.images[0]?.url} alt={item.product.name} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1">
                <Link href={`/product/${item.product.id}`} className="text-sm font-medium text-navy hover:text-gold transition-colors">
                  {item.product.name}
                </Link>
                <p className="text-xs text-navy/50 mt-0.5">
                  {item.product.purityLabel} {item.product.metalType} &middot; {item.product.netWeightGrams}g
                  {item.selectedSize && ` | Size ${item.selectedSize}`}
                </p>
                <p className="text-xs text-navy/40 mt-0.5">Qty: {item.quantity}</p>
              </div>
              <p className="font-semibold text-sm text-navy">{formatPrice(item.pricePaise)}</p>
            </div>
          ))}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            {order.invoiceUrl && (
              <button type="button" className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 rounded-lg text-sm text-navy/60 hover:border-gold hover:text-gold transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Download Invoice
              </button>
            )}
            {order.status === "delivered" && (
              <button type="button" className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 rounded-lg text-sm text-navy/60 hover:border-rose-300 hover:text-rose-500 transition-colors">
                Request Return
              </button>
            )}
          </div>
        </div>

        {/* Summary */}
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
                  <span>Discount{order.couponCode && ` (${order.couponCode})`}</span>
                  <span>-{formatPrice(order.discountPaise)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-navy/60">CGST</span>
                <span>{formatPrice(order.cgstPaise)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-navy/60">SGST</span>
                <span>{formatPrice(order.sgstPaise)}</span>
              </div>
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

          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h3 className="font-semibold text-navy mb-3 text-sm">Shipping Address</h3>
            <p className="text-sm text-navy/70">
              {order.shippingAddress.fullName}<br />
              {order.shippingAddress.addressLine1}<br />
              {order.shippingAddress.addressLine2 && <>{order.shippingAddress.addressLine2}<br /></>}
              {order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.pincode}
            </p>
            <p className="text-xs text-navy/40 mt-2">{order.shippingAddress.phone}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
