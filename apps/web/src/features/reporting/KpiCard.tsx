'use client';

import * as React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { KpiData } from '@caratflow/shared-types';

interface KpiCardProps {
  data: KpiData;
  icon?: React.ReactNode;
}

export function KpiCard({ data, icon }: KpiCardProps) {
  const trendColor =
    data.trend?.direction === 'up'
      ? 'text-green-600'
      : data.trend?.direction === 'down'
        ? 'text-red-600'
        : 'text-muted-foreground';

  const TrendIcon =
    data.trend?.direction === 'up'
      ? TrendingUp
      : data.trend?.direction === 'down'
        ? TrendingDown
        : Minus;

  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{data.label}</p>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </div>
      <div className="mt-2">
        <p className="text-2xl font-bold">{data.formattedValue}</p>
        {data.trend && (
          <div className={`mt-1 flex items-center gap-1 text-xs ${trendColor}`}>
            <TrendIcon className="h-3 w-3" />
            <span>
              {data.trend.value > 0 ? '+' : ''}
              {data.trend.value}%
            </span>
            <span className="text-muted-foreground">{data.trend.label}</span>
          </div>
        )}
      </div>
    </div>
  );
}
