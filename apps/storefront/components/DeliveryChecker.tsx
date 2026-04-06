"use client";

import { useState } from "react";
import type { DeliveryEstimate } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function DeliveryChecker() {
  const [pincode, setPincode] = useState("");
  const [estimate, setEstimate] = useState<DeliveryEstimate | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function checkDelivery() {
    if (pincode.length !== 6 || !/^\d{6}$/.test(pincode)) {
      setError("Please enter a valid 6-digit pincode");
      return;
    }
    setLoading(true);
    setError("");

    // Mock API call
    await new Promise((resolve) => setTimeout(resolve, 500));

    const available = parseInt(pincode[0]!) < 8;
    const days = 3 + Math.floor(Math.random() * 5);
    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + days);

    setEstimate({
      pincode,
      available,
      estimatedDays: days,
      estimatedDate: deliveryDate.toISOString(),
      shippingCostPaise: 0,
      codAvailable: available && parseInt(pincode[0]!) < 5,
    });
    setLoading(false);
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <h4 className="text-sm font-semibold text-navy mb-2 flex items-center gap-1.5">
        <svg className="w-4 h-4 text-navy/50" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
        </svg>
        Check Delivery
      </h4>
      <div className="flex gap-2">
        <input
          type="text"
          value={pincode}
          onChange={(e) => {
            setPincode(e.target.value.replace(/\D/g, "").slice(0, 6));
            setEstimate(null);
            setError("");
          }}
          placeholder="Enter pincode"
          maxLength={6}
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/20"
        />
        <button
          type="button"
          onClick={checkDelivery}
          disabled={loading}
          className="px-4 py-2 bg-navy text-white text-sm font-medium rounded-lg hover:bg-navy-light transition-colors disabled:opacity-50"
        >
          {loading ? "..." : "Check"}
        </button>
      </div>
      {error && <p className="text-xs text-rose-500 mt-2">{error}</p>}
      {estimate && (
        <div className={cn("mt-3 text-sm", estimate.available ? "text-emerald-600" : "text-rose-500")}>
          {estimate.available ? (
            <>
              <p className="font-medium flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                Delivery available to {estimate.pincode}
              </p>
              <p className="text-xs text-navy/60 mt-1">
                Estimated delivery in {estimate.estimatedDays} days (by{" "}
                {new Date(estimate.estimatedDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })})
              </p>
              <p className="text-xs text-navy/60">
                {estimate.shippingCostPaise === 0 ? "Free Shipping" : `Shipping: Rs ${estimate.shippingCostPaise / 100}`}
                {estimate.codAvailable && " | COD Available"}
              </p>
            </>
          ) : (
            <p className="font-medium">Delivery not available to this pincode</p>
          )}
        </div>
      )}
    </div>
  );
}
