"use client";

import { useState, useRef } from "react";
import Link from "next/link";

export default function VerifyOtpPage() {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const code = otp.join("");
    if (code.length === 6) {
      alert(`Verifying OTP: ${code}. Integration pending.`);
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-navy" style={{ fontFamily: "var(--font-serif)" }}>Verify OTP</h1>
          <p className="text-sm text-navy/50 mt-1">Enter the 6-digit code sent to your phone</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
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

            <button type="submit" className="w-full bg-gold text-white font-semibold py-3 rounded-lg hover:bg-gold-dark transition-colors">
              Verify
            </button>
          </form>

          <div className="text-center mt-4">
            <p className="text-xs text-navy/40">
              Didn't receive the code?{" "}
              <button type="button" className="text-gold font-medium hover:text-gold-dark transition-colors">
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
