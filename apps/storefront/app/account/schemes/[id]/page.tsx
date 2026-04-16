"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiFetch, ApiError } from "@/lib/api";
import { formatPrice, formatDate, cn } from "@/lib/utils";

interface Installment {
  id: string;
  installmentNumber: number;
  dueDate: string;
  amountPaise: number;
  status: string;
  paidDate?: string | null;
}

interface SchemeDetail {
  id: string;
  memberNumber: string;
  schemeType: "KITTY" | "GOLD_SAVINGS";
  schemeName: string;
  schemeDescription?: string | null;
  status: string;
  joinedDate: string;
  monthlyAmountPaise: number;
  durationMonths: number;
  bonusPercent?: number | null;
  bonusMonths?: number | null;
  totalPaidPaise: number;
  maturityDate?: string | null;
  maturityValuePaise: number;
  installments: Installment[];
}

export default function SchemeDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [scheme, setScheme] = useState<SchemeDetail | null>(null);
  const [error, setError] = useState("");
  const [paying, setPaying] = useState<string | null>(null);
  const [payMsg, setPayMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  async function loadScheme() {
    try {
      const data = await apiFetch<SchemeDetail>(`/api/v1/store/account/schemes/${id}`);
      setScheme(data);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        if (typeof window !== "undefined") window.location.href = "/auth/login";
        return;
      }
      setError(err instanceof Error ? err.message : "Could not load scheme");
    }
  }

  useEffect(() => {
    loadScheme();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handlePay(installmentId: string) {
    if (!scheme) return;
    setPaying(installmentId);
    setPayMsg(null);
    try {
      await apiFetch(`/api/v1/store/account/schemes/${scheme.id}/pay`, {
        method: "POST",
        body: { paymentMethod: "UPI" },
      });
      setPayMsg({ type: "ok", text: "Payment successful." });
      await loadScheme();
    } catch (err) {
      setPayMsg({ type: "err", text: err instanceof Error ? err.message : "Payment failed" });
    } finally {
      setPaying(null);
    }
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <h1 className="text-xl font-bold text-navy mb-2">Scheme Not Found</h1>
        <p className="text-sm text-navy/50 mb-4">{error}</p>
        <Link href="/account/schemes" className="text-gold font-medium hover:text-gold-dark transition-colors">
          Back to Schemes
        </Link>
      </div>
    );
  }

  if (!scheme) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-navy mb-6" style={{ fontFamily: "var(--font-serif)" }}>Scheme</h1>
        <div className="bg-white rounded-xl border border-gray-100 p-6 text-navy/50 text-sm">Loading...</div>
      </div>
    );
  }

  const totalInst = scheme.installments.length;
  const paid = scheme.installments.filter((i) => i.status === "PAID").length;
  const progress = totalInst > 0 ? Math.round((paid / totalInst) * 100) : 0;

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Link href="/account/schemes" className="text-navy/40 hover:text-gold transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold text-navy" style={{ fontFamily: "var(--font-serif)" }}>{scheme.schemeName}</h1>
      </div>

      {payMsg && (
        <div className={`text-sm rounded-lg p-3 mb-4 ${
          payMsg.type === "ok" ? "bg-emerald-50 border border-emerald-200 text-emerald-700" : "bg-red-50 border border-red-200 text-red-700"
        }`}>
          {payMsg.text}
        </div>
      )}

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
            <p className="text-lg font-bold text-gold">{formatPrice(scheme.maturityValuePaise)}</p>
          </div>
          <div>
            <p className="text-xs text-white/60">Status</p>
            <p className="text-lg font-bold capitalize">{scheme.status.toLowerCase()}</p>
          </div>
        </div>
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-white/60">{paid} of {totalInst} months</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2.5 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-gold rounded-full" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <h2 className="font-semibold text-navy mb-4">Installment Tracker</h2>
        {scheme.installments.length === 0 ? (
          <p className="text-sm text-navy/40">No installments yet.</p>
        ) : (
          <div className="space-y-2">
            {scheme.installments.map((inst) => {
              const status = inst.status.toLowerCase();
              const isDue = status === "pending" || status === "overdue";
              return (
                <div key={inst.id} className="flex items-center gap-4 py-3 border-b border-gray-50 last:border-0">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
                    status === "paid" ? "bg-emerald-50 text-emerald-600" :
                    status === "pending" ? "bg-gold/10 text-gold" :
                    status === "overdue" ? "bg-rose-50 text-rose-500" :
                    "bg-gray-100 text-navy/30"
                  )}>
                    {inst.installmentNumber}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-navy">Month {inst.installmentNumber}</p>
                    <p className="text-xs text-navy/40">Due: {formatDate(inst.dueDate)}</p>
                  </div>
                  <p className="text-sm font-medium text-navy">{formatPrice(inst.amountPaise)}</p>
                  <span className={cn(
                    "px-2.5 py-1 rounded text-[10px] font-semibold uppercase",
                    status === "paid" ? "bg-emerald-50 text-emerald-600" :
                    status === "pending" ? "bg-gold/10 text-gold-dark" :
                    status === "overdue" ? "bg-rose-50 text-rose-500" :
                    "bg-gray-100 text-navy/40"
                  )}>
                    {status}
                  </span>
                  {isDue && (
                    <button
                      type="button"
                      onClick={() => handlePay(inst.id)}
                      disabled={paying !== null}
                      className="px-3 py-1.5 bg-gold text-white text-xs font-semibold rounded-lg hover:bg-gold-dark transition-colors disabled:opacity-60"
                    >
                      {paying === inst.id ? "Paying..." : "Pay Now"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
