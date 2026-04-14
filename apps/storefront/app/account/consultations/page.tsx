"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

type Consultation = {
  id: string;
  status: string;
  scheduledAt?: string | null;
  requestedAt?: string | null;
  meetingUrl?: string | null;
  preferredLang?: string;
  notes?: string | null;
};

const STATUS_COLORS: Record<string, string> = {
  REQUESTED: "bg-gray-100 text-navy/60",
  SCHEDULED: "bg-blue-50 text-blue-600",
  IN_PROGRESS: "bg-emerald-50 text-emerald-600",
  COMPLETED: "bg-indigo-50 text-indigo-600",
  CANCELLED: "bg-rose-50 text-rose-600",
  NO_SHOW: "bg-amber-50 text-amber-600",
};

export default function ConsultationsPage() {
  const [items, setItems] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
        const res = await fetch("/api/v1/crm/video-consultation/list?page=1&limit=50", {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (!res.ok) {
          setItems([]);
          return;
        }
        const data = await res.json();
        const rows: Consultation[] = (data?.data?.items ?? data?.items ?? []) as Consultation[];
        setItems(rows);
      } catch {
        setError("Could not load consultations.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-navy" style={{ fontFamily: "var(--font-serif)" }}>
          My Consultations
        </h1>
        <Link
          href="/consultation/request"
          className="h-9 px-4 inline-flex items-center rounded-lg bg-gold text-white text-sm font-medium hover:bg-gold-dark transition-colors"
        >
          New Request
        </Link>
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-navy/50">Loading...</div>
      ) : error ? (
        <div className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-sm text-rose-700">{error}</div>
      ) : items.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-navy/40 mb-4">You have no consultations yet.</p>
          <Link href="/consultation/request" className="text-gold font-medium hover:text-gold-dark transition-colors">
            Book Your First Live Consultation
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((c) => {
            const color = STATUS_COLORS[c.status] ?? STATUS_COLORS.REQUESTED;
            const canJoin = (c.status === "SCHEDULED" || c.status === "IN_PROGRESS") && c.meetingUrl;
            return (
              <div key={c.id} className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-navy">
                      {c.scheduledAt ? `Scheduled: ${formatDate(c.scheduledAt)}` : `Requested: ${formatDate(c.requestedAt ?? "")}`}
                    </p>
                    <p className="text-xs text-navy/50 mt-0.5">
                      Language: {c.preferredLang?.toUpperCase() ?? "EN"}
                    </p>
                  </div>
                  <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded ${color}`}>
                    {c.status.replace("_", " ")}
                  </span>
                </div>

                {c.notes && (
                  <p className="text-xs text-navy/60 mt-2 whitespace-pre-wrap">{c.notes}</p>
                )}

                {canJoin && c.meetingUrl ? (
                  <a
                    href={c.meetingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex h-10 items-center rounded-lg bg-emerald-500 text-white px-5 text-sm font-medium hover:bg-emerald-600 transition-colors"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                    Join Meeting
                  </a>
                ) : c.status === "REQUESTED" ? (
                  <p className="mt-2 text-xs text-navy/40">We'll contact you to confirm a slot.</p>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
