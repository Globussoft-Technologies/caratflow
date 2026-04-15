"use client";

import { useState } from "react";
import Link from "next/link";
import { mockProducts, mockGoldRates } from "@/lib/mock-data";

// ─── Inline icon primitives (avoids a new dependency) ───────
type IconProps = { className?: string; strokeWidth?: number; fill?: string };
const Icon = ({
  children,
  className,
  strokeWidth = 1.5,
  fill = "none",
}: IconProps & { children: React.ReactNode }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill={fill}
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {children}
  </svg>
);
const Heart = (p: IconProps) => (
  <Icon {...p} strokeWidth={p.strokeWidth ?? 2}>
    <path d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
  </Icon>
);
const ShieldCheck = (p: IconProps) => (
  <Icon {...p}>
    <path d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
  </Icon>
);
const Gem = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6 3h12l3 6-9 12L3 9l3-6zM3 9h18M9 3l3 6 3-6" />
  </Icon>
);
const RefreshCw = (p: IconProps) => (
  <Icon {...p}>
    <path d="M21 12a9 9 0 01-15 6.7L3 16m0 0v5m0-5h5M3 12a9 9 0 0115-6.7L21 8m0 0V3m0 5h-5" />
  </Icon>
);
const Truck = (p: IconProps) => (
  <Icon {...p}>
    <path d="M1 3h15v13H1zM16 8h4l3 3v5h-7zM5.5 21a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM18.5 21a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
  </Icon>
);
const Star = (p: IconProps) => (
  <Icon {...p} strokeWidth={p.strokeWidth ?? 1}>
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </Icon>
);
const ArrowRight = (p: IconProps) => (
  <Icon {...p} strokeWidth={p.strokeWidth ?? 2}>
    <path d="M5 12h14M13 5l7 7-7 7" />
  </Icon>
);
const Mail = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <path d="M22 6l-10 7L2 6" />
  </Icon>
);
import { calculateProductPrice, formatRupees, cn } from "@/lib/utils";
import { useStore } from "@/lib/store";

// ─── Picsum Image Library ────────────────────────────────────
// Deterministic, always-loads, professional photography for the
// hackathon demo. Descriptive seeds keep image identity stable.

const IMG = {
  hero: "https://picsum.photos/seed/caratflow-hero-luxury/1920/800",
  collections: {
    bridal: "https://picsum.photos/seed/caratflow-bridal/800/600",
    daily: "https://picsum.photos/seed/caratflow-daily/800/600",
    festive: "https://picsum.photos/seed/caratflow-festive/800/600",
  },
  categories: {
    rings: "https://picsum.photos/seed/caratflow-cat-rings/600/600",
    necklaces: "https://picsum.photos/seed/caratflow-cat-necklaces/600/600",
    earrings: "https://picsum.photos/seed/caratflow-cat-earrings/600/600",
    bangles: "https://picsum.photos/seed/caratflow-cat-bangles/600/600",
    pendants: "https://picsum.photos/seed/caratflow-cat-pendants/600/600",
    chains: "https://picsum.photos/seed/caratflow-cat-chains/600/600",
  },
  avatars: {
    a1: "https://picsum.photos/seed/caratflow-avatar-1/100/100",
    a2: "https://picsum.photos/seed/caratflow-avatar-2/100/100",
    a3: "https://picsum.photos/seed/caratflow-avatar-3/100/100",
  },
};

const PRODUCT_SLUGS = [
  "solitaire-ring",
  "kundan-necklace",
  "temple-bangle",
  "diamond-stud",
  "gold-chain",
  "ruby-pendant",
  "emerald-ring",
  "pearl-drops",
] as const;

const productImg = (slug: string) =>
  `https://picsum.photos/seed/caratflow-prod-${slug}/600/600`;

// ─── Featured Collections ────────────────────────────────────
const COLLECTIONS = [
  {
    title: "Bridal Heirloom",
    tagline: "Timeless sets for your big day",
    image: IMG.collections.bridal,
    href: "/category/all?occasion=bridal",
  },
  {
    title: "Everyday Luxe",
    tagline: "Lightweight pieces for daily wear",
    image: IMG.collections.daily,
    href: "/category/all?occasion=daily",
  },
  {
    title: "Festive Edit",
    tagline: "Statement jewelry for celebrations",
    image: IMG.collections.festive,
    href: "/category/all?occasion=festive",
  },
] as const;

// ─── Category Tiles ──────────────────────────────────────────
const CATEGORIES = [
  { name: "Rings", slug: "rings", image: IMG.categories.rings },
  { name: "Necklaces", slug: "necklaces", image: IMG.categories.necklaces },
  { name: "Earrings", slug: "earrings", image: IMG.categories.earrings },
  { name: "Bangles", slug: "bangles", image: IMG.categories.bangles },
  { name: "Pendants", slug: "pendants", image: IMG.categories.pendants },
  { name: "Chains", slug: "chains", image: IMG.categories.chains },
] as const;

// ─── Trust Signals ───────────────────────────────────────────
const TRUST = [
  {
    icon: ShieldCheck,
    title: "BIS Hallmarked",
    desc: "Every piece government-certified for purity",
  },
  {
    icon: Gem,
    title: "Certified Diamonds",
    desc: "IGI & GIA certified natural diamonds",
  },
  {
    icon: RefreshCw,
    title: "Lifetime Exchange",
    desc: "Upgrade or exchange, no questions asked",
  },
  {
    icon: Truck,
    title: "365-Day Returns",
    desc: "Free insured returns for a full year",
  },
] as const;

// ─── Testimonials ────────────────────────────────────────────
const TESTIMONIALS = [
  {
    name: "Priya Sharma",
    city: "Mumbai",
    rating: 5,
    avatar: IMG.avatars.a1,
    quote:
      "The bridal set I bought for my wedding was breathtaking. Craftsmanship is world-class and the BIS hallmark gave me total peace of mind.",
  },
  {
    name: "Ananya Iyer",
    city: "Bengaluru",
    rating: 5,
    avatar: IMG.avatars.a2,
    quote:
      "Ordered a diamond pendant for my mother's 60th. It arrived beautifully packaged, with a certificate and a personal handwritten note.",
  },
  {
    name: "Kavita Reddy",
    city: "Hyderabad",
    rating: 5,
    avatar: IMG.avatars.a3,
    quote:
      "I love that I can book a video consultation before buying. The designer walked me through three options over a call. Bought on the spot.",
  },
] as const;

// ─── Page ────────────────────────────────────────────────────
export default function HomePage() {
  const { toggleWishlist, isInWishlist } = useStore();
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  // Featured: take first 8 mock products but swap image to picsum slug
  const featured = mockProducts.slice(0, 8).map((p, i) => ({
    ...p,
    _img: productImg(PRODUCT_SLUGS[i % PRODUCT_SLUGS.length]),
  }));

  const goldRate22k = mockGoldRates.find(
    (r) => r.metalType === "GOLD" && r.purity === 916,
  );
  const goldRate18k = mockGoldRates.find(
    (r) => r.metalType === "GOLD" && r.purity === 750,
  );
  const silverRate = mockGoldRates.find((r) => r.metalType === "SILVER");

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.includes("@")) {
      setSubscribed(true);
      setEmail("");
    }
  };

  return (
    <div>
      {/* ─── 1. Hero Banner ─────────────────────────────────── */}
      <section className="relative h-[600px] w-full overflow-hidden">
        <img
          src={IMG.hero}
          alt="CaratFlow luxury jewelry"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-navy/90 via-navy/60 to-navy/20" />
        <div className="relative z-10 mx-auto flex h-full max-w-7xl items-center px-4 sm:px-6">
          <div className="max-w-2xl">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.25em] text-gold">
              Since 1952 · Four Generations of Artisans
            </p>
            <h1
              className="mb-6 text-4xl font-bold leading-tight text-white md:text-6xl lg:text-7xl"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              Crafted for
              <br />
              Generations
            </h1>
            <p className="mb-8 max-w-lg text-base leading-relaxed text-white/80 md:text-lg">
              Handcrafted fine jewelry in 22K & 18K gold, natural diamonds, and
              ethically sourced gemstones. BIS hallmarked, certified, and made
              to be passed down.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/category/all"
                className="inline-flex items-center gap-2 rounded-lg bg-gold px-8 py-4 text-sm font-semibold text-white transition-colors hover:bg-gold-dark"
              >
                Shop Collection
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/consultation/request"
                className="inline-flex items-center gap-2 rounded-lg border border-white/40 bg-white/10 px-8 py-4 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/20"
              >
                Book Consultation
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 2. Featured Collections ────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="mb-10 text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-gold">
            Curated Edits
          </p>
          <h2
            className="text-3xl font-bold text-navy md:text-4xl"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Featured Collections
          </h2>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {COLLECTIONS.map((c) => (
            <Link
              key={c.title}
              href={c.href}
              className="group relative block h-80 overflow-hidden rounded-2xl"
            >
              <img
                src={c.image}
                alt={c.title}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-navy/90 via-navy/30 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-6">
                <h3
                  className="mb-1 text-2xl font-bold text-white"
                  style={{ fontFamily: "var(--font-serif)" }}
                >
                  {c.title}
                </h3>
                <p className="mb-3 text-sm text-white/70">{c.tagline}</p>
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-gold">
                  Shop now
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ─── 3. Category Tiles ──────────────────────────────── */}
      <section className="bg-cream py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-10 text-center">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-gold">
              Browse Our Store
            </p>
            <h2
              className="text-3xl font-bold text-navy md:text-4xl"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              Shop by Category
            </h2>
          </div>
          <div className="grid grid-cols-3 gap-6 md:grid-cols-6">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.slug}
                href={`/category/${cat.slug}`}
                className="group text-center"
              >
                <div className="mx-auto mb-3 h-28 w-28 overflow-hidden rounded-full border-2 border-transparent bg-warm-gray transition-all group-hover:border-gold md:h-36 md:w-36">
                  <img
                    src={cat.image}
                    alt={cat.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                </div>
                <h3 className="text-sm font-semibold text-navy transition-colors group-hover:text-gold md:text-base">
                  {cat.name}
                </h3>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 4. Featured Products ───────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="mb-10 flex items-end justify-between">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-gold">
              Most Loved
            </p>
            <h2
              className="text-3xl font-bold text-navy md:text-4xl"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              Featured Pieces
            </h2>
          </div>
          <Link
            href="/category/all?sort=popularity"
            className="hidden items-center gap-1 text-sm font-medium text-gold hover:text-gold-dark sm:inline-flex"
          >
            View All
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
          {featured.map((product) => {
            const price = calculateProductPrice(product);
            const wishlisted = isInWishlist(product.id);
            return (
              <div
                key={product.id}
                className="group relative overflow-hidden rounded-xl border border-gray-100 bg-white transition-all hover:border-gold/30 hover:shadow-lg"
              >
                <button
                  type="button"
                  onClick={() => toggleWishlist(product.id)}
                  className={cn(
                    "absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full transition-all",
                    wishlisted
                      ? "bg-rose-50 text-rose-500"
                      : "bg-white/90 text-navy/40 hover:bg-rose-50 hover:text-rose-500",
                  )}
                  aria-label={
                    wishlisted ? "Remove from wishlist" : "Add to wishlist"
                  }
                >
                  <Heart
                    className="h-4 w-4"
                    fill={wishlisted ? "currentColor" : "none"}
                  />
                </button>
                <Link
                  href={`/product/${product.id}`}
                  className="block aspect-square overflow-hidden bg-warm-gray"
                >
                  <img
                    src={product._img}
                    alt={product.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                </Link>
                <div className="p-4">
                  <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-gold">
                    {product.metalType} · {product.purityLabel}
                  </p>
                  <h3 className="mb-2 line-clamp-1 text-sm font-semibold text-navy">
                    {product.name}
                  </h3>
                  <div className="flex items-baseline justify-between">
                    <span className="text-lg font-bold text-navy">
                      {formatRupees(price.total / 100)}
                    </span>
                    <span className="text-[10px] font-medium text-navy/40">
                      {product.netWeightGrams}g
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── 5. Live Metal Rates Ticker ─────────────────────── */}
      <section className="bg-navy text-white">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-sm md:text-base">
            <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-gold">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-gold" />
              Live Rates
            </span>
            {goldRate22k && (
              <span>
                <span className="text-white/60">22K Gold</span>{" "}
                <span className="font-bold">
                  {formatRupees(goldRate22k.ratePerGram)}/g
                </span>
              </span>
            )}
            <span className="text-white/20">·</span>
            {goldRate18k && (
              <span>
                <span className="text-white/60">18K Gold</span>{" "}
                <span className="font-bold">
                  {formatRupees(goldRate18k.ratePerGram)}/g
                </span>
              </span>
            )}
            <span className="text-white/20">·</span>
            {silverRate && (
              <span>
                <span className="text-white/60">Silver</span>{" "}
                <span className="font-bold">
                  {formatRupees(silverRate.ratePerGram)}/g
                </span>
              </span>
            )}
            <span className="text-white/20">·</span>
            <span className="text-xs text-white/50">
              Updated {new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        </div>
      </section>

      {/* ─── 6. Trust Signals ───────────────────────────────── */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {TRUST.map((t) => {
              const TrustIcon = t.icon;
              return (
                <div
                  key={t.title}
                  className="flex flex-col items-center text-center"
                >
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gold/10 text-gold">
                    <TrustIcon className="h-8 w-8" strokeWidth={1.5} />
                  </div>
                  <h4 className="mb-1 text-base font-semibold text-navy">
                    {t.title}
                  </h4>
                  <p className="text-xs leading-relaxed text-navy/50">
                    {t.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── 7. Testimonials ────────────────────────────────── */}
      <section className="bg-cream py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-12 text-center">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-gold">
              Customer Stories
            </p>
            <h2
              className="text-3xl font-bold text-navy md:text-4xl"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              What Our Clients Say
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <div
                key={t.name}
                className="flex flex-col rounded-2xl bg-white p-8 shadow-sm"
              >
                <div className="mb-4 flex gap-1">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star
                      key={i}
                      className="h-4 w-4 text-gold"
                      fill="currentColor"
                    />
                  ))}
                </div>
                <p className="mb-6 flex-1 text-sm leading-relaxed text-navy/70">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="flex items-center gap-3 border-t border-gray-100 pt-4">
                  <img
                    src={t.avatar}
                    alt={t.name}
                    className="h-12 w-12 rounded-full object-cover"
                  />
                  <div>
                    <p className="text-sm font-semibold text-navy">{t.name}</p>
                    <p className="text-xs text-navy/50">{t.city}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 8. Newsletter ──────────────────────────────────── */}
      <section className="bg-navy py-16">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <Mail className="mx-auto mb-4 h-10 w-10 text-gold" strokeWidth={1.5} />
          <h2
            className="mb-3 text-3xl font-bold text-white md:text-4xl"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Join the CaratFlow Circle
          </h2>
          <p className="mb-8 text-sm text-white/60 md:text-base">
            Early access to new collections, private sale invitations, and
            expert styling tips — delivered once a week.
          </p>
          {subscribed ? (
            <p className="text-sm font-semibold text-gold">
              Thank you — you&apos;re on the list. Check your inbox.
            </p>
          ) : (
            <form
              onSubmit={handleSubscribe}
              className="mx-auto flex max-w-md flex-col gap-3 sm:flex-row"
            >
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="flex-1 rounded-lg border border-white/20 bg-white/10 px-5 py-3.5 text-sm text-white placeholder-white/40 backdrop-blur-sm focus:border-gold focus:outline-none"
              />
              <button
                type="submit"
                className="rounded-lg bg-gold px-8 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-gold-dark"
              >
                Subscribe
              </button>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}
