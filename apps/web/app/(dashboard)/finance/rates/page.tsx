'use client';

import * as React from 'react';
import { PageHeader } from '@caratflow/ui';
import { TrendingUp, TrendingDown, Minus, Plus, RefreshCw } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────

interface LiveRate {
  metalType: string;
  purity: number;
  ratePer10gPaise: number;
  ratePerGramPaise: number;
  ratePerTolaPaise: number;
  ratePerTroyOzPaise: number;
  source: string;
  updatedAt: string;
  changePercent: number | null;
}

interface HistoricalRate {
  date: string;
  ratePer10gPaise: number;
}

// ─── Mock Data ────────────────────────────────────────────────────

const mockRates: LiveRate[] = [
  { metalType: 'GOLD', purity: 999, ratePer10gPaise: 72_500_00, ratePerGramPaise: 7_250_00, ratePerTolaPaise: 84_564_00, ratePerTroyOzPaise: 2_25_501_85, source: 'IBJA', updatedAt: '2026-04-04T10:30:00', changePercent: 0.45 },
  { metalType: 'GOLD', purity: 916, ratePer10gPaise: 66_430_00, ratePerGramPaise: 6_643_00, ratePerTolaPaise: 77_482_75, ratePerTroyOzPaise: 2_06_577_23, source: 'IBJA', updatedAt: '2026-04-04T10:30:00', changePercent: 0.42 },
  { metalType: 'GOLD', purity: 750, ratePer10gPaise: 54_375_00, ratePerGramPaise: 5_437_50, ratePerTolaPaise: 63_423_00, ratePerTroyOzPaise: 1_69_126_39, source: 'IBJA', updatedAt: '2026-04-04T10:30:00', changePercent: 0.38 },
  { metalType: 'SILVER', purity: 999, ratePer10gPaise: 920_00, ratePerGramPaise: 92_00, ratePerTolaPaise: 1_073_09, ratePerTroyOzPaise: 28_615_22, source: 'IBJA', updatedAt: '2026-04-04T10:30:00', changePercent: -0.22 },
  { metalType: 'PLATINUM', purity: 999, ratePer10gPaise: 31_500_00, ratePerGramPaise: 3_150_00, ratePerTolaPaise: 36_741_60, ratePerTroyOzPaise: 97_976_03, source: 'MANUAL', updatedAt: '2026-04-04T09:00:00', changePercent: null },
];

const mockHistory: HistoricalRate[] = [
  { date: '2026-04-04', ratePer10gPaise: 72_500_00 },
  { date: '2026-04-03', ratePer10gPaise: 72_175_00 },
  { date: '2026-04-02', ratePer10gPaise: 71_900_00 },
  { date: '2026-04-01', ratePer10gPaise: 72_050_00 },
  { date: '2026-03-31', ratePer10gPaise: 71_800_00 },
  { date: '2026-03-30', ratePer10gPaise: 71_600_00 },
  { date: '2026-03-29', ratePer10gPaise: 71_400_00 },
  { date: '2026-03-28', ratePer10gPaise: 71_200_00 },
  { date: '2026-03-27', ratePer10gPaise: 70_900_00 },
  { date: '2026-03-26', ratePer10gPaise: 70_500_00 },
];

// ─── Helpers ──────────────────────────────────────────────────────

function formatPaise(paise: number): string {
  return `${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

function formatPurityLabel(metalType: string, purity: number): string {
  if (metalType === 'GOLD') {
    const karatMap: Record<number, string> = { 999: '24K', 916: '22K', 750: '18K', 585: '14K' };
    return karatMap[purity] ?? `${purity}`;
  }
  return `${purity}`;
}

// ─── Page ─────────────────────────────────────────────────────────

export default function RatesPage() {
  const [rateForm, setRateForm] = React.useState({
    metalType: 'GOLD',
    purity: '999',
    ratePer10g: '',
    source: 'MANUAL',
  });

  const handleSubmitRate = (e: React.FormEvent) => {
    e.preventDefault();
    // In production: call trpc.india.rates.record mutation
    console.log('Recording rate:', rateForm);
  };

  // Simple chart: bar representation of historical rates
  const maxRate = Math.max(...mockHistory.map((r) => r.ratePer10gPaise));
  const minRate = Math.min(...mockHistory.map((r) => r.ratePer10gPaise));
  const range = maxRate - minRate || 1;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Metal Rates"
        description="Live metal rates, manual entry, and historical data."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Finance', href: '/finance' },
          { label: 'Rates' },
        ]}
      />

      {/* Live Rates */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {mockRates.map((rate) => (
          <div key={`${rate.metalType}-${rate.purity}`} className="rounded-lg border bg-card p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium">
                {rate.metalType} {formatPurityLabel(rate.metalType, rate.purity)}
              </span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {rate.source}
              </span>
            </div>
            <p className="text-xl font-bold font-mono">{formatPaise(rate.ratePer10gPaise)}</p>
            <p className="text-xs text-muted-foreground">per 10g</p>
            <div className="mt-2 flex items-center gap-1">
              {rate.changePercent !== null ? (
                <>
                  {rate.changePercent > 0 ? (
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                  ) : rate.changePercent < 0 ? (
                    <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                  ) : (
                    <Minus className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                  <span className={`text-xs font-medium ${
                    rate.changePercent > 0 ? 'text-emerald-600' : rate.changePercent < 0 ? 'text-red-500' : 'text-muted-foreground'
                  }`}>
                    {rate.changePercent > 0 ? '+' : ''}{rate.changePercent.toFixed(2)}%
                  </span>
                </>
              ) : (
                <span className="text-xs text-muted-foreground">--</span>
              )}
            </div>
            <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
              <p>Per gram: {formatPaise(rate.ratePerGramPaise)}</p>
              <p>Per tola: {formatPaise(rate.ratePerTolaPaise)}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Rate Entry Form */}
        <div className="rounded-lg border bg-card p-6">
          <h3 className="mb-4 text-sm font-semibold">Record Rate Manually</h3>
          <form onSubmit={handleSubmitRate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-muted-foreground">Metal</label>
                <select
                  value={rateForm.metalType}
                  onChange={(e) => setRateForm((p) => ({ ...p, metalType: e.target.value }))}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                >
                  <option value="GOLD">Gold</option>
                  <option value="SILVER">Silver</option>
                  <option value="PLATINUM">Platinum</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-muted-foreground">Purity</label>
                <select
                  value={rateForm.purity}
                  onChange={(e) => setRateForm((p) => ({ ...p, purity: e.target.value }))}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                >
                  <option value="999">999 (24K/Pure)</option>
                  <option value="916">916 (22K)</option>
                  <option value="750">750 (18K)</option>
                  <option value="585">585 (14K)</option>
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-muted-foreground">Rate per 10g (Rs.)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={rateForm.ratePer10g}
                onChange={(e) => setRateForm((p) => ({ ...p, ratePer10g: e.target.value }))}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                placeholder="72,500.00"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-muted-foreground">Source</label>
              <select
                value={rateForm.source}
                onChange={(e) => setRateForm((p) => ({ ...p, source: e.target.value }))}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="MANUAL">Manual</option>
                <option value="MCX">MCX</option>
                <option value="IBJA">IBJA</option>
              </select>
            </div>
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" /> Record Rate
            </button>
          </form>
        </div>

        {/* Historical Rate Chart (simplified bar) */}
        <div className="rounded-lg border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Gold 24K - Last 10 Days</h3>
            <button className="text-muted-foreground hover:text-foreground">
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-2">
            {[...mockHistory].reverse().map((h) => {
              const barWidth = ((h.ratePer10gPaise - minRate) / range) * 80 + 20;
              return (
                <div key={h.date} className="flex items-center gap-3">
                  <span className="w-20 text-xs text-muted-foreground">{h.date.slice(5)}</span>
                  <div className="flex-1">
                    <div
                      className="h-5 rounded bg-amber-400/80 dark:bg-amber-600/60"
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                  <span className="w-24 text-right font-mono text-xs">{formatPaise(h.ratePer10gPaise)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
