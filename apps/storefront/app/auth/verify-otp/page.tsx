"use client";

import { useState, useRef, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AUTH_API, TENANT_SLUG } from "@/lib/constants";
import { setTokens } from "@/lib/api";

type AuthTokens = { accessToken: string; refreshToken?: string };

function VerifyOtpPageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const identifier = params.get("phone") ?? params.get("email") ?? params.get("identifier") ?? "";
  const purpose = params.get("purpose") ?? "PHONE_VERIFICATION";

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  function handleChange(index: number, value: string) {
    if (!/^\d?$/.test(value)) return;
    const next = [...otp];
    next[index] = value;
    setOtp(next);
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    const code = otp.join("");
    if (code.length !== 6) {
      setError("Please enter the 6-digit code");
      return;
    }
    if (!identifier) {
      setError("Missing phone/email. Please restart the verification flow.");
      return;
    }
    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        identifier,
        otp: code,
        purpose,
      };
      if (purpose === "LOGIN") body.tenantSlug = TENANT_SLUG;
      const res = await fetch(`${AUTH_API}/otp/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        throw new Error(data?.error?.message || data?.message || "OTP verification failed");
      }
      const tokens = data.data as AuthTokens | { verified?: boolean } | undefined;
      if (tokens && "accessToken" in tokens && tokens.accessToken) {
        setTokens(tokens.accessToken, tokens.refreshToken);
      }
      setSuccess("Verified. Redirecting...");
      router.push("/account");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setError("");
    setSuccess("");
    if (!identifier) {
      setError("Missing phone/email. Please restart the verification flow.");
      return;
    }
    try {
      const res = await fetch(`${AUTH_API}/otp/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, purpose }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        throw new Error(data?.error?.message || data?.message || "Could not resend OTP");
      }
      setSuccess("A new OTP has been sent.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-navy" style={{ fontFamily: "var(--font-serif)" }}>Verify OTP</h1>
          <p className="text-sm text-navy/50 mt-1">
            Enter the 6-digit code sent to {identifier ? <span className="font-medium text-navy/80">{identifier}</span> : "your phone"}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-4">{error}</div>}
          {success && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-lg p-3 mb-4">{success}</div>}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex justify-center gap-2.5">
              {otp.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => { inputRefs.current[idx] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  className="w-12 h-14 border border-gray-200 rounded-lg text-center text-xl font-bold text-navy focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20"
                />
              ))}
            </div>

            <button type="submit" disabled={loading} className="w-full bg-gold text-white font-semibold py-3 rounded-lg hover:bg-gold-dark transition-colors disabled:opacity-60">
              {loading ? "Verifying..." : "Verify"}
            </button>
          </form>

          <div className="text-center mt-4">
            <p className="text-xs text-navy/40">
              Didn't receive the code?{" "}
              <button type="button" onClick={handleResend} className="text-gold font-medium hover:text-gold-dark transition-colors">
                Resend OTP
              </button>
            </p>
          </div>
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

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={<div className="min-h-[80vh]" />}>
      <VerifyOtpPageInner />
    </Suspense>
  );
}
