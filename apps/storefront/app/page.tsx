"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { mockProducts, mockBanners, mockCategories, mockGoldRates } from "@/lib/mock-data";
import { OCCASIONS } from "@/lib/constants";
import { formatRupees, cn } from "@/lib/utils";
import ProductCard from "@/components/ProductCard";
import SearchBar from "@/components/SearchBar";

export default function HomePage() {
  const [currentBanner, setCurrentBanner] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % mockBanners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const featured = mockProducts.filter((p) => p.isBestseller);
  const newArrivals = mockProducts.filter((p) => p.isNew);
  const trending = mockProducts.filter((p) => p.isTrending);

  return (
    <div>
      {/* ─── Hero Banner Carousel ─────────────────────────────── */}
      <section className="relative bg-navy overflow-hidden">
        <div className="relative h-[420px] md:h-[520px]">
          {mockBanners.map((banner, idx) => (
            <div
              key={banner.id}
              className={cn(
                "absolute inset-0 flex items-center transition-opacity duration-700",
                idx === currentBanner ? "opacity-100" : "opacity-0 pointer-events-none"
              )}
            >
              <div className={`absolute inset-0 bg-gradient-to-r ${banner.bgColor} opacity-90`} />
              <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 w-full">
                <div className="max-w-xl">
                  <h1 className="text-3xl md:text-5xl font-bold text-white mb-4 leading-tight" style={{ fontFamily: "var(--font-serif)" }}>
                    {banner.title}
                  </h1>
                  <p className="text-white/70 text-base md:text-lg mb-6 leading-relaxed">
                    {banner.subtitle}
                  </p>
                  <Link
                    href={banner.ctaLink}
                    className="inline-block bg-gold text-white font-semibold px-8 py-3.5 rounded-lg hover:bg-gold-dark transition-colors text-sm md:text-base"
                  >
                    {banner.ctaText}
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Dots */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {mockBanners.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrentBanner(idx)}
              className={cn(
                "w-2.5 h-2.5 rounded-full transition-all",
                idx === currentBanner ? "bg-gold w-8" : "bg-white/40 hover:bg-white/60"
              )}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>

        {/* Search overlay for mobile */}
        <div className="absolute bottom-0 left-0 right-0 md:hidden px-4 pb-16 z-10">
          <SearchBar expanded />
        </div>
      </section>

      {/* ─── Live Gold Rate Strip ─────────────────────────────── */}
      <section className="bg-cream border-y border-gold/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between overflow-x-auto gap-6 custom-scrollbar">
            <span className="text-[10px] font-semibold text-navy/40 uppercase tracking-wider flex-shrink-0">
              Live Rates
            </span>
            {mockGoldRates.slice(0, 4).map((rate) => {
              const label = rate.metalType === "GOLD"
                ? `Gold ${rate.purity}`
                : rate.metalType === "SILVER" ? "Silver" : "Platinum";
              return (
                <div key={`${rate.metalType}-${rate.purity}`} className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs font-medium text-navy/60">{label}</span>
                  <span className="text-sm font-bold text-navy">{formatRupees(rate.ratePerGram)}/g</span>
                  <span className={cn("text-xs font-medium", rate.change24h >= 0 ? "text-emerald-600" : "text-rose-500")}>
                    {rate.change24h >= 0 ? "+" : ""}{rate.changePercent24h.toFixed(2)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── Category Grid ────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold text-navy" style={{ fontFamily: "var(--font-serif)" }}>
            Shop by Category
          </h2>
          <p className="text-navy/50 mt-2 text-sm">Find the perfect piece for every moment</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {mockCategories.slice(0, 10).map((cat) => (
            <Link
              key={cat.id}
              href={`/category/${cat.slug}`}
              className="group relative aspect-square rounded-xl overflow-hidden bg-warm-gray"
            >
              <img
                src={cat.image}
                alt={cat.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-navy/70 via-navy/20 to-transparent" />
              <div className="absolute bottom-3 left-3 right-3">
                <h3 className="text-white font-semibold text-sm">{cat.name}</h3>
                <p className="text-white/60 text-[10px]">{cat.productCount} designs</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ─── Featured Products ────────────────────────────────── */}
      <section className="bg-white py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-navy" style={{ fontFamily: "var(--font-serif)" }}>
                Bestsellers
              </h2>
              <p className="text-navy/50 mt-1 text-sm">Our most loved jewelry pieces</p>
            </div>
            <Link href="/category/all?sort=popularity" className="text-gold text-sm font-medium hover:text-gold-dark transition-colors flex items-center gap-1">
              View All
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {featured.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* ─── Promotional Banner ───────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="relative bg-gradient-to-r from-navy via-navy-light to-navy rounded-2xl overflow-hidden p-8 md:p-12">
          <div className="relative z-10 max-w-lg">
            <p className="text-gold text-xs font-semibold uppercase tracking-wider mb-2">Gold Savings Scheme</p>
            <h3 className="text-2xl md:text-3xl font-bold text-white mb-3" style={{ fontFamily: "var(--font-serif)" }}>
              Save Monthly, Get Gold at Better Rates
            </h3>
            <p className="text-white/60 text-sm mb-6">
              Join our 11+1 Gold Savings Scheme. Pay for 11 months, get 12 months worth of gold. Start with as little as Rs 1,000/month.
            </p>
            <Link
              href="/account/schemes"
              className="inline-block bg-gold text-white font-semibold px-6 py-3 rounded-lg hover:bg-gold-dark transition-colors text-sm"
            >
              Learn More
            </Link>
          </div>
          {/* Decorative pattern */}
          <div className="absolute top-0 right-0 w-1/2 h-full opacity-5">
            <svg viewBox="0 0 200 200" className="w-full h-full" fill="white">
              <pattern id="dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1.5" />
              </pattern>
              <rect fill="url(#dots)" width="200" height="200" />
            </svg>
          </div>
        </div>
      </section>

      {/* ─── New Arrivals ─────────────────────────────────────── */}
      <section className="bg-warm-white py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-navy" style={{ fontFamily: "var(--font-serif)" }}>
                New Arrivals
              </h2>
              <p className="text-navy/50 mt-1 text-sm">Fresh additions to our collection</p>
            </div>
            <Link href="/category/all?sort=newest" className="text-gold text-sm font-medium hover:text-gold-dark transition-colors flex items-center gap-1">
              View All
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {newArrivals.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* ─── Shop by Occasion ─────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold text-navy" style={{ fontFamily: "var(--font-serif)" }}>
            Shop by Occasion
          </h2>
          <p className="text-navy/50 mt-2 text-sm">Curated collections for life's special moments</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {OCCASIONS.map((occasion) => (
            <Link
              key={occasion.slug}
              href={`/category/all?occasion=${occasion.slug}`}
              className="group text-center"
            >
              <div className="aspect-square rounded-full overflow-hidden bg-warm-gray mb-3 mx-auto w-28 h-28 md:w-32 md:h-32 border-2 border-transparent group-hover:border-gold transition-all">
                <img
                  src={occasion.image}
                  alt={occasion.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  loading="lazy"
                />
              </div>
              <h3 className="text-sm font-semibold text-navy group-hover:text-gold transition-colors">
                {occasion.name}
              </h3>
            </Link>
          ))}
        </div>
      </section>

      {/* ─── Trending Products ────────────────────────────────── */}
      <section className="bg-cream py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-navy" style={{ fontFamily: "var(--font-serif)" }}>
                Trending Now
              </h2>
              <p className="text-navy/50 mt-1 text-sm">What everyone is loving right now</p>
            </div>
            <Link href="/category/all?sort=popularity" className="text-gold text-sm font-medium hover:text-gold-dark transition-colors flex items-center gap-1">
              View All
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {trending.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* ─── Trust Strip ──────────────────────────────────────── */}
      <section className="bg-white py-12 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              {
                icon: (
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                  </svg>
                ),
                title: "100% Certified",
                desc: "BIS Hallmarked & IGI Certified",
              },
              {
                icon: (
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
                  </svg>
                ),
                title: "Free Shipping",
                desc: "Insured delivery on all orders",
              },
              {
                icon: (
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3l-3 3" />
                  </svg>
                ),
                title: "15-Day Returns",
                desc: "Hassle-free return & exchange",
              },
              {
                icon: (
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                ),
                title: "Secure Payments",
                desc: "100% secure checkout",
              },
            ].map((item) => (
              <div key={item.title} className="flex flex-col items-center text-center">
                <div className="text-gold mb-3">{item.icon}</div>
                <h4 className="font-semibold text-sm text-navy mb-0.5">{item.title}</h4>
                <p className="text-xs text-navy/50">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
