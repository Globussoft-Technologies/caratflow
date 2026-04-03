'use client';

import * as React from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { ChartData } from '@caratflow/shared-types';

const DEFAULT_COLORS = [
  '#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
];

interface ReportChartProps {
  data: ChartData;
  height?: number;
  formatValue?: (value: number) => string;
}

export function ReportChart({ data, height = 350, formatValue }: ReportChartProps) {
  const chartData = data.labels.map((label, index) => {
    const point: Record<string, unknown> = { name: label };
    for (const dataset of data.datasets) {
      point[dataset.label] = dataset.data[index] ?? 0;
    }
    return point;
  });

  const formatter = formatValue ?? ((v: number) => v.toLocaleString('en-IN'));

  switch (data.chartType) {
    case 'bar':
      return (
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="name" className="text-xs" />
            <YAxis className="text-xs" tickFormatter={formatter} />
            <Tooltip
              formatter={(value: number) => formatter(value)}
              contentStyle={{ borderRadius: '8px' }}
            />
            <Legend />
            {data.datasets.map((ds, i) => (
              <Bar
                key={ds.label}
                dataKey={ds.label}
                fill={ds.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length]}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      );

    case 'line':
      return (
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="name" className="text-xs" />
            <YAxis className="text-xs" tickFormatter={formatter} />
            <Tooltip
              formatter={(value: number) => formatter(value)}
              contentStyle={{ borderRadius: '8px' }}
            />
            <Legend />
            {data.datasets.map((ds, i) => (
              <Line
                key={ds.label}
                type="monotone"
                dataKey={ds.label}
                stroke={ds.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length]}
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      );

    case 'pie':
      return (
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={height / 3}
              dataKey={data.datasets[0]?.label ?? 'value'}
              label={({ name, percent }) =>
                `${name}: ${(percent * 100).toFixed(1)}%`
              }
            >
              {chartData.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip formatter={(value: number) => formatter(value)} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      );

    case 'area':
      return (
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="name" className="text-xs" />
            <YAxis className="text-xs" tickFormatter={formatter} />
            <Tooltip
              formatter={(value: number) => formatter(value)}
              contentStyle={{ borderRadius: '8px' }}
            />
            <Legend />
            {data.datasets.map((ds, i) => (
              <Area
                key={ds.label}
                type="monotone"
                dataKey={ds.label}
                stroke={ds.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length]}
                fill={ds.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length]}
                fillOpacity={0.15}
                strokeWidth={2}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      );

    default:
      return (
        <div className="flex items-center justify-center h-48 text-muted-foreground">
          Unsupported chart type: {data.chartType}
        </div>
      );
  }
}
