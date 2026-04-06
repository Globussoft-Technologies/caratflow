"use client";

import Link from "next/link";
import { formatPrice, cn } from "@/lib/utils";
import type { Scheme } from "@/lib/types";

interface SchemeProgressCardProps {
  scheme: Scheme;
}

export default function SchemeProgressCard({ scheme }: SchemeProgressCardProps) {
  const progress = (scheme.paidMonths / scheme.totalMonths) * 100;
  const typeLabel = scheme.type === "kitty" ? "Kitty Plan" : "Gold Savings";

  return (
    <Link
      href={`/account/schemes/${scheme.id}`}
      className="block bg-white rounded-xl border border-gray-100 p-5 hover:border-gold/30 hover:shadow-md transition-all"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-[10px] font-semibold text-gold uppercase tracking-wider">{typeLabel}</p>
          <h4 className="font-bold text-navy">{scheme.name}</h4>
        </div>
        <span className={cn(
          "px-2 py-0.5 rounded text-[10px] font-semibold uppercase",
          scheme.status === "active" ? "bg-emerald-50 text-emerald-600" :
          scheme.status === "matured" ? "bg-gold/10 text-gold-dark" :
          "bg-gray-100 text-navy/40"
        )}>
          {scheme.status}
        </span>
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-navy/60">{scheme.paidMonths} of {scheme.totalMonths} months</span>
          <span className="font-medium text-navy">{Math.round(progress)}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-gold to-gold-light rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-[10px] text-navy/40">Monthly Amount</p>
          <p className="font-semibold text-navy">{formatPrice(scheme.monthlyAmountPaise)}</p>
        </div>
        <div>
          <p className="text-[10px] text-navy/40">Total Paid</p>
          <p className="font-semibold text-navy">{formatPrice(scheme.totalPaidPaise)}</p>
        </div>
      </div>

      {scheme.bonusMonths > 0 && (
        <div className="mt-3 px-2.5 py-1.5 bg-cream rounded-lg text-[10px] text-gold-dark font-medium flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
          </svg>
          {scheme.bonusMonths} bonus month included
        </div>
      )}
    </Link>
  );
}
