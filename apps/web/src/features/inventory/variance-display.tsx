'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface VarianceDisplayProps {
  variance: number | null;
}

export function VarianceDisplay({ variance }: VarianceDisplayProps) {
  if (variance === null || variance === undefined) {
    return <span className="text-muted-foreground">-</span>;
  }

  if (variance === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
        <Minus className="h-3.5 w-3.5" />
        0
      </span>
    );
  }

  if (variance > 0) {
    return (
      <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600">
        <TrendingUp className="h-3.5 w-3.5" />
        +{variance}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-sm font-medium text-red-600">
      <TrendingDown className="h-3.5 w-3.5" />
      {variance}
    </span>
  );
}
