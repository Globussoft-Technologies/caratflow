'use client';

import * as React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface ComparisonMetric {
  label: string;
  period1Value: string;
  period2Value: string;
  changePercent: number;
}

interface PeriodComparisonProps {
  period1Label: string;
  period2Label: string;
  metrics: ComparisonMetric[];
}

export function PeriodComparison({
  period1Label,
  period2Label,
  metrics,
}: PeriodComparisonProps) {
  return (
    <div className="rounded-lg border bg-card">
      {/* Header */}
      <div className="grid grid-cols-4 gap-4 px-4 py-3 border-b bg-muted/50 text-sm font-medium text-muted-foreground">
        <div>Metric</div>
        <div className="text-right">{period1Label}</div>
        <div className="text-right">{period2Label}</div>
        <div className="text-right">Change</div>
      </div>

      {/* Rows */}
      {metrics.map((metric) => {
        const isPositive = metric.changePercent > 0;
        const isNeutral = metric.changePercent === 0;

        return (
          <div
            key={metric.label}
            className="grid grid-cols-4 gap-4 px-4 py-3 border-b last:border-0 text-sm hover:bg-muted/30"
          >
            <div className="font-medium">{metric.label}</div>
            <div className="text-right">{metric.period1Value}</div>
            <div className="text-right">{metric.period2Value}</div>
            <div
              className={`text-right flex items-center justify-end gap-1 ${
                isNeutral
                  ? 'text-muted-foreground'
                  : isPositive
                    ? 'text-green-600'
                    : 'text-red-600'
              }`}
            >
              {!isNeutral &&
                (isPositive ? (
                  <TrendingUp className="h-3.5 w-3.5" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5" />
                ))}
              <span>
                {isPositive ? '+' : ''}
                {metric.changePercent}%
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
