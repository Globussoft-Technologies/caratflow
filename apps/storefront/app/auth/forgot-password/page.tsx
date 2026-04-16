"use client";

import { useState } from "react";
import Link from "next/link";
import { API_BASE_URL, TENANT_SLUG } from "@/lib/constants";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, tenantSlug: TENANT_SLUG }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || (data && data.success === false)) {
        throw new Error(data?.error?.message || data?.message || "Could not send reset link");
      }
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-navy" style={{ fontFamily: "var(--font-serif)" }}>Reset Password</h1>
          <p className="text-sm text-navy/50 mt-1">Enter your email and we'll send you reset instructions</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          {sent ? (
            <div className="text-center py-6">
              <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
              </div>
              <h3 className="font-semibold text-navy mb-1">Check Your Email</h3>
              <p className="text-sm text-navy/50 mb-4">
                If <strong>{email}</strong> matches an account, we've sent a password reset link.
              </p>
              <Link href="/auth/login" className="text-gold font-medium text-sm hover:text-gold-dark transition-colors">
                Back to Sign In
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">{error}</div>
              )}
              <div>
                <label className="block text-xs font-medium text-navy/60 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/20"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gold text-white font-semibold py-3 rounded-lg hover:bg-gold-dark transition-colors disabled:opacity-60"
              >
                {loading ? "Sending..." : "Send Reset Link"}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-sm text-navy/50 mt-5">
          <Link href="/auth/login" className="text-gold font-medium hover:text-gold-dark transition-colors">
            Back to Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
