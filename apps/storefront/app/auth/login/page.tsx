"use client";

import { useState } from "react";
import Link from "next/link";

export default function LoginPage() {
  const [loginMethod, setLoginMethod] = useState<"email" | "phone">("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    alert("Login integration pending. This is a UI placeholder.");
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
          <h1 className="text-2xl font-bold text-navy" style={{ fontFamily: "var(--font-serif)" }}>Welcome Back</h1>
          <p className="text-sm text-navy/50 mt-1">Sign in to your CaratFlow account</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          {/* Social login */}
          <div className="space-y-2.5 mb-6">
            {[
              { label: "Continue with Google", bg: "bg-white border border-gray-200 text-navy hover:bg-gray-50" },
              { label: "Continue with Facebook", bg: "bg-[#1877F2] text-white hover:bg-[#166FE5]" },
              { label: "Continue with Apple", bg: "bg-black text-white hover:bg-gray-900" },
            ].map((social) => (
              <button
                key={social.label}
                type="button"
                className={`w-full py-2.5 rounded-lg text-sm font-medium transition-colors ${social.bg}`}
              >
                {social.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-navy/40">or</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Login method tabs */}
          <div className="flex gap-1 bg-warm-gray rounded-lg p-1 mb-5">
            <button
              type="button"
              onClick={() => setLoginMethod("email")}
              className={`flex-1 py-2 rounded-md text-xs font-medium transition-colors ${
                loginMethod === "email" ? "bg-white text-navy shadow-sm" : "text-navy/50"
              }`}
            >
              Email
            </button>
            <button
              type="button"
              onClick={() => setLoginMethod("phone")}
              className={`flex-1 py-2 rounded-md text-xs font-medium transition-colors ${
                loginMethod === "phone" ? "bg-white text-navy shadow-sm" : "text-navy/50"
              }`}
            >
              Phone (OTP)
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {loginMethod === "email" ? (
              <>
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
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-navy/60">Password</label>
                    <Link href="/auth/forgot-password" className="text-xs text-gold hover:text-gold-dark transition-colors">
                      Forgot?
                    </Link>
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Enter your password"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/20"
                  />
                </div>
              </>
            ) : (
              <div>
                <label className="block text-xs font-medium text-navy/60 mb-1">Phone Number</label>
                <div className="flex gap-2">
                  <span className="flex items-center px-3 border border-gray-200 rounded-lg text-sm text-navy/60 bg-warm-gray">
                    +91
                  </span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    required
                    placeholder="98765 43210"
                    maxLength={10}
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/20"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-gold text-white font-semibold py-3 rounded-lg hover:bg-gold-dark transition-colors"
            >
              {loginMethod === "email" ? "Sign In" : "Send OTP"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-navy/50 mt-5">
          Don't have an account?{" "}
          <Link href="/auth/register" className="text-gold font-medium hover:text-gold-dark transition-colors">
            Create Account
          </Link>
        </p>
      </div>
    </div>
  );
}
