'use client';

import * as React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { ForecastResult } from '@caratflow/shared-types';

interface ForecastChartProps {
  data: ForecastResult;
  height?: number;
}

export function ForecastChart({ data, height = 400 }: ForecastChartProps) {
  if (data.predictions.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground">
        Not enough historical data for forecasting.
      </div>
    );
  }

  const chartData = data.predictions.map((point) => ({
    period: point.period,
    actual: point.actual,
    predicted: point.actual === null ? point.predicted : null,
    lowerBound: point.actual === null ? point.lowerBound : null,
    upperBound: point.actual === null ? point.upperBound : null,
  }));

  // Find the dividing line between actual and predicted
  let lastActualIdx = -1;
  for (let i = data.predictions.length - 1; i >= 0; i--) {
    if (data.predictions[i]!.actual !== null) {
      lastActualIdx = i;
      break;
    }
  }
  const dividerPeriod = lastActualIdx >= 0 ? data.predictions[lastActualIdx]!.period : undefined;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>
          Method: <strong className="text-foreground">{data.method}</strong>
        </span>
        <span>
          Accuracy: <strong className="text-foreground">{data.accuracy}%</strong>
        </span>
        <span>
          MAPE: <strong className="text-foreground">{data.mape}%</strong>
        </span>
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="period" className="text-xs" />
          <YAxis className="text-xs" />
          <Tooltip contentStyle={{ borderRadius: '8px' }} />
          <Legend />

          {/* Confidence interval band */}
          <Area
            type="monotone"
            dataKey="upperBound"
            stroke="none"
            fill="#3B82F6"
            fillOpacity={0.1}
            name="Upper Bound"
          />
          <Area
            type="monotone"
            dataKey="lowerBound"
            stroke="none"
            fill="#ffffff"
            fillOpacity={1}
            name="Lower Bound"
          />

          {/* Actual values */}
          <Area
            type="monotone"
            dataKey="actual"
            stroke="#10B981"
            fill="#10B981"
            fillOpacity={0.15}
            strokeWidth={2}
            name="Actual"
            connectNulls={false}
          />

          {/* Predicted values */}
          <Area
            type="monotone"
            dataKey="predicted"
            stroke="#3B82F6"
            fill="#3B82F6"
            fillOpacity={0.1}
            strokeWidth={2}
            strokeDasharray="5 5"
            name="Predicted"
            connectNulls={false}
          />

          {dividerPeriod && (
            <ReferenceLine
              x={dividerPeriod}
              stroke="#94A3B8"
              strokeDasharray="3 3"
              label="Forecast Start"
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
