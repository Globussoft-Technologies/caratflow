'use client';

import * as React from 'react';
import { cn } from '../lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  icon?: React.ReactNode;
  trend?: {
    value: number; // percentage change
    label?: string; // e.g., "vs last month"
  };
  className?: string;
  isLoading?: boolean;
}

export function StatCard({ title, value, icon, trend, className, isLoading }: StatCardProps) {
  const trendDirection = trend ? (trend.value > 0 ? 'up' : trend.value < 0 ? 'down' : 'flat') : null;

  return (
    <div
      className={cn(
        'rounded-lg border bg-card p-6 shadow-sm transition-shadow hover:shadow-md',
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </div>
      <div className="mt-2">
        {isLoading ? (
          <div className="h-8 w-24 animate-pulse rounded bg-muted" />
        ) : (
          <p className="text-2xl font-bold tracking-tight">{value}</p>
        )}
      </div>
      {trend && (
        <div className="mt-2 flex items-center gap-1">
          {trendDirection === 'up' && <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />}
          {trendDirection === 'down' && <TrendingDown className="h-3.5 w-3.5 text-red-600" />}
          {trendDirection === 'flat' && <Minus className="h-3.5 w-3.5 text-muted-foreground" />}
          <span
            className={cn(
              'text-xs font-medium',
              trendDirection === 'up' && 'text-emerald-600',
              trendDirection === 'down' && 'text-red-600',
              trendDirection === 'flat' && 'text-muted-foreground',
            )}
          >
            {trend.value > 0 ? '+' : ''}
            {trend.value.toFixed(1)}%
          </span>
          {trend.label && <span className="text-xs text-muted-foreground">{trend.label}</span>}
        </div>
      )}
    </div>
  );
}
