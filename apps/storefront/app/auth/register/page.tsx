"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AUTH_API, TENANT_SLUG } from "@/lib/constants";
import { setTokens } from "@/lib/api";

type AuthTokens = { accessToken: string; refreshToken?: string };

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", confirmPassword: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    const parts = form.name.trim().split(/\s+/);
    const firstName = parts[0] || form.name.trim();
    const lastName = parts.slice(1).join(" ") || firstName;
    setLoading(true);
    try {
      const res = await fetch(`${AUTH_API}/register/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          firstName,
          lastName,
          tenantSlug: TENANT_SLUG,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data?.error?.message || data?.message || "Registration failed");
      }
      const tokens = data.data as AuthTokens | undefined;
      if (tokens?.accessToken) {
        setTokens(tokens.accessToken, tokens.refreshToken);
      }
      // Send OTP for phone verification (non-blocking)
      if (form.phone) {
        try {
          await fetch(`${AUTH_API}/otp/send`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ identifier: form.phone, purpose: "PHONE_VERIFICATION" }),
          });
          router.push(`/auth/verify-otp?phone=${encodeURIComponent(form.phone)}&purpose=PHONE_VERIFICATION`);
          return;
        } catch {
          // non-fatal
        }
      }
      router.push("/account");
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
          <div className="w-12 h-12 bg-gold rounded-xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l2.5 5.5L20 9.5l-4 4 1 5.5L12 16.5 6.5 19l1-5.5-4-4 5.5-1L12 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-navy" style={{ fontFamily: "var(--font-serif)" }}>Create Account</h1>
          <p className="text-sm text-navy/50 mt-1">Join CaratFlow for exclusive jewelry offers</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-4">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-navy/60 mb-1">Full Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                placeholder="Priya Sharma"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/20"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-navy/60 mb-1">Email *</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                placeholder="you@example.com"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/20"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-navy/60 mb-1">Phone Number *</label>
              <div className="flex gap-2">
                <span className="flex items-center px-3 border border-gray-200 rounded-lg text-sm text-navy/60 bg-warm-gray">+91</span>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                  required
                  placeholder="98765 43210"
                  maxLength={10}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/20"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-navy/60 mb-1">Password *</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                minLength={8}
                placeholder="Min 8 characters"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/20"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-navy/60 mb-1">Confirm Password *</label>
              <input
                type="password"
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                required
                placeholder="Confirm your password"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/20"
              />
            </div>

            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" required className="w-4 h-4 rounded border-gray-300 text-gold accent-gold mt-0.5" />
              <span className="text-xs text-navy/60">
                I agree to the{" "}
                <Link href="/terms" className="text-gold hover:text-gold-dark">Terms of Service</Link> and{" "}
                <Link href="/privacy" className="text-gold hover:text-gold-dark">Privacy Policy</Link>
              </span>
            </label>

            <button type="submit" disabled={loading} className="w-full bg-gold text-white font-semibold py-3 rounded-lg hover:bg-gold-dark transition-colors disabled:opacity-60">
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-navy/50 mt-5">
          Already have an account?{" "}
          <Link href="/auth/login" className="text-gold font-medium hover:text-gold-dark transition-colors">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
