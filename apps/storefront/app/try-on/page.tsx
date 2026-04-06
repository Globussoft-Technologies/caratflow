"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import VirtualTryOn from "@/components/VirtualTryOn";
import { useStore } from "@/lib/store";

// ─── Types ────────────────────────────────────────────────────

type JewelryCategory = "RING" | "NECKLACE" | "EARRING" | "BANGLE";

interface TryOnProduct {
  id: string;
  name: string;
  image: string;
  category: JewelryCategory;
  price: string;
  overlayUrl: string;
}

// ─── Mock Data ────────────────────────────────────────────────
// In production: fetch from GET /api/v1/store/ar/products?category=RING

const CATEGORIES: { key: JewelryCategory; label: string; icon: string }[] = [
  { key: "RING", label: "Rings", icon: "💍" },
  { key: "NECKLACE", label: "Necklaces", icon: "📿" },
  { key: "EARRING", label: "Earrings", icon: "✨" },
  { key: "BANGLE", label: "Bangles", icon: "⭕" },
];

const mockTryOnProducts: TryOnProduct[] = [
  {
    id: "ar-1",
    name: "Classic Gold Solitaire Ring",
    image: "https://placehold.co/400x400/FFF8E7/B8903F?text=Gold+Ring+1",
    category: "RING",
    price: "45,999",
    overlayUrl: "https://placehold.co/200x200/FFF8E7/B8903F?text=Ring+Overlay",
  },
  {
    id: "ar-2",
    name: "Diamond Cluster Ring",
    image: "https://placehold.co/400x400/FFF8E7/B8903F?text=Diamond+Ring",
    category: "RING",
    price: "1,25,000",
    overlayUrl: "https://placehold.co/200x200/FFF8E7/B8903F?text=Ring+Overlay",
  },
  {
    id: "ar-3",
    name: "Kundan Bridal Necklace",
    image: "https://placehold.co/400x400/FFF8E7/B8903F?text=Necklace+1",
    category: "NECKLACE",
    price: "2,45,000",
    overlayUrl: "https://placehold.co/300x200/FFF8E7/B8903F?text=Necklace+Overlay",
  },
  {
    id: "ar-4",
    name: "Diamond Tennis Necklace",
    image: "https://placehold.co/400x400/FFF8E7/B8903F?text=Necklace+2",
    category: "NECKLACE",
    price: "3,75,000",
    overlayUrl: "https://placehold.co/300x200/FFF8E7/B8903F?text=Necklace+Overlay",
  },
  {
    id: "ar-5",
    name: "Pearl Drop Earrings",
    image: "https://placehold.co/400x400/FFF8E7/B8903F?text=Earring+1",
    category: "EARRING",
    price: "18,500",
    overlayUrl: "https://placehold.co/100x150/FFF8E7/B8903F?text=Earring",
  },
  {
    id: "ar-6",
    name: "Jhumka Gold Earrings",
    image: "https://placehold.co/400x400/FFF8E7/B8903F?text=Earring+2",
    category: "EARRING",
    price: "32,000",
    overlayUrl: "https://placehold.co/100x150/FFF8E7/B8903F?text=Earring",
  },
  {
    id: "ar-7",
    name: "22K Gold Bangle Set",
    image: "https://placehold.co/400x400/FFF8E7/B8903F?text=Bangle+1",
    category: "BANGLE",
    price: "85,000",
    overlayUrl: "https://placehold.co/200x100/FFF8E7/B8903F?text=Bangle+Overlay",
  },
  {
    id: "ar-8",
    name: "Diamond Studded Bangle",
    image: "https://placehold.co/400x400/FFF8E7/B8903F?text=Bangle+2",
    category: "BANGLE",
    price: "1,65,000",
    overlayUrl: "https://placehold.co/200x100/FFF8E7/B8903F?text=Bangle+Overlay",
  },
];

// ─── Page Component ───────────────────────────────────────────

export default function TryOnPage() {
  const [selectedCategory, setSelectedCategory] = useState<JewelryCategory>("RING");
  const [activeTryOn, setActiveTryOn] = useState<TryOnProduct | null>(null);
  const { addToCart } = useStore();

  const filteredProducts = mockTryOnProducts.filter(
    (p) => p.category === selectedCategory,
  );

  function handleAddToCart(productId: string) {
    // In production: call store's addToCart with actual product data
    setActiveTryOn(null);
  }

  function handleShare(productId: string, via: string) {
    // In production: POST /api/v1/store/ar/sessions/:sessionId/end with sharedVia
  }

  return (
    <>
      {/* Active try-on overlay */}
      {activeTryOn && (
        <VirtualTryOn
          config={{
            productId: activeTryOn.id,
            productName: activeTryOn.name,
            productImage: activeTryOn.image,
            category: activeTryOn.category,
            overlayUrl: activeTryOn.overlayUrl,
            overlayPositioning: { scale: 1, offsetX: 0, offsetY: 0, rotation: 0 },
          }}
          onClose={() => setActiveTryOn(null)}
          onAddToCart={handleAddToCart}
          onShare={handleShare}
        />
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-xs text-navy/50 mb-6">
          <Link href="/" className="hover:text-gold transition-colors">Home</Link>
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
          <span className="text-navy font-medium">Virtual Try-On</span>
        </nav>

        {/* Hero Section */}
        <div className="mb-10">
          <h1
            className="text-3xl md:text-4xl font-bold text-navy mb-3"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Virtual Try-On
          </h1>
          <p className="text-navy/60 text-sm md:text-base max-w-2xl">
            See how jewelry looks on you before buying. Select a category, choose a
            piece, and use your camera to try it on virtually.
          </p>
        </div>

        {/* How It Works */}
        <div className="bg-warm-gray rounded-2xl p-6 md:p-8 mb-10">
          <h2 className="text-lg font-bold text-navy mb-4">How It Works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center flex-shrink-0">
                <span className="text-gold font-bold text-sm">1</span>
              </div>
              <div>
                <h3 className="text-navy font-semibold text-sm mb-1">Choose Jewelry</h3>
                <p className="text-navy/50 text-xs leading-relaxed">
                  Browse through our collection and select a piece you want to try on.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center flex-shrink-0">
                <span className="text-gold font-bold text-sm">2</span>
              </div>
              <div>
                <h3 className="text-navy font-semibold text-sm mb-1">Enable Camera</h3>
                <p className="text-navy/50 text-xs leading-relaxed">
                  Allow camera access and position yourself. Drag the jewelry to adjust placement.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center flex-shrink-0">
                <span className="text-gold font-bold text-sm">3</span>
              </div>
              <div>
                <h3 className="text-navy font-semibold text-sm mb-1">Capture & Share</h3>
                <p className="text-navy/50 text-xs leading-relaxed">
                  Take a screenshot, share with friends on WhatsApp, or add directly to cart.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              type="button"
              onClick={() => setSelectedCategory(cat.key)}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                selectedCategory === cat.key
                  ? "bg-gold text-white shadow-md"
                  : "bg-warm-gray text-navy/60 hover:bg-gold/10 hover:text-navy"
              )}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 mb-12">
          {filteredProducts.map((product) => (
            <button
              key={product.id}
              type="button"
              onClick={() => setActiveTryOn(product)}
              className="group text-left bg-white rounded-xl overflow-hidden border border-gray-100 hover:border-gold/30 hover:shadow-lg transition-all"
            >
              <div className="aspect-square bg-warm-gray relative overflow-hidden">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
                {/* Try-on badge */}
                <div className="absolute top-2 right-2 bg-gold text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
                  TRY ON
                </div>
              </div>
              <div className="p-3">
                <h3 className="text-navy text-xs font-semibold mb-1 line-clamp-2 leading-snug">
                  {product.name}
                </h3>
                <p className="text-gold font-bold text-sm">
                  ₹{product.price}
                </p>
              </div>
            </button>
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-16">
            <p className="text-navy/40 text-sm">
              No products available for virtual try-on in this category yet.
            </p>
          </div>
        )}

        {/* Recently Tried Section */}
        <div className="border-t border-gray-100 pt-10 mb-10">
          <h2
            className="text-xl font-bold text-navy mb-4"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Recently Tried
          </h2>
          <p className="text-navy/40 text-sm">
            Your recent try-on history will appear here after you try on some jewelry.
          </p>
        </div>

        {/* FAQ Section */}
        <div className="border-t border-gray-100 pt-10">
          <h2
            className="text-xl font-bold text-navy mb-6"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Frequently Asked Questions
          </h2>
          <div className="space-y-4 max-w-2xl">
            <details className="group">
              <summary className="flex items-center justify-between cursor-pointer py-3 text-sm font-medium text-navy">
                Does it work on all devices?
                <svg className="w-4 h-4 text-navy/30 group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </summary>
              <p className="text-navy/50 text-xs leading-relaxed pb-3">
                Yes! Virtual try-on works on all modern browsers. On mobile, it uses your
                front-facing camera. On desktop, it uses your webcam. If camera access is
                unavailable, you can still view and position the jewelry on a blank canvas.
              </p>
            </details>
            <details className="group">
              <summary className="flex items-center justify-between cursor-pointer py-3 text-sm font-medium text-navy">
                Is my camera data stored?
                <svg className="w-4 h-4 text-navy/30 group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </summary>
              <p className="text-navy/50 text-xs leading-relaxed pb-3">
                No. Your camera feed is processed entirely in your browser and is never
                sent to our servers. Screenshots are generated locally on your device.
              </p>
            </details>
            <details className="group">
              <summary className="flex items-center justify-between cursor-pointer py-3 text-sm font-medium text-navy">
                How accurate is the sizing?
                <svg className="w-4 h-4 text-navy/30 group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </summary>
              <p className="text-navy/50 text-xs leading-relaxed pb-3">
                The virtual try-on provides a realistic visual preview using 2D overlay
                technology. You can adjust the size using the slider. For precise ring
                sizing, we recommend using our ring size guide or visiting a store.
              </p>
            </details>
          </div>
        </div>
      </div>
    </>
  );
}
