"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { mockSchemes } from "@/lib/mock-data";
import { formatPrice, formatDate, cn } from "@/lib/utils";

export default function SchemeDetailPage() {
  const params = useParams();
  const scheme = mockSchemes.find((s) => s.id === params.id);

  if (!scheme) {
    return (
      <div className="text-center py-16">
        <h1 className="text-xl font-bold text-navy mb-2">Scheme Not Found</h1>
        <Link href="/account/schemes" className="text-gold font-medium hover:text-gold-dark transition-colors">
          Back to Schemes
        </Link>
      </div>
    );
  }

  const progress = (scheme.paidMonths / scheme.totalMonths) * 100;

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Link href="/account/schemes" className="text-navy/40 hover:text-gold transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold text-navy" style={{ fontFamily: "var(--font-serif)" }}>{scheme.name}</h1>
      </div>

      {/* Overview */}
      <div className="bg-gradient-to-br from-navy to-navy-light rounded-2xl p-6 text-white mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div>
            <p className="text-xs text-white/60">Monthly</p>
            <p className="text-lg font-bold">{formatPrice(scheme.monthlyAmountPaise)}</p>
          </div>
          <div>
            <p className="text-xs text-white/60">Total Paid</p>
            <p className="text-lg font-bold">{formatPrice(scheme.totalPaidPaise)}</p>
          </div>
          <div>
            <p className="text-xs text-white/60">Maturity Value</p>
            <p className="text-lg font-bold text-gold">{formatPrice(scheme.maturityAmountPaise)}</p>
          </div>
          <div>
            <p className="text-xs text-white/60">Status</p>
            <p className="text-lg font-bold capitalize">{scheme.status}</p>
          </div>
        </div>
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-white/60">{scheme.paidMonths} of {scheme.totalMonths} months</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-2.5 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-gold rounded-full" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      {/* Installment tracker */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <h2 className="font-semibold text-navy mb-4">Installment Tracker</h2>
        <div className="space-y-2">
          {scheme.installments.map((inst) => (
            <div key={inst.month} className="flex items-center gap-4 py-3 border-b border-gray-50 last:border-0">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
                inst.status === "paid" ? "bg-emerald-50 text-emerald-600" :
                inst.status === "due" ? "bg-gold/10 text-gold" :
                inst.status === "overdue" ? "bg-rose-50 text-rose-500" :
                "bg-gray-100 text-navy/30"
              )}>
                {inst.month}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-navy">Month {inst.month}</p>
                <p className="text-xs text-navy/40">Due: {formatDate(inst.dueDate)}</p>
              </div>
              <p className="text-sm font-medium text-navy">{formatPrice(inst.amountPaise)}</p>
              <span className={cn(
                "px-2.5 py-1 rounded text-[10px] font-semibold uppercase",
                inst.status === "paid" ? "bg-emerald-50 text-emerald-600" :
                inst.status === "due" ? "bg-gold/10 text-gold-dark" :
                inst.status === "overdue" ? "bg-rose-50 text-rose-500" :
                "bg-gray-100 text-navy/40"
              )}>
                {inst.status}
              </span>
              {inst.status === "due" && (
                <button type="button" className="px-3 py-1.5 bg-gold text-white text-xs font-semibold rounded-lg hover:bg-gold-dark transition-colors">
                  Pay Now
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {scheme.bonusMonths > 0 && (
        <div className="mt-4 bg-cream rounded-xl p-4 border border-gold/10 flex items-center gap-3">
          <svg className="w-6 h-6 text-gold flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
          </svg>
          <div>
            <p className="font-semibold text-sm text-navy">Bonus: {scheme.bonusMonths} month free!</p>
            <p className="text-xs text-navy/60">
              Complete all {scheme.totalMonths} payments to receive {formatPrice(scheme.monthlyAmountPaise)} as bonus credit.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
