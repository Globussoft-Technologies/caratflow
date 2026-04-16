"use client";

import { useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { calculateProductPrice, formatRupees, cn } from "@/lib/utils";
import { apiFetch, ApiError } from "@/lib/api";

interface CouponValidationResult {
  isValid: boolean;
  reason?: string;
  discountAmountPaise?: number;
  discountType?: string;
  message?: string;
}

export default function CartPage() {
  const {
    cartItems,
    removeFromCart,
    updateCartQuantity,
    clearCart,
    couponCode,
    setCouponCode,
    couponDiscount,
    setCouponDiscount,
  } = useStore();
  const [couponMsg, setCouponMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [applying, setApplying] = useState(false);

  const subtotal = cartItems.reduce((sum, item) => {
    const price = calculateProductPrice(item.product);
    return sum + price.total * item.quantity;
  }, 0);

  const discount = couponDiscount;
  const afterDiscount = subtotal - discount;
  const shipping = subtotal >= 200000 ? 0 : 49900; // Free shipping over Rs 2000
  const total = afterDiscount + shipping;

  async function handleApplyCoupon() {
    setCouponMsg(null);
    if (!couponCode.trim()) {
      setCouponMsg({ type: "err", text: "Enter a coupon code." });
      return;
    }
    setApplying(true);
    try {
      const result = await apiFetch<CouponValidationResult>("/api/v1/store/coupons/validate", {
        method: "POST",
        tenantHeaders: true,
        body: { code: couponCode.trim().toUpperCase(), cartTotalPaise: subtotal },
      });
      if (result.isValid) {
        setCouponDiscount(result.discountAmountPaise ?? 0);
        setCouponMsg({ type: "ok", text: `Coupon applied: -${formatRupees((result.discountAmountPaise ?? 0) / 100)}` });
      } else {
        setCouponDiscount(0);
        setCouponMsg({ type: "err", text: result.reason || result.message || "Invalid coupon" });
      }
    } catch (err) {
      setCouponDiscount(0);
      if (err instanceof ApiError && err.status === 401) {
        setCouponMsg({ type: "err", text: "Please sign in to apply a coupon." });
      } else {
        setCouponMsg({ type: "err", text: err instanceof Error ? err.message : "Could not apply coupon" });
      }
    } finally {
      setApplying(false);
    }
  }

  if (cartItems.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20 text-center">
        <svg className="w-20 h-20 text-navy/10 mx-auto mb-4" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
        </svg>
        <h1 className="text-2xl font-bold text-navy mb-2">Your Cart is Empty</h1>
        <p className="text-navy/50 text-sm mb-6">Looks like you haven't added anything to your cart yet.</p>
        <Link href="/" className="inline-block bg-gold text-white font-semibold px-8 py-3 rounded-lg hover:bg-gold-dark transition-colors">
          Start Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-navy" style={{ fontFamily: "var(--font-serif)" }}>
          Shopping Cart ({cartItems.length})
        </h1>
        <button
          type="button"
          onClick={clearCart}
          className="text-sm text-navy/40 hover:text-rose-500 transition-colors"
        >
          Clear Cart
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart items */}
        <div className="lg:col-span-2 space-y-4">
          {cartItems.map((item) => {
            const price = calculateProductPrice(item.product);
            const primaryImage = item.product.images.find((img) => img.isPrimary) ?? item.product.images[0];

            return (
              <div key={item.id} className="bg-white rounded-xl border border-gray-100 p-4 flex gap-4">
                <Link href={`/product/${item.product.id}`} className="w-24 h-24 md:w-32 md:h-32 rounded-lg overflow-hidden bg-warm-gray flex-shrink-0">
                  <img src={primaryImage?.url} alt={item.product.name} className="w-full h-full object-cover" />
                </Link>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link href={`/product/${item.product.id}`} className="font-semibold text-navy hover:text-gold transition-colors text-sm md:text-base line-clamp-1">
                        {item.product.name}
                      </Link>
                      <p className="text-xs text-navy/50 mt-0.5">
                        {item.product.purityLabel} {item.product.metalType} &middot; {item.product.netWeightGrams}g
                        {item.selectedSize && ` | Size ${item.selectedSize}`}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.id)}
                      className="text-navy/30 hover:text-rose-500 transition-colors p-1"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>
                  </div>

                  {/* Price breakdown mini */}
                  <div className="mt-2 text-xs text-navy/40">
                    Metal: {formatRupees(price.metalValue / 100)} + Making: {formatRupees(price.makingCharges / 100)}
                    {price.stoneCharges > 0 && ` + Stones: ${formatRupees(price.stoneCharges / 100)}`}
                    {` + GST: ${formatRupees(price.gst / 100)}`}
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center border border-gray-200 rounded-lg">
                      <button
                        type="button"
                        onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                        className="w-8 h-8 flex items-center justify-center text-navy/60 hover:text-navy transition-colors text-sm"
                      >
                        -
                      </button>
                      <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                        className="w-8 h-8 flex items-center justify-center text-navy/60 hover:text-navy transition-colors text-sm"
                      >
                        +
                      </button>
                    </div>
                    <span className="font-bold text-navy">
                      {formatRupees((price.total * item.quantity) / 100)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          <div className="flex items-center gap-2 px-1 py-2">
            <svg className="w-4 h-4 text-navy/30" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs text-navy/40">Prices are based on live metal rates and may update at checkout.</p>
          </div>
        </div>

        {/* Order summary */}
        <div>
          <div className="bg-white rounded-xl border border-gray-100 p-6 sticky top-20">
            <h2 className="font-bold text-navy mb-5">Order Summary</h2>

            {/* Coupon */}
            <div className="mb-5">
              <label className="block text-xs font-medium text-navy/60 mb-1.5">Coupon Code</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponMsg(null); }}
                  placeholder="Enter code"
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/20 uppercase"
                />
                <button
                  type="button"
                  onClick={handleApplyCoupon}
                  disabled={applying}
                  className="px-4 py-2 border border-gold text-gold text-sm font-medium rounded-lg hover:bg-gold hover:text-white transition-colors disabled:opacity-60"
                >
                  {applying ? "..." : "Apply"}
                </button>
              </div>
              {couponMsg && (
                <p className={cn(
                  "text-xs mt-1.5",
                  couponMsg.type === "ok" ? "text-emerald-600" : "text-rose-500"
                )}>
                  {couponMsg.text}
                </p>
              )}
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-navy/60">Subtotal</span>
                <span className="font-medium text-navy">{formatRupees(subtotal / 100)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount</span>
                  <span className="font-medium">-{formatRupees(discount / 100)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-navy/60">Shipping</span>
                <span className={cn("font-medium", shipping === 0 ? "text-emerald-600" : "text-navy")}>
                  {shipping === 0 ? "Free" : formatRupees(shipping / 100)}
                </span>
              </div>
              <div className="border-t border-gray-100 pt-3 flex justify-between">
                <span className="font-bold text-navy">Total</span>
                <span className="font-bold text-lg text-navy">{formatRupees(total / 100)}</span>
              </div>
            </div>

            <Link
              href="/checkout"
              className="block w-full bg-gold text-white text-center font-semibold py-3.5 rounded-lg hover:bg-gold-dark transition-colors mt-5"
            >
              Proceed to Checkout
            </Link>

            <Link
              href="/"
              className="block w-full text-center text-sm text-navy/50 hover:text-gold transition-colors mt-3"
            >
              Continue Shopping
            </Link>

            {/* Trust signals */}
            <div className="mt-5 pt-5 border-t border-gray-100 space-y-2">
              {["Secure SSL Checkout", "BIS Hallmarked Products", "15-Day Easy Returns"].map((trust) => (
                <div key={trust} className="flex items-center gap-2 text-xs text-navy/50">
                  <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  {trust}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
