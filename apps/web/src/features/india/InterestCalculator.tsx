'use client';

import * as React from 'react';
import { Calculator } from 'lucide-react';

interface InterestCalculatorProps {
  className?: string;
}

function formatPaise(paise: number): string {
  return `${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

export function InterestCalculator({ className }: InterestCalculatorProps) {
  const [principal, setPrincipal] = React.useState('');
  const [rate, setRate] = React.useState('18');
  const [days, setDays] = React.useState('30');
  const [type, setType] = React.useState<'SIMPLE' | 'COMPOUND'>('SIMPLE');

  const principalPaise = Math.round(parseFloat(principal || '0') * 100);
  const annualRate = parseFloat(rate || '0');
  const dayCount = parseInt(days || '0', 10);

  let interestPaise = 0;
  if (type === 'SIMPLE') {
    interestPaise = Math.round((principalPaise * annualRate * dayCount) / (365 * 100));
  } else {
    const periodsPerYear = 12;
    const periodRate = annualRate / (periodsPerYear * 100);
    const periods = (dayCount / 365) * periodsPerYear;
    interestPaise = Math.round(principalPaise * (Math.pow(1 + periodRate, periods) - 1));
  }

  const totalPaise = principalPaise + interestPaise;

  return (
    <div className={`rounded-lg border bg-card p-4 ${className ?? ''}`}>
      <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <Calculator className="h-4 w-4 text-blue-600" /> Interest Calculator
      </h4>
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Principal (Rs.)</label>
          <input
            type="number"
            step="0.01"
            value={principal}
            onChange={(e) => setPrincipal(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-1.5 text-sm"
            placeholder="1,00,000"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Rate (% p.a.)</label>
            <input
              type="number"
              step="0.01"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Days</label>
            <input
              type="number"
              min="1"
              value={days}
              onChange={(e) => setDays(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-1.5 text-sm"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as 'SIMPLE' | 'COMPOUND')}
            className="w-full rounded-md border bg-background px-3 py-1.5 text-sm"
          >
            <option value="SIMPLE">Simple</option>
            <option value="COMPOUND">Compound (Monthly)</option>
          </select>
        </div>
        <hr />
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Interest</span>
            <span className="font-mono text-amber-600">{formatPaise(interestPaise)}</span>
          </div>
          <div className="flex justify-between text-sm font-semibold">
            <span>Total</span>
            <span className="font-mono">{formatPaise(totalPaise)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
