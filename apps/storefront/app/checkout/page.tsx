"use client";

import { useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { mockAddresses } from "@/lib/mock-data";
import { calculateProductPrice, formatRupees, cn } from "@/lib/utils";
import AddressForm from "@/components/AddressForm";
import type { Address } from "@/lib/types";

type CheckoutStep = 1 | 2 | 3;

export default function CheckoutPage() {
  const { cartItems, couponCode, couponDiscount } = useStore();
  const [step, setStep] = useState<CheckoutStep>(1);
  const [addresses, setAddresses] = useState<Address[]>(mockAddresses);
  const [selectedAddressId, setSelectedAddressId] = useState<string>(addresses.find((a) => a.isDefault)?.id ?? "");
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);

  const subtotal = cartItems.reduce((sum, item) => {
    const price = calculateProductPrice(item.product);
    return sum + price.total * item.quantity;
  }, 0);
  const discount = couponDiscount;
  const shipping = subtotal >= 200000 ? 0 : 49900;
  const total = subtotal - discount + shipping;

  const selectedAddress = addresses.find((a) => a.id === selectedAddressId);

  function handlePayment() {
    setPaymentProcessing(true);
    // Simulated payment
    setTimeout(() => {
      setPaymentProcessing(false);
      alert("Payment gateway integration (Razorpay/Stripe) will be connected here. This is a placeholder.");
    }, 1500);
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
                    className="flex items-start gap-3 p-4 rounded-xl border border-gray-200 hover:border-gold/30 cursor-pointer transition-all"
                  >
                    <input type="radio" name="payment" defaultChecked={method.id === "razorpay"} className="mt-1 accent-gold" />
                    <div>
                      <p className="text-sm font-semibold text-navy">{method.label}</p>
                      <p className="text-xs text-navy/50">{method.desc}</p>
                    </div>
                  </label>
                ))}
              </div>

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
