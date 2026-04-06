"use client";

import { mockSchemes } from "@/lib/mock-data";
import SchemeProgressCard from "@/components/SchemeProgressCard";

export default function SchemesPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-navy mb-6" style={{ fontFamily: "var(--font-serif)" }}>My Schemes</h1>

      {mockSchemes.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
          <p className="text-navy/40 mb-2">No active schemes</p>
          <p className="text-sm text-navy/30">Join a Gold Savings or Kitty scheme to start saving</p>
        </div>
      ) : (
        <div className="space-y-4">
          {mockSchemes.map((scheme) => (
            <SchemeProgressCard key={scheme.id} scheme={scheme} />
          ))}
        </div>
      )}

      {/* Scheme info */}
      <div className="mt-8 bg-cream rounded-xl p-6 border border-gold/10">
        <h3 className="font-bold text-navy mb-3">How Gold Savings Scheme Works</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="font-semibold text-navy mb-1">1. Choose Your Plan</p>
            <p className="text-navy/60">Select a monthly amount starting from Rs 1,000. Choose an 11-month plan.</p>
          </div>
          <div>
            <p className="font-semibold text-navy mb-1">2. Pay Monthly</p>
            <p className="text-navy/60">Pay your installment every month via UPI, card, or auto-debit.</p>
          </div>
          <div>
            <p className="font-semibold text-navy mb-1">3. Get Gold Bonus</p>
            <p className="text-navy/60">After 11 months, we add 1 month's amount as bonus. Redeem for jewelry!</p>
          </div>
        </div>
      </div>
    </div>
  );
}
