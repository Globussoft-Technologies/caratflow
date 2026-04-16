"use client";

import { useState } from "react";
import { CRM_API, TENANT_ID } from "@/lib/constants";

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [status, setStatus] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    if (!form.email.includes("@")) {
      setStatus({ type: "err", text: "Enter a valid email." });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${CRM_API}/newsletter/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-tenant-id": TENANT_ID },
        body: JSON.stringify({
          email: form.email,
          name: form.name || undefined,
          source: `contact: ${form.message.slice(0, 200)}`,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || (data && data.success === false)) {
        throw new Error(data?.error?.message || "Could not send message");
      }
      setStatus({ type: "ok", text: "Thanks! We will get back to you within 1 business day." });
      setForm({ name: "", email: "", message: "" });
    } catch (err) {
      setStatus({ type: "err", text: err instanceof Error ? err.message : "Could not send message" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <h1 className="text-3xl font-bold text-navy mb-2" style={{ fontFamily: "var(--font-serif)" }}>
        Contact Us
      </h1>
      <p className="text-navy/60 text-sm mb-8">
        We typically reply within one business day. For urgent order issues please call.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-gold mb-1">Customer care</p>
          <p className="text-sm text-navy"><a href="tel:+918000800800" className="hover:text-gold">+91 80 0080 0800</a></p>
          <p className="text-xs text-navy/40 mt-1">Mon - Sat, 09:00 - 21:00</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-gold mb-1">Email</p>
          <p className="text-sm text-navy"><a href="mailto:hello@caratflow.com" className="hover:text-gold">hello@caratflow.com</a></p>
          <p className="text-xs text-navy/40 mt-1">For orders, returns, or sizing</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-gold mb-1">WhatsApp</p>
          <p className="text-sm text-navy"><a href="https://wa.me/918000800800" className="hover:text-gold">+91 80 0080 0800</a></p>
          <p className="text-xs text-navy/40 mt-1">Fastest channel for live help</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
        <h2 className="font-semibold text-navy">Send us a message</h2>
        {status && (
          <div className={`text-sm rounded-lg p-3 ${status.type === "ok" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
            {status.text}
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-navy/60 mb-1">Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/20"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-navy/60 mb-1">Email *</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/20"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-navy/60 mb-1">How can we help? *</label>
          <textarea
            required
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            rows={4}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/20"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="px-6 py-2.5 bg-gold text-white text-sm font-semibold rounded-lg hover:bg-gold-dark disabled:opacity-60"
        >
          {submitting ? "Sending..." : "Send Message"}
        </button>
      </form>
    </div>
  );
}
