"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { mockAddresses } from "@/lib/mock-data";
import { calculateProductPrice, formatRupees, cn } from "@/lib/utils";
import AddressForm from "@/components/AddressForm";
import { apiFetch, ApiError } from "@/lib/api";
import type { Address } from "@/lib/types";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if (window.Razorpay) return resolve(true);
    const existing = document.getElementById("razorpay-checkout-js") as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve(true));
      existing.addEventListener("error", () => resolve(false));
      return;
    }
    const script = document.createElement("script");
    script.id = "razorpay-checkout-js";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

type CheckoutStep = 1 | 2 | 3;

interface InitiateCheckoutResponse {
  id: string;
  orderNumber?: string;
  totalPaise?: number;
  payment?: {
    razorpayOrderId?: string;
    keyId?: string;
    amountPaise?: number;
    currency?: string;
  };
  razorpayOrderId?: string;
  keyId?: string;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { cartItems, couponCode, couponDiscount, clearCart } = useStore();
  const [step, setStep] = useState<CheckoutStep>(1);
  const [addresses, setAddresses] = useState<Address[]>(mockAddresses);
  const [selectedAddressId, setSelectedAddressId] = useState<string>(addresses.find((a) => a.isDefault)?.id ?? "");
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>("razorpay");
  const [paymentError, setPaymentError] = useState("");

  // Load saved addresses from backend on mount; fall back to mockAddresses if signed out.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiFetch<Address[] | { items?: Address[] }>("/api/v1/store/addresses", {
          tenantHeaders: true,
        });
        if (cancelled) return;
        const items = Array.isArray(data) ? data : data.items ?? [];
        if (items.length > 0) {
          setAddresses(items);
          const def = items.find((a) => a.isDefault) ?? items[0];
          if (def?.id) setSelectedAddressId(def.id);
        }
      } catch {
        // Stay on mock addresses for guest checkout demo
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const subtotal = cartItems.reduce((sum, item) => {
    const price = calculateProductPrice(item.product);
    return sum + price.total * item.quantity;
  }, 0);
  const discount = couponDiscount;
  const shipping = subtotal >= 200000 ? 0 : 49900;
  const total = subtotal - discount + shipping;

  const selectedAddress = addresses.find((a) => a.id === selectedAddressId);

  async function completeOrder(orderId: string, externalPaymentId: string, gatewayResponse: Record<string, unknown>) {
    await apiFetch(`/api/v1/store/checkout/${orderId}/complete`, {
      method: "POST",
      tenantHeaders: true,
      body: { externalPaymentId, gatewayResponse },
    });
    clearCart();
    router.push(`/account/orders/${orderId}`);
  }

  async function handlePayment() {
    setPaymentError("");
    setPaymentProcessing(true);
    try {
      // 1. Fetch current cart from backend to get real cartId
      const cart = await apiFetch<{ id: string }>("/api/v1/store/cart", { tenantHeaders: true });

      // 2. Initiate checkout (creates an order in PENDING payment state)
      const order = await apiFetch<InitiateCheckoutResponse>(
        "/api/v1/store/checkout",
        {
          method: "POST",
          tenantHeaders: true,
          body: {
            cartId: cart.id,
            addressId: selectedAddressId,
            paymentMethod,
            couponCode: couponCode || undefined,
          },
        },
      );

      // 3. Cash on delivery -> mark complete server-side without a gateway round-trip.
      if (paymentMethod === "cod") {
        await completeOrder(order.id, `cod_${Date.now()}`, { mode: "cod" });
        return;
      }

      // 4. Razorpay / UPI / card flow.
      const razorpayOrderId = order.payment?.razorpayOrderId ?? order.razorpayOrderId;
      const keyId = order.payment?.keyId ?? order.keyId;
      const amountPaise = order.payment?.amountPaise ?? order.totalPaise ?? total;

      if (!razorpayOrderId || !keyId) {
        // Backend hasn't returned Razorpay credentials -- fall back to demo completion
        // so the flow still works in dev environments without payment keys configured.
        await completeOrder(order.id, `demo_${Date.now()}`, { mode: "demo", method: paymentMethod });
        return;
      }

      const sdkLoaded = await loadRazorpayScript();
      if (!sdkLoaded || typeof window === "undefined" || !window.Razorpay) {
        throw new Error("Could not load Razorpay. Check your network and try again.");
      }

      const rzp = new window.Razorpay({
        key: keyId,
        amount: amountPaise,
        currency: order.payment?.currency ?? "INR",
        order_id: razorpayOrderId,
        name: "CaratFlow",
        description: order.orderNumber ? `Order ${order.orderNumber}` : "Order",
        prefill: {
          name: selectedAddress?.fullName,
          contact: selectedAddress?.phone,
        },
        theme: { color: "#D4A853" },
        handler: async (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => {
          try {
            await completeOrder(order.id, response.razorpay_payment_id, {
              razorpayPaymentId: response.razorpay_payment_id,
              razorpayOrderId: response.razorpay_order_id,
              razorpaySignature: response.razorpay_signature,
              method: paymentMethod,
            });
          } catch (err) {
            setPaymentError(err instanceof Error ? err.message : "Payment captured but order completion failed. Contact support.");
            setPaymentProcessing(false);
          }
        },
        modal: {
          ondismiss: () => {
            setPaymentProcessing(false);
            setPaymentError("Payment cancelled. Your cart is intact -- try again when ready.");
          },
        },
      } as Record<string, unknown>);
      rzp.open();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setPaymentError("Please sign in to place an order.");
        setTimeout(() => router.push("/auth/login"), 1500);
      } else {
        setPaymentError(err instanceof Error ? err.message : "Payment failed. Please try again.");
      }
      setPaymentProcessing(false);
    }
  }

  if (cartItems.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20 text-center">
        <h1 className="text-2xl font-bold text-navy mb-2">Nothing to Checkout</h1>
        <p className="text-navy/50 text-sm mb-6">Your cart is empty.</p>
        <Link href="/" className="inline-block bg-gold text-white font-semibold px-8 py-3 rounded-lg hover:bg-gold-dark transition-colors">
          Start Shopping
        </Link>
      </div>
    );
  }

  const steps = [
    { num: 1 as const, label: "Shipping" },
    { num: 2 as const, label: "Review" },
    { num: 3 as const, label: "Payment" },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <h1 className="text-2xl font-bold text-navy mb-6" style={{ fontFamily: "var(--font-serif)" }}>Checkout</h1>

      {/* Steps */}
      <div className="flex items-center gap-4 mb-8">
        {steps.map((s, idx) => (
          <div key={s.num} className="flex items-center">
            <button
              type="button"
              onClick={() => s.num < step && setStep(s.num)}
              className={cn(
                "flex items-center gap-2",
                s.num <= step ? "text-navy" : "text-navy/30"
              )}
            >
              <span className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold",
                s.num < step ? "bg-gold text-white" :
                s.num === step ? "bg-navy text-white" :
                "bg-gray-200 text-navy/40"
              )}>
                {s.num < step ? (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                ) : s.num}
              </span>
              <span className="text-sm font-medium hidden sm:block">{s.label}</span>
            </button>
            {idx < steps.length - 1 && (
              <div className={cn("w-12 md:w-20 h-px mx-2", s.num < step ? "bg-gold" : "bg-gray-200")} />
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="lg:col-span-2">
          {/* Step 1: Shipping */}
          {step === 1 && (
            <div>
              <h2 className="text-lg font-bold text-navy mb-4">Shipping Address</h2>

              {!showAddressForm ? (
                <>
                  <div className="space-y-3 mb-4">
                    {addresses.map((addr) => (
                      <label
                        key={addr.id}
                        className={cn(
                          "flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all",
                          selectedAddressId === addr.id ? "border-gold bg-gold/5" : "border-gray-200 hover:border-gold/30"
                        )}
                      >
                        <input
                          type="radio"
                          name="address"
                          checked={selectedAddressId === addr.id}
                          onChange={() => setSelectedAddressId(addr.id)}
                          className="mt-1 accent-gold"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-sm text-navy">{addr.fullName}</span>
                            {addr.label && (
                              <span className="px-2 py-0.5 bg-navy/5 text-navy/50 text-[10px] font-medium rounded">{addr.label}</span>
                            )}
                            {addr.isDefault && (
                              <span className="px-2 py-0.5 bg-gold/10 text-gold-dark text-[10px] font-medium rounded">Default</span>
                            )}
                          </div>
                          <p className="text-sm text-navy/60">
                            {addr.addressLine1}{addr.addressLine2 && `, ${addr.addressLine2}`}
                          </p>
                          <p className="text-sm text-navy/60">
                            {addr.city}, {addr.state} - {addr.pincode}
                          </p>
                          <p className="text-xs text-navy/40 mt-1">{addr.phone}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddressForm(true)}
                    className="flex items-center gap-2 text-gold font-medium text-sm hover:text-gold-dark transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    Add New Address
                  </button>
                  <div className="mt-6">
                    <button
                      type="button"
                      onClick={() => selectedAddressId && setStep(2)}
                      disabled={!selectedAddressId}
                      className="bg-gold text-white font-semibold px-8 py-3 rounded-lg hover:bg-gold-dark transition-colors disabled:opacity-50"
                    >
                      Continue to Review
                    </button>
                  </div>
                </>
              ) : (
                <AddressForm
                  onSave={(addr) => {
                    setAddresses((prev) => [...prev, addr]);
                    setSelectedAddressId(addr.id);
                    setShowAddressForm(false);
                  }}
                  onCancel={() => setShowAddressForm(false)}
                />
              )}
            </div>
          )}

          {/* Step 2: Review */}
          {step === 2 && (
            <div>
              <h2 className="text-lg font-bold text-navy mb-4">Review Your Order</h2>

              {/* Address summary */}
              {selectedAddress && (
                <div className="bg-warm-white rounded-xl p-4 mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-navy">Shipping to</h3>
                    <button type="button" onClick={() => setStep(1)} className="text-xs text-gold hover:text-gold-dark transition-colors">
                      Change
                    </button>
                  </div>
                  <p className="text-sm text-navy/70">
                    {selectedAddress.fullName}, {selectedAddress.addressLine1}
                    {selectedAddress.addressLine2 && `, ${selectedAddress.addressLine2}`},
                    {selectedAddress.city}, {selectedAddress.state} - {selectedAddress.pincode}
                  </p>
                </div>
              )}

              {/* Items */}
              <div className="space-y-3 mb-6">
                {cartItems.map((item) => {
                  const price = calculateProductPrice(item.product);
                  const img = item.product.images.find((i) => i.isPrimary) ?? item.product.images[0];
                  return (
                    <div key={item.id} className="flex items-center gap-3 bg-white rounded-lg border border-gray-100 p-3">
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-warm-gray flex-shrink-0">
                        <img src={img?.url} alt={item.product.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-navy truncate">{item.product.name}</p>
                        <p className="text-xs text-navy/50">Qty: {item.quantity}{item.selectedSize && ` | Size: ${item.selectedSize}`}</p>
                      </div>
                      <span className="font-semibold text-sm text-navy">{formatRupees((price.total * item.quantity) / 100)}</span>
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setStep(3)}
                className="bg-gold text-white font-semibold px-8 py-3 rounded-lg hover:bg-gold-dark transition-colors"
              >
                Continue to Payment
              </button>
            </div>
          )}

          {/* Step 3: Payment */}
          {step === 3 && (
            <div>
              <h2 className="text-lg font-bold text-navy mb-4">Payment</h2>
              <div className="space-y-3 mb-6">
                {[
                  { id: "razorpay", label: "Razorpay (UPI, Cards, NetBanking, Wallets)", desc: "All payment methods" },
                  { id: "upi", label: "UPI (GPay, PhonePe, Paytm)", desc: "Pay using any UPI app" },
                  { id: "cod", label: "Cash on Delivery", desc: "Pay when you receive (Rs 50 extra)" },
                ].map((method) => (
                  <label
                    key={method.id}
                    className={cn(
                      "flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all",
                      paymentMethod === method.id ? "border-gold bg-gold/5" : "border-gray-200 hover:border-gold/30",
                    )}
                  >
                    <input
                      type="radio"
                      name="payment"
                      checked={paymentMethod === method.id}
                      onChange={() => setPaymentMethod(method.id)}
                      className="mt-1 accent-gold"
                    />
                    <div>
                      <p className="text-sm font-semibold text-navy">{method.label}</p>
                      <p className="text-xs text-navy/50">{method.desc}</p>
                    </div>
                  </label>
                ))}
              </div>

              {paymentError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-4">
                  {paymentError}
                </div>
              )}

              <button
                type="button"
                onClick={handlePayment}
                disabled={paymentProcessing}
                className="bg-gold text-white font-semibold px-8 py-3.5 rounded-lg hover:bg-gold-dark transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {paymentProcessing ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Processing...
                  </>
                ) : (
                  `Pay ${formatRupees(total / 100)}`
                )}
              </button>
            </div>
          )}
        </div>

        {/* Order summary sidebar */}
        <div>
          <div className="bg-white rounded-xl border border-gray-100 p-6 sticky top-20">
            <h2 className="font-bold text-navy mb-4">Order Summary</h2>
            <div className="space-y-2 text-sm mb-4">
              {cartItems.map((item) => {
                const price = calculateProductPrice(item.product);
                return (
                  <div key={item.id} className="flex justify-between">
                    <span className="text-navy/60 truncate mr-2">{item.product.name} x{item.quantity}</span>
                    <span className="font-medium text-navy flex-shrink-0">{formatRupees((price.total * item.quantity) / 100)}</span>
                  </div>
                );
              })}
            </div>
            <div className="border-t border-gray-100 pt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-navy/60">Subtotal</span>
                <span className="font-medium">{formatRupees(subtotal / 100)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount ({couponCode})</span>
                  <span>-{formatRupees(discount / 100)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-navy/60">Shipping</span>
                <span className={shipping === 0 ? "text-emerald-600 font-medium" : "font-medium"}>
                  {shipping === 0 ? "Free" : formatRupees(shipping / 100)}
                </span>
              </div>
              <div className="border-t border-gray-100 pt-2 flex justify-between">
                <span className="font-bold text-navy">Total</span>
                <span className="font-bold text-lg text-navy">{formatRupees(total / 100)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
