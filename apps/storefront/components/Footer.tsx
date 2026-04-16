"use client";

import { useState } from "react";
import Link from "next/link";
import { CRM_API, TENANT_ID } from "@/lib/constants";

const footerLinks = {
  "Shop Jewelry": [
    { label: "Rings", href: "/category/rings" },
    { label: "Necklaces", href: "/category/necklaces" },
    { label: "Earrings", href: "/category/earrings" },
    { label: "Bangles", href: "/category/bangles" },
    { label: "Bracelets", href: "/category/bracelets" },
    { label: "Pendants", href: "/category/pendants" },
    { label: "Mangalsutra", href: "/category/mangalsutra" },
  ],
  "Customer Service": [
    { label: "Track Order", href: "/account/orders" },
    { label: "Shipping Policy", href: "/shipping" },
    { label: "Return & Exchange", href: "/returns" },
    { label: "FAQ", href: "/faq" },
    { label: "Size Guide", href: "/size-guide" },
    { label: "Jewelry Care", href: "/jewelry-care" },
  ],
  Company: [
    { label: "About CaratFlow", href: "/about" },
    { label: "Store Locator", href: "/store-locator" },
    { label: "BIS Hallmark", href: "/bis-hallmark" },
    { label: "Gold Savings Scheme", href: "/account/schemes" },
    { label: "Careers", href: "/careers" },
    { label: "Contact Us", href: "/contact" },
  ],
};

export default function Footer() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubscribe(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    if (!email.includes("@")) {
      setStatus({ type: "err", text: "Enter a valid email." });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${CRM_API}/newsletter/subscribe`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": TENANT_ID,
        },
        body: JSON.stringify({ email, source: "footer" }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || (data && data.success === false)) {
        throw new Error(data?.error?.message || "Could not subscribe");
      }
      setStatus({ type: "ok", text: "Subscribed! Check your inbox." });
      setEmail("");
    } catch (err) {
      setStatus({ type: "err", text: err instanceof Error ? err.message : "Could not subscribe" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <footer className="bg-navy text-white">
      {/* Newsletter */}
      <div className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-lg font-bold mb-1">Stay Updated</h3>
              <p className="text-gray-400 text-sm">Get exclusive offers, new arrivals & gold rate alerts</p>
            </div>
            <form className="flex flex-col gap-2 w-full md:w-auto" onSubmit={handleSubscribe}>
              <div className="flex gap-2">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="flex-1 md:w-72 bg-white/10 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/30"
                />
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-gold text-white text-sm font-semibold rounded-lg hover:bg-gold-dark transition-colors flex-shrink-0 disabled:opacity-60"
                >
                  {submitting ? "..." : "Subscribe"}
                </button>
              </div>
              {status && (
                <p className={`text-xs ${status.type === "ok" ? "text-emerald-300" : "text-rose-300"}`}>
                  {status.text}
                </p>
              )}
            </form>
          </div>
        </div>
      </div>

      {/* Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-gold rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l2.5 5.5L20 9.5l-4 4 1 5.5L12 16.5 6.5 19l1-5.5-4-4 5.5-1L12 3z" />
                </svg>
              </div>
              <span className="text-xl font-bold">
                Carat<span className="text-gold">Flow</span>
              </span>
            </Link>
            <p className="text-gray-400 text-sm leading-relaxed mb-4 max-w-xs">
              India's trusted online jewelry store. BIS Hallmarked, IGI Certified, 100% authentic jewelry delivered to your doorstep.
            </p>

            {/* Trust badges */}
            <div className="flex flex-wrap gap-3 mb-5">
              {["BIS Hallmark", "IGI Certified", "Insured Shipping", "15-Day Returns"].map((badge) => (
                <span key={badge} className="px-2.5 py-1 bg-white/5 border border-white/10 rounded text-[10px] text-gray-400">
                  {badge}
                </span>
              ))}
            </div>

            {/* Social - placeholders until brand accounts exist */}
            <div className="flex gap-3">
              {[
                { label: "Fb", href: "#" },
                { label: "Ig", href: "#" },
                { label: "Tw", href: "#" },
                { label: "Yt", href: "#" },
                { label: "Pi", href: "#" },
              ].map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  aria-label={`${s.label} (coming soon)`}
                  className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center text-xs font-bold text-gray-400 hover:bg-gold hover:text-white transition-colors"
                >
                  {s.label}
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4 className="font-semibold text-sm mb-4 text-white">{title}</h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-gray-400 text-sm hover:text-gold transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Payment methods */}
        <div className="border-t border-white/10 mt-10 pt-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="text-xs text-gray-500">We accept</span>
              <div className="flex gap-2">
                {["Visa", "MC", "UPI", "RuPay", "NetB", "EMI"].map((m) => (
                  <span
                    key={m}
                    className="px-2.5 py-1 bg-white/5 border border-white/10 rounded text-[10px] font-medium text-gray-400"
                  >
                    {m}
                  </span>
                ))}
              </div>
            </div>
            <div className="text-gray-500 text-xs flex flex-wrap items-center gap-x-3 justify-center md:justify-end">
              <Link href="/privacy" className="hover:text-gold transition-colors">Privacy</Link>
              <span>&middot;</span>
              <Link href="/terms" className="hover:text-gold transition-colors">Terms</Link>
              <span className="hidden sm:inline">&middot;</span>
              <span>&copy; {new Date().getFullYear()} CaratFlow by Globussoft Technologies</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
