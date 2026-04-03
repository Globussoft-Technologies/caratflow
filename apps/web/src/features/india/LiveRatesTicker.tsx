'use client';

import * as React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface LiveRate {
  metalType: string;
  purity: number;
  ratePer10gPaise: number;
  changePercent: number | null;
}

interface LiveRatesTickerProps {
  rates: LiveRate[];
  className?: string;
}

function formatPaise(paise: number): string {
  return `${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

function purityLabel(metalType: string, purity: number): string {
  if (metalType === 'GOLD') {
    const map: Record<number, string> = { 999: '24K', 916: '22K', 750: '18K' };
    return map[purity] ?? `${purity}`;
  }
  return purity === 999 ? '' : `${purity}`;
}

export function LiveRatesTicker({ rates, className }: LiveRatesTickerProps) {
  return (
    <div className={`flex flex-wrap gap-4 ${className ?? ''}`}>
      {rates.map((rate) => (
        <div
          key={`${rate.metalType}-${rate.purity}`}
          className="flex items-center gap-2 rounded-md border bg-card px-3 py-1.5"
        >
          <span className="text-sm font-medium">
            {rate.metalType} {purityLabel(rate.metalType, rate.purity)}
          </span>
          <span className="font-mono text-sm font-semibold">{formatPaise(rate.ratePer10gPaise)}</span>
          {rate.changePercent !== null && (
            <span className={`flex items-center gap-0.5 text-xs ${
              rate.changePercent > 0 ? 'text-emerald-600' : rate.changePercent < 0 ? 'text-red-500' : 'text-muted-foreground'
            }`}>
              {rate.changePercent > 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : rate.changePercent < 0 ? (
                <TrendingDown className="h-3 w-3" />
              ) : (
                <Minus className="h-3 w-3" />
              )}
              {rate.changePercent > 0 ? '+' : ''}{rate.changePercent.toFixed(2)}%
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
