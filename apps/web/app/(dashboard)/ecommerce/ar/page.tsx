'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PageHeader, StatCard } from '@caratflow/ui';
import {
  Eye,
  Camera,
  ShoppingCart,
  Clock,
  Upload,
  RotateCcw,
  ArrowRight,
  Search,
  Filter,
} from 'lucide-react';

// ─── Mock Data ────────────────────────────────────────────────
// In production: fetched via tRPC ar.getAnalytics and ar.listArProducts

const analytics = {
  totalArProducts: 48,
  totalSessions: 2340,
  conversionRate: 4.8,
  avgDuration: 45,
  screenshotRate: 32.5,
  shareRate: 12.1,
};

const arProducts = [
  {
    productId: '1',
    productName: '22K Gold Solitaire Ring',
    productSku: 'GR-22K-001',
    productImage: 'https://placehold.co/100x100/FFF8E7/B8903F?text=Ring',
    category: 'RING',
    hasOverlay: true,
    has360: true,
    has3dModel: false,
    tryOnSessions: 345,
  },
  {
    productId: '2',
    productName: 'Kundan Bridal Necklace Set',
    productSku: 'NK-KN-001',
    productImage: 'https://placehold.co/100x100/FFF8E7/B8903F?text=Necklace',
    category: 'NECKLACE',
    hasOverlay: true,
    has360: true,
    has3dModel: false,
    tryOnSessions: 512,
  },
  {
    productId: '3',
    productName: 'Diamond Jhumka Earrings',
    productSku: 'ER-DJ-001',
    productImage: 'https://placehold.co/100x100/FFF8E7/B8903F?text=Earring',
    category: 'EARRING',
    hasOverlay: true,
    has360: false,
    has3dModel: false,
    tryOnSessions: 278,
  },
  {
    productId: '4',
    productName: '22K Gold Bangle Pair',
    productSku: 'BG-22K-001',
    productImage: 'https://placehold.co/100x100/FFF8E7/B8903F?text=Bangle',
    category: 'BANGLE',
    hasOverlay: true,
    has360: true,
    has3dModel: false,
    tryOnSessions: 189,
  },
  {
    productId: '5',
    productName: 'Platinum Diamond Ring',
    productSku: 'GR-PT-001',
    productImage: 'https://placehold.co/100x100/FFF8E7/B8903F?text=Pt+Ring',
    category: 'RING',
    hasOverlay: true,
    has360: true,
    has3dModel: true,
    tryOnSessions: 421,
  },
  {
    productId: '6',
    productName: 'Pearl Drop Pendant',
    productSku: 'PD-PR-001',
    productImage: 'https://placehold.co/100x100/FFF8E7/B8903F?text=Pendant',
    category: 'PENDANT',
    hasOverlay: true,
    has360: false,
    has3dModel: false,
    tryOnSessions: 156,
  },
];

const topProductsByConversion = [
  { name: '22K Gold Solitaire Ring', sessions: 345, conversions: 28, rate: 8.1 },
  { name: 'Kundan Bridal Necklace', sessions: 512, conversions: 35, rate: 6.8 },
  { name: 'Platinum Diamond Ring', sessions: 421, conversions: 25, rate: 5.9 },
  { name: 'Diamond Jhumka Earrings', sessions: 278, conversions: 14, rate: 5.0 },
  { name: '22K Gold Bangle Pair', sessions: 189, conversions: 8, rate: 4.2 },
];

// ─── Helper ───────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}

const categoryColors: Record<string, string> = {
  RING: 'bg-purple-50 text-purple-700',
  NECKLACE: 'bg-blue-50 text-blue-700',
  EARRING: 'bg-pink-50 text-pink-700',
  BANGLE: 'bg-amber-50 text-amber-700',
  BRACELET: 'bg-emerald-50 text-emerald-700',
  PENDANT: 'bg-cyan-50 text-cyan-700',
  CHAIN: 'bg-gray-50 text-gray-700',
};

// ─── Page Component ───────────────────────────────────────────

export default function ArDashboardPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');

  const filteredProducts = arProducts.filter((p) => {
    if (categoryFilter && p.category !== categoryFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        p.productName.toLowerCase().includes(q) ||
        p.productSku.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="AR & Virtual Try-On"
        description="Manage AR assets, 360-degree views, and virtual try-on experiences for your products."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'E-Commerce', href: '/ecommerce' },
          { label: 'AR & Try-On' },
        ]}
        actions={
          <Link
            href="/ecommerce/ar/upload"
            className="inline-flex items-center gap-2 px-4 py-2 bg-gold text-white text-sm font-medium rounded-lg hover:bg-gold/90 transition-colors"
          >
            <Upload className="w-4 h-4" />
            Upload AR Asset
          </Link>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="AR Products"
          value={analytics.totalArProducts.toString()}
          icon={<Eye className="w-5 h-5" />}
          subtitle="Products with AR assets"
        />
        <StatCard
          title="Try-On Sessions"
          value={analytics.totalSessions.toLocaleString()}
          icon={<Camera className="w-5 h-5" />}
          subtitle="Last 30 days"
        />
        <StatCard
          title="Conversion Rate"
          value={`${analytics.conversionRate}%`}
          icon={<ShoppingCart className="w-5 h-5" />}
          subtitle="Try-on to cart"
        />
        <StatCard
          title="Avg. Duration"
          value={formatDuration(analytics.avgDuration)}
          icon={<Clock className="w-5 h-5" />}
          subtitle="Per session"
        />
      </div>

      {/* Two-column layout: Products + Conversion Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Products with AR Assets */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-navy">Products with AR</h2>
              <span className="text-xs text-navy/40">{filteredProducts.length} products</span>
            </div>

            {/* Search + Filter */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy/30" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-gold/20 focus:border-gold outline-none"
                />
              </div>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="text-xs border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-gold/20 focus:border-gold outline-none bg-white"
              >
                <option value="">All Categories</option>
                <option value="RING">Ring</option>
                <option value="NECKLACE">Necklace</option>
                <option value="EARRING">Earring</option>
                <option value="BANGLE">Bangle</option>
                <option value="BRACELET">Bracelet</option>
                <option value="PENDANT">Pendant</option>
                <option value="CHAIN">Chain</option>
              </select>
            </div>
          </div>

          <div className="divide-y divide-gray-50">
            {filteredProducts.map((product) => (
              <Link
                key={product.productId}
                href={`/ecommerce/ar/${product.productId}`}
                className="flex items-center gap-4 px-5 py-3 hover:bg-warm-gray/50 transition-colors"
              >
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-warm-gray flex-shrink-0">
                  <img
                    src={product.productImage}
                    alt={product.productName}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-navy truncate">{product.productName}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-navy/40">{product.productSku}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${categoryColors[product.category] ?? 'bg-gray-50 text-gray-700'}`}>
                      {product.category}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {product.hasOverlay && (
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-green-50 text-green-700 font-medium">
                      Try-On
                    </span>
                  )}
                  {product.has360 && (
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium flex items-center gap-0.5">
                      <RotateCcw className="w-2.5 h-2.5" />
                      360
                    </span>
                  )}
                  {product.has3dModel && (
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 font-medium">
                      3D
                    </span>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs font-semibold text-navy">{product.tryOnSessions}</p>
                  <p className="text-[9px] text-navy/40">sessions</p>
                </div>
                <ArrowRight className="w-4 h-4 text-navy/20 flex-shrink-0" />
              </Link>
            ))}

            {filteredProducts.length === 0 && (
              <div className="px-5 py-8 text-center">
                <p className="text-navy/40 text-xs">No products found.</p>
              </div>
            )}
          </div>
        </div>

        {/* Conversion Leaderboard */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-base font-bold text-navy">Top Converting Products</h2>
            <p className="text-[10px] text-navy/40 mt-0.5">Try-on to add-to-cart rate</p>
          </div>

          <div className="divide-y divide-gray-50">
            {topProductsByConversion.map((product, idx) => (
              <div key={idx} className="px-5 py-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-navy truncate mr-2">
                    {product.name}
                  </span>
                  <span className="text-xs font-bold text-gold flex-shrink-0">
                    {product.rate}%
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gold rounded-full transition-all"
                      style={{ width: `${Math.min(product.rate * 10, 100)}%` }}
                    />
                  </div>
                  <span className="text-[9px] text-navy/40 flex-shrink-0">
                    {product.conversions}/{product.sessions}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Additional Stats */}
          <div className="px-5 py-4 border-t border-gray-100 bg-warm-gray/30">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] text-navy/40 mb-0.5">Screenshot Rate</p>
                <p className="text-sm font-bold text-navy">{analytics.screenshotRate}%</p>
              </div>
              <div>
                <p className="text-[10px] text-navy/40 mb-0.5">Share Rate</p>
                <p className="text-sm font-bold text-navy">{analytics.shareRate}%</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
