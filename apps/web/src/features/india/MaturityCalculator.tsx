'use client';

import * as React from 'react';
import { Gift } from 'lucide-react';

interface MaturityCalculatorProps {
  className?: string;
}

function formatPaise(paise: number): string {
  return `${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

export function MaturityCalculator({ className }: MaturityCalculatorProps) {
  const [monthlyAmount, setMonthlyAmount] = React.useState('5000');
  const [durationMonths, setDurationMonths] = React.useState('12');
  const [bonusMonths, setBonusMonths] = React.useState('1');
  const [bonusPercent, setBonusPercent] = React.useState('2.5');

  const monthlyPaise = Math.round(parseFloat(monthlyAmount || '0') * 100);
  const duration = parseInt(durationMonths || '0', 10);
  const bonus = parseInt(bonusMonths || '0', 10);
  const bonusPct = parseFloat(bonusPercent || '0');

  const paidMonths = Math.max(0, duration - bonus);
  const totalPaidPaise = monthlyPaise * paidMonths;
  const bonusValuePaise = monthlyPaise * bonus;
  const maturityBonusPaise = Math.round((totalPaidPaise * bonusPct) / 100);
  const maturityValuePaise = totalPaidPaise + bonusValuePaise + maturityBonusPaise;

  return (
    <div className={`rounded-lg border bg-card p-4 ${className ?? ''}`}>
      <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <Gift className="h-4 w-4 text-amber-600" /> Maturity Calculator
      </h4>
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Monthly Amount (Rs.)</label>
          <input
            type="number"
            step="100"
            min="0"
            value={monthlyAmount}
            onChange={(e) => setMonthlyAmount(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-1.5 text-sm"
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Duration (mo)</label>
            <input
              type="number"
              min="1"
              value={durationMonths}
              onChange={(e) => setDurationMonths(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Bonus (mo)</label>
            <input
              type="number"
              min="0"
              value={bonusMonths}
              onChange={(e) => setBonusMonths(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Bonus %</label>
            <input
              type="number"
              step="0.1"
              min="0"
              value={bonusPercent}
              onChange={(e) => setBonusPercent(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-1.5 text-sm"
            />
          </div>
        </div>
        <hr />
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">You pay ({paidMonths} months)</span>
            <span className="font-mono">{formatPaise(totalPaidPaise)}</span>
          </div>
          <div className="flex justify-between text-emerald-600">
            <span>Bonus months ({bonus}mo)</span>
            <span className="font-mono">+{formatPaise(bonusValuePaise)}</span>
          </div>
          <div className="flex justify-between text-emerald-600">
            <span>Maturity bonus ({bonusPct}%)</span>
            <span className="font-mono">+{formatPaise(maturityBonusPaise)}</span>
          </div>
          <hr />
          <div className="flex justify-between font-semibold">
            <span>Maturity Value</span>
            <span className="font-mono text-primary">{formatPaise(maturityValuePaise)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
