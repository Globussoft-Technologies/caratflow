'use client';

import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@caratflow/ui';

interface MetalRateDisplayProps {
  metalType: string;
  ratePaisePerGram: number;
  previousRatePaise?: number;
  className?: string;
}

export function MetalRateDisplay({
  metalType,
  ratePaisePerGram,
  previousRatePaise,
  className,
}: MetalRateDisplayProps) {
  const rateInRupees = (ratePaisePerGram / 100).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const ratePer10g = ((ratePaisePerGram * 10) / 100).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const trend = previousRatePaise
    ? ratePaisePerGram > previousRatePaise
      ? 'up'
      : ratePaisePerGram < previousRatePaise
        ? 'down'
        : 'flat'
    : null;

  const changePercent = previousRatePaise
    ? (((ratePaisePerGram - previousRatePaise) / previousRatePaise) * 100).toFixed(2)
    : null;

  return (
    <div className={cn('rounded-lg border bg-card p-3', className)}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase">{metalType} Rate</span>
        {trend && (
          <div className="flex items-center gap-1">
            {trend === 'up' && <TrendingUp className="h-3 w-3 text-emerald-600" />}
            {trend === 'down' && <TrendingDown className="h-3 w-3 text-red-600" />}
            {changePercent && (
              <span
                className={cn(
                  'text-[10px] font-medium',
                  trend === 'up' ? 'text-emerald-600' : 'text-red-600',
                )}
              >
                {trend === 'up' ? '+' : ''}{changePercent}%
              </span>
            )}
          </div>
        )}
      </div>
      <p className="mt-1 text-lg font-bold">₹{rateInRupees}/g</p>
      <p className="text-xs text-muted-foreground">₹{ratePer10g}/10g</p>
    </div>
  );
}
