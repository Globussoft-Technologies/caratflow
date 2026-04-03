'use client';

import { useState } from 'react';
import { Plus, TrendingUp, TrendingDown } from 'lucide-react';

const currentRates = [
  { fromCurrency: 'USD', toCurrency: 'INR', rate: 830000, rateDecimal: 83.0000, source: 'RBI', effectiveDate: '2026-04-04', change: 0.15 },
  { fromCurrency: 'EUR', toCurrency: 'INR', rate: 900500, rateDecimal: 90.0500, source: 'RBI', effectiveDate: '2026-04-04', change: -0.22 },
  { fromCurrency: 'GBP', toCurrency: 'INR', rate: 1050000, rateDecimal: 105.0000, source: 'RBI', effectiveDate: '2026-04-04', change: 0.35 },
  { fromCurrency: 'AED', toCurrency: 'INR', rate: 226000, rateDecimal: 22.6000, source: 'RBI', effectiveDate: '2026-04-04', change: 0.05 },
  { fromCurrency: 'SGD', toCurrency: 'INR', rate: 620000, rateDecimal: 62.0000, source: 'API', effectiveDate: '2026-04-04', change: -0.10 },
];

const rateHistory = [
  { date: '2026-04-04', usd: 83.00, eur: 90.05, gbp: 105.00 },
  { date: '2026-04-03', usd: 82.85, eur: 90.27, gbp: 104.65 },
  { date: '2026-04-02', usd: 82.95, eur: 90.10, gbp: 104.80 },
  { date: '2026-04-01', usd: 83.10, eur: 89.95, gbp: 105.20 },
  { date: '2026-03-31', usd: 83.05, eur: 90.15, gbp: 105.10 },
];

export function ExchangeRateDisplay() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newFrom, setNewFrom] = useState('USD');
  const [newTo, setNewTo] = useState('INR');
  const [newRate, setNewRate] = useState('');
  const [newSource, setNewSource] = useState('MANUAL');

  return (
    <div className="space-y-6">
      {/* Current Rates */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {currentRates.map((rate) => (
          <div key={`${rate.fromCurrency}-${rate.toCurrency}`} className="rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold">{rate.fromCurrency}/{rate.toCurrency}</span>
              <span className={`inline-flex items-center gap-1 text-xs font-medium ${rate.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {rate.change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {rate.change >= 0 ? '+' : ''}{rate.change.toFixed(2)}%
              </span>
            </div>
            <p className="text-2xl font-bold mt-1">{rate.rateDecimal.toFixed(4)}</p>
            <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
              <span>Source: {rate.source}</span>
              <span>{rate.effectiveDate}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Add Rate */}
      <div className="flex justify-end">
        <button onClick={() => setShowAddForm(!showAddForm)} className="inline-flex h-9 items-center gap-2 rounded-md border px-4 text-sm font-medium hover:bg-accent">
          <Plus className="h-4 w-4" /> Record Rate
        </button>
      </div>

      {showAddForm && (
        <div className="rounded-lg border bg-card p-4 space-y-4">
          <h3 className="text-sm font-semibold">Record New Exchange Rate</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="text-sm font-medium">From Currency</label>
              <select value={newFrom} onChange={(e) => setNewFrom(e.target.value)} className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm">
                <option value="USD">USD</option><option value="EUR">EUR</option><option value="GBP">GBP</option><option value="AED">AED</option><option value="SGD">SGD</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">To Currency</label>
              <select value={newTo} onChange={(e) => setNewTo(e.target.value)} className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm">
                <option value="INR">INR</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Rate</label>
              <input type="number" step="0.0001" value={newRate} onChange={(e) => setNewRate(e.target.value)} placeholder="83.0000" className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium">Source</label>
              <select value={newSource} onChange={(e) => setNewSource(e.target.value)} className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm">
                <option value="MANUAL">Manual</option><option value="RBI">RBI Reference</option><option value="API">API</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowAddForm(false)} className="h-9 rounded-md border px-4 text-sm font-medium hover:bg-accent">Cancel</button>
            <button className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">Save Rate</button>
          </div>
        </div>
      )}

      {/* Rate History Table */}
      <div className="rounded-lg border">
        <div className="px-4 py-3 border-b bg-muted/50">
          <h3 className="text-sm font-semibold">Rate History (INR per unit)</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="px-4 py-2 text-left font-medium">Date</th>
              <th className="px-4 py-2 text-right font-medium">USD/INR</th>
              <th className="px-4 py-2 text-right font-medium">EUR/INR</th>
              <th className="px-4 py-2 text-right font-medium">GBP/INR</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rateHistory.map((row) => (
              <tr key={row.date} className="hover:bg-accent/50">
                <td className="px-4 py-2 text-muted-foreground">{row.date}</td>
                <td className="px-4 py-2 text-right font-mono">{row.usd.toFixed(4)}</td>
                <td className="px-4 py-2 text-right font-mono">{row.eur.toFixed(4)}</td>
                <td className="px-4 py-2 text-right font-mono">{row.gbp.toFixed(4)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
