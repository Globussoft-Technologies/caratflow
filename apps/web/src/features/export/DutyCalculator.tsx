'use client';

import { useState } from 'react';
import { Calculator } from 'lucide-react';

interface DutyResult {
  hsCode: string;
  description: string;
  dutyRate: number;
  dutyAmount: number;
  assessableValue: number;
  totalDuty: number;
}

export function DutyCalculator() {
  const [country, setCountry] = useState('');
  const [hsCode, setHsCode] = useState('');
  const [valuePaise, setValuePaise] = useState(0);
  const [result, setResult] = useState<DutyResult | null>(null);

  const handleCalculate = () => {
    // Mock calculation -- in production this calls tRPC: export.calculateDuty
    if (!country || !hsCode || valuePaise <= 0) return;

    const dutyRates: Record<string, number> = {
      'US': 650, // 6.5%
      'AE': 500, // 5%
      'GB': 250, // 2.5%
      'SG': 0,
      'HK': 0,
    };

    const rate = dutyRates[country] ?? 1000;
    const assessable = valuePaise;
    const dutyAmount = Math.round((assessable * rate) / 10000);

    setResult({
      hsCode,
      description: hsCode.startsWith('7113') ? 'Articles of jewellery and parts thereof, of precious metal' : 'Precious or semi-precious stones',
      dutyRate: rate,
      dutyAmount,
      assessableValue: assessable,
      totalDuty: dutyAmount,
    });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card p-6 space-y-4">
        <h3 className="text-sm font-semibold uppercase text-muted-foreground">Calculate Import Duty</h3>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="text-sm font-medium">Destination Country *</label>
            <select value={country} onChange={(e) => setCountry(e.target.value)} className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm">
              <option value="">Select country...</option>
              <option value="US">United States</option>
              <option value="AE">UAE</option>
              <option value="GB">United Kingdom</option>
              <option value="SG">Singapore</option>
              <option value="HK">Hong Kong</option>
              <option value="JP">Japan</option>
              <option value="DE">Germany</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">HS Code *</label>
            <input type="text" value={hsCode} onChange={(e) => setHsCode(e.target.value)} placeholder="7113.19" className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm font-mono" />
          </div>
          <div>
            <label className="text-sm font-medium">Assessable Value (Rs) *</label>
            <input type="number" min="0" step="0.01" value={valuePaise / 100} onChange={(e) => setValuePaise(Math.round(parseFloat(e.target.value) * 100) || 0)} className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm" />
          </div>
          <div className="flex items-end">
            <button onClick={handleCalculate} disabled={!country || !hsCode || valuePaise <= 0} className="h-10 w-full rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 inline-flex items-center justify-center gap-2">
              <Calculator className="h-4 w-4" /> Calculate
            </button>
          </div>
        </div>
      </div>

      {result && (
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <h3 className="text-sm font-semibold uppercase text-muted-foreground">Duty Calculation Result</h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">HS Code</span>
                <span className="font-mono font-medium">{result.hsCode}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Description</span>
                <span className="font-medium text-right max-w-[60%]">{result.description}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Duty Rate</span>
                <span className="font-medium">{(result.dutyRate / 100).toFixed(2)}%</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Assessable Value</span>
                <span className="font-medium">{`\u20B9${(result.assessableValue / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Duty Amount</span>
                <span className="font-medium">{`\u20B9${(result.dutyAmount / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}</span>
              </div>
              <div className="flex justify-between text-sm border-t pt-2">
                <span className="font-semibold">Total Duty</span>
                <span className="text-lg font-bold">{`\u20B9${(result.totalDuty / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}</span>
              </div>
            </div>
          </div>

          {result.dutyRate === 0 && (
            <div className="rounded-md bg-green-50 border border-green-200 p-3 text-sm text-green-800">
              This destination has zero import duty on jewelry items.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
